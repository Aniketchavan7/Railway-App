import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from app.ai.status_format import format_status_reply
from app.ai.tools import RAILWAY_TOOLS, get_fare_enquiry, get_railway_disruptions_and_mega_blocks
from app.config import settings
from app.schemas.ai import ChatMessage
from app.schemas.status import RailwayStatus
from app.services.disruption_service import DisruptionService
from app.services.orchestrator import LiveDataUnavailable, orchestrator
from app.services.train_schedule_service import IST, TrainOperationsMetadata

logger = logging.getLogger("railpulse.ai.agent")

MAX_HISTORY_MESSAGES = 10

SYSTEM_PROMPT = """You are RailPulse Assistant, an honest Indian Railways travel assistant.

Current date and time: {now} (Indian Standard Time). All times you give must be in IST.
{train_context}
Rules:
1. Never guess a train's position, delay, running days or arrival time. Always call a tool, and answer only from its result. Do not rely on anything you remember about a train.
2. Lead with what the train is doing, from `service_state`: RUNNING, NOT_STARTED, COMPLETED (has reached its destination), NOT_RUNNING_TODAY, CANCELLED, or UNKNOWN (say live data is unavailable).
3. `position_label` says how the position is known. If it says "Estimated", say it is an estimate. Only call it exact when `position_basis` is PASSENGER_GPS or PROVIDER_GPS.
4. A train that started yesterday can still be running today. `journey_date_label` says which journey is being described, so mention it.
5. If `is_simulated` is true, say clearly that it is simulated demo data. If `freshness` is STALE, say when it was last updated.
6. If a tool has no information, say so plainly. Never invent cancellations, diversions, mega blocks or platform numbers. There is currently no verified network-wide disruption feed.
7. Be brief and structured. Use short bullet points and bold for the key fact.
"""

# Whole words only: as substrings, "latest" would match "late" and "address" would match "dr".
STATUS_WORDS = {
    "where", "status", "running", "run", "runs", "location", "late", "delay", "delayed", "reach", "reached",
    "arrive", "arrived", "arrival", "live", "latest", "update", "updates", "now", "today", "current",
    "currently", "started", "departed", "left", "eta", "position", "track", "tracking", "cancelled", "canceled",
}
OTHER_TOPIC_WORDS = {
    "fare", "fares", "price", "cost", "ticket", "tariff", "coach", "coaches", "bogie", "pnr", "platform", "halts",
    "stops", "schedule", "timetable", "route", "mega", "block", "blocks", "diversion", "diverted",
}
GENERAL_QUESTION_WORDS = {"which", "trains"}
DISRUPTION_WORDS = {"mega", "jumbo", "block", "blocks", "diversion", "diversions", "diverted", "disruption", "disruptions"}
FARE_WORDS = {"fare", "fares", "price", "cost", "tariff"}
WEEKDAYS = {
    "monday": "MON", "tuesday": "TUE", "wednesday": "WED", "thursday": "THU",
    "friday": "FRI", "saturday": "SAT", "sunday": "SUN",
}
STATION_WORDS = {
    "pune": "PUNE", "mumbai": "CSMT", "csmt": "CSMT", "delhi": "NDLS", "ndls": "NDLS", "solapur": "SUR", "sur": "SUR",
    "howrah": "HWH", "hwh": "HWH", "kalyan": "KYN", "kyn": "KYN", "dadar": "DR", "kurduvadi": "KWV", "kwv": "KWV",
    "nagpur": "NGP", "ngp": "NGP", "bhusawal": "BSL", "bsl": "BSL", "chennai": "MAS", "mas": "MAS",
    "bangalore": "SBC", "bengaluru": "SBC", "sbc": "SBC", "hyderabad": "HYB", "ltt": "LTT",
}


def _words(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _train_numbers(text: str) -> List[str]:
    seen: List[str] = []
    for number in re.findall(r"(?<!\d)\d{5}(?!\d)", text):
        if number not in seen:
            seen.append(number)
    return seen


def _is_status_question(query: str) -> bool:
    words = set(_words(query))
    if words & OTHER_TOPIC_WORDS:
        return False
    # "Which trains run to Delhi?" is not about the train in the conversation.
    if words & GENERAL_QUESTION_WORDS and not _train_numbers(query):
        return False
    # A train number on its own is the most common question of all.
    is_bare_number = bool(_train_numbers(query)) and len(words) <= 3
    return is_bare_number or bool(words & STATUS_WORDS)


def _last_mentioned_train(history: Sequence[ChatMessage]) -> Optional[str]:
    # User messages only: the assistant's own examples must not become "the user's train".
    for message in reversed(history):
        if message.role != "user":
            continue
        numbers = _train_numbers(message.content)
        if numbers:
            return numbers[-1]
    return None


def _build_system_prompt(train_number: Optional[str]) -> str:
    now = datetime.now(IST).strftime("%A, %d %B %Y, %H:%M")
    context = f"The conversation is about train {train_number} unless the user names another.\n" if train_number else ""
    return SYSTEM_PROMPT.format(now=now, train_context=context)


def _to_langchain(history: Sequence[ChatMessage], query: str) -> List[BaseMessage]:
    messages: List[BaseMessage] = []
    for message in list(history)[-MAX_HISTORY_MESSAGES:]:
        if message.role == "user":
            messages.append(HumanMessage(content=message.content))
        elif message.role == "assistant":
            messages.append(AIMessage(content=message.content))
    messages.append(HumanMessage(content=query))
    return messages


def _text_of(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(part.get("text", "") if isinstance(part, dict) else str(part) for part in content)
    return str(content)


async def _status_for(train_number: str) -> Optional[RailwayStatus]:
    try:
        return await orchestrator.get_live_status(train_number)
    except LiveDataUnavailable:
        return None


def _reply(text: str, model: str, train: Optional[RailwayStatus] = None, **extra: Any) -> Dict[str, Any]:
    return {
        "response": text,
        "model": model,
        "grounded": True,
        "train": train.model_dump(mode="json") if train else None,
        **extra,
    }


DIRECT = "live_status_direct"
FALLBACK = "deterministic_grounded_agent"


class RailwayAIAgent:
    async def answer(
        self,
        user_query: str,
        history: Optional[Sequence[ChatMessage]] = None,
        context_train: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Answer from live data. Status questions skip the model, so they stay exact."""
        history = list(history or [])
        numbers = _train_numbers(user_query)
        train_number = numbers[0] if numbers else (_last_mentioned_train(history) or context_train)

        # A named day is about the timetable, not about what the train is doing now.
        words = set(_words(user_query))
        day = next((WEEKDAYS[w] for w in words if w in WEEKDAYS), None)
        if day and train_number and (numbers or not words & GENERAL_QUESTION_WORDS):
            return _reply(_running_day_answer(train_number, day), DIRECT, await _status_for(train_number))

        if train_number and _is_status_question(user_query):
            return await self._status_answer(numbers or [train_number], user_query)

        if settings.XKIRO_API_KEY:
            try:
                return await self._model_answer(user_query, history, train_number)
            except Exception as e:
                logger.warning("Model call failed (%s), using the deterministic handler", e)
        return await self._deterministic_answer(user_query, train_number)

    async def _model_answer(
        self, query: str, history: Sequence[ChatMessage], train_number: Optional[str]
    ) -> Dict[str, Any]:
        from langchain_openai import ChatOpenAI
        from langgraph.prebuilt import create_react_agent

        llm = ChatOpenAI(
            base_url=settings.XKIRO_BASE_URL,
            api_key=settings.XKIRO_API_KEY,
            model=settings.XKIRO_MODEL,
            temperature=0.2,
        )
        agent = create_react_agent(llm, RAILWAY_TOOLS, prompt=_build_system_prompt(train_number))
        result = await agent.ainvoke({"messages": _to_langchain(history, query)})
        train = await _status_for(train_number) if train_number else None
        return _reply(_text_of(result["messages"][-1].content), settings.XKIRO_MODEL, train)

    async def _status_answer(self, numbers: List[str], query: str) -> Dict[str, Any]:
        sections: List[str] = []
        first_status: Optional[RailwayStatus] = None
        for number in numbers:
            try:
                status = await orchestrator.get_live_status(number)
            except LiveDataUnavailable:
                sections.append(f"**Train {number}:** live railway data is temporarily unavailable, and we have no timetable for it. Please try again shortly.")
                continue
            if not status:
                sections.append(f"**Train {number}:** no running record for today or yesterday. It may not run on these days, or the number may be wrong.")
                continue
            first_status = first_status or status
            section = format_status_reply(status)
            arrival = _arrival_detail(status, query)
            sections.append(f"{section}\n{arrival}" if arrival else section)
        return _reply("\n\n".join(sections), DIRECT, first_status)

    async def _deterministic_answer(self, query: str, train_number: Optional[str]) -> Dict[str, Any]:
        """Used when no model is available. Limited, but never invents an answer."""
        words = set(_words(query))
        train = await _status_for(train_number) if train_number else None

        day = next((WEEKDAYS[w] for w in words if w in WEEKDAYS), None)
        if day and train_number:
            return _reply(_running_day_answer(train_number, day), FALLBACK, train)

        if words & DISRUPTION_WORDS:
            summary = DisruptionService.get_disruption_summary(train_number=train_number)
            if train and train.exceptions:
                return _reply(format_status_reply(train), FALLBACK, train)
            return _reply(
                "I don't have a verified source for mega blocks or diversions, so I can't list them. "
                "Please check the National Train Enquiry System or station announcements."
                + (" Live data shows no notices for this train." if train else ""),
                FALLBACK, train, telemetry_context=summary.model_dump(mode="json"),
            )

        if words & FARE_WORDS:
            return await self._fare_answer(query, train_number, train)

        if train:
            return _reply(format_status_reply(train), FALLBACK, train)
        return _reply(
            "Please give me a 5-digit train number, such as 12951, and I'll tell you whether it is running, has reached, or isn't running today.",
            FALLBACK,
        )

    async def _fare_answer(self, query: str, train_number: Optional[str], train: Optional[RailwayStatus]) -> Dict[str, Any]:
        stations = [STATION_WORDS[w] for w in _words(query) if w in STATION_WORDS]
        if not train_number or len(stations) < 2:
            return _reply("To work out a fare, please give me the train number and both stations, for example: fare for 12101 from CSMT to PUNE.", FALLBACK, train)
        raw = await get_fare_enquiry.ainvoke({"train_number": train_number, "origin_station": stations[0], "destination_station": stations[1]})
        fare = json.loads(raw)
        rows = "\n".join(f"- **{c['class_name']}:** ₹{round(c['total_fare'])}" for c in fare.get("classes", []))
        return _reply(
            f"**Estimated fare for {train_number}, {stations[0]} to {stations[1]}** ({round(fare.get('distance_km', 0))} km):\n{rows}\n\n"
            "These are calculated from the distance tariff. Check the actual fare when booking.",
            FALLBACK, train,
        )


def _arrival_detail(status: RailwayStatus, query: str) -> Optional[str]:
    """If the question names a stop on this train, say what is known about reaching it."""
    words = set(_words(query))
    for halt in status.halts:
        name_words = set(_words(halt.station_name))
        if halt.station_code.lower() not in words and not (name_words & words - {"jn", "junction", "central"}):
            continue
        if halt.has_arrived:
            return f"- **{halt.station_name}:** already reached."
        if status.service_state == "RUNNING" and halt.arrival_time:
            delay = f", plus {status.delay_minutes} min running delay" if status.delay_minutes > 0 else ""
            return f"- **{halt.station_name}:** timetable arrival {halt.arrival_time} IST{delay}."
    return None


def _running_day_answer(train_number: str, day: str) -> str:
    profile = TrainOperationsMetadata.get_profile(train_number)
    if not profile:
        return f"I don't have running days for train {train_number}."
    days = profile["days_of_run"]
    answer = "runs" if day in days else "does not run"
    reason = f" ({profile['non_running_reason']})" if day not in days and profile.get("non_running_reason") else ""
    return f"**{train_number} {profile['name']} {answer} on that day{reason}.** It runs on {', '.join(days)}."


railway_ai = RailwayAIAgent()

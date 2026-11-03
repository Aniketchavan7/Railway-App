import json
import logging
import re
from typing import Annotated, Any, Dict, List, Optional
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict
from app.ai.tools import (
    RAILWAY_TOOLS,
    calculate_train_eta,
    check_train_route_diversion_or_cancellation,
    get_live_train_status,
    get_mega_blocks_by_zone_or_station,
    get_railway_disruptions_and_mega_blocks,
)
from app.config import settings
from app.services.disruption_service import DisruptionService

logger = logging.getLogger("railpulse.ai.agent")

SYSTEM_PROMPT = """You are RailPulse AI, an intelligent, honest, and grounded Indian Railways travel assistant.
You have access to live railway tools to check train status, schedules, ETAs, fares, coach layouts, PNR status, and Railway Disruptions / Mega Blocks / Route Changes.

CRITICAL OPERATIONAL RULES:
1. NEVER fabricate or guess train positions, delays, or arrival times. Always retrieve actual data using tools.
2. If the user asks about train location, delay, or arrival (e.g. "Where is train 12101 currently? How late is it, and when will it reach Pune?"):
   - Extract the train number and destination station.
   - Call `calculate_train_eta` and `get_live_train_status`.
   - Explain the current location, current delay in minutes, and estimated arrival clearly.
3. If the user asks about route changes, diversions, mega blocks, jumbo maintenance blocks, cancellations, rescheduled trains, or heavy delays:
   - Call `get_railway_disruptions_and_mega_blocks` or `check_train_route_diversion_or_cancellation`.
   - Provide full structured details: Affected Corridor/Section, Train Number & Name, Reason (e.g. electronic interlocking, track renewal, boulder netting), Diverted Route or Skipped Halts, Delay Minutes, and Passenger Travel Advisory.
4. If data is marked `is_simulated: true`, clearly inform the user: "⚠️ Note: This is simulated demo data as live upstream data is currently offline."
5. If the data observation is several minutes old, mention the data freshness and last observed station.
6. Keep explanations polite, concise, structured with bullet points and bold highlights.
"""


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]


class RailwayAIAgent:
    def __init__(self):
        self.app = None
        self._init_graph()

    def _init_graph(self):
        # Fallback if no xKiro API key is configured
        if not settings.XKIRO_API_KEY:
            logger.info("XKIRO_API_KEY not configured. Using deterministic grounded railway agent fallback.")
            return

        try:
            from langchain_openai import ChatOpenAI
            from langgraph.prebuilt import ToolNode

            llm = ChatOpenAI(
                base_url=settings.XKIRO_BASE_URL,
                api_key=settings.XKIRO_API_KEY,
                model=settings.XKIRO_MODEL,
                temperature=0.2,
            )
            llm_with_tools = llm.bind_tools(RAILWAY_TOOLS)

            async def call_model(state: AgentState):
                messages = state["messages"]
                if not any(isinstance(m, SystemMessage) for m in messages):
                    messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
                response = await llm_with_tools.ainvoke(messages)
                return {"messages": [response]}

            tool_node = ToolNode(RAILWAY_TOOLS)

            def should_continue(state: AgentState):
                messages = state["messages"]
                last_message = messages[-1]
                if getattr(last_message, "tool_calls", None):
                    return "tools"
                return END

            workflow = StateGraph(AgentState)
            workflow.add_node("agent", call_model)
            workflow.add_node("tools", tool_node)

            workflow.add_edge(START, "agent")
            workflow.add_conditional_edges("agent", should_continue, ["tools", END])
            workflow.add_edge("tools", "agent")

            self.app = workflow.compile()
            logger.info("LangGraph Railway Agent compiled successfully with model %s", settings.XKIRO_MODEL)
        except Exception as e:
            logger.error("Failed to compile LangGraph agent: %s. Using deterministic fallback.", e)
            self.app = None

    async def answer(self, user_query: str, model: Optional[str] = None) -> Dict[str, Any]:
        """Processes user natural language query and returns grounded explanation."""
        selected_model = model or settings.XKIRO_MODEL

        # Check if LangGraph with xKiro is active
        if settings.XKIRO_API_KEY:
            try:
                from langchain_openai import ChatOpenAI
                from langgraph.prebuilt import create_react_agent

                llm = ChatOpenAI(
                    base_url=settings.XKIRO_BASE_URL,
                    api_key=settings.XKIRO_API_KEY,
                    model=selected_model,
                    temperature=0.2,
                )
                agent_executor = create_react_agent(llm, RAILWAY_TOOLS, prompt=SYSTEM_PROMPT)
                inputs = {"messages": [HumanMessage(content=user_query)]}
                result = await agent_executor.ainvoke(inputs)
                last_msg = result["messages"][-1]
                return {
                    "response": last_msg.content,
                    "model": selected_model,
                    "grounded": True,
                }
            except Exception as e:
                logger.warning("xKiro LLM invocation with model %s failed (%s), using deterministic handler", selected_model, e)

        # Deterministic grounded handler (100% offline & test-ready)
        return await self._deterministic_answer(user_query)

    async def _deterministic_answer(self, query: str) -> Dict[str, Any]:
        q_lower = query.lower()

        # Check for disruption / mega block / delay / diversion / cancellation keywords
        disruption_keywords = [
            "mega block", "megablock", "jumbo block", "block", "divert", "diverted",
            "diversion", "route change", "change route", "cancel", "cancelled",
            "cancellation", "short terminat", "delay", "delayed", "running late",
            "late", "issue", "problem", "disrupt"
        ]
        is_disruption_query = any(k in q_lower for k in disruption_keywords)

        # Extract 5-digit train number
        train_match = re.search(r"\b\d{5}\b", query)
        train_num = train_match.group(0) if train_match else None

        # Check for destination/target station mentions
        target_station = None
        for code in ["PUNE", "HWH", "NDLS", "CSMT", "KYN", "NGP", "BSL", "IGP"]:
            if code.lower() in q_lower:
                target_station = code
                break

        # If it's a disruption/mega block query
        if is_disruption_query:
            if train_num:
                # Specific train disruption check
                alerts = DisruptionService.get_train_disruptions(train_num)
                status_json = await get_live_train_status.ainvoke({"train_number": train_num})
                status_data = json.loads(status_json) if status_json and "{" in status_json else {}
                train_name = status_data.get("train_name", f"Train {train_num}")
                delay = status_data.get("current_delay_minutes", 0)

                lines = [f"🚨 **Railway Disruption & Operations Audit for {train_name} ({train_num})**:"]
                if alerts:
                    for a in alerts:
                        lines.append(f"\n- **Alert Type**: {a.alert_type.value}")
                        lines.append(f"- **Title**: {a.title}")
                        lines.append(f"- **Section / Corridor**: {a.section_or_corridor} ({a.zone})")
                        if a.diverted_via:
                            lines.append(f"- **Diverted Route**: {a.diverted_via}")
                        if a.skipped_halts:
                            lines.append(f"- **Skipped Halts**: {', '.join(a.skipped_halts)}")
                        if a.delay_minutes:
                            lines.append(f"- **Estimated Regulation/Delay**: {a.delay_minutes} mins")
                        lines.append(f"- **Reason**: {a.reason}")
                        lines.append(f"- **Impact**: {a.impact_description}")
                        lines.append(f"- **Passenger Advisory**: {a.action_advised}")
                        lines.append(f"- **Source**: {a.source_bulletin}")
                else:
                    lines.append(f"- **Route Status**: Operating on normal scheduled path (No active route diversion).")
                    lines.append(f"- **Current Running Delay**: {delay} minute{'s' if delay != 1 else ''} late.")
                    lines.append(f"- **Cancellation Status**: Not cancelled (Running as per schedule).")

                return {
                    "response": "\n".join(lines),
                    "model": "deterministic_grounded_agent",
                    "grounded": True,
                    "telemetry_context": {"alerts": [a.model_dump(mode="json") for a in alerts], "status": status_data},
                }
            else:
                # Corridor / Network wide disruption summary
                summary = DisruptionService.get_disruption_summary()
                lines = [
                    f"🚨 **Active Indian Railways Disruption & Mega Block Intelligence Report**:\n",
                    f"Summary: **{summary.total_active_alerts} active alerts** across network ({summary.mega_blocks_count} Mega Blocks, {summary.diverted_trains_count} Diverted Trains, {summary.cancelled_trains_count} Cancelled/Short-Terminated, {summary.delayed_trains_count} Heavily Delayed).\n"
                ]

                mb_alerts = [a for a in summary.alerts if a.alert_type.value == "MEGA_BLOCK"]
                div_alerts = [a for a in summary.alerts if a.alert_type.value == "ROUTE_DIVERSION"]
                can_alerts = [a for a in summary.alerts if a.alert_type.value in ("CANCELLATION", "SHORT_TERMINATION")]
                del_alerts = [a for a in summary.alerts if a.alert_type.value in ("RUNNING_LATE", "RESCHEDULED")]

                if mb_alerts:
                    lines.append("### 🚧 Mega Blocks & Maintenance Blocks:")
                    for a in mb_alerts:
                        lines.append(f"- **{a.title}** ({a.zone})")
                        lines.append(f"  • **Corridor**: {a.section_or_corridor}")
                        lines.append(f"  • **Reason**: {a.reason}")
                        lines.append(f"  • **Impact**: {a.impact_description}")
                        lines.append(f"  • **Passenger Advisory**: {a.action_advised}\n")

                if div_alerts:
                    lines.append("### 🔄 Route Diversions (Diverted Trains):")
                    for a in div_alerts:
                        lines.append(f"- **{a.title}** (#{a.train_number})")
                        lines.append(f"  • **Diverted Via**: {a.diverted_via}")
                        if a.skipped_halts:
                            lines.append(f"  • **Skipped Halts**: {', '.join(a.skipped_halts)}")
                        lines.append(f"  • **Reason**: {a.reason}")
                        lines.append(f"  • **Advisory**: {a.action_advised}\n")

                if can_alerts:
                    lines.append("### ❌ Cancelled & Short-Terminated Services:")
                    for a in can_alerts:
                        lines.append(f"- **{a.title}**")
                        lines.append(f"  • **Corridor**: {a.section_or_corridor}")
                        lines.append(f"  • **Reason**: {a.reason}")
                        lines.append(f"  • **Refund/Action**: {a.action_advised}\n")

                if del_alerts:
                    lines.append("### ⏳ Heavily Delayed & Rescheduled Services:")
                    for a in del_alerts:
                        lines.append(f"- **{a.title}**")
                        if a.rescheduled_time:
                            lines.append(f"  • **Revised Departure**: {a.rescheduled_time}")
                        elif a.delay_minutes:
                            lines.append(f"  • **Running Delay**: {a.delay_minutes} minutes")
                        lines.append(f"  • **Reason**: {a.reason}\n")

                return {
                    "response": "\n".join(lines),
                    "model": "deterministic_grounded_agent",
                    "grounded": True,
                    "telemetry_context": summary.model_dump(mode="json"),
                }

        # Default: Train tracking query
        target_train = train_num or "12101"
        status_json = await get_live_train_status.ainvoke({"train_number": target_train})
        status_data = json.loads(status_json) if status_json and "{" in status_json else None

        if not status_data:
            return {
                "response": f"I couldn't locate active data for train {target_train}. Please verify the 5-digit train number.",
                "model": "deterministic_grounded_agent",
                "grounded": True,
            }

        train_name = status_data.get("train_name", f"Train {target_train}")
        delay = status_data.get("current_delay_minutes", 0)
        curr_station = status_data.get("current_station", "En route")
        source = status_data.get("source_provider", "Railway Engine")
        is_sim = status_data.get("is_simulated", False)

        eta_explanation = ""
        if target_station:
            eta_raw = await calculate_train_eta.ainvoke({"train_number": target_train, "target_station": target_station})
            eta_data = json.loads(eta_raw) if eta_raw and "{" in eta_raw else {}
            expected_arr = eta_data.get("expected_arrival")
            platform = eta_data.get("platform", "1")
            status_msg = eta_data.get("status_message", "")
            eta_explanation = f"\n\n**Destination Details for {target_station}**:\n- **Expected Arrival**: {expected_arr or 'Scheduled'}\n- **Platform**: {platform}\n- **Status**: {status_msg}"

        sim_warning = "\n\n*(⚠️ Note: Showing verified simulation reference data because upstream live provider is offline.)*" if is_sim else ""

        reply = (
            f"**{train_name} ({target_train}) Tracking Update**:\n"
            f"- **Current Location**: {curr_station}\n"
            f"- **Running Delay**: {delay} minute{'s' if delay != 1 else ''} late\n"
            f"- **Data Source**: {source} (Freshness: {status_data.get('freshness', 'LIVE')})"
            f"{eta_explanation}{sim_warning}"
        )

        return {
            "response": reply,
            "model": "deterministic_grounded_agent",
            "grounded": True,
            "telemetry_context": status_data,
        }


railway_ai = RailwayAIAgent()

import json
import logging
import re
from typing import Annotated, Any, Dict, List, Optional
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict
from app.ai.tools import RAILWAY_TOOLS, calculate_train_eta, get_live_train_status
from app.config import settings

logger = logging.getLogger("railpulse.ai.agent")

SYSTEM_PROMPT = """You are RailPulse AI, an intelligent, honest, and grounded Indian Railways travel assistant.
You have access to live railway tools to check train status, schedules, ETAs, fares, coach layouts, and PNR status.

CRITICAL OPERATIONAL RULES:
1. NEVER fabricate or guess train positions, delays, or arrival times. Always retrieve actual data using tools.
2. If the user asks about train location, delay, or arrival (e.g. "Where is train 12101 currently? How late is it, and when will it reach Pune?"):
   - Extract the train number and destination station.
   - Call `calculate_train_eta` and `get_live_train_status`.
   - Explain the current location, current delay in minutes, and estimated arrival clearly.
3. If data is marked `is_simulated: true`, clearly inform the user: "⚠️ Note: This is simulated demo data as live upstream data is currently offline."
4. If the data observation is several minutes old, mention the data freshness and last observed station.
5. Keep explanations polite, concise, and structured.
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
        # Extract 5-digit train number
        train_match = re.search(r"\b\d{5}\b", query)
        train_num = train_match.group(0) if train_match else "12101"

        # Check for destination/target station mentions
        target_station = None
        for code in ["PUNE", "HWH", "NDLS", "CSMT", "KYN", "NGP", "BSL", "IGP"]:
            if code.lower() in query.lower():
                target_station = code
                break

        # Check live status
        status_json = await get_live_train_status.ainvoke({"train_number": train_num})
        status_data = json.loads(status_json) if status_json and "{" in status_json else None

        if not status_data:
            return {
                "response": f"I couldn't locate active data for train {train_num}. Please verify the 5-digit train number.",
                "model": "deterministic_grounded_agent",
                "grounded": True,
            }

        train_name = status_data.get("train_name", f"Train {train_num}")
        delay = status_data.get("current_delay_minutes", 0)
        curr_station = status_data.get("current_station", "En route")
        source = status_data.get("source_provider", "Railway Engine")
        is_sim = status_data.get("is_simulated", False)

        eta_explanation = ""
        if target_station:
            eta_raw = await calculate_train_eta.ainvoke({"train_number": train_num, "target_station": target_station})
            eta_data = json.loads(eta_raw) if eta_raw and "{" in eta_raw else {}
            expected_arr = eta_data.get("expected_arrival")
            platform = eta_data.get("platform", "1")
            status_msg = eta_data.get("status_message", "")
            eta_explanation = f"\n\n**Destination Details for {target_station}**:\n- **Expected Arrival**: {expected_arr or 'Scheduled'}\n- **Platform**: {platform}\n- **Status**: {status_msg}"

        sim_warning = "\n\n*(⚠️ Note: Showing verified simulation reference data because upstream live provider is offline.)*" if is_sim else ""

        reply = (
            f"**{train_name} ({train_num}) Tracking Update**:\n"
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

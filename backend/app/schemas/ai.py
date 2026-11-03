from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str  # user, assistant, system, tool
    content: str
    tool_call_id: Optional[str] = None
    name: Optional[str] = None


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: Optional[str] = None
    stream: bool = False
    context_train_number: Optional[str] = None


class ToolCallRecord(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    output: Optional[Any] = None


class ChatResponse(BaseModel):
    response: str
    tool_calls: List[ToolCallRecord] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)
    telemetry_context: Optional[Dict[str, Any]] = None

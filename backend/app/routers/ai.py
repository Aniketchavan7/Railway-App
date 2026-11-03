from fastapi import APIRouter
from app.ai.agent import railway_ai
from app.schemas.ai import ChatRequest, ChatResponse
from app.schemas.status import ResponseEnvelope

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/chat", response_model=ResponseEnvelope)
async def chat_with_railway_ai(req: ChatRequest):
    last_user_message = next(
        (m.content for m in reversed(req.messages) if m.role == "user"), ""
    )
    if not last_user_message:
        return ResponseEnvelope(data={"response": "Hello! How can I help you with Indian Railways today?"})

    res = await railway_ai.answer(last_user_message)
    return ResponseEnvelope(data=res)

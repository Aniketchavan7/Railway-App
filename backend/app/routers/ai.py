from fastapi import APIRouter
from app.ai.agent import railway_ai
from app.schemas.ai import ChatRequest
from app.schemas.status import ResponseEnvelope

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/chat", response_model=ResponseEnvelope)
async def chat_with_railway_ai(req: ChatRequest):
    last_index = next(
        (i for i in range(len(req.messages) - 1, -1, -1) if req.messages[i].role == "user"), None
    )
    if last_index is None:
        return ResponseEnvelope(data={"response": "Hello! How can I help you with Indian Railways today?"})

    # req.model is deliberately ignored: visitors must not choose models on our API key.
    res = await railway_ai.answer(
        req.messages[last_index].content,
        history=req.messages[:last_index],
        context_train=req.context_train_number,
    )
    return ResponseEnvelope(data=res)

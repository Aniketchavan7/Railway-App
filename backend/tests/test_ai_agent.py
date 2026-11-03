import pytest
from app.ai.agent import railway_ai


@pytest.mark.asyncio
async def test_ai_agent_question_answering():
    query = "Where is train 12101 currently? How late is it, and when will it reach Pune?"
    answer = await railway_ai.answer(query)

    assert answer is not None
    assert "response" in answer
    text = answer["response"]
    assert "12101" in text
    assert "minute" in text.lower() or "delay" in text.lower()
    assert answer.get("grounded") is True

import json

from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import Optional, List
from datetime import datetime

# ==================== CHAT SESSION SCHEMAS ====================

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Legal Consultation"

class ChatSessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ==================== CHAT MESSAGE SCHEMAS ====================

class SendMessageRequest(BaseModel):
    session_id: str  # The specific "Main Chat" the user is currently inside
    query: str       # The new question or follow-up question

    @field_validator("query", mode="before")
    @classmethod
    def sanitize_query_text(cls, value: str) -> str:
        if isinstance(value, str):
            # Normalization of raw control characters, newlines, or carriage returns
            return value.replace("\r\n", "\n").replace("\r", "\n")
        return value

class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    sender: str  # "user" or "assistant"
    text: str
    sources: Optional[List[str]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
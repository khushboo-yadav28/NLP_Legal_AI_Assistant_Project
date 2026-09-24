import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base

def utc_now():
    """Returns dynamic UTC datetime for SQLAlchemy defaults."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

class UserTable(Base):
    """
    Stores registered user profiles.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    chat_sessions = relationship(
        "ChatSessionTable", back_populates="user", cascade="all, delete-orphan"
    )


class ChatSessionTable(Base):
    """
    Represents a specific legal consultation / chat thread belonging to a user.
    """
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New Consultation")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # uploaded_file_uri = Column(String(255), nullable=True)  # Store Gemini file name/uri
    uploaded_file_uris = Column(JSON, default=list, nullable=False)
    
    # Relationships
    user = relationship("UserTable", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessageTable", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessageTable.created_at"
    )


class ChatMessageTable(Base):
    """
    Stores individual messages exchanged within a chat session.
    """
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = Column(String(10), nullable=False)  # 'user' or 'assistant'
    text = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)  # List of filenames/acts cited (e.g., ["indian_contract_act.pdf"])
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    session = relationship("ChatSessionTable", back_populates="messages")
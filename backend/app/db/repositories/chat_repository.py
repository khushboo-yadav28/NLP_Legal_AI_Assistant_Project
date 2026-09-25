from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.user_chat_models import ChatSessionTable, ChatMessageTable, UserTable

def utc_now():
    return datetime.now(timezone.utc)

class ChatRepository:
    """
    Data access layer for managing User sessions and Chat history.
    """

    # ==================== USER OPERATIONS ====================

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[UserTable]:
        """Fetch user by ID."""
        return db.query(UserTable).filter(UserTable.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[UserTable]:
        """Fetch user by email."""
        return db.query(UserTable).filter(UserTable.email == email).first()

    # ==================== SESSION OPERATIONS ====================

    @staticmethod
    def create_session(db: Session, user_id: str, title: str = "New Consultation") -> ChatSessionTable:
        """Create a new chat session (thread) for a user."""
        now = utc_now() #datetime.now(timezone.utc)
        session = ChatSessionTable(user_id=user_id, title=title,created_at=now,updated_at=now)
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_session_by_id(db: Session, session_id: str) -> Optional[ChatSessionTable]:
        """Fetch a single chat session by ID."""
        return db.query(ChatSessionTable).filter(ChatSessionTable.id == session_id).first()

    @staticmethod
    def get_user_sessions(db: Session, user_id: str) -> List[ChatSessionTable]:
        """Fetch all chat sessions for a user, ordered by most recently updated."""
        return db.query(ChatSessionTable).filter(
            ChatSessionTable.user_id == user_id
        ).order_by(ChatSessionTable.updated_at.desc()).all()

    @staticmethod
    def delete_session(db: Session, session_id: str) -> bool:
        """Delete a chat session and all associated messages via cascade."""
        session = db.query(ChatSessionTable).filter(ChatSessionTable.id == session_id).first()
        if session:
            db.delete(session)
            db.commit()
            return True
        return False

    # ==================== MESSAGE OPERATIONS ====================

    @staticmethod
    def add_message(
        db: Session,
        session_id: str,
        sender: str,
        text: str,
        sources: Optional[List[str]] = None
    ) -> ChatMessageTable:
        """
        Add a message (user query or assistant response) to a chat session
        and update the session's updated_at timestamp.
        """
        message = ChatMessageTable(
            session_id=session_id,
            sender=sender,
            text=text,
            sources=sources or []
        )
        db.add(message)

        # Update parent session's updated_at timestamp
        session = db.query(ChatSessionTable).filter(ChatSessionTable.id == session_id).first()
        if session:
            session.updated_at = utc_now() #datetime.now(timezone.utc)

        db.commit()
        db.refresh(message)
        return message

    @staticmethod
    def get_recent_messages(db: Session, session_id: str, limit: int = 6) -> List[ChatMessageTable]:
        """
        Fetch the last N messages for context building during follow-up questions.
        Returns messages in chronological order (oldest to newest).
        """
        messages = (
            db.query(ChatMessageTable)
            .filter(ChatMessageTable.session_id == session_id)
            .order_by(ChatMessageTable.created_at.desc())
            .limit(limit)
            .all()
        )
        # Reverse list back to chronological order (oldest -> newest)
        return list(reversed(messages))

    @staticmethod
    def get_all_session_messages(db: Session, session_id: str):
        """Fetches ALL messages for a chat session in chronological order for UI rendering."""
        messages = (
            db.query(ChatMessageTable)
             .filter(ChatMessageTable.session_id == session_id)
             .order_by(ChatMessageTable.created_at.asc())
             .all()
        )   
        return messages
    
    @staticmethod
    def update_session_cache(
        db: Session, 
        session_id: str, 
        file_uri: str, 
        cache_name: str, 
        expires_at: datetime
    ) -> Optional[ChatSessionTable]:
        """Attach uploaded document cache references to the session."""

        if expires_at and expires_at.tzinfo is not None:
            expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)

        session = db.query(ChatSessionTable).filter(ChatSessionTable.id == session_id).first()
        if session:
            session.uploaded_file_uri = file_uri
            session.gemini_cache_name = cache_name
            session.cache_expires_at = expires_at
            session.updated_at = utc_now() #datetime.now(timezone.utc)
            db.commit()
            db.refresh(session)
        return session

    @staticmethod
    def append_file_uri(db: Session, session_id: str, file_uri: str) -> Optional[ChatSessionTable]:
        """Appends a new Gemini file URI to the chat session's uploaded_file_uris array."""
        session = db.query(ChatSessionTable).filter(ChatSessionTable.id == session_id).first()
        if session:
            # Re-assign or initialize list to trigger SQLAlchemy JSON mutation detection
            current_uris = list(session.uploaded_file_uris or [])
            if file_uri not in current_uris:
                current_uris.append(file_uri)
                session.uploaded_file_uris = current_uris
                db.commit()
                db.refresh(session)
        return session
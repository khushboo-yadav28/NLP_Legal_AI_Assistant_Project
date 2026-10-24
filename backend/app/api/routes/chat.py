from datetime import datetime, timezone
import json
import os
import re
import tempfile
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, get_db
from app.db.repositories.chat_repository import ChatRepository
from app.db.user_chat_models import ChatSessionTable
from app.models.chat import ChatMessageResponse, ChatSessionCreate, ChatSessionResponse, SendMessageRequest
from app.rag.generation.chat_prompt_builder import PromptBuilder
from app.rag.retrieval.retriever import Retriever
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(tags=["Legal Chat & Consultations"])


@router.post("/", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    payload: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a new Chat Session (Sidebar item) strictly associated with the authenticated user."""
    # Reuse existing unused empty session if titled "New Consultation"
    if payload.title == "New Consultation":
        existing_empty = (
            db.query(ChatSessionTable)
            .filter(
                ChatSessionTable.user_id == str(current_user.id),
                ChatSessionTable.title == "New Consultation"
            )
            .order_by(ChatSessionTable.created_at.desc())
            .first()
        )
        if existing_empty and len(existing_empty.messages) == 0:
            return existing_empty

    session = ChatRepository.create_session(db=db, user_id=str(current_user.id), title=payload.title)
    return session


@router.get("/", response_model=List[ChatSessionResponse])
def list_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches all main chat sessions strictly filtered by current_user.id."""
    sessions = ChatRepository.get_user_sessions(db=db, user_id=str(current_user.id))

    updated_any = False
    for s in sessions:
        if s.title == "New Consultation":
            first_user_msg = next((m for m in s.messages if m.sender == "user"), None)
            if first_user_msg and first_user_msg.text.strip():
                clean_text = first_user_msg.text.strip().replace("\n", " ")
                s.title = clean_text[:40] + ("..." if len(clean_text) > 40 else "")
                updated_any = True

    # Prune redundant empty "New Consultation" sessions if any
    empty_sessions = [s for s in sessions if s.title == "New Consultation" and len(s.messages) == 0]
    if len(empty_sessions) > 1:
        for redundant in empty_sessions[1:]:
            db.delete(redundant)
            updated_any = True

    if updated_any:
        db.commit()
        sessions = ChatRepository.get_user_sessions(db=db, user_id=str(current_user.id))

    return sessions


@router.get("/{session_id}", response_model=ChatSessionResponse)
def get_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches a single chat session strictly verifying current_user ownership."""
    session = ChatRepository.get_session_by_id(db, session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if str(session.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Unauthorized access to chat session")
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a chat session strictly verifying current_user ownership."""
    session = ChatRepository.get_session_by_id(db, session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if str(session.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Unauthorized access to chat session")
    ChatRepository.delete_session(db, session_id=session_id)
    return None


@router.patch("/{session_id}/title", response_model=ChatSessionResponse)
def update_chat_session_title(
    session_id: str,
    payload: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates a chat session's title strictly verifying current_user ownership."""
    session = ChatRepository.get_session_by_id(db, session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if str(session.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Unauthorized access to chat session")
    session.title = payload.title.strip() or session.title
    db.commit()
    db.refresh(session)
    return session


@router.post("/upload", response_model=ChatSessionResponse)
async def upload_document_and_cache(
    request: Request,
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handles file upload, uploads to Gemini File API, creates a Context Cache (TTL: 1h),
    and links the cache metadata to the ChatSession (enforcing strict user ownership).
    """
    llm_client = request.app.state.llm_client

    # 1. Resolve or Create Chat Session
    if session_id:
        session = ChatRepository.get_session_by_id(db, session_id=session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        if str(session.user_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Unauthorized access to chat session")
    else:
        title = f"Document: {file.filename[:30]}"
        session = ChatRepository.create_session(db=db, user_id=str(current_user.id), title=title)

    # 2. Save Uploaded File to Temp Directory
    temp_file_path = None
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # 3. Upload File to Gemini & Create Context Cache
        file_uri = llm_client.upload_file(
            file_path=temp_file_path,
            display_name=file.filename
        )

        # 4. Append File URI to Session DB (multi-file list)
        session = ChatRepository.append_file_uri(
            db=db,
            session_id=session.id,
            file_uri=file_uri
        )

    except Exception as e:
        print(f"[Upload Error] Failed to process document cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
    
    finally:
        # Clean up temporary local file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError:
                pass

    return session


@router.post("/message/stream")
async def send_message_stream(
    request: Request,
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Streams response via SSE while strictly enforcing user session ownership."""
    start_time = time.perf_counter()

    # 1. Verify Chat Session & Ownership
    session = ChatRepository.get_session_by_id(db, session_id=payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if str(session.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Unauthorized access to chat session")

    # 2. Access pre-loaded models from app.state
    embedding_model = request.app.state.embedding_model
    llm_client = request.app.state.llm_client
    reranker = request.app.state.reranker
    file_uris: List[str] = getattr(session, "uploaded_file_uris", []) or []

    # 3. Save User Message
    ChatRepository.add_message(
        db=db,
        session_id=payload.session_id,
        sender="user",
        text=payload.query
    )

    # Auto-derive session title in DB if it was "New Consultation"
    if session.title == "New Consultation" and payload.query.strip():
        clean_query = payload.query.strip().replace("\n", " ")
        session.title = clean_query[:40] + ("..." if len(clean_query) > 40 else "")
        db.commit()

    # 4. Fetch past conversation history
    history = ChatRepository.get_recent_messages(db, session_id=payload.session_id, limit=4)

    # 5. RAG Retrieval Strategy
    retrieved_results = []
    if not file_uris or getattr(payload, "use_rag_fallback", False):
        retriever = Retriever(db=db, embedding_model=embedding_model, reranker=reranker)
        retrieved_results = retriever.retrieve(payload.query)

    # 6. Build Hybrid Prompt
    prompt = PromptBuilder.build_hybrid(
        query=payload.query,
        rag_results=retrieved_results,
        history=history,
        has_attached_doc=bool(file_uris)
    )

    def event_stream():
        full_text = []

        try:
            for chunk_text in llm_client.generate_stream_with_file(
                prompt=prompt,
                file_uris=file_uris
            ):
                full_text.append(chunk_text)
                yield f"data: {json.dumps({'text': chunk_text})}\n\n"

            complete_response = "".join(full_text)
            end_time = time.perf_counter()
            latency_seconds = round(end_time - start_time, 3)

            # Isolated DB Session write post-stream
            with SessionLocal() as stream_db:
                ChatRepository.add_message(
                    db=stream_db,
                    session_id=payload.session_id,
                    sender="assistant",
                    text=complete_response
                )

            yield f"data: {json.dumps({'latency_seconds': latency_seconds, 'done': True})}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as err:
            print(f"[Streaming Error] Failure during stream output: {err}")
            yield f"data: {json.dumps({'error': str(err)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches all past messages for a specific chat session strictly enforcing user ownership."""
    session = ChatRepository.get_session_by_id(db, session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    if str(session.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Unauthorized access to chat session")

    return ChatRepository.get_all_session_messages(db, session_id=session_id)

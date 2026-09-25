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
from app.models.chat import ChatMessageResponse,ChatSessionCreate,ChatSessionResponse,SendMessageRequest
from app.rag.generation.chat_prompt_builder import PromptBuilder
from app.rag.retrieval.retriever import Retriever
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(tags=["Legal Chat & Consultations"])


@router.post("/", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    payload: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    # user_id: str,  # In production, extract this from auth token
    db: Session = Depends(get_db)
):
    """Creates a new Chat Session (Sidebar item)."""
    session = ChatRepository.create_session(db=db, user_id=str(current_user.id), title=payload.title)
    return session


@router.get("/", response_model=List[ChatSessionResponse])
def list_user_sessions(
    # user_id: str,  # In production, extract this from auth token
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches all main chat sessions for the logged-in user."""
    # user = ChatRepository.get_user_by_id(db=db, user_id=str(current_user.id))
    # if not user:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND, 
    #         detail=f"User '{str(current_user.id)}' not found."
    #     )
        
    sessions = ChatRepository.get_user_sessions(db=db, user_id=str(current_user.id))
    return sessions


@router.post("/upload", response_model=ChatSessionResponse)
async def upload_document_and_cache(
    request: Request,
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    # user_id: str = Form(...),  # In production, extract from current_user
    db: Session = Depends(get_db)
):
    """
    Handles file upload, uploads to Gemini File API, creates a Context Cache (TTL: 1h),
    and links the cache metadata to the ChatSession.
    """
    llm_client = request.app.state.llm_client

    # 1. Resolve or Create Chat Session
    if session_id:
        session = ChatRepository.get_session_by_id(db, session_id=session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
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
    payload: SendMessageRequest,  # <-- Adding this brings back the Swagger UI JSON body box!
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Streams response via SSE while enforcing session ownership."""
    start_time = time.perf_counter()

    # Since SendMessageRequest is already validated and parsed by FastAPI via Pydantic,
    # you no longer need manual raw_bytes json loads unless you want to keep your fallback regex.
    # If you want to keep your regex safety fallback, you can inspect payload fields directly.

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
            # --- DRY RUN / MOCK MODE ---
            # Yield fake streaming text without calling Gemini API
            # mock_chunks = ["[DRY RUN] Prompt assembled successfully. ", "Gemini call bypassed."]
            # for chunk_text in mock_chunks:
            #     full_text.append(chunk_text)
            #     yield f"data: {json.dumps({'text': chunk_text})}\n\n"


            # --- REAL GEMINI STREAMING (COMMENTED OUT FOR TESTING) ---
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
    """Fetches all past messages for a specific chat session in chronological order."""
    session = ChatRepository.get_session_by_id(db, session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    if str(session.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Unauthorized access to chat session")

    # Use the dedicated repository method to pull all messages ordered ascendingly
    return ChatRepository.get_all_session_messages(db, session_id=session_id)
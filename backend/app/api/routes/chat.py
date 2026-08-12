import json
import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import SessionLocal, get_db
from app.db.repositories.chat_repository import ChatRepository
from app.models.chat import (
    ChatSessionCreate, 
    ChatSessionResponse, 
    SendMessageRequest, 
    ChatMessageResponse
)
from app.rag.generation.chat_prompt_builder import PromptBuilder
from app.rag.retrieval.retriever import Retriever

router = APIRouter(prefix="/chats", tags=["Legal Chat & Consultations"])


@router.post("/", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    payload: ChatSessionCreate, 
    user_id: str,  # In production, extract this from current_user auth token
    db: Session = Depends(get_db)
):
    """
    Creates a new Chat Session (Sidebar item).
    """
    session = ChatRepository.create_session(db=db, user_id=user_id, title=payload.title)
    return session


@router.get("/", response_model=List[ChatSessionResponse])
def list_user_sessions(
    user_id: str,  # In production, extract this from current_user auth token
    db: Session = Depends(get_db)
):
    """
    Fetches all main chat sessions for the logged-in user.
    """
    user = ChatRepository.get_user_by_id(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"User '{user_id}' not found."
        )
        
    sessions = ChatRepository.get_user_sessions(db=db, user_id=user_id)
    return sessions


@router.post("/message", response_model=ChatMessageResponse)
def send_message(
    request: Request,
    payload: SendMessageRequest,
    db: Session = Depends(get_db)
):
    """
    Handles single-turn questions AND follow-up questions within a session.
    """
    start_time = time.perf_counter()

    # 1. Access pre-loaded model instances from FastAPI app.state (loaded during lifespan)
    embedding_model = request.app.state.embedding_model
    llm_client = request.app.state.llm_client
    reranker = request.app.state.reranker

    # 2. Verify Chat Session exists
    session = ChatRepository.get_session_by_id(db, session_id=payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # 3. Fetch past conversation history (last 6 messages) for multi-turn context
    history = ChatRepository.get_recent_messages(db, session_id=payload.session_id, limit=4)

    # 4. Save User Message to Database
    user_msg = ChatRepository.add_message(
        db=db,
        session_id=payload.session_id,
        sender="user",
        text=payload.query
    )

    # 5. Perform RAG Retrieval using the pre-loaded embedding model
    retriever = Retriever(db=db, embedding_model=embedding_model,reranker=reranker)
    retrieved_results = retriever.retrieve(payload.query)

    # 6. Extract unique source filenames
    # sources = []
    # for item in retrieved_results:
    #     chunk = item[0] if isinstance(item, (tuple, list)) else item
    #     if hasattr(chunk, "filename") and chunk.filename:
    #         sources.append(chunk.filename)

    # 7. Build Prompt using chat_prompt_builder
    prompt = PromptBuilder.build(
        query=payload.query,
        results=retrieved_results,
        history=history
    )

    # 8. Generate Response from Gemini
    llm_response = llm_client.generate(prompt=prompt)

    # 9. Measure total processing latency (in seconds)
    end_time = time.perf_counter()
    latency_seconds = round(end_time - start_time, 3)

    # 10. Save Assistant Response to Database
    assistant_msg = ChatRepository.add_message(
        db=db,
        session_id=payload.session_id,
        sender="assistant",
        text=llm_response,
        # sources=list(set(sources))
    )

    # If your ChatMessageResponse Pydantic schema contains latency_seconds, set it dynamically:
    if hasattr(assistant_msg, "latency_seconds"):
        assistant_msg.latency_seconds = latency_seconds

    print(f"[Performance] Total turn latency for session {payload.session_id}: {latency_seconds}s")

    return assistant_msg

@router.post("/message/stream")
async def send_message_stream(
    request: Request,
    payload: SendMessageRequest,
    db: Session = Depends(get_db)
):
    """
    Streams the legal assistant's answer chunk-by-chunk using Server-Sent Events (SSE).
    Dramatically reduces Time-To-First-Token (TTFT) latency to ~1 second.
    """
    start_time = time.perf_counter()

    # 1. Access pre-loaded models from app.state
    embedding_model = request.app.state.embedding_model
    llm_client = request.app.state.llm_client
    reranker = request.app.state.reranker

    # 2. Verify Chat Session exists
    session = ChatRepository.get_session_by_id(db, session_id=payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # 3. Fetch truncated past history (limit to last 4 messages to save context budget)
    history = ChatRepository.get_recent_messages(db, session_id=payload.session_id, limit=4)

    # 4. Save User Message to Database before starting the stream
    ChatRepository.add_message(
        db=db,
        session_id=payload.session_id,
        sender="user",
        text=payload.query
    )

    # 5. Perform RAG Retrieval
    retriever = Retriever(db=db, embedding_model=embedding_model, reranker=reranker)
    retrieved_results = retriever.retrieve(payload.query)

    # 6. Extract unique source filenames
    # sources = []
    # for item in retrieved_results:
    #     chunk = item[0] if isinstance(item, (tuple, list)) else item
    #     if hasattr(chunk, "filename") and chunk.filename:
    #         sources.append(chunk.filename)
    # unique_sources = list(set(sources))

    # 7. Build Prompt
    prompt = PromptBuilder.build(
        query=payload.query,
        results=retrieved_results,
        history=history
    )

    def event_stream():
        full_text = []

        # Stream text tokens directly from the Gemini client
        for chunk_text in llm_client.generate_stream(prompt=prompt):
            full_text.append(chunk_text)
            # Send live text chunks via SSE format
            yield f"data: {json.dumps({'text': chunk_text})}\n\n"

        # Complete text assembly & latency measurement
        complete_response = "".join(full_text)
        end_time = time.perf_counter()
        latency_seconds = round(end_time - start_time, 3)

        # 8. Save Assistant Response and metadata to Database after stream finishes
        # Create isolated DB session for post-stream write
        stream_db = SessionLocal()
        try:
            ChatRepository.add_message(
                db=stream_db,
                session_id=payload.session_id,
                sender="assistant",
                text=complete_response,
                # sources=unique_sources
            )
        finally:
            stream_db.close()

        print(f"[Performance Streaming] Full stream completed for session {payload.session_id} in {latency_seconds}s")

        # Send final completion event with sources and latency payload
        yield f"data: {json.dumps({
            # 'sources': unique_sources, 
            'latency_seconds': latency_seconds, 'done': True})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
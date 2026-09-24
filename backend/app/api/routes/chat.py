# import json
# import time
# from typing import List
# from fastapi import APIRouter, Depends, HTTPException, Request, status
# from fastapi.responses import StreamingResponse
# from sqlalchemy.orm import Session

# from app.db.database import SessionLocal, get_db
# from app.db.repositories.chat_repository import ChatRepository
# from app.models.chat import (
#     ChatSessionCreate, 
#     ChatSessionResponse, 
#     SendMessageRequest, 
#     ChatMessageResponse
# )
# from app.rag.generation.chat_prompt_builder import PromptBuilder
# from app.rag.retrieval.retriever import Retriever

# #router = APIRouter(prefix="/chats", tags=["Legal Chat & Consultations"])
# router = APIRouter(tags=["Legal Chat & Consultations"])


# @router.post("/", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
# def create_chat_session(
#     payload: ChatSessionCreate, 
#     user_id: str,  # In production, extract this from current_user auth token
#     db: Session = Depends(get_db)
# ):
#     """
#     Creates a new Chat Session (Sidebar item).
#     """
#     session = ChatRepository.create_session(db=db, user_id=user_id, title=payload.title)
#     return session


# @router.get("/", response_model=List[ChatSessionResponse])
# def list_user_sessions(
#     user_id: str,  # In production, extract this from current_user auth token
#     db: Session = Depends(get_db)
# ):
#     """
#     Fetches all main chat sessions for the logged-in user.
#     """
#     user = ChatRepository.get_user_by_id(db=db, user_id=user_id)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND, 
#             detail=f"User '{user_id}' not found."
#         )
        
#     sessions = ChatRepository.get_user_sessions(db=db, user_id=user_id)
#     return sessions


# @router.post("/message", response_model=ChatMessageResponse)
# def send_message(
#     request: Request,
#     payload: SendMessageRequest,
#     db: Session = Depends(get_db)
# ):
#     """
#     Handles single-turn questions AND follow-up questions within a session.
#     """
#     start_time = time.perf_counter()

#     # 1. Access pre-loaded model instances from FastAPI app.state (loaded during lifespan)
#     embedding_model = request.app.state.embedding_model
#     llm_client = request.app.state.llm_client
#     reranker = request.app.state.reranker

#     # 2. Verify Chat Session exists
#     session = ChatRepository.get_session_by_id(db, session_id=payload.session_id)
#     if not session:
#         raise HTTPException(status_code=404, detail="Chat session not found")

#     # 3. Fetch past conversation history (last 6 messages) for multi-turn context
#     history = ChatRepository.get_recent_messages(db, session_id=payload.session_id, limit=4)

#     # 4. Save User Message to Database
#     user_msg = ChatRepository.add_message(
#         db=db,
#         session_id=payload.session_id,
#         sender="user",
#         text=payload.query
#     )

#     # 5. Perform RAG Retrieval using the pre-loaded embedding model
#     retriever = Retriever(db=db, embedding_model=embedding_model,reranker=reranker)
#     retrieved_results = retriever.retrieve(payload.query)

#     # 6. Extract unique source filenames
#     # sources = []
#     # for item in retrieved_results:
#     #     chunk = item[0] if isinstance(item, (tuple, list)) else item
#     #     if hasattr(chunk, "filename") and chunk.filename:
#     #         sources.append(chunk.filename)

#     # 7. Build Prompt using chat_prompt_builder
#     prompt = PromptBuilder.build(
#         query=payload.query,
#         results=retrieved_results,
#         history=history
#     )

#     # 8. Generate Response from Gemini
#     llm_response = llm_client.generate(prompt=prompt)

#     # 9. Measure total processing latency (in seconds)
#     end_time = time.perf_counter()
#     latency_seconds = round(end_time - start_time, 3)

#     # 10. Save Assistant Response to Database
#     assistant_msg = ChatRepository.add_message(
#         db=db,
#         session_id=payload.session_id,
#         sender="assistant",
#         text=llm_response,
#         # sources=list(set(sources))
#     )

#     # If your ChatMessageResponse Pydantic schema contains latency_seconds, set it dynamically:
#     if hasattr(assistant_msg, "latency_seconds"):
#         assistant_msg.latency_seconds = latency_seconds

#     print(f"[Performance] Total turn latency for session {payload.session_id}: {latency_seconds}s")

#     return assistant_msg

# @router.post("/message/stream")
# async def send_message_stream(
#     request: Request,
#     payload: SendMessageRequest,
#     db: Session = Depends(get_db)
# ):
#     """
#     Streams the legal assistant's answer chunk-by-chunk using Server-Sent Events (SSE).
#     Dramatically reduces Time-To-First-Token (TTFT) latency to ~1 second.
#     """
#     start_time = time.perf_counter()

#     # 1. Access pre-loaded models from app.state
#     embedding_model = request.app.state.embedding_model
#     llm_client = request.app.state.llm_client
#     reranker = request.app.state.reranker

#     # 2. Verify Chat Session exists
#     session = ChatRepository.get_session_by_id(db, session_id=payload.session_id)
#     if not session:
#         raise HTTPException(status_code=404, detail="Chat session not found")

#     # 3. Fetch truncated past history (limit to last 4 messages to save context budget)
#     history = ChatRepository.get_recent_messages(db, session_id=payload.session_id, limit=4)

#     # 4. Save User Message to Database before starting the stream
#     ChatRepository.add_message(
#         db=db,
#         session_id=payload.session_id,
#         sender="user",
#         text=payload.query
#     )

#     # 5. Perform RAG Retrieval
#     retriever = Retriever(db=db, embedding_model=embedding_model, reranker=reranker)
#     retrieved_results = retriever.retrieve(payload.query)

#     # 6. Extract unique source filenames
#     # sources = []
#     # for item in retrieved_results:
#     #     chunk = item[0] if isinstance(item, (tuple, list)) else item
#     #     if hasattr(chunk, "filename") and chunk.filename:
#     #         sources.append(chunk.filename)
#     # unique_sources = list(set(sources))

#     # 7. Build Prompt
#     prompt = PromptBuilder.build(
#         query=payload.query,
#         results=retrieved_results,
#         history=history
#     )

#     def event_stream():
#         full_text = []

#         # Stream text tokens directly from the Gemini client
#         for chunk_text in llm_client.generate_stream(prompt=prompt):
#             full_text.append(chunk_text)
#             # Send live text chunks via SSE format
#             yield f"data: {json.dumps({'text': chunk_text})}\n\n"

#         # Complete text assembly & latency measurement
#         complete_response = "".join(full_text)
#         end_time = time.perf_counter()
#         latency_seconds = round(end_time - start_time, 3)

#         # 8. Save Assistant Response and metadata to Database after stream finishes
#         # Create isolated DB session for post-stream write
#         stream_db = SessionLocal()
#         try:
#             ChatRepository.add_message(
#                 db=stream_db,
#                 session_id=payload.session_id,
#                 sender="assistant",
#                 text=complete_response,
#                 # sources=unique_sources
#             )
#         finally:
#             stream_db.close()

#         print(f"[Performance Streaming] Full stream completed for session {payload.session_id} in {latency_seconds}s")

#         # Send final completion event with sources and latency payload
#         yield f"data: {json.dumps({
#             # 'sources': unique_sources, 
#             'latency_seconds': latency_seconds, 'done': True})}\n\n"
#         yield "data: [DONE]\n\n"

#     return StreamingResponse(event_stream(), media_type="text/event-stream")

# import json
# import time
# from typing import List
# from fastapi import APIRouter, Depends, HTTPException, Request, status
# from fastapi.responses import StreamingResponse
# from sqlalchemy.orm import Session

# from app.db.database import SessionLocal, get_db
# from app.db.repositories.chat_repository import ChatRepository
# from app.models.chat import (
#     ChatSessionCreate, 
#     ChatSessionResponse, 
#     SendMessageRequest, 
#     ChatMessageResponse
# )
# from app.rag.generation.chat_prompt_builder import PromptBuilder
# from app.rag.retrieval.retriever import Retriever

# #router = APIRouter(prefix="/chats", tags=["Legal Chat & Consultations"])
# router = APIRouter(tags=["Legal Chat & Consultations"])


# @router.post("/", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
# def create_chat_session(
#     payload: ChatSessionCreate, 
#     user_id: str,  # In production, extract this from current_user auth token
#     db: Session = Depends(get_db)
# ):
#     """
#     Creates a new Chat Session (Sidebar item).
#     """
#     session = ChatRepository.create_session(db=db, user_id=user_id, title=payload.title)
#     return session


# @router.get("/", response_model=List[ChatSessionResponse])
# def list_user_sessions(
#     user_id: str,  # In production, extract this from current_user auth token
#     db: Session = Depends(get_db)
# ):
#     """
#     Fetches all main chat sessions for the logged-in user.
#     """
#     user = ChatRepository.get_user_by_id(db=db, user_id=user_id)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND, 
#             detail=f"User '{user_id}' not found."
#         )
        
#     sessions = ChatRepository.get_user_sessions(db=db, user_id=user_id)
#     return sessions


# @router.post("/message", response_model=ChatMessageResponse)
# def send_message(
#     request: Request,
#     payload: SendMessageRequest,
#     db: Session = Depends(get_db)
# ):
#     """
#     Handles single-turn questions AND follow-up questions within a session.
#     """
#     start_time = time.perf_counter()

#     # 1. Access pre-loaded model instances from FastAPI app.state (loaded during lifespan)
#     embedding_model = request.app.state.embedding_model
#     llm_client = request.app.state.llm_client
#     reranker = request.app.state.reranker

#     # 2. Verify Chat Session exists
#     session = ChatRepository.get_session_by_id(db, session_id=payload.session_id)
#     if not session:
#         raise HTTPException(status_code=404, detail="Chat session not found")

#     # 3. Fetch past conversation history (last 6 messages) for multi-turn context
#     history = ChatRepository.get_recent_messages(db, session_id=payload.session_id, limit=4)

#     # 4. Save User Message to Database
#     user_msg = ChatRepository.add_message(
#         db=db,
#         session_id=payload.session_id,
#         sender="user",
#         text=payload.query
#     )

#     # 5. Perform RAG Retrieval using the pre-loaded embedding model
#     retriever = Retriever(db=db, embedding_model=embedding_model,reranker=reranker)
#     retrieved_results = retriever.retrieve(payload.query)

#     # 6. Extract unique source filenames
#     # sources = []
#     # for item in retrieved_results:
#     #     chunk = item[0] if isinstance(item, (tuple, list)) else item
#     #     if hasattr(chunk, "filename") and chunk.filename:
#     #         sources.append(chunk.filename)

#     # 7. Build Prompt using chat_prompt_builder
#     prompt = PromptBuilder.build(
#         query=payload.query,
#         results=retrieved_results,
#         history=history
#     )

#     # 8. Generate Response from Gemini
#     llm_response = llm_client.generate(prompt=prompt)

#     # 9. Measure total processing latency (in seconds)
#     end_time = time.perf_counter()
#     latency_seconds = round(end_time - start_time, 3)

#     # 10. Save Assistant Response to Database
#     assistant_msg = ChatRepository.add_message(
#         db=db,
#         session_id=payload.session_id,
#         sender="assistant",
#         text=llm_response,
#         # sources=list(set(sources))
#     )

#     # If your ChatMessageResponse Pydantic schema contains latency_seconds, set it dynamically:
#     if hasattr(assistant_msg, "latency_seconds"):
#         assistant_msg.latency_seconds = latency_seconds

#     print(f"[Performance] Total turn latency for session {payload.session_id}: {latency_seconds}s")

#     return assistant_msg

# @router.post("/message/stream")
# async def send_message_stream(
#     request: Request,
#     payload: SendMessageRequest,
#     db: Session = Depends(get_db)
# ):
#     """
#     Streams the legal assistant's answer chunk-by-chunk using Server-Sent Events (SSE).
#     Dramatically reduces Time-To-First-Token (TTFT) latency to ~1 second.
#     """
#     start_time = time.perf_counter()

#     # 1. Access pre-loaded models from app.state
#     embedding_model = request.app.state.embedding_model
#     llm_client = request.app.state.llm_client
#     reranker = request.app.state.reranker

#     # 2. Verify Chat Session exists
#     session = ChatRepository.get_session_by_id(db, session_id=payload.session_id)
#     if not session:
#         raise HTTPException(status_code=404, detail="Chat session not found")

#     # 3. Fetch truncated past history (limit to last 4 messages to save context budget)
#     history = ChatRepository.get_recent_messages(db, session_id=payload.session_id, limit=4)

#     # 4. Save User Message to Database before starting the stream
#     ChatRepository.add_message(
#         db=db,
#         session_id=payload.session_id,
#         sender="user",
#         text=payload.query
#     )

#     # 5. Perform RAG Retrieval
#     retriever = Retriever(db=db, embedding_model=embedding_model, reranker=reranker)
#     retrieved_results = retriever.retrieve(payload.query)

#     # 6. Extract unique source filenames
#     # sources = []
#     # for item in retrieved_results:
#     #     chunk = item[0] if isinstance(item, (tuple, list)) else item
#     #     if hasattr(chunk, "filename") and chunk.filename:
#     #         sources.append(chunk.filename)
#     # unique_sources = list(set(sources))

#     # 7. Build Prompt
#     prompt = PromptBuilder.build(
#         query=payload.query,
#         results=retrieved_results,
#         history=history
#     )

#     def event_stream():
#         full_text = []

#         # Stream text tokens directly from the Gemini client
#         for chunk_text in llm_client.generate_stream(prompt=prompt):
#             full_text.append(chunk_text)
#             # Send live text chunks via SSE format
#             yield f"data: {json.dumps({'text': chunk_text})}\n\n"

#         # Complete text assembly & latency measurement
#         complete_response = "".join(full_text)
#         end_time = time.perf_counter()
#         latency_seconds = round(end_time - start_time, 3)

#         # 8. Save Assistant Response and metadata to Database after stream finishes
#         # Create isolated DB session for post-stream write
#         stream_db = SessionLocal()
#         try:
#             ChatRepository.add_message(
#                 db=stream_db,
#                 session_id=payload.session_id,
#                 sender="assistant",
#                 text=complete_response,
#                 # sources=unique_sources
#             )
#         finally:
#             stream_db.close()

#         print(f"[Performance Streaming] Full stream completed for session {payload.session_id} in {latency_seconds}s")

#         # Send final completion event with sources and latency payload
#         yield f"data: {json.dumps({
#             # 'sources': unique_sources, 
#             'latency_seconds': latency_seconds, 'done': True})}\n\n"
#         yield "data: [DONE]\n\n"

#     return StreamingResponse(event_stream(), media_type="text/event-stream")

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
from app.models.chat import (
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    SendMessageRequest,
)
from app.rag.generation.chat_prompt_builder import PromptBuilder
from app.rag.retrieval.retriever import Retriever

router = APIRouter(tags=["Legal Chat & Consultations"])


@router.post("/", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    payload: ChatSessionCreate,
    user_id: str,  # In production, extract this from auth token
    db: Session = Depends(get_db)
):
    """Creates a new Chat Session (Sidebar item)."""
    session = ChatRepository.create_session(db=db, user_id=user_id, title=payload.title)
    return session


@router.get("/", response_model=List[ChatSessionResponse])
def list_user_sessions(
    user_id: str,  # In production, extract this from auth token
    db: Session = Depends(get_db)
):
    """Fetches all main chat sessions for the logged-in user."""
    user = ChatRepository.get_user_by_id(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"User '{user_id}' not found."
        )
        
    sessions = ChatRepository.get_user_sessions(db=db, user_id=user_id)
    return sessions


@router.post("/upload", response_model=ChatSessionResponse)
async def upload_document_and_cache(
    request: Request,
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    user_id: str = Form(...),  # In production, extract from current_user
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
        session = ChatRepository.create_session(db=db, user_id=user_id, title=title)

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

        # 5. Save Cache Metadata to Session DB
        # ChatRepository.update_session_cache(
        #     db=db,
        #     session_id=session.id,
        #     file_uri=file_uri,
        #     cache_name=None,
        #     expires_at=None
        # )

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
    db: Session = Depends(get_db)
):
    """
    Streams response via SSE using Gemini Context Caching.
    Handles Option A (Document Only) and Option B (Hybrid Doc + RAG statutory search).
    """
    start_time = time.perf_counter()

    # 1. Safely read raw stream bytes
    raw_bytes = await request.body()
    raw_str = raw_bytes.decode("utf-8", errors="ignore")

    # 2. Decode JSON (with fallback regex cleanup for raw unescaped newlines/tabs)
    try:
        data = json.loads(raw_str)
    except json.JSONDecodeError:
        # Escape unescaped control characters inside JSON strings
        sanitized_str = re.sub(r'(?<!\\)[\r\n]', r'\\n', raw_str)
        try:
            data = json.loads(sanitized_str)
        except Exception as err:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid JSON payload syntax: {str(err)}"
            )

    # 3. Validate parsed dictionary with Pydantic
    try:
        payload = SendMessageRequest(**data)
    except Exception as err:
        raise HTTPException(
            status_code=422,
            detail=f"Validation error: {str(err)}"
        )

    # 1. Access pre-loaded models from app.state
    embedding_model = request.app.state.embedding_model
    llm_client = request.app.state.llm_client
    reranker = request.app.state.reranker

    # 2. Verify Chat Session
    session = ChatRepository.get_session_by_id(db, session_id=payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    file_uris: List[str] = getattr(session, "uploaded_file_uris", []) or []

    # file_uri = getattr(session, "uploaded_file_uri", None) or getattr(session, "gemini_file_uri", None) or getattr(session, "file_uri", None)

    # 3. Check Context Cache Validity
    # cached_content_name = None
    # now = datetime.now(timezone.utc)
    # now_naive = datetime.now(timezone.utc).replace(tzinfo=None)

    # if session.gemini_cache_name and session.cache_expires_at:
    #     # Ensure cache expiration timestamp is timezone-aware for comparison
    #     cache_exp = session.cache_expires_at
    #     if cache_exp.tzinfo is not None:
    #         cache_exp = cache_exp.astimezone(timezone.utc).replace(tzinfo=None)
            
    #     if cache_exp > now_naive:
    #         cached_content_name = session.gemini_cache_name

    # has_doc_cache = bool(cached_content_name)

    # 4. Save User Message
    ChatRepository.add_message(
        db=db,
        session_id=payload.session_id,
        sender="user",
        text=payload.query
    )

    # 5. Fetch past conversation history
    history = ChatRepository.get_recent_messages(db, session_id=payload.session_id, limit=4)

    # 6. RAG Retrieval Strategy (Option A vs Option B)
    retrieved_results = []
    
    # Retrieve statutory laws via RAG if cached context alone isn't enough or on follow-ups
    # (i.e. Option B, or when no document cache exists at all)
    # if not has_doc_cache or getattr(payload, "use_rag_fallback", False):  # `use_rag_fallback` optional flag in schema
    #     retriever = Retriever(db=db, embedding_model=embedding_model, reranker=reranker)
    #     retrieved_results = retriever.retrieve(payload.query)

    if not file_uris or getattr(payload, "use_rag_fallback", False):
        retriever = Retriever(db=db, embedding_model=embedding_model, reranker=reranker)
        retrieved_results = retriever.retrieve(payload.query)

    # 7. Build Hybrid Prompt
    prompt = PromptBuilder.build_hybrid(
        query=payload.query,
        rag_results=retrieved_results,
        history=history,
        has_attached_doc=bool(file_uris)
    )

    # ================= [DEBUG TERMINAL PRINTS] =================
    print("\n" + "=" * 60)
    print(" [DEBUG] SESSION ID:", payload.session_id)
    print(" [DEBUG] ATTACHED FILE URI:", file_uris)
    print(" [DEBUG] RETRIEVED RAG CHUNKS COUNT:", len(retrieved_results))
    if retrieved_results:
        print(" [DEBUG] RAG CONTENT PREVIEW:")
        for idx, item in enumerate(retrieved_results, 1):
            chunk = item[0] if isinstance(item, (tuple, list)) else item
            print(f"   --- Chunk {idx} ({getattr(chunk, 'filename', 'No File')}) ---")
            print(f"   {chunk.text[:300]}...\n")
            
    print(" [DEBUG] ASSEMBLED PROMPT SENT TO GEMINI:")
    print("-" * 60)
    print(prompt)
    print("=" * 60 + "\n")
    # ===========================================================

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
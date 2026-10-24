import os
import re
import tempfile
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session

from app.core.security import SECRET_KEY, ALGORITHM
from app.db.database import get_db
from app.db.repositories.chat_repository import ChatRepository
from app.models.affidavit import AffidavitRequest
from app.models.contract_audit import ContractAuditReport, ContractAuditRequest
from app.models.user import User
from app.services.affidavit_generator import (
    generate_affidavit_docx,
    generate_name_change_affidavit_docx,
    generate_address_change_affidavit_docx,
    generate_dob_correction_affidavit_docx,
    generate_relation_update_affidavit_docx,
    generate_one_and_same_affidavit_docx,
)
from app.services.risk_analyzer import ContractRiskAnalyzer

router = APIRouter(prefix="/documents", tags=["Document Generation & Analysis"])

optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_optional_current_user(
    token: Optional[str] = Depends(optional_oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Resolves authenticated user if valid token is provided; otherwise returns None."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None


@router.post(
    "/generate-affidavit",
    summary="Generate Legal Affidavit (.docx)",
    description="Generates a standardized legal affidavit (Name Change, Address Change, DOB Correction, Relation Update, One and the Same Person) Word document based on user inputs.",
    responses={
        200: {
            "content": {
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {}
            },
            "description": "Returns the generated .docx file as a downloadable stream.",
        }
    },
)
def generate_affidavit(payload: AffidavitRequest):
    try:
        # Route to corresponding python-docx template builder based on document_type
        doc_type = (payload.document_type or "name_change").strip().lower()
        if "dob" in doc_type or "birth" in doc_type:
            docx_stream = generate_dob_correction_affidavit_docx(payload)
            type_prefix = "DOB_Correction"
        elif "address" in doc_type or "residence" in doc_type:
            docx_stream = generate_address_change_affidavit_docx(payload)
            type_prefix = "Address_Change"
        elif "relation" in doc_type or "parent" in doc_type or "spouse" in doc_type:
            docx_stream = generate_relation_update_affidavit_docx(payload)
            type_prefix = "Relation_Update"
        elif "same" in doc_type or "one_and" in doc_type:
            docx_stream = generate_one_and_same_affidavit_docx(payload)
            type_prefix = "One_And_Same_Person"
        else:
            docx_stream = generate_name_change_affidavit_docx(payload)
            type_prefix = "Name_Change"

        # Generate a clean, filesystem-safe filename
        target_name = (payload.new_value or payload.new_name or payload.full_name or "Standard").strip()
        clean_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", target_name).strip("_")
        safe_name = clean_name if clean_name else "Standard"

        filename = f"Affidavit_{type_prefix}_{safe_name}.docx"

        return StreamingResponse(
            docx_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate affidavit: {str(e)}",
        )


@router.post(
    "/analyze-contract",
    response_model=ContractAuditReport,
    summary="Analyze Contract Legal Risks & Red-Flags",
    description="Performs an automated legal risk audit on an uploaded session document or provided contract text.",
)
def analyze_contract(
    payload: ContractAuditRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    analyzer = ContractRiskAnalyzer()

    file_uris = None
    contract_text = payload.contract_text

    if payload.session_id:
        session = ChatRepository.get_session_by_id(db, session_id=payload.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        if current_user and str(session.user_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Unauthorized access to chat session")

        session_files = getattr(session, "uploaded_file_uris", []) or []
        if session_files:
            file_uris = session_files

    if not file_uris and not contract_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No document or contract text available to analyze. Please upload a contract or provide text.",
        )

    try:
        report = analyzer.analyze(contract_text=contract_text, file_uris=file_uris)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Contract risk analysis failed: {str(e)}",
        )


@router.post(
    "/analyze-contract-file",
    response_model=ContractAuditReport,
    summary="Upload & Analyze Contract Document",
    description="Directly uploads a PDF or Word contract document and returns a structured legal risk assessment.",
)
async def analyze_contract_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    llm_client = request.app.state.llm_client
    temp_file_path = None
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        file_uri = llm_client.upload_file(
            file_path=temp_file_path,
            display_name=file.filename,
        )

        analyzer = ContractRiskAnalyzer()
        report = analyzer.analyze(file_uris=[file_uri])
        return report

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze contract file: {str(e)}",
        )
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError:
                pass

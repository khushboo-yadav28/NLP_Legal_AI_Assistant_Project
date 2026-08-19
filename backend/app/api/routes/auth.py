from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import UserCreate, UserLogin, UserResponse
from app.db.repositories.auth_repository import AuthRepository

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing_user = AuthRepository.get_user_by_email(db, email=payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    
    new_user = AuthRepository.create_user(
        db=db, 
        email=payload.email, 
        password=payload.password, 
        full_name=payload.full_name
    )
    return new_user

@router.post("/login", response_model=UserResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    # 1. Fetch user by email from database
    user = AuthRepository.get_user_by_email(db, email=payload.email)
    
    # 2. Check if user exists AND verify that the password matches the hash
    if not user or not AuthRepository.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    # 3. Return user info only if validation succeeds
    return user
    # 4. Return user info if successful
    return user
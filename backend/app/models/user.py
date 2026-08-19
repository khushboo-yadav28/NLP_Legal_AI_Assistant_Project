from pydantic import BaseModel, EmailStr, ConfigDict
from sqlalchemy import Column, String, DateTime
from datetime import datetime
from app.db.database import Base

# ==================== SQLALCHEMY ORM MODEL ====================

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}  # <-- Add this line

    id = Column(String(36), primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# ==================== PYDANTIC SCHEMAS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
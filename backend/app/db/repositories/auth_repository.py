from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.models.user import User
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthRepository:
    @staticmethod
    def get_user_by_email(db: Session, email: str):
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def create_user(db: Session, email: str, password: str, full_name: str):
        # Hash the password securely before saving
        hashed_password = pwd_context.hash(password)
        
        new_user = User(
            id=str(uuid.uuid4()),
            email=email,
            full_name=full_name,
            hashed_password=hashed_password
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        # Securely verify plain password against the stored bcrypt hash
        return pwd_context.verify(plain_password, hashed_password)
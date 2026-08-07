import sys
import os

# Add parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal, Base, engine
from sqlalchemy import text
from app.core.security import hash_password
from datetime import datetime, timezone

# Example User Model if you have a users table:
"""
If you have a dedicated User ORM model, import it:
from app.db.models.user import User
"""

def seed_database():
    db = SessionLocal()

    try:
        # Check if user_123 already exists
        existing_user = db.execute(
            text("SELECT id FROM users WHERE id = :uid"), 
            {"uid": "user_123"}
        ).fetchone()

        if not existing_user:
            print("Seeding test user...")
            
            # Hash plain password before saving
            raw_password = "SecurePassword123!"
            hashed_pw = hash_password(raw_password)

            db.execute(
                text("""
                    INSERT INTO users (id, email, full_name, hashed_password, created_at) 
                    VALUES (:uid, :email, :name, :hashed_pw, :created_at)
                """),
                {
                    "uid": "user_123",
                    "email": "user123@example.com",
                    "name": "John",
                    "hashed_pw": hashed_pw,
                    "created_at": datetime.now(timezone.utc)
                }
            )
            db.commit()
            print("User 'user_123' inserted successfully with hashed password!")
        else:
            print("User 'user_123' already exists in the database.")

        print("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
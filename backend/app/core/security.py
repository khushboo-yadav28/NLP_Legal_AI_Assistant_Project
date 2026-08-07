from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

# Initialize PasswordHash context with bcrypt
password_hash = PasswordHash((BcryptHasher(),))


def hash_password(password: str) -> str:
    """
    Hashes a plain text password using bcrypt.
    """
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against a stored hash.
    """
    return password_hash.verify(plain_password, hashed_password)
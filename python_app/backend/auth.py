"""Password/security-answer hashing (bcrypt) and JWT authentication dependencies."""
from datetime import datetime, timedelta
import re
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from backend.config import get_settings
from backend.database import get_db
from backend.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)
_EPHEMERAL_FALLBACK_SECRET = secrets.token_hex(32)

ALLOWED_SECURITY_QUESTION_KEYS = (
    "birth_city",
    "first_school",
    "childhood_nickname",
    "mother_name",
    "favorite_teacher",
    "favorite_pet_or_book",
)


def _signing_secret() -> str:
    settings = get_settings()
    if settings.jwt_secret_key and settings.jwt_secret_key != "REPLACE_WITH_RANDOM_64_CHAR_HEX_SECRET":
        return settings.jwt_secret_key
    return _EPHEMERAL_FALLBACK_SECRET


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def normalize_security_answer(answer: str) -> str:
    return re.sub(r"\s+", " ", answer.strip().lower())


def create_access_token(user_id: str, email: str) -> str:
    settings = get_settings()
    now = datetime.utcnow()
    expire = now + timedelta(hours=settings.jwt_expire_hours)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": expire,
    }
    return jwt.encode(payload, _signing_secret(), algorithm=settings.jwt_algorithm)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    try:
        payload = jwt.decode(
            credentials.credentials,
            _signing_secret(),
            algorithms=[get_settings().jwt_algorithm],
        )
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Missing subject")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    if user.password_changed_at is not None:
        issued_at = payload.get("iat")
        if issued_at is None or int(issued_at) < int(user.password_changed_at.timestamp()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session invalidated after password change. Please sign in again.",
            )

    return user

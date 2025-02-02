"""Security utilities for authentication and authorization."""
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from src.core.config import get_app_settings
from src.core.exceptions import AuthenticationError

settings = get_app_settings()

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = "your-secret-key-here"  # TODO: Move to environment variables
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


class Token(BaseModel):
    """Token schema."""
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None


class TokenData(BaseModel):
    """Token payload schema."""
    sub: str  # user id
    exp: datetime
    type: str  # "access" or "refresh"
    jti: str  # unique token identifier


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


def create_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
    scopes: Optional[list[str]] = None,
) -> str:
    """Create access token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "access"
    }
    
    if scopes:
        to_encode["scopes"] = scopes
        
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(
    subject: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create refresh token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh"
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_token(
    token: str,
    verify_exp: bool = True,
    token_type: Optional[str] = None
) -> Dict[str, Any]:
    """Decode and verify JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": verify_exp}
        )
        
        if token_type and payload.get("type") != token_type:
            raise AuthenticationError(f"Invalid token type. Expected {token_type}")
            
        return payload
    except JWTError as e:
        raise AuthenticationError(f"Could not validate token: {str(e)}")


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and verify access token."""
    return decode_token(token, token_type="access")


def decode_refresh_token(token: str) -> Dict[str, Any]:
    """Decode and verify refresh token."""
    return decode_token(token, token_type="refresh")


def verify_token(token: str, token_type: str = "access") -> Optional[TokenData]:
    """Verify a JWT token and return its payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenData(**payload)
        
        if token_data.type != token_type:
            return None
            
        if datetime.fromtimestamp(token_data.exp) < datetime.utcnow():
            return None
            
        return token_data
    except JWTError:
        return None
    except ValueError:
        return None 
"""Security utilities for authentication and authorization."""
from datetime import datetime, timedelta
from typing import Any, Optional, Union

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

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


def create_token(subject: Union[str, Any], expires_delta: timedelta, token_type: str = "access") -> str:
    """Create a new JWT token."""
    expire = datetime.utcnow() + expires_delta
    
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "type": token_type,
        "jti": f"{subject}_{datetime.utcnow().timestamp()}"  # unique token id
    }
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_access_token(subject: Union[str, Any]) -> str:
    """Create a new access token."""
    return create_token(
        subject=subject,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type="access"
    )


def create_refresh_token(subject: Union[str, Any]) -> str:
    """Create a new refresh token."""
    return create_token(
        subject=subject,
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        token_type="refresh"
    )


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
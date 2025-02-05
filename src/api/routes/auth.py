"""Authentication routes."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from src.api.dependencies.database import get_db
from src.core.security import (
    Token,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)
from src.schemas.user import User, UserCreate
from src.services.user import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[get_db, Depends()],
) -> Token:
    """Login user."""
    user_service = UserService(db)
    user = await user_service.authenticate(
        email=form_data.username,
        password=form_data.password,
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    
    return Token(
        access_token=create_access_token({"sub": str(user.id)}),
        token_type="bearer",
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: Annotated[get_db, Depends()],
) -> Token:
    """Refresh access token."""
    try:
        payload = verify_refresh_token(refresh_token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    
    return Token(
        access_token=create_access_token({"sub": str(user.id)}),
        token_type="bearer",
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: Annotated[get_db, Depends()],
) -> User:
    """Register new user."""
    user_service = UserService(db)
    
    # Check if user with this email already exists
    if await user_service.get_by_email(user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new user
    user = await user_service.create(user_in)
    return user 
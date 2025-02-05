"""User endpoints."""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_active_user, get_current_superuser, get_db
from src.models.user import User
from src.schemas.user import User as UserSchema, UserCreate, UserUpdate, UserResponse
from src.services.users import UserService

router = APIRouter()

@router.post("", response_model=UserSchema)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Create new user."""
    user_service = UserService(db)
    user = await user_service.get_user_by_email(user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    return await user_service.create_user(user_in)

@router.get("/me", response_model=UserSchema)
async def read_user_me(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get current user."""
    return current_user

@router.put("/me", response_model=UserSchema)
async def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Update current user."""
    user_service = UserService(db)
    return await user_service.update_user(current_user, user_in)

@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_superuser),
    session: AsyncSession = Depends(get_db)
) -> List[User]:
    """Get all users (superuser only)."""
    user_service = UserService(session)
    return await user_service.get_all(skip=skip, limit=limit)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_superuser),
    session: AsyncSession = Depends(get_db)
) -> User:
    """Get user by ID (superuser only)."""
    user_service = UserService(session)
    user = await user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_superuser),
    session: AsyncSession = Depends(get_db)
) -> None:
    """Delete user (superuser only)."""
    user_service = UserService(session)
    user = await user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    await user_service.delete(user)

@router.post("/me/email-settings", response_model=UserResponse)
async def update_email_settings(
    signature: str = None,
    vacation_responder_enabled: bool = None,
    vacation_responder_message: str = None,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db)
) -> User:
    """Update user's email settings."""
    user_service = UserService(session)
    return await user_service.update_email_settings(
        current_user,
        signature=signature,
        vacation_responder_enabled=vacation_responder_enabled,
        vacation_responder_message=vacation_responder_message
    ) 
"""User endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, get_current_superuser, get_db
from src.models.user import User
from src.schemas.user import UserUpdate, UserResponse
from src.services.users import UserService

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user information."""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> User:
    """Update current user information."""
    user_service = UserService(session)
    return await user_service.update(current_user, user_data)

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
    current_user: User = Depends(get_current_user),
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
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from src.api.dependencies.auth import get_current_user
from src.models.user import User, UserCreate, UserUpdate
from src.services.users import UserService
from src.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(user_in: UserCreate) -> User:
    """Create new user."""
    try:
        user = await UserService.create_user(user_in)
        return user
    except Exception as e:
        logger.error(f"User creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User creation failed",
        )


@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current user information."""
    return current_user


@router.put("/me", response_model=User)
async def update_current_user(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
) -> User:
    """Update current user information."""
    try:
        user = await UserService.update_user(current_user.id, user_in)
        return user
    except Exception as e:
        logger.error(f"User update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User update failed",
        )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete current user."""
    try:
        await UserService.delete_user(current_user.id)
    except Exception as e:
        logger.error(f"User deletion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User deletion failed",
        )


@router.get("", response_model=List[User])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> List[User]:
    """List all users (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    try:
        users = await UserService.get_users(skip=skip, limit=limit)
        return users
    except Exception as e:
        logger.error(f"User listing failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User listing failed",
        )


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
) -> User:
    """Get user by ID (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    try:
        user = await UserService.get_user(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user
    except Exception as e:
        logger.error(f"User retrieval failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User retrieval failed",
        ) 
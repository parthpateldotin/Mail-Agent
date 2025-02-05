"""Email endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, get_db
from src.models.user import User
from src.schemas.email import (
    EmailCreate,
    EmailUpdate,
    EmailResponse,
    EmailListResponse
)
from src.services.email.email_service import EmailService

router = APIRouter()

@router.get("/", response_model=EmailListResponse)
async def get_emails(
    skip: int = 0,
    limit: int = 50,
    folder_id: str = None,
    is_read: bool = None,
    is_starred: bool = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> EmailListResponse:
    """Get user's emails with pagination and filters."""
    email_service = EmailService(session)
    return await email_service.get_user_emails(
        current_user,
        skip=skip,
        limit=limit,
        folder_id=folder_id,
        is_read=is_read,
        is_starred=is_starred
    )

@router.get("/{email_id}", response_model=EmailResponse)
async def get_email(
    email_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> EmailResponse:
    """Get email by ID."""
    email_service = EmailService(session)
    email = await email_service.get_email_by_id(email_id)
    if not email or email.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found"
        )
    return email

@router.post("/", response_model=EmailResponse, status_code=status.HTTP_201_CREATED)
async def create_email(
    email_data: EmailCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> EmailResponse:
    """Create a new email."""
    email_service = EmailService(session)
    return await email_service.create_email(current_user, email_data)

@router.put("/{email_id}", response_model=EmailResponse)
async def update_email(
    email_id: str,
    email_data: EmailUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> EmailResponse:
    """Update email data."""
    email_service = EmailService(session)
    email = await email_service.get_email_by_id(email_id)
    if not email or email.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found"
        )
    return await email_service.update_email(email, email_data)

@router.delete("/{email_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email(
    email_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> None:
    """Delete an email."""
    email_service = EmailService(session)
    email = await email_service.get_email_by_id(email_id)
    if not email or email.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found"
        )
    await email_service.delete_email(email)

@router.post("/{email_id}/read", response_model=EmailResponse)
async def mark_as_read(
    email_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> EmailResponse:
    """Mark email as read."""
    email_service = EmailService(session)
    email = await email_service.get_email_by_id(email_id)
    if not email or email.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found"
        )
    return await email_service.mark_as_read(email)

@router.post("/{email_id}/unread", response_model=EmailResponse)
async def mark_as_unread(
    email_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> EmailResponse:
    """Mark email as unread."""
    email_service = EmailService(session)
    email = await email_service.get_email_by_id(email_id)
    if not email or email.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found"
        )
    return await email_service.mark_as_unread(email)

@router.post("/{email_id}/star", response_model=EmailResponse)
async def toggle_star(
    email_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> EmailResponse:
    """Toggle email star status."""
    email_service = EmailService(session)
    email = await email_service.get_email_by_id(email_id)
    if not email or email.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found"
        )
    return await email_service.toggle_star(email)

@router.post("/{email_id}/move/{folder_id}", response_model=EmailResponse)
async def move_to_folder(
    email_id: str,
    folder_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> EmailResponse:
    """Move email to different folder."""
    email_service = EmailService(session)
    email = await email_service.get_email_by_id(email_id)
    if not email or email.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found"
        )
    return await email_service.move_to_folder(email, folder_id)

@router.post("/bulk/update", response_model=List[EmailResponse])
async def bulk_update_emails(
    email_ids: List[str],
    update_data: dict,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> List[EmailResponse]:
    """Bulk update emails."""
    email_service = EmailService(session)
    return await email_service.bulk_update_emails(
        current_user,
        email_ids,
        update_data
    ) 
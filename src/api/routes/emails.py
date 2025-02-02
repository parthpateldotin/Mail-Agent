"""Email routes."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import (
    get_current_user,
    get_db,
    get_rate_limiter,
    RateLimiter
)
from src.core.exceptions import (
    DatabaseError,
    EmailNotFoundError,
    ValidationError,
    OperationError
)
from src.models.user import User
from src.schemas.email import (
    EmailCreate,
    EmailUpdate,
    EmailResponse,
    EmailListResponse
)
from src.services.emails import EmailService

router = APIRouter(prefix="/emails", tags=["emails"])

@router.get("/", response_model=EmailListResponse)
async def list_emails(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    folder_id: Optional[str] = None,
    is_read: Optional[bool] = None,
    is_starred: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> EmailListResponse:
    """List user's emails with pagination and filters."""
    try:
        await rate_limiter.check_rate_limit(current_user.id, "list_emails")
        email_service = EmailService(db)
        return await email_service.get_user_emails(
            user=current_user,
            skip=skip,
            limit=limit,
            folder_id=folder_id,
            is_read=is_read,
            is_starred=is_starred,
        )
    except (DatabaseError, ValidationError, OperationError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"message": str(e), "details": e.details}
        )

@router.get("/{email_id}", response_model=EmailResponse)
async def get_email(
    email_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> EmailResponse:
    """Get email by ID."""
    try:
        await rate_limiter.check_rate_limit(current_user.id, "get_email")
        email_service = EmailService(db)
        email = await email_service.get_email_by_id(email_id)
        
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this email"
            )
            
        return EmailResponse.from_orm(email)
    except EmailNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (DatabaseError, ValidationError, OperationError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"message": str(e), "details": e.details}
        )

@router.post("/", response_model=EmailResponse, status_code=status.HTTP_201_CREATED)
async def create_email(
    email_data: EmailCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> EmailResponse:
    """Create a new email."""
    try:
        await rate_limiter.check_rate_limit(current_user.id, "create_email")
        email_service = EmailService(db)
        email = await email_service.create_email(current_user, email_data)
        return EmailResponse.from_orm(email)
    except (DatabaseError, ValidationError, OperationError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"message": str(e), "details": e.details}
        )

@router.patch("/{email_id}", response_model=EmailResponse)
async def update_email(
    email_id: str,
    email_data: EmailUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> EmailResponse:
    """Update email."""
    try:
        await rate_limiter.check_rate_limit(current_user.id, "update_email")
        email_service = EmailService(db)
        email = await email_service.get_email_by_id(email_id)
        
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this email"
            )
            
        updated_email = await email_service.update_email(email, email_data)
        return EmailResponse.from_orm(updated_email)
    except EmailNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (DatabaseError, ValidationError, OperationError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"message": str(e), "details": e.details}
        )

@router.delete("/{email_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email(
    email_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> None:
    """Delete email."""
    try:
        await rate_limiter.check_rate_limit(current_user.id, "delete_email")
        email_service = EmailService(db)
        email = await email_service.get_email_by_id(email_id)
        
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this email"
            )
            
        await email_service.delete_email(email)
    except EmailNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (DatabaseError, ValidationError, OperationError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"message": str(e), "details": e.details}
        )

@router.post("/{email_id}/read", response_model=EmailResponse)
async def mark_as_read(
    email_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> EmailResponse:
    """Mark email as read."""
    try:
        await rate_limiter.check_rate_limit(current_user.id, "mark_email_read")
        email_service = EmailService(db)
        email = await email_service.get_email_by_id(email_id)
        
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this email"
            )
            
        updated_email = await email_service.mark_as_read(email)
        return EmailResponse.from_orm(updated_email)
    except EmailNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (DatabaseError, ValidationError, OperationError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"message": str(e), "details": e.details}
        )

@router.post("/{email_id}/unread", response_model=EmailResponse)
async def mark_as_unread(
    email_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> EmailResponse:
    """Mark email as unread."""
    try:
        await rate_limiter.check_rate_limit(current_user.id, "mark_email_unread")
        email_service = EmailService(db)
        email = await email_service.get_email_by_id(email_id)
        
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this email"
            )
            
        updated_email = await email_service.mark_as_unread(email)
        return EmailResponse.from_orm(updated_email)
    except EmailNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (DatabaseError, ValidationError, OperationError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"message": str(e), "details": e.details}
        )

@router.post("/{email_id}/star", response_model=EmailResponse)
async def toggle_star(
    email_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> EmailResponse:
    """Toggle email star status."""
    try:
        await rate_limiter.check_rate_limit(current_user.id, "toggle_email_star")
        email_service = EmailService(db)
        email = await email_service.get_email_by_id(email_id)
        
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this email"
            )
            
        updated_email = await email_service.toggle_star(email)
        return EmailResponse.from_orm(updated_email)
    except EmailNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (DatabaseError, ValidationError, OperationError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"message": str(e), "details": e.details}
        )

@router.post("/{email_id}/move", response_model=EmailResponse)
async def move_to_folder(
    email_id: str,
    folder_id: str = Query(..., description="Target folder ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> EmailResponse:
    """Move email to a different folder."""
    try:
        await rate_limiter.check_rate_limit(current_user.id, "move_email")
        email_service = EmailService(db)
        email = await email_service.get_email_by_id(email_id)
        
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this email"
            )
            
        updated_email = await email_service.move_to_folder(email, folder_id)
        return EmailResponse.from_orm(updated_email)
    except EmailNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (DatabaseError, ValidationError, OperationError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"message": str(e), "details": e.details}
        ) 
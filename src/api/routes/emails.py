from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File

from src.api.dependencies.auth import get_current_user
from src.models.email import Email, EmailCreate, EmailUpdate, EmailResponse
from src.models.user import User
from src.services.emails import EmailService
from src.services.ai import AIService
from src.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("", response_model=Email, status_code=status.HTTP_201_CREATED)
async def create_email(
    email_in: EmailCreate,
    current_user: User = Depends(get_current_user),
) -> Email:
    """Create new email draft."""
    try:
        email = await EmailService.create_email(current_user.id, email_in)
        return email
    except Exception as e:
        logger.error(f"Email creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email creation failed",
        )


@router.get("", response_model=List[Email])
async def list_emails(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> List[Email]:
    """List user's emails."""
    try:
        emails = await EmailService.get_user_emails(
            user_id=current_user.id,
            skip=skip,
            limit=limit,
        )
        return emails
    except Exception as e:
        logger.error(f"Email listing failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email listing failed",
        )


@router.get("/{email_id}", response_model=Email)
async def get_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
) -> Email:
    """Get email by ID."""
    try:
        email = await EmailService.get_email(email_id)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found",
            )
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return email
    except Exception as e:
        logger.error(f"Email retrieval failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email retrieval failed",
        )


@router.put("/{email_id}", response_model=Email)
async def update_email(
    email_id: int,
    email_in: EmailUpdate,
    current_user: User = Depends(get_current_user),
) -> Email:
    """Update email draft."""
    try:
        email = await EmailService.get_email(email_id)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found",
            )
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        email = await EmailService.update_email(email_id, email_in)
        return email
    except Exception as e:
        logger.error(f"Email update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email update failed",
        )


@router.delete("/{email_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete email."""
    try:
        email = await EmailService.get_email(email_id)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found",
            )
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        await EmailService.delete_email(email_id)
    except Exception as e:
        logger.error(f"Email deletion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email deletion failed",
        )


@router.post("/{email_id}/send", response_model=EmailResponse)
async def send_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
) -> EmailResponse:
    """Send email."""
    try:
        email = await EmailService.get_email(email_id)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found",
            )
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        response = await EmailService.send_email(email_id)
        return response
    except Exception as e:
        logger.error(f"Email sending failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email sending failed",
        )


@router.post("/{email_id}/analyze", response_model=dict)
async def analyze_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Analyze email content using AI."""
    try:
        email = await EmailService.get_email(email_id)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found",
            )
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        analysis = await AIService.analyze_email(email.content)
        return analysis
    except Exception as e:
        logger.error(f"Email analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email analysis failed",
        )


@router.post("/{email_id}/improve", response_model=dict)
async def improve_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get AI suggestions to improve email content."""
    try:
        email = await EmailService.get_email(email_id)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found",
            )
        if email.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        suggestions = await AIService.improve_email(email.content)
        return suggestions
    except Exception as e:
        logger.error(f"Email improvement failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email improvement failed",
        )


@router.post("/attachments", response_model=dict)
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Upload email attachment."""
    try:
        result = await EmailService.upload_attachment(file, current_user.id)
        return result
    except Exception as e:
        logger.error(f"Attachment upload failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attachment upload failed",
        ) 
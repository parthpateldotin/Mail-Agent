"""User schemas."""
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema."""
    
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """User creation schema."""
    
    email: EmailStr
    password: str


class UserUpdate(UserBase):
    """User update schema."""
    
    password: Optional[str] = None


class UserInDBBase(UserBase):
    """Base user in DB schema."""
    
    id: str
    
    class Config:
        """Pydantic config."""
        
        from_attributes = True


class User(UserInDBBase):
    """User schema."""
    
    pass


class UserInDB(UserInDBBase):
    """User in DB schema."""
    
    hashed_password: str 
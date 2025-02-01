"""OpenAI service for email analysis and response generation."""
from typing import Dict, List, Optional

from openai import AsyncOpenAI
from pydantic import BaseModel

from src.core.config import settings


# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class EmailAnalysis(BaseModel):
    """Email analysis result."""
    sentiment: str
    priority: str
    key_points: List[str]
    suggested_actions: List[str]
    category: str


class ResponseSuggestion(BaseModel):
    """Email response suggestion."""
    subject: str
    content: str
    tone: str
    formality_level: str


async def analyze_email_content(
    subject: str,
    content: str,
    sender: str,
    importance: Optional[str] = None
) -> EmailAnalysis:
    """Analyze email content using OpenAI."""
    prompt = f"""
    Analyze the following email:
    
    From: {sender}
    Subject: {subject}
    Importance: {importance or 'Not specified'}
    
    Content:
    {content}
    
    Provide a detailed analysis including:
    1. Sentiment (positive, negative, neutral)
    2. Priority level (high, medium, low)
    3. Key points (max 5)
    4. Suggested actions (max 3)
    5. Category (business, personal, marketing, etc.)
    """
    
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert email analyzer."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=500
    )
    
    # Parse response
    analysis = response.choices[0].message.content
    
    # TODO: Implement proper response parsing
    # This is a placeholder implementation
    return EmailAnalysis(
        sentiment="neutral",
        priority="medium",
        key_points=["Point 1", "Point 2"],
        suggested_actions=["Action 1"],
        category="business"
    )


async def generate_email_response(
    original_email: Dict,
    tone: str = "professional",
    length: str = "medium"
) -> ResponseSuggestion:
    """Generate email response using OpenAI."""
    prompt = f"""
    Generate a response to the following email:
    
    Original Email:
    From: {original_email.get('sender')}
    Subject: {original_email.get('subject')}
    Content: {original_email.get('content')}
    
    Requirements:
    - Tone: {tone}
    - Length: {length}
    - Must be professional and courteous
    - Include relevant details from the original email
    - End with a clear call to action if appropriate
    
    Generate:
    1. Response subject line
    2. Response content
    3. Appropriate tone
    4. Formality level
    """
    
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are an expert email composer, skilled in professional communication."
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=800
    )
    
    # Parse response
    suggestion = response.choices[0].message.content
    
    # TODO: Implement proper response parsing
    # This is a placeholder implementation
    return ResponseSuggestion(
        subject="Re: " + original_email.get('subject', ''),
        content="Thank you for your email...",
        tone=tone,
        formality_level="professional"
    )


async def summarize_email_thread(
    emails: List[Dict],
    max_length: int = 150
) -> str:
    """Summarize email thread using OpenAI."""
    thread_content = "\n\n".join([
        f"Email {i+1}:\nFrom: {email.get('sender')}\n"
        f"Subject: {email.get('subject')}\n"
        f"Content: {email.get('content')}"
        for i, email in enumerate(emails)
    ])
    
    prompt = f"""
    Summarize the following email thread in a concise way (max {max_length} words):
    
    {thread_content}
    
    Focus on:
    1. Main discussion points
    2. Decisions made
    3. Action items
    4. Current status
    """
    
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are an expert at summarizing email conversations."
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=200
    )
    
    return response.choices[0].message.content


async def classify_email_priority(
    subject: str,
    content: str,
    sender: str,
    metadata: Optional[Dict] = None
) -> str:
    """Classify email priority using OpenAI."""
    prompt = f"""
    Classify the priority of the following email:
    
    From: {sender}
    Subject: {subject}
    Content: {content}
    Additional Metadata: {metadata or {}}
    
    Classify as one of:
    - URGENT: Requires immediate attention
    - HIGH: Should be addressed within 24 hours
    - MEDIUM: Should be addressed within 48-72 hours
    - LOW: Can be addressed when convenient
    
    Consider:
    1. Sender importance
    2. Content urgency
    3. Subject line indicators
    4. Time sensitivity
    """
    
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are an expert at classifying email priority."
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=50
    )
    
    return response.choices[0].message.content.strip() 
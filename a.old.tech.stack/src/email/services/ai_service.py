from typing import Dict, Any, List, Optional
import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime
import json
import aiohttp
import os
from pathlib import Path
from enum import Enum
from src.utils.event_loop import EventLoopManager, run_async

@dataclass
class AIConfig:
    model_name: str
    temperature: float
    max_tokens: int
    top_p: float
    frequency_penalty: float
    presence_penalty: float

@dataclass
class AIResponse:
    content: str
    tokens_used: int
    model_used: str
    timestamp: datetime
    metadata: Dict[str, Any]

@dataclass
class ValidationResult:
    is_valid: bool
    score: float
    issues: list[str] = None
    suggestions: list[str] = None

class AIService:
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.session: Optional[aiohttp.ClientSession] = None
        self.is_running = False
        self.api_key = config.OPENAI_API_KEY
        self.model = config.AI_MODEL_NAME
        self.temperature = config.AI_TEMPERATURE
        self.max_tokens = config.AI_MAX_TOKENS
        self.top_p = config.AI_TOP_P
        self.frequency_penalty = config.AI_FREQUENCY_PENALTY
        self.presence_penalty = config.AI_PRESENCE_PENALTY
        self.last_check = datetime.now()
        self.metrics = {
            "total_responses": 0,
            "successful_validations": 0,
            "failed_validations": 0,
            "avg_validation_score": 0,
            "avg_response_time": 0,
            "quality_excellent": 0,
            "quality_good": 0,
            "quality_fair": 0,
            "quality_poor": 0,
            "common_issues": {}
        }
        self._init_lock = asyncio.Lock()
        self.templates = self.load_templates()
        self.health_status = {"status": "initialized", "last_check": datetime.now()}
        
        if not self.api_key:
            self.logger.error("OpenAI API key not found in environment variables")
            raise ValueError("OpenAI API key not configured")

        self._loop = EventLoopManager.get_instance().get_loop()

    @property
    def initialization_lock(self):
        """Get or create initialization lock in the current event loop"""
        if self._init_lock is None:
            loop = EventLoopManager.get_instance().get_loop()
            self._init_lock = asyncio.Lock()
        return self._init_lock

    def load_config(self) -> AIConfig:
        """Load AI configuration"""
        return AIConfig(
            model_name="gpt-4",
            temperature=0.7,
            max_tokens=150,
            top_p=1.0,
            frequency_penalty=0.0,
            presence_penalty=0.0
        )

    def load_templates(self) -> Dict[str, str]:
        """Load response templates from templates directory"""
        templates_dir = Path(__file__).parent.parent.parent / 'config' / 'templates'
        templates = {}
        
        # Default templates if file loading fails
        default_templates = {
            "inquiry": """
                Based on the email inquiry:
                {email_content}
                
                Please provide a professional and helpful response that:
                1. Acknowledges the inquiry
                2. Addresses the main points
                3. Provides relevant information
                4. Maintains a friendly tone
                """,
            "support": """
                Regarding the support request:
                {email_content}
                
                Please provide a solution-focused response that:
                1. Shows understanding of the issue
                2. Provides clear steps or solutions
                3. Offers additional assistance
                4. Maintains an empathetic tone
                """
        }
        
        try:
            if templates_dir.exists():
                for template_file in templates_dir.glob('*.txt'):
                    template_name = template_file.stem
                    templates[template_name] = template_file.read_text()
            return templates if templates else default_templates
        except Exception as e:
            self.logger.warning(f"Error loading templates: {e}. Using defaults.")
            return default_templates

    async def _init_session(self):
        """Initialize aiohttp session with proper timeout handling"""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)
    
    async def start(self):
        """Start the AI service with proper initialization"""
        try:
            async with self._init_lock:
                if not self.is_running:
                    await self._init_session()
                    
                    # Test API connection
                    async with self.session.get(
                        self.config.OPENAI_API_ENDPOINT + "/models",
                        headers={"Authorization": f"Bearer {self.config.OPENAI_API_KEY}"}
                    ) as response:
                        if response.status == 200:
                            self.is_running = True
                            self.logger.info("AI Service started successfully")
                            self.health_status.update({
                                "status": "running",
                                "last_check": datetime.now(),
                                "api_status": "available"
                            })
                            return True
                        else:
                            self.logger.error(f"Failed to connect to OpenAI API: {response.status}")
                            return False
                            
        except Exception as e:
            self.logger.error(f"Failed to start AI service: {e}")
            self.is_running = False
            if self.session and not self.session.closed:
                await self.session.close()
            self.health_status.update({
                "status": "error",
                "last_check": datetime.now(),
                "error": str(e)
            })
            return False
    
    async def stop(self):
        """Stop the AI service and cleanup resources"""
        try:
            self.is_running = False
            if self.session and not self.session.closed:
                await self.session.close()
                self.session = None
            self.logger.info("AI Service stopped")
            self.health_status.update({
                "status": "stopped",
                "last_check": datetime.now()
            })
        except Exception as e:
            self.logger.error(f"Error stopping AI service: {e}")
    
    async def check_health(self) -> Dict[str, Any]:
        """Check AI service health with proper error handling"""
        try:
            if not self.is_running:
                return self.health_status
            
            await self._init_session()
            async with self.session.get(
                self.config.OPENAI_API_ENDPOINT + "/models",
                headers={"Authorization": f"Bearer {self.config.OPENAI_API_KEY}"}
            ) as response:
                api_status = "operational" if response.status == 200 else "error"
                
            self.last_check = datetime.now()
            self.health_status.update({
                "status": "healthy" if self.is_running else "error",
                "api_status": api_status,
                "last_check": self.last_check.isoformat()
            })
            return self.health_status
        except Exception as e:
            self.logger.error(f"Health check failed: {e}")
            self.health_status.update({
                "status": "error",
                "api_status": "error",
                "last_check": datetime.now().isoformat(),
                "error": str(e)
            })
            return self.health_status
    
    async def ensure_running(self):
        """Ensure the service is running, restart if necessary"""
        if not self.is_running:
            await self.start()
        return self.is_running

    async def analyze_email(self, email_content: str) -> Dict[str, Any]:
        """Analyze email content with enhanced error handling"""
        try:
            prompt = f"""
            Analyze the following email and provide:
            1. Main intent/purpose
            2. Sentiment
            3. Priority level
            4. Key points
            5. Required action items

            Email:
            {email_content}
            """

            response = await self.generate_completion(prompt)
            analysis = self.parse_analysis_response(response)
            
            # Validate analysis
            validation = await self.validate_response(analysis)
            if not validation.is_valid:
                self.logger.warning(f"Analysis validation issues: {validation.issues}")
                # Adjust parameters and retry if necessary
                if validation.score < 0.7:
                    await self.adjust_parameters({"temperature": 0.5})
                    response = await self.generate_completion(prompt)
                    analysis = self.parse_analysis_response(response)
            
            return analysis
        except Exception as e:
            self.logger.error(f"Error in email analysis: {e}")
            raise

    async def generate_response(self, 
                              email_content: str, 
                              analysis: Dict[str, Any],
                              template_key: str = "inquiry") -> AIResponse:
        """Generate email response with validation"""
        try:
            template = self.templates.get(template_key, self.templates["inquiry"])
            prompt = template.format(email_content=email_content)
            
            # Add analysis context to the prompt
            prompt += f"\n\nContext from analysis:\n"
            prompt += f"Intent: {analysis.get('intent', 'unknown')}\n"
            prompt += f"Sentiment: {analysis.get('sentiment', 'neutral')}\n"
            prompt += f"Priority: {analysis.get('priority', 'medium')}\n"
            
            response_content = await self.generate_completion(prompt)
            
            # Validate response
            validation = await self.validate_response({"content": response_content})
            if not validation.is_valid:
                self.logger.warning(f"Response validation issues: {validation.issues}")
                # Adjust and retry if necessary
                if validation.score < 0.7:
                    await self.adjust_parameters({"temperature": 0.5})
                    response_content = await self.generate_completion(prompt)
            
            return AIResponse(
                content=response_content,
                tokens_used=len(response_content.split()),  # Approximate
                model_used=self.model,
                timestamp=datetime.now(),
                metadata={"analysis": analysis, "validation": validation.__dict__}
            )
        except Exception as e:
            self.logger.error(f"Error generating response: {e}")
            raise

    async def validate_response(self, response: Dict[str, Any]) -> ValidationResult:
        """Validate the AI response with enhanced error handling"""
        try:
            # Initialize validation metrics
            score = 0.0
            issues = []
            suggestions = []

            # Check response structure
            if not isinstance(response, dict):
                issues.append("Invalid response format")
                return ValidationResult(False, 0.0, issues, suggestions)

            # Validate required fields
            required_fields = ['content', 'model_used', 'timestamp']
            for field in required_fields:
                if field not in response:
                    issues.append(f"Missing required field: {field}")
                    score -= 0.2

            # Validate content quality
            if 'content' in response:
                content = response['content']
                content_length = len(content)
                
                # Length check
                if content_length < 50:
                    issues.append("Response too short")
                    suggestions.append("Provide more detailed response")
                    score -= 0.3
                elif content_length > 1000:
                    issues.append("Response too long")
                    suggestions.append("Consider making response more concise")
                    score -= 0.1
                
                # Quality checks
                if content.count('.') < 2:
                    issues.append("Too few sentences")
                    suggestions.append("Structure response with multiple sentences")
                    score -= 0.2
                
                # Update metrics
                self.metrics["total_responses"] += 1
                if score >= 0.7:
                    self.metrics["quality_excellent"] += 1
                elif score >= 0.5:
                    self.metrics["quality_good"] += 1
                elif score >= 0.3:
                    self.metrics["quality_fair"] += 1
                else:
                    self.metrics["quality_poor"] += 1

            # Calculate final score
            final_score = max(0.0, 1.0 + score)  # Base score of 1.0, subtract penalties
            
            # Update validation metrics
            if final_score >= 0.5:
                self.metrics["successful_validations"] += 1
            else:
                self.metrics["failed_validations"] += 1
            
            self.metrics["avg_validation_score"] = (
                (self.metrics["avg_validation_score"] * (self.metrics["total_responses"] - 1) + final_score) / 
                self.metrics["total_responses"]
            )

            return ValidationResult(
                is_valid=final_score >= 0.5,
                score=final_score,
                issues=issues if issues else None,
                suggestions=suggestions if suggestions else None
            )

        except Exception as e:
            self.logger.error(f"Error validating response: {e}")
            return ValidationResult(
                is_valid=False,
                score=0.0,
                issues=[f"Validation error: {str(e)}"],
                suggestions=["Retry with proper response format"]
            )

    async def adjust_parameters(self, params: Dict[str, Any]):
        """Adjust AI parameters based on feedback"""
        try:
            for param, value in params.items():
                if hasattr(self.config, param):
                    setattr(self.config, param, value)
                    self.logger.info(f"Adjusted {param} to {value}")
        except Exception as e:
            self.logger.error(f"Error adjusting parameters: {e}")
            raise

    async def generate_completion(self, prompt: str) -> str:
        """Generate completion using OpenAI API with enhanced error handling"""
        if not self.session:
            raise RuntimeError("AI Service not started")

        try:
            async with self.session.post(
                self.config.OPENAI_API_ENDPOINT + "/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.config.OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.config.OPENAI_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": self.temperature,
                    "max_tokens": self.max_tokens,
                    "top_p": self.top_p,
                    "frequency_penalty": self.frequency_penalty,
                    "presence_penalty": self.presence_penalty
                }
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    error_data = await response.text()
                    raise Exception(f"API Error: {response.status} - {error_data}")
        except Exception as e:
            self.logger.error(f"Error generating completion: {str(e)}")
            raise

    def parse_analysis_response(self, response: str) -> Dict[str, Any]:
        """Parse the analysis response into structured data with enhanced error handling"""
        try:
            lines = response.strip().split("\n")
            analysis = {
                "intent": "unknown",
                "sentiment": "neutral",
                "priority": "medium",
                "key_points": [],
                "action_items": []
            }
            
            current_section = None
            for line in lines:
                line = line.strip()
                if "intent:" in line.lower():
                    analysis["intent"] = line.split(":", 1)[1].strip()
                elif "sentiment:" in line.lower():
                    analysis["sentiment"] = line.split(":", 1)[1].strip()
                elif "priority:" in line.lower():
                    analysis["priority"] = line.split(":", 1)[1].strip()
                elif "key points:" in line.lower():
                    current_section = "key_points"
                elif "action items:" in line.lower():
                    current_section = "action_items"
                elif line.startswith("- ") and current_section:
                    analysis[current_section].append(line[2:].strip())
            
            return analysis
        except Exception as e:
            self.logger.error(f"Error parsing analysis response: {e}")
            return {
                "intent": "error",
                "sentiment": "neutral",
                "priority": "high",
                "key_points": ["Error in analysis"],
                "action_items": ["Review error and retry"]
            }

    def get_metrics(self) -> Dict[str, Any]:
        """Get AI service metrics"""
        return {
            "total_responses": self.metrics["total_responses"],
            "successful_validations": self.metrics["successful_validations"],
            "failed_validations": self.metrics["failed_validations"],
            "avg_validation_score": self.metrics["avg_validation_score"],
            "avg_response_time": self.metrics["avg_response_time"],
            "quality_excellent": self.metrics["quality_excellent"],
            "quality_good": self.metrics["quality_good"],
            "quality_fair": self.metrics["quality_fair"],
            "quality_poor": self.metrics["quality_poor"],
            "common_issues": self.metrics["common_issues"]
        }

class AIServiceManager:
    def __init__(self):
        # Create a default configuration using AIConfig and add required attributes
        from src.email.services.ai_service import AIConfig, AIService
        config = AIConfig(
            model_name="gpt-4",
            temperature=0.7,
            max_tokens=150,
            top_p=1.0,
            frequency_penalty=0.0,
            presence_penalty=0.0
        )
        # Add additional required configuration parameters
        config.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-default-api-key")
        config.AI_MODEL_NAME = config.model_name
        config.AI_TEMPERATURE = config.temperature
        config.AI_MAX_TOKENS = config.max_tokens
        config.AI_TOP_P = config.top_p
        config.AI_FREQUENCY_PENALTY = config.frequency_penalty
        config.AI_PRESENCE_PENALTY = config.presence_penalty
        config.OPENAI_API_ENDPOINT = os.getenv("OPENAI_API_ENDPOINT", "https://api.openai.com/v1")

        self.service = AIService(config)
        self.logger = logging.getLogger(__name__)

    async def start(self):
        """Start the AI service manager"""
        await self.service.start()
        self.logger.info("AI Service Manager started")

    async def stop(self):
        """Stop the AI service manager"""
        await self.service.stop()
        self.logger.info("AI Service Manager stopped")

    async def process_email(self, email_content: str) -> Dict[str, Any]:
        """Process an email through the AI service"""
        try:
            # Analyze the email
            analysis = await self.service.analyze_email(email_content)
            
            # Generate response
            response = await self.service.generate_response(
                email_content=email_content,
                analysis=analysis,
                template_key=analysis.get("intent", "inquiry")
            )
            
            return {
                "analysis": analysis,
                "response": response.content,
                "metadata": {
                    "model": response.model_used,
                    "timestamp": response.timestamp.isoformat(),
                    "tokens_used": response.tokens_used
                }
            }
        except Exception as e:
            self.logger.error(f"Error processing email: {str(e)}")
            raise
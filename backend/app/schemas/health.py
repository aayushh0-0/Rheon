from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Current system operational status")
    project: str = Field(default="RHEON AI", description="Application name")
    tagline: str = Field(default="Predict. Orchestrate. Respond.", description="Platform tagline")
    version: str = Field(default="0.1.0", description="API version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Server UTC timestamp")
    environment: str = Field(default="development", description="Runtime environment")

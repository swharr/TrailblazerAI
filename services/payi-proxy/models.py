"""
Pydantic models for Pay-i Proxy Service API
"""
from typing import Optional
from pydantic import BaseModel, Field


class VehicleInfo(BaseModel):
    """Vehicle information for analysis context."""
    make: str
    model: str
    year: Optional[int] = None
    features: list[str] = Field(default_factory=list)
    suspension_brand: Optional[str] = None
    suspension_travel: Optional[str] = None


class AnalysisContext(BaseModel):
    """Additional context for trail analysis."""
    trail_name: Optional[str] = None
    trail_location: Optional[str] = None
    additional_notes: Optional[str] = None


class AnalyzeRequest(BaseModel):
    """Request body for trail analysis."""
    images: list[str] = Field(..., description="List of base64-encoded images")
    model: str = Field(default="claude-sonnet-4-20250514", description="Model to use")
    prompt: Optional[str] = Field(None, description="Full analysis prompt (if not provided, a basic prompt is generated)")
    vehicle_info: Optional[VehicleInfo] = None
    context: Optional[AnalysisContext] = None
    user_id: Optional[str] = Field(None, description="User ID for tracking")
    account_name: Optional[str] = Field(None, description="Account name for grouping")
    limit_ids: list[str] = Field(default_factory=list, description="Limit IDs to apply")


class UsageMetrics(BaseModel):
    """Token usage and cost metrics."""
    input_tokens: int
    output_tokens: int
    cost: Optional[float] = None
    input_cost: Optional[float] = None
    output_cost: Optional[float] = None


class AnalyzeResponse(BaseModel):
    """Response from trail analysis."""
    success: bool
    text: str = Field(default="", description="Raw response text from the model")
    usage: UsageMetrics
    use_case_id: str = Field(..., description="Unique use case instance ID")
    payi_request_id: Optional[str] = Field(None, description="Pay-i request ID")
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    payi_enabled: bool
    anthropic_enabled: bool

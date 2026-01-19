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
    # Pay-i attribution fields
    use_case_name: Optional[str] = Field(None, description="Use case name for Pay-i attribution")
    use_case_version: Optional[int] = Field(None, description="Use case version")
    use_case_properties: Optional[dict[str, str]] = Field(None, description="Custom use case properties")
    request_properties: Optional[dict[str, str]] = Field(None, description="Custom request properties")


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


# Trail Finder Models
class TrailFinderRequest(BaseModel):
    """Request body for trail finder search."""
    prompt: str = Field(..., description="The trail finder prompt")
    model: str = Field(default="claude-sonnet-4-20250514", description="Model to use")
    max_tokens: int = Field(default=4096, description="Maximum tokens for response")
    user_id: Optional[str] = Field(None, description="User ID for tracking")
    account_name: Optional[str] = Field(None, description="Account name for grouping")
    # Pay-i attribution fields
    use_case_name: Optional[str] = Field(default="trail_finder", description="Use case name")
    use_case_version: Optional[int] = Field(default=1, description="Use case version")
    use_case_properties: Optional[dict[str, str]] = Field(None, description="Custom use case properties")
    request_properties: Optional[dict[str, str]] = Field(None, description="Custom request properties")


class TrailFinderResponse(BaseModel):
    """Response from trail finder search."""
    success: bool
    text: str = Field(default="", description="Raw response text from the model")
    usage: UsageMetrics
    use_case_id: str = Field(..., description="Unique use case instance ID")
    payi_request_id: Optional[str] = Field(None, description="Pay-i request ID")
    error: Optional[str] = None


# Judge Validation Models
class JudgeRequest(BaseModel):
    """Request body for judge validation."""
    prompt: str = Field(..., description="The judge evaluation prompt")
    provider: str = Field(default="openai", description="AI provider to use (openai, anthropic, google)")
    model: str = Field(default="gpt-4o", description="Model to use for judging")
    max_tokens: int = Field(default=4096, description="Maximum tokens for response")
    user_id: Optional[str] = Field(None, description="User ID for tracking")
    # Context about what's being validated
    validated_use_case: Optional[str] = Field(None, description="The use case being validated (e.g., trail_finder)")
    location: Optional[str] = Field(None, description="Location context if applicable")
    # Pay-i attribution fields
    use_case_name: str = Field(default="judge_validation", description="Use case name")
    use_case_version: int = Field(default=1, description="Use case version")
    use_case_properties: Optional[dict[str, str]] = Field(None, description="Custom use case properties")


class JudgeResponse(BaseModel):
    """Response from judge validation."""
    success: bool
    text: str = Field(default="", description="Raw response text from the judge model")
    usage: UsageMetrics
    use_case_id: str = Field(..., description="Unique use case instance ID")
    payi_request_id: Optional[str] = Field(None, description="Pay-i request ID")
    error: Optional[str] = None

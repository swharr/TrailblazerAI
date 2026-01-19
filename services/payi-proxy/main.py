"""
Pay-i Proxy Service

FastAPI service that wraps Anthropic API calls with full Pay-i instrumentation.
Provides automatic use case tracking, token counting, and cost attribution.
"""
import os
import uuid
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

import anthropic
from payi.lib.instrument import payi_instrument, track_context, get_context

from config import Settings, get_settings
from models import (
    AnalyzeRequest,
    AnalyzeResponse,
    UsageMetrics,
    HealthResponse,
    TrailFinderRequest,
    TrailFinderResponse,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global Anthropic client (will be instrumented by Pay-i)
anthropic_client: Optional[anthropic.Anthropic] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - initialize Pay-i instrumentation."""
    global anthropic_client
    settings = get_settings()

    # Initialize Pay-i instrumentation
    if settings.payi_api_key and settings.payi_base_url:
        logger.info("Initializing Pay-i instrumentation...")
        os.environ["PAYI_API_KEY"] = settings.payi_api_key
        os.environ["PAYI_BASE_URL"] = settings.payi_base_url

        # This wraps all supported AI provider clients automatically
        payi_instrument(
            config={
                "use_case_properties": {
                    "app": "trailblazer_ai",
                    "service": settings.service_name,
                    "environment": settings.environment,
                },
            }
        )
        logger.info("Pay-i instrumentation initialized")
    else:
        logger.warning("Pay-i not configured - running without instrumentation")

    # Initialize Anthropic client (will be auto-instrumented if Pay-i is enabled)
    if settings.anthropic_api_key:
        anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        logger.info("Anthropic client initialized")
    else:
        logger.warning("Anthropic API key not configured")

    yield

    # Cleanup
    logger.info("Shutting down Pay-i proxy service")


# Create FastAPI app
app = FastAPI(
    title="Pay-i Proxy Service",
    description="Proxies AI calls with full Pay-i instrumentation for TrailBlazer AI",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check(settings: Settings = Depends(get_settings)):
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        payi_enabled=bool(settings.payi_api_key),
        anthropic_enabled=bool(settings.anthropic_api_key),
    )


def analyze_trail_images(
    images: list[str],
    prompt: str,
    model: str,
    requesting_user_id: Optional[str] = None,
    use_case_name: str = "trail_analysis",
    use_case_version: Optional[int] = None,
    use_case_properties: Optional[dict] = None,
    request_properties: Optional[dict] = None,
) -> tuple[str, dict]:
    """
    Analyze trail images using Anthropic with Pay-i tracking.

    Uses track_context to:
    - Create a use case instance with unique ID
    - Track all AI calls within this context
    - Capture token usage and costs
    - Associate properties with the use case
    """
    if anthropic_client is None:
        raise HTTPException(status_code=503, detail="Anthropic client not initialized")

    logger.info(f"Starting Pay-i tracked analysis with use_case_name={use_case_name}")

    # Build context kwargs
    context_kwargs = {
        "use_case_name": use_case_name,
        "user_id": requesting_user_id,
        "use_case_properties": use_case_properties or {},
        "request_properties": request_properties or {},
    }
    if use_case_version is not None:
        context_kwargs["use_case_version"] = use_case_version

    # Use track_context for request-specific properties
    with track_context(**context_kwargs):
        # Build message content with images
        content = []
        for image_data in images:
            # Parse base64 image
            if image_data.startswith("data:"):
                # Extract media type and base64 data
                parts = image_data.split(",", 1)
                media_type = parts[0].split(":")[1].split(";")[0]
                base64_data = parts[1]
            else:
                # Assume JPEG if no prefix
                media_type = "image/jpeg"
                base64_data = image_data

            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": base64_data,
                },
            })

        # Add the text prompt
        content.append({"type": "text", "text": prompt})

        # Make the API call (automatically instrumented by Pay-i)
        response = anthropic_client.messages.create(
            model=model,
            max_tokens=2048,
            messages=[{"role": "user", "content": content}],
        )

        # Extract text response
        text = ""
        for block in response.content:
            if block.type == "text":
                text = block.text
                break

        # Get context for use_case_id
        ctx = get_context()
        use_case_id = ctx.get("use_case_id", str(uuid.uuid4()))

        return text, {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "use_case_id": use_case_id,
        }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    settings: Settings = Depends(get_settings),
):
    """
    Analyze trail images with full Pay-i instrumentation.

    This endpoint:
    - Creates a new use case instance for each analysis
    - Tracks token usage and costs automatically
    - Associates user, vehicle, and trail metadata
    - Applies spending limits if specified
    """
    logger.info(f"Received analysis request: {len(request.images)} images, model={request.model}")

    # Use provided prompt or build a basic one
    if request.prompt:
        prompt = request.prompt
        logger.info("Using provided prompt from Next.js app")
    else:
        prompt = build_analysis_prompt(request)
        logger.info("Using fallback basic prompt")

    # Use properties from request if provided, otherwise build from context
    if request.use_case_properties:
        use_case_properties = request.use_case_properties
    else:
        use_case_properties = {}
        if request.context:
            if request.context.trail_name:
                use_case_properties["trail_name"] = request.context.trail_name
            if request.context.trail_location:
                use_case_properties["trail_location"] = request.context.trail_location
        if request.vehicle_info:
            use_case_properties["vehicle_make"] = request.vehicle_info.make
            use_case_properties["vehicle_model"] = request.vehicle_info.model
            if request.vehicle_info.year:
                use_case_properties["vehicle_year"] = str(request.vehicle_info.year)

    # Use request properties from request if provided, otherwise build defaults
    if request.request_properties:
        request_properties = request.request_properties
    else:
        request_properties = {
            "image_count": str(len(request.images)),
            "model_used": request.model,
            "has_vehicle_info": str(request.vehicle_info is not None),
            "has_context": str(request.context is not None),
        }

    # Get use case name from request or default to trail_analysis
    use_case_name = request.use_case_name or "trail_analysis"
    logger.info(f"Using use_case_name: {use_case_name}, version: {request.use_case_version}")

    try:
        # Call the tracked analysis function
        text, metrics = analyze_trail_images(
            images=request.images,
            prompt=prompt,
            model=request.model,
            requesting_user_id=request.user_id,
            use_case_name=use_case_name,
            use_case_version=request.use_case_version,
            use_case_properties=use_case_properties,
            request_properties=request_properties,
        )

        logger.info(f"Analysis complete: {metrics['input_tokens']} input, {metrics['output_tokens']} output tokens")

        return AnalyzeResponse(
            success=True,
            text=text,
            usage=UsageMetrics(
                input_tokens=metrics["input_tokens"],
                output_tokens=metrics["output_tokens"],
            ),
            use_case_id=metrics["use_case_id"],
        )

    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def search_trails(
    prompt: str,
    model: str,
    max_tokens: int,
    requesting_user_id: Optional[str] = None,
    use_case_name: str = "trail_finder",
    use_case_version: Optional[int] = None,
    use_case_properties: Optional[dict] = None,
    request_properties: Optional[dict] = None,
) -> tuple[str, dict]:
    """
    Search for trails using Anthropic with web search and Pay-i tracking.

    Uses track_context to:
    - Create a use case instance with unique ID
    - Track all AI calls within this context
    - Capture token usage and costs
    - Associate properties with the use case
    """
    if anthropic_client is None:
        raise HTTPException(status_code=503, detail="Anthropic client not initialized")

    logger.info(f"Starting Pay-i tracked trail search with use_case_name={use_case_name}")

    # Build context kwargs
    context_kwargs = {
        "use_case_name": use_case_name,
        "user_id": requesting_user_id,
        "use_case_properties": use_case_properties or {},
        "request_properties": request_properties or {},
    }
    if use_case_version is not None:
        context_kwargs["use_case_version"] = use_case_version

    # Use track_context for request-specific properties
    with track_context(**context_kwargs):
        # Make the API call with web search tool (automatically instrumented by Pay-i)
        response = anthropic_client.messages.create(
            model=model,
            max_tokens=max_tokens,
            tools=[
                {
                    "type": "web_search_20250305",
                    "name": "web_search",
                    "max_uses": 10,
                },
            ],
            messages=[{"role": "user", "content": prompt}],
        )

        # Extract text from response (may include multiple content blocks with web search)
        text = ""
        for block in response.content:
            if block.type == "text":
                text += block.text

        # Get context for use_case_id
        ctx = get_context()
        use_case_id = ctx.get("use_case_id", str(uuid.uuid4()))

        return text, {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "use_case_id": use_case_id,
        }


@app.post("/trail-finder", response_model=TrailFinderResponse)
async def trail_finder(
    request: TrailFinderRequest,
    settings: Settings = Depends(get_settings),
):
    """
    Search for trails using web search with full Pay-i instrumentation.

    This endpoint:
    - Creates a new use case instance for each search
    - Tracks token usage and costs automatically
    - Uses web search to find trails from AllTrails, OnX, etc.
    """
    logger.info(f"Received trail finder request, model={request.model}")

    # Get use case name from request or default
    use_case_name = request.use_case_name or "trail_finder"
    logger.info(f"Using use_case_name: {use_case_name}, version: {request.use_case_version}")

    try:
        # Call the tracked search function
        text, metrics = search_trails(
            prompt=request.prompt,
            model=request.model,
            max_tokens=request.max_tokens,
            requesting_user_id=request.user_id,
            use_case_name=use_case_name,
            use_case_version=request.use_case_version,
            use_case_properties=request.use_case_properties,
            request_properties=request.request_properties,
        )

        logger.info(f"Trail search complete: {metrics['input_tokens']} input, {metrics['output_tokens']} output tokens")

        return TrailFinderResponse(
            success=True,
            text=text,
            usage=UsageMetrics(
                input_tokens=metrics["input_tokens"],
                output_tokens=metrics["output_tokens"],
            ),
            use_case_id=metrics["use_case_id"],
        )

    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))
    except Exception as e:
        logger.error(f"Trail finder error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def build_analysis_prompt(request: AnalyzeRequest) -> str:
    """Build the analysis prompt based on request context."""
    # Note: The full sophisticated prompt is in the Next.js app (src/lib/prompts.ts)
    # This is a simplified version - consider moving full prompt here
    prompt_parts = [
        "Analyze these trail photos for off-road/overlanding conditions.",
        "Provide a JSON response with the following structure:",
        "{",
        '  "difficulty": 1-5,',
        '  "trailType": ["dirt road", "rock crawl", etc],',
        '  "conditions": ["dry", "muddy", etc],',
        '  "hazards": ["steep grades", "loose rocks", etc],',
        '  "recommendations": ["air down tires", etc],',
        '  "bestFor": ["4x4 trucks", "ATVs", etc],',
        '  "summary": "Brief trail description"',
        "}",
    ]

    if request.vehicle_info:
        prompt_parts.append(
            f"\nVehicle: {request.vehicle_info.year or ''} {request.vehicle_info.make} {request.vehicle_info.model}"
        )
        if request.vehicle_info.features:
            prompt_parts.append(f"Features: {', '.join(request.vehicle_info.features)}")

    if request.context:
        if request.context.trail_name:
            prompt_parts.append(f"\nTrail: {request.context.trail_name}")
        if request.context.trail_location:
            prompt_parts.append(f"Location: {request.context.trail_location}")
        if request.context.additional_notes:
            prompt_parts.append(f"Notes: {request.context.additional_notes}")

    return "\n".join(prompt_parts)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

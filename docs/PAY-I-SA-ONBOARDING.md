# Pay-i SA Onboarding Guide

> For Solutions Architects joining Pay-i. Uses TrailblazerAI as a reference implementation.

## Quick Context

**What Pay-i is:** An observability and governance platform for GenAI spend—think Datadog meets cost management, but purpose-built for LLM workloads.

**The pitch:** "You wouldn't run production without APM. Why run GenAI without cost observability?"

---

## The Problem Space (Know This Cold)

### What Customers Are Experiencing

| Stage | Pain Point | What They Say |
|-------|------------|---------------|
| **Pilot** | "We got a $50K bill and don't know why" | Surprise costs, no attribution |
| **Scaling** | "Which team is burning through budget?" | No chargeback capability |
| **Production** | "One user ran a loop and cost us $10K" | No guardrails/limits |
| **Optimization** | "Should we use GPT-4 or Claude for this?" | No data to compare |

### DIY Alternatives (And Why They Fall Short)

**"We'll just wrap our API calls"**
- Works initially, breaks with scale
- No standardization across teams
- Reinventing token counting, cost calculation
- No cross-provider normalization

**"We'll use cloud cost tools"**
- Cloud cost tools see "API calls to OpenAI"
- No visibility into: which feature, which user, which prompt version
- Can't correlate cost to business outcomes

**"We'll build dashboards in our BI tool"**
- Requires custom instrumentation everywhere
- No real-time limits/guardrails
- Maintenance burden as providers change pricing

---

## Pay-i Architecture (SA Perspective)

### Where Pay-i Sits

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Customer's Environment                           │
│                                                                      │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│   │  App Service │     │  App Service │     │   Worker     │       │
│   │  (Python)    │     │  (Node.js)   │     │  (Python)    │       │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘       │
│          │                    │                    │                │
│          │    ┌───────────────┴────────────────────┘                │
│          │    │                                                      │
│          ▼    ▼                                                      │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │              Pay-i Instrumentation Layer                 │       │
│   │                                                          │       │
│   │  Option A: SDK (payi_instrument)                        │       │
│   │  Option B: Proxy Service                                │       │
│   │  Option C: REST API (manual)                            │       │
│   └─────────────────────────────────────────────────────────┘       │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Pay-i Platform    │
                    │                      │
                    │  • Ingest & Process  │
                    │  • Limits Engine     │
                    │  • Analytics         │
                    │  • Alerting          │
                    └──────────────────────┘
```

### Deployment Model

Pay-i is **SaaS**—customers send telemetry to Pay-i's endpoints:
- `api.pay-i.com` (or customer-specific subdomain)
- Data: token counts, model used, use case metadata, costs
- **NOT** prompts/responses (privacy-friendly)

### SDK Magic: How `payi_instrument()` Works

This is the "aha moment" for technical buyers:

```python
# BEFORE: Direct to Anthropic
import anthropic
client = anthropic.Anthropic()
response = client.messages.create(...)  # Goes straight to Anthropic

# AFTER: One line change
from payi.lib.instrument import payi_instrument
payi_instrument()  # <-- This is the magic

import anthropic
client = anthropic.Anthropic()
response = client.messages.create(...)  # Now instrumented automatically
```

**Under the hood:**
1. `payi_instrument()` monkey-patches supported AI client libraries
2. Every API call is intercepted
3. Pre-call: Check limits, capture context
4. Post-call: Extract tokens, calculate cost, report to Pay-i
5. Transparent to application code

**Supported providers:** Anthropic, OpenAI, Google (Vertex/Gemini), Bedrock, Azure OpenAI

---

## Key Concepts for Customer Conversations

### Use Cases = Features

Map customer's AI features to Pay-i Use Cases:

| Customer Feature | Use Case Name | Why Track Separately |
|-----------------|---------------|---------------------|
| Chat assistant | `customer_chat` | High volume, needs limits |
| Document summarization | `doc_summary` | Per-document cost attribution |
| Code generation | `code_assist` | Developer productivity metrics |
| RAG search | `semantic_search` | Embedding costs often overlooked |

**Talk track:** "Each Use Case becomes a line item you can budget, monitor, and optimize independently."

### Properties = Dimensions for Analysis

```python
track_context(
    use_case_name="customer_chat",
    user_id="user@customer.com",        # Who
    use_case_properties={
        "customer_tier": "enterprise",   # Segmentation
        "department": "sales",           # Chargeback
        "prompt_version": "v2.3",        # A/B testing
    }
)
```

**Talk track:** "Think of properties like tags in your monitoring system. Slice and dice costs by any dimension that matters to your business."

### Limits = Guardrails

| Limit Type | `block` | `allow` |
|------------|---------|---------|
| Behavior | Rejects request when exceeded | Permits but alerts |
| Use case | Hard budget caps, prevent runaway | Soft budgets, planning |
| Example | Per-user daily limit | Monthly department budget |

**Talk track:** "You wouldn't deploy to prod without circuit breakers. Limits are circuit breakers for AI spend."

### KPIs = Business Correlation

Don't just track cost—track outcomes:

```python
# After successful customer interaction
record_kpi("customer_chat", instance_id, "resolved_ticket", True)
record_kpi("customer_chat", instance_id, "csat_score", 4.5)
```

Now you can answer: **"What's our cost per resolved ticket?"**

**Talk track:** "This is where Pay-i becomes strategic—not just cost tracking, but ROI measurement."

---

## TrailblazerAI as a Demo Asset

### What It Demonstrates

| Feature | Where to Show | Customer Value |
|---------|---------------|----------------|
| Use Case tracking | Trail Finder search → Pay-i dashboard | "Every search is attributed" |
| Multi-model support | Anthropic (analysis) + Judge model | "Works across providers" |
| Properties | Location, vehicle type in trail searches | "Segment by any dimension" |
| Proxy pattern | `services/payi-proxy/` | "Works with any language" |
| Background validation | Judge model evaluates responses | "Quality + cost together" |

### Demo Flow

1. **Show the app** - "This is an AI-powered trail planning app"
2. **Trigger a search** - Search for trails near "Moab, Utah"
3. **Show Pay-i dashboard** - "That search just appeared, fully attributed"
4. **Highlight dimensions** - "I can see it was trail_finder, from this user, searching Moab"
5. **Show cost** - "It cost $0.04, used 2,500 input tokens"
6. **Show trends** - "Over time, I can see which features cost most"

### Code Walkthrough Points

**For the "how does it work" conversation:**

```
1. src/app/api/trail-finder/search/route.ts
   - Shows: Conditional routing to proxy vs direct
   - Line 228: isPayiProxyEnabled() check
   - Line 231-242: Passing use_case_name and properties

2. services/payi-proxy/main.py
   - Shows: SDK instrumentation in action
   - Line 50-58: payi_instrument() at startup
   - Line 140: track_context() wrapping API calls

3. src/lib/payi-client.ts
   - Shows: REST API integration for TypeScript
   - Full client for limits, use cases, KPIs
```

---

## Integration Complexity Assessment

### Quick Wins (Days)

| Scenario | Effort | Approach |
|----------|--------|----------|
| Single Python service | 1-2 days | SDK instrumentation |
| Monolith with one AI feature | 2-3 days | SDK + use case setup |
| Existing proxy/gateway | 1 day | Add instrumentation to gateway |

### Medium Effort (Weeks)

| Scenario | Effort | Approach |
|----------|--------|----------|
| Multiple services, one language | 1-2 weeks | SDK in each service |
| Need TypeScript/Node support | 1-2 weeks | Deploy proxy service |
| Complex use case hierarchy | 2 weeks | Design use cases, properties |

### Larger Projects (Months)

| Scenario | Effort | Approach |
|----------|--------|----------|
| Polyglot microservices | 4-6 weeks | Proxy pattern + REST fallback |
| Enterprise with chargeback | 6-8 weeks | Properties design, integrations |
| Regulated industry | 8+ weeks | Compliance review, audit logs |

---

## Common Objections & Responses

### "We can build this ourselves"

**Response:** "You absolutely can—and many teams start there. What we hear is that it works for the first feature, but becomes a maintenance burden at scale. The SDK monkey-patching, cross-provider normalization, real-time limits engine—that's 6-12 months of eng time. Most teams decide that's not core to their business."

### "What data do you see?"

**Response:** "Token counts, model used, timing, and the metadata you choose to send (use case, user ID, properties). We never see prompt content or responses. Think of it like APM—we see the shape of the request, not the payload."

### "We're only using one provider"

**Response:** "Most companies start that way. But you'll likely add a second provider within 12 months—for cost, capability, or redundancy. Pay-i normalizes across providers so your cost tracking doesn't break when you add Gemini or switch models."

### "Our volume is too low to matter"

**Response:** "That's actually the best time to instrument. Set up attribution now while it's easy—before you have 50 features and no idea which one caused that spike. The SDK overhead is negligible."

### "We need it on-prem"

**Response:** "Currently SaaS-only, but we only receive telemetry—no prompts or responses. For regulated industries, we can discuss data residency options. What's the specific compliance requirement?"

---

## Customer Qualification Questions

### Technical Fit

1. "What AI providers are you using today? Planning to add?"
2. "What languages are your AI services written in?"
3. "Do you have a centralized API gateway, or direct provider calls?"
4. "How many distinct AI features/use cases do you have?"

### Business Fit

1. "Who owns the AI budget? Engineering? Product? Finance?"
2. "Do you need to charge back AI costs to teams or customers?"
3. "Have you had any surprise AI bills?"
4. "How do you measure ROI on your AI features today?"

### Urgency Signals

- Recent unexpected bill
- Scaling from pilot to production
- Adding AI to customer-facing product
- Finance asking for cost attribution
- Security/compliance review of AI usage

---

## Resources

### Internal

- [Pay-i Documentation](https://docs.pay-i.com)
- TrailblazerAI repo: `github.com/swharr/TrailblazerAI`
- Pay-i Python SDK: `pip install payi`

### Key Files in TrailblazerAI

```
docs/PAY-I-ARCHITECTURE.md     # Technical deep-dive
src/lib/payi-client.ts         # TypeScript REST client
services/payi-proxy/           # Python proxy service
  ├── main.py                  # FastAPI + instrumentation
  ├── config.py                # Configuration
  └── models.py                # Request/response types
k8s/base/                      # Kubernetes deployment
  ├── payi-proxy-deployment.yaml
  └── payi-proxy-service.yaml
```

### Demo Environment

- App URL: `https://trailblazer.harrislab.dev`
- Admin panel: `/admin` (requires admin user)
- Pay-i setup: Admin panel → "Run Setup" button

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PAY-I QUICK REFERENCE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WHAT: Observability & governance for GenAI spend                   │
│                                                                      │
│  HOW: SDK instrumentation or REST API                               │
│                                                                      │
│  KEY CONCEPTS:                                                       │
│    • Use Case = Feature you're tracking                             │
│    • Properties = Dimensions for analysis                           │
│    • Limits = Spending guardrails                                   │
│    • KPIs = Business outcome metrics                                │
│                                                                      │
│  INTEGRATION OPTIONS:                                               │
│    1. Python SDK (payi_instrument) - easiest                        │
│    2. Proxy service - for non-Python apps                           │
│    3. REST API - full control                                       │
│                                                                      │
│  QUICK OBJECTION HANDLERS:                                          │
│    "Build ourselves" → 6-12 months eng time, not core               │
│    "What data?" → Telemetry only, never prompts                     │
│    "One provider" → You'll add more, normalize now                  │
│    "Low volume" → Best time to set up attribution                   │
│                                                                      │
│  DEMO: trailblazer.harrislab.dev → Trail Finder → Pay-i Dashboard  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

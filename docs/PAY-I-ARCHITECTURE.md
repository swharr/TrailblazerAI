# Pay-i Architecture & Integration Guide

> A Solutions Architect's deep-dive into Pay-i for AI cost management, attribution, and governance.

## Table of Contents

1. [What Problem Does Pay-i Solve?](#what-problem-does-pay-i-solve)
2. [Core Concepts](#core-concepts)
3. [Architecture Overview](#architecture-overview)
4. [Integration Patterns](#integration-patterns)
5. [Data Flow](#data-flow)
6. [TrailblazerAI Reference Implementation](#trailblazerai-reference-implementation)
7. [Key APIs](#key-apis)
8. [Best Practices](#best-practices)

---

## What Problem Does Pay-i Solve?

### The Challenge

When organizations adopt AI (LLMs like Claude, GPT-4, Gemini), they face several challenges:

1. **Cost Visibility** - "How much are we spending on AI, and where?"
2. **Attribution** - "Which features/users/teams are consuming AI resources?"
3. **Budget Control** - "How do we prevent runaway costs?"
4. **Optimization** - "Are we using the right models for each task?"
5. **Compliance** - "Can we track and audit AI usage?"

### Pay-i's Solution

Pay-i acts as an **instrumentation and governance layer** for AI applications:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Application                          │
├─────────────────────────────────────────────────────────────────┤
│                         Pay-i Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ Tracking │  │ Limits   │  │ KPIs     │  │ Attribution  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│              AI Providers (Anthropic, OpenAI, Google)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Use Cases

A **Use Case** represents a distinct AI-powered feature in your application.

```
Use Case: "trail_analysis"
├── Description: "AI-powered trail photo analysis"
├── Version: 2
├── Properties:
│   ├── app: "trailblazer_ai"
│   └── features: "terrain_analysis,vehicle_recommendations"
└── KPIs:
    ├── analysis_success (boolean)
    ├── difficulty_rating (numeric)
    └── image_count (numeric)
```

**Why Use Cases Matter:**
- Group related AI calls together
- Track costs per feature
- Compare performance across versions
- Set feature-specific limits

### 2. Use Case Instances

Each execution of a use case creates an **Instance** with a unique ID.

```
Use Case Instance: "trail_analysis/inst_abc123"
├── User: "user@example.com"
├── Timestamp: "2024-01-15T10:30:00Z"
├── Properties:
│   ├── trail_name: "Rubicon Trail"
│   └── vehicle_make: "Toyota"
├── AI Calls: 1
├── Input Tokens: 1,500
├── Output Tokens: 800
└── Cost: $0.0234
```

### 3. Limits

**Limits** control spending at various levels:

| Limit Type | Example | Behavior |
|------------|---------|----------|
| `block` | $100/day budget | Rejects requests when exceeded |
| `allow` | $500/month soft limit | Allows requests but alerts |

Limits can be scoped to:
- Global (entire application)
- Per user
- Per use case
- Per team/account

### 4. KPIs (Key Performance Indicators)

**KPIs** track business-level metrics alongside AI usage:

```typescript
// After successful analysis
await payi.recordKpi('trail_analysis', instanceId, 'analysis_success', true);
await payi.recordKpi('trail_analysis', instanceId, 'difficulty_rating', 4);
```

This enables questions like:
- "What's the average cost per successful analysis?"
- "Do higher difficulty trails require more tokens?"

### 5. Properties

**Properties** add context to AI requests for filtering and analysis:

| Property Type | Scope | Example |
|---------------|-------|---------|
| Use Case Properties | All instances | `app: "trailblazer"` |
| Request Properties | Single request | `image_count: "3"` |

---

## Architecture Overview

### Pay-i Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Pay-i Platform                               │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Ingest API  │  │  Limits API  │  │  Analytics Dashboard     │  │
│  │              │  │              │  │                          │  │
│  │ - Track usage│  │ - Create     │  │ - Cost visualization     │  │
│  │ - Record KPIs│  │ - Check      │  │ - Usage trends           │  │
│  │ - Attribute  │  │ - Enforce    │  │ - Use case breakdown     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Python SDK (payi)                          │  │
│  │                                                                │  │
│  │  payi_instrument()  - Auto-wrap AI clients                    │  │
│  │  track_context()    - Set use case context for requests       │  │
│  │  get_context()      - Retrieve current context                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### How Instrumentation Works

The Pay-i SDK uses **monkey-patching** to intercept AI provider calls:

```python
# Before instrumentation
client = anthropic.Anthropic()
response = client.messages.create(...)  # Direct to Anthropic

# After payi_instrument()
payi_instrument()
client = anthropic.Anthropic()
response = client.messages.create(...)  # Intercepted by Pay-i
                                         # 1. Checks limits
                                         # 2. Calls Anthropic
                                         # 3. Records usage
                                         # 4. Returns response
```

---

## Integration Patterns

### Pattern 1: Direct SDK Instrumentation (Python)

**Best for:** Python applications with direct AI provider access

```python
from payi.lib.instrument import payi_instrument, track_context

# Initialize once at startup
payi_instrument()

# Create AI client (automatically instrumented)
client = anthropic.Anthropic()

# Make tracked requests
with track_context(
    use_case_name="trail_analysis",
    user_id="user@example.com",
    use_case_properties={"trail_name": "Rubicon"}
):
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        messages=[{"role": "user", "content": prompt}]
    )
```

**Pros:**
- Automatic token counting
- Automatic cost calculation
- Minimal code changes

**Cons:**
- Python only
- Requires SDK in your runtime

---

### Pattern 2: REST Ingest API (Any Language)

**Best for:** Non-Python applications, custom tracking

```typescript
// After making an AI call, report to Pay-i
const response = await fetch('https://api.pay-i.com/api/v1/ingest', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PAYI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    category: 'system.anthropic',
    resource: 'claude-sonnet-4-20250514',
    units: {
      text: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    },
    use_case_name: 'trail_analysis',
    user_id: 'user@example.com',
    use_case_properties: {
      trail_name: 'Rubicon Trail',
    },
  }),
});
```

**Pros:**
- Language agnostic
- Full control over what's tracked

**Cons:**
- Manual token counting
- More code to maintain

---

### Pattern 3: Proxy Service (Recommended for Production)

**Best for:** Multi-service architectures, TypeScript/Node.js apps

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Next.js    │────▶│  Pay-i Proxy │────▶│  Anthropic   │
│     App      │     │   (Python)   │     │     API      │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Pay-i API  │
                     └──────────────┘
```

**How it works:**
1. Your app sends requests to the proxy (not directly to AI provider)
2. Proxy uses Pay-i SDK for automatic instrumentation
3. Proxy forwards requests to AI provider
4. All tracking is transparent to your app

**Pros:**
- Centralized instrumentation
- Works with any frontend language
- Easy to add/change tracking logic

**Cons:**
- Additional service to deploy
- Slight latency overhead

---

## Data Flow

### Complete Request Flow (Proxy Pattern)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            REQUEST FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

1. User triggers Trail Finder search
   │
   ▼
2. Next.js API Route (/api/trail-finder/search)
   │
   │  POST {
   │    prompt: "Find trails near Moab, Utah",
   │    model: "claude-sonnet-4-20250514",
   │    use_case_name: "trail_finder",
   │    use_case_properties: { location: "Moab, Utah" }
   │  }
   │
   ▼
3. Pay-i Proxy Service (Python/FastAPI)
   │
   │  a) payi_instrument() already initialized
   │  b) with track_context(use_case_name="trail_finder", ...):
   │
   ▼
4. Anthropic API Call (auto-instrumented)
   │
   │  ┌─────────────────────────────────┐
   │  │ Pay-i SDK intercepts:           │
   │  │ - Checks limits (not exceeded?) │
   │  │ - Forwards to Anthropic         │
   │  │ - Captures response             │
   │  │ - Records: tokens, cost, etc.   │
   │  │ - Reports to Pay-i API          │
   │  └─────────────────────────────────┘
   │
   ▼
5. Response flows back
   │
   │  {
   │    text: "{ recommendations: [...] }",
   │    usage: { input_tokens: 2500, output_tokens: 1200 },
   │    use_case_id: "inst_xyz789"
   │  }
   │
   ▼
6. Next.js returns results to user


┌─────────────────────────────────────────────────────────────────────────┐
│                      PAY-I DASHBOARD SHOWS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Use Case: trail_finder                                                  │
│  ├── Total Requests: 1,247                                              │
│  ├── Total Cost: $45.23                                                 │
│  ├── Avg Cost/Request: $0.036                                           │
│  └── By User:                                                           │
│      ├── user1@example.com: $12.50 (347 requests)                       │
│      └── user2@example.com: $8.75 (289 requests)                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## TrailblazerAI Reference Implementation

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TrailblazerAI Architecture                        │
└─────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │   User Browser  │
                         └────────┬────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster (AKS)                          │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js Application                           │   │
│  │                                                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │   /analyze  │  │/trail-finder│  │  /admin                 │  │   │
│  │  │             │  │             │  │                         │  │   │
│  │  │ Trail photo │  │ AI search   │  │ - Provider config       │  │   │
│  │  │ analysis    │  │ with web    │  │ - Pay-i setup           │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  │ - Judge model config    │  │   │
│  │         │                │         └─────────────────────────┘  │   │
│  │         │                │                                       │   │
│  │         │    ┌───────────┴───────────┐                          │   │
│  │         │    │   isPayiProxyEnabled? │                          │   │
│  │         │    └───────────┬───────────┘                          │   │
│  │         │                │                                       │   │
│  │         │         Yes    │    No                                 │   │
│  │         │    ┌───────────┴───────────┐                          │   │
│  │         ▼    ▼                       ▼                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│            │                            │                               │
│            ▼                            │                               │
│  ┌─────────────────────┐               │                               │
│  │   Pay-i Proxy       │               │                               │
│  │   (Python/FastAPI)  │               │                               │
│  │                     │               │                               │
│  │  payi_instrument()  │               │                               │
│  │  track_context()    │               │                               │
│  └──────────┬──────────┘               │                               │
│             │                          │                               │
└─────────────┼──────────────────────────┼───────────────────────────────┘
              │                          │
              ▼                          ▼
       ┌──────────────┐           ┌──────────────┐
       │ Anthropic API│           │ Anthropic API│
       │ (instrumented)│          │   (direct)   │
       └──────────────┘           └──────────────┘
              │
              ▼
       ┌──────────────┐
       │   Pay-i API  │
       │              │
       │ - Ingest     │
       │ - Limits     │
       │ - Analytics  │
       └──────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/payi-client.ts` | TypeScript client for Pay-i REST API |
| `services/payi-proxy/main.py` | Python proxy with SDK instrumentation |
| `services/payi-proxy/config.py` | Proxy configuration |
| `src/app/api/admin/payi-setup/route.ts` | Creates use cases, KPIs, limits |
| `k8s/base/payi-proxy-deployment.yaml` | K8s deployment for proxy |

### Use Cases Defined

```typescript
const useCaseDefinitions = [
  {
    use_case_name: 'trail_analysis',
    description: 'AI-powered trail photo analysis',
    properties: {
      app: 'trailblazer_ai',
      version: '2',
      features: 'terrain_analysis,vehicle_recommendations',
    },
  },
  {
    use_case_name: 'trail_finder',
    description: 'AI-powered trail search with web search',
    properties: {
      app: 'trailblazer_ai',
      version: '1',
      features: 'web_search,vehicle_matching',
    },
  },
  {
    use_case_name: 'trail_planner',
    description: 'AI-powered route planning',
    properties: {
      app: 'trailblazer_ai',
      version: '1',
    },
  },
];
```

### Environment Variables

```bash
# Pay-i Configuration
PAYI_API_KEY=pi_xxx           # API key for REST calls
PAYI_BASE_URL=https://your-instance.pay-i.com
PAYI_PROXY_URL=http://payi-proxy:8000  # Internal K8s service URL

# The proxy also needs:
ANTHROPIC_API_KEY=sk-xxx      # For forwarding to Anthropic
```

---

## Key APIs

### Ingest API

**Purpose:** Report AI usage to Pay-i

```bash
POST /api/v1/ingest
Authorization: Bearer ${PAYI_API_KEY}

{
  "category": "system.anthropic",
  "resource": "claude-sonnet-4-20250514",
  "units": {
    "text": {
      "input": 1500,
      "output": 800
    }
  },
  "use_case_name": "trail_analysis",
  "use_case_id": "inst_abc123",
  "user_id": "user@example.com",
  "use_case_properties": {
    "trail_name": "Rubicon Trail"
  }
}
```

### Limits API

**Create a limit:**
```bash
POST /api/v1/limits

{
  "limit_name": "daily_analysis_budget",
  "max": 10.0,
  "threshold": 8.0,
  "limit_type": "allow"
}
```

**Check a limit:**
```bash
GET /api/v1/limits/{limit_id}
```

### Use Cases API

**Create use case definition:**
```bash
POST /api/v1/use_cases/definitions

{
  "use_case_name": "trail_analysis",
  "description": "AI-powered trail photo analysis",
  "properties": {
    "app": "trailblazer_ai"
  }
}
```

**Record KPI:**
```bash
POST /api/v1/use_cases/instances/{use_case_name}/{use_case_id}/kpis/{kpi_name}

{
  "value": 4.5
}
```

---

## Best Practices

### 1. Design Use Cases Around Features

```
Good:
├── trail_analysis (one feature)
├── trail_finder (another feature)
└── trail_planner (third feature)

Bad:
├── ai_calls (too generic)
└── expensive_operations (not meaningful)
```

### 2. Use Properties for Segmentation

```typescript
// Enable filtering by these dimensions later
use_case_properties: {
  customer_tier: 'enterprise',
  region: 'us-west',
  feature_flag: 'new_algorithm',
}
```

### 3. Version Your Use Cases

When you change prompts or models significantly:

```typescript
// v1: Basic analysis
use_case_name: 'trail_analysis'
use_case_version: 1

// v2: Added vehicle recommendations
use_case_name: 'trail_analysis'
use_case_version: 2
```

### 4. Set Limits Before Production

```typescript
// Start conservative, adjust based on data
const limits = [
  { name: 'daily_budget', max: 50.0, type: 'block' },
  { name: 'monthly_budget', max: 500.0, type: 'allow' },
  { name: 'per_user_daily', max: 5.0, type: 'block' },
];
```

### 5. Use the Proxy Pattern for Non-Python Apps

The proxy pattern provides:
- Clean separation of concerns
- Easy debugging (logs in one place)
- Language-agnostic frontend
- Centralized limit enforcement

### 6. Track Business KPIs

Don't just track tokens—track outcomes:

```typescript
// After successful analysis
await recordKpi('analysis_success', true);
await recordKpi('user_satisfaction', rating);

// Now you can answer: "Cost per satisfied user"
```

---

## Troubleshooting

### "Unattributed" Requests in Dashboard

**Cause:** Use case definitions don't exist in Pay-i

**Fix:** Run the setup endpoint:
```bash
POST /api/admin/payi-setup
```

### Proxy Not Receiving Requests

**Check:**
1. `PAYI_PROXY_URL` environment variable is set
2. Proxy service is running: `kubectl get pods -l app=payi-proxy`
3. Service is accessible: `kubectl port-forward svc/payi-proxy 8000:8000`

### Limits Not Enforcing

**Check:**
1. Limit `limit_type` is `block` (not `allow`)
2. Limit is associated with requests via `limit_ids` parameter
3. Limit hasn't been reset (check `limit_creation_timestamp`)

---

## Further Reading

- [Pay-i Documentation](https://docs.pay-i.com)
- [Pay-i Python SDK](https://github.com/pay-i/payi-python)
- [TrailblazerAI Source Code](https://github.com/swharr/TrailblazerAI)

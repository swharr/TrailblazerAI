# Pay-i Learning Path

> Learn Pay-i by exploring TrailblazerAI. This is your hands-on onboarding guide.

## Prerequisites

- [ ] Access to this repo (`TrailblazerAI`)
- [ ] Pay-i dashboard access (get from your manager)
- [ ] Basic familiarity with TypeScript, Python, and Kubernetes
- [ ] Docker Desktop installed locally

---

## Learning Path Overview

```
Module 1: The Problem (30 min)
    ↓
Module 2: Core Concepts (1 hour)
    ↓
Module 3: SDK Instrumentation (1.5 hours)
    ↓
Module 4: The Proxy Pattern (1.5 hours)
    ↓
Module 5: REST API Client (1 hour)
    ↓
Module 6: Production Deployment (1 hour)
    ↓
Module 7: Demo & Customer Conversations (1 hour)
```

---

## Module 1: The Problem

### Exercise 1.1: Experience the Problem

Before understanding the solution, experience the problem.

1. **Look at the direct Anthropic call** in `src/app/api/analyze/route.ts`:

```bash
# Find where we call Anthropic directly (fallback path)
grep -n "new Anthropic" src/app/api/analyze/route.ts
```

Look at lines ~580-620. This is the "no Pay-i" path. Notice:
- We get `response.usage.input_tokens` and `output_tokens`
- But... where does this data go? (Nowhere, unless we build something)
- Who made this call? Which feature? What user? (Unknown)

2. **Imagine you're the VP of Engineering:**
   - You get a $15,000 AI bill at end of month
   - Which feature caused it?
   - Which users?
   - Was it a bug or legitimate usage?
   - How do you set a budget for next month?

### Exercise 1.2: What Would You Build?

Before continuing, write down:
1. What data would you capture for each AI call?
2. How would you categorize/group AI calls?
3. How would you enforce spending limits?
4. How would you handle multiple AI providers?

Keep these notes—you'll compare them to Pay-i's approach.

---

## Module 2: Core Concepts

### Exercise 2.1: Use Cases

Open `src/app/api/admin/payi-setup/route.ts` and find the use case definitions (around line 56):

```typescript
const useCaseDefinitions = [
  {
    use_case_name: 'trail_analysis',
    description: 'AI-powered trail photo analysis',
    properties: { ... },
  },
  // ...
];
```

**Questions to answer:**
1. How many use cases does TrailblazerAI define?
2. What's the difference between `trail_analysis` and `trail_finder`?
3. Why are these separate use cases instead of one "ai_calls" use case?

**Key insight:** Use Cases map to features, not API calls. One feature might make multiple AI calls, but they're all attributed to one use case instance.

### Exercise 2.2: Properties

In the same file, look at the `properties` field:

```typescript
properties: {
  app: 'trailblazer_ai',
  version: '2',
  features: 'terrain_analysis,vehicle_recommendations',
}
```

Now look at `src/app/api/trail-finder/search/route.ts` around line 214:

```typescript
const useCaseProperties: Record<string, string> = {
  location: searchInput.location,
  difficulty_pref: searchInput.difficultyPref || 'any',
  trip_length: searchInput.tripLength || 'any',
  has_vehicle: vehicleInfo ? 'true' : 'false',
};
```

**Questions:**
1. What's the difference between use case definition properties and request-time properties?
2. Why would you want to track `location` as a property?
3. What questions could you answer with these properties in the Pay-i dashboard?

### Exercise 2.3: Limits

In `payi-setup/route.ts`, find the limits section (around line 197):

```typescript
const limitsToCreate = [
  {
    limit_name: 'daily_analysis_budget',
    max: 10.0,        // $10/day
    threshold: 8.0,   // Alert at $8
    limit_type: 'allow',
  },
  // ...
];
```

**Questions:**
1. What's the difference between `block` and `allow` limit types?
2. Why have both a `max` and a `threshold`?
3. When would you use `block` vs `allow` in a real app?

### Exercise 2.4: KPIs

Look at the KPIs defined (around line 104):

```typescript
{
  useCaseName: 'trail_finder',
  kpi: {
    kpi_name: 'result_count',
    description: 'Number of trail recommendations returned',
    value_type: 'numeric',
  },
},
```

**Key insight:** KPIs let you correlate cost with business outcomes.

**Think about:** If `result_count` averages 5 trails and each search costs $0.04, you can say "It costs $0.008 per trail recommendation." That's a business metric, not just a tech metric.

---

## Module 3: SDK Instrumentation

### Exercise 3.1: Explore the Proxy Service

The proxy service uses the Pay-i Python SDK. Let's explore it.

```bash
cd services/payi-proxy
cat requirements.txt
```

Note the `payi>=0.1.0a150` dependency.

### Exercise 3.2: Understand payi_instrument()

Open `services/payi-proxy/main.py` and find the lifespan handler (around line 37):

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ...
    payi_instrument(
        config={
            "use_case_properties": {
                "app": "trailblazer_ai",
                "service": settings.service_name,
            },
        }
    )
```

**What's happening:**
1. `payi_instrument()` is called ONCE at startup
2. It monkey-patches the Anthropic client library
3. ALL subsequent Anthropic calls are automatically instrumented
4. The `config` sets default properties for ALL calls from this service

### Exercise 3.3: Understand track_context()

Find the `search_trails` function (around line 280):

```python
def search_trails(...):
    # Build context
    context_kwargs = {
        "use_case_name": use_case_name,
        "user_id": requesting_user_id,
        "use_case_properties": use_case_properties or {},
    }

    # Wrap the API call in context
    with track_context(**context_kwargs):
        response = anthropic_client.messages.create(...)
```

**What's happening:**
1. `track_context()` creates a context for THIS request
2. Any AI calls inside the `with` block inherit this context
3. When the Anthropic call completes, Pay-i automatically:
   - Counts tokens
   - Calculates cost
   - Associates with the use case
   - Reports to Pay-i API

### Exercise 3.4: Run the Proxy Locally

```bash
cd services/payi-proxy

# Create a .env file
cat > .env << EOF
PAYI_API_KEY=your_key_here
PAYI_BASE_URL=https://your-instance.pay-i.com
ANTHROPIC_API_KEY=your_anthropic_key
ENVIRONMENT=development
EOF

# Install dependencies
pip install -r requirements.txt

# Run it
uvicorn main:app --reload --port 8000
```

Visit `http://localhost:8000/health` - you should see:
```json
{
  "status": "healthy",
  "payi_enabled": true,
  "anthropic_enabled": true
}
```

### Exercise 3.5: Make an Instrumented Call

With the proxy running, use curl to make a call:

```bash
curl -X POST http://localhost:8000/trail-finder \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Find easy off-road trails near Denver, Colorado. Return JSON.",
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1000,
    "user_id": "test@example.com",
    "use_case_name": "trail_finder",
    "use_case_properties": {
      "location": "Denver, Colorado",
      "difficulty": "easy"
    }
  }'
```

Now go to your Pay-i dashboard. You should see:
- A new request under `trail_finder` use case
- Token counts and cost
- Properties: location="Denver, Colorado"

---

## Module 4: The Proxy Pattern

### Exercise 4.1: Why a Proxy?

TrailblazerAI is a Next.js (TypeScript) app. The Pay-i SDK is Python.

**Options:**
1. ❌ Rewrite the app in Python (not realistic)
2. ❌ Wait for TypeScript SDK (timeline unknown)
3. ✅ Proxy pattern: TypeScript app → Python proxy → AI provider

### Exercise 4.2: Trace the Request Flow

Follow a Trail Finder request through the system:

**Step 1:** User clicks Search in the UI

**Step 2:** Frontend calls `/api/trail-finder/search`

Open `src/app/api/trail-finder/search/route.ts`:

```typescript
// Line ~228
if (isPayiProxyEnabled()) {
  // Route through proxy
  const proxyResponse = await trailFinderViaPayiProxy({
    prompt,
    model: TRAIL_FINDER_MODEL,
    // ...
  });
}
```

**Step 3:** Request goes to proxy

Open `src/lib/payi-client.ts` and find `trailFinderViaPayiProxy` (around line 880):

```typescript
export async function trailFinderViaPayiProxy(
  request: TrailFinderProxyRequest
): Promise<TrailFinderProxyResponse> {
  const proxyUrl = process.env.PAYI_PROXY_URL;
  // ...
  const response = await fetch(`${proxyUrl}/trail-finder`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
```

**Step 4:** Proxy calls Anthropic (instrumented)

Back in `services/payi-proxy/main.py`:

```python
with track_context(**context_kwargs):
    response = anthropic_client.messages.create(...)
```

**Step 5:** Proxy returns response to Next.js

**Step 6:** Next.js returns to user

### Exercise 4.3: Draw the Diagram

Without looking at the docs, draw the request flow diagram yourself. Include:
- User browser
- Next.js API route
- Pay-i Proxy
- Anthropic API
- Pay-i Platform

Compare with the diagram in `docs/PAY-I-ARCHITECTURE.md`.

---

## Module 5: REST API Client

### Exercise 5.1: Explore the TypeScript Client

Open `src/lib/payi-client.ts`. This is a full REST client for Pay-i.

Find these sections:
1. **Ingest API types** (line ~12): `PayiIngestRequest`, `PayiIngestResponse`
2. **Limits API** (line ~78): `CreateLimitRequest`, `Limit`
3. **Use Cases API** (line ~137): `CreateUseCaseDefinitionRequest`

### Exercise 5.2: The PayiClient Class

Find the `PayiClient` class (around line 200). Notice:

```typescript
class PayiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.PAYI_BASE_URL || '';
    this.apiKey = process.env.PAYI_API_KEY || '';
  }

  isEnabled(): boolean {
    return !!(this.baseUrl && this.apiKey);
  }
```

**Key methods:**
- `ingest()` - Report AI usage
- `createLimit()` / `getLimits()` - Manage limits
- `createUseCaseDefinition()` - Create use cases
- `createKpi()` / `recordKpi()` - Track KPIs

### Exercise 5.3: When Would You Use REST vs SDK?

| Scenario | Use SDK | Use REST |
|----------|---------|----------|
| Python app with direct AI calls | ✅ | |
| TypeScript app | | ✅ |
| Need custom tracking logic | | ✅ |
| Centralized proxy | ✅ | |
| Serverless functions | | ✅ |

---

## Module 6: Production Deployment

### Exercise 6.1: Kubernetes Resources

Explore the K8s manifests:

```bash
ls k8s/base/
```

Key files:
- `payi-proxy-deployment.yaml` - The proxy service
- `payi-proxy-service.yaml` - Internal service for routing
- `configmap.yaml` - Environment config

### Exercise 6.2: Deployment Configuration

Open `k8s/base/payi-proxy-deployment.yaml`:

```yaml
env:
  - name: PAYI_API_KEY
    valueFrom:
      secretKeyRef:
        name: trailblazer-ai-secrets
        key: PAYI_API_KEY
  - name: PAYI_BASE_URL
    valueFrom:
      secretKeyRef:
        name: trailblazer-ai-secrets
        key: PAYI_BASE_URL
```

**Note:** Secrets are stored in K8s secrets, not in the manifest.

### Exercise 6.3: CI/CD Integration

Open `.github/workflows/deploy-aks.yml` and find:

1. How secrets are passed to K8s
2. How the proxy image is built and pushed
3. How the Next.js app knows the proxy URL

---

## Module 7: Demo & Customer Conversations

### Exercise 7.1: Run TrailblazerAI Locally

```bash
# Start the database
docker compose up -d

# Run migrations
npx prisma migrate dev

# Start the app
npm run dev
```

Visit `http://localhost:3636`

### Exercise 7.2: Configure Pay-i Locally

1. Create `.env.local`:
```bash
PAYI_API_KEY=your_key
PAYI_BASE_URL=https://your-instance.pay-i.com
PAYI_PROXY_URL=http://localhost:8000  # If running proxy locally
```

2. Go to `/admin` and click "Run Setup"

### Exercise 7.3: Practice the Demo Flow

1. **Open the app** and navigate to Trail Finder
2. **Run a search** for "Moab, Utah"
3. **Open Pay-i dashboard** in another tab
4. **Show the attribution:**
   - Use case: `trail_finder`
   - Properties: location, difficulty
   - Cost breakdown

### Exercise 7.4: Practice Objection Handling

Have a colleague ask you these questions. Practice your responses:

1. "Why can't we just build this ourselves?"
2. "What data does Pay-i see?"
3. "We only use one AI provider."
4. "This seems like overkill for our scale."

Refer to `docs/PAY-I-SA-ONBOARDING.md` for response frameworks.

---

## Certification Checklist

Before you're ready for customer conversations, you should be able to:

### Conceptual Understanding
- [ ] Explain what problem Pay-i solves (in business terms)
- [ ] Define: Use Case, Properties, Limits, KPIs
- [ ] Explain the difference between `block` and `allow` limits
- [ ] Describe when you'd use SDK vs REST vs Proxy

### Technical Understanding
- [ ] Explain how `payi_instrument()` works
- [ ] Trace a request through the proxy pattern
- [ ] Identify where use case context is set
- [ ] Read and understand the TypeScript REST client

### Demo Capability
- [ ] Run TrailblazerAI locally with Pay-i enabled
- [ ] Demonstrate a tracked AI call
- [ ] Show attribution in Pay-i dashboard
- [ ] Navigate the TrailblazerAI codebase confidently

### Customer Conversation
- [ ] Handle "build vs buy" objection
- [ ] Handle "data privacy" question
- [ ] Ask good qualification questions
- [ ] Identify urgency signals

---

## Quick Reference

### Key Files

| What | Where |
|------|-------|
| Use case setup | `src/app/api/admin/payi-setup/route.ts` |
| TypeScript client | `src/lib/payi-client.ts` |
| Proxy entrypoint | `services/payi-proxy/main.py` |
| Request routing | `src/app/api/trail-finder/search/route.ts` |
| K8s deployment | `k8s/base/payi-proxy-deployment.yaml` |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `PAYI_API_KEY` | Authenticate to Pay-i API |
| `PAYI_BASE_URL` | Pay-i instance URL |
| `PAYI_PROXY_URL` | Internal proxy service URL |
| `ANTHROPIC_API_KEY` | For AI calls (proxy needs this) |

### Commands

```bash
# Run app locally
npm run dev

# Run proxy locally
cd services/payi-proxy && uvicorn main:app --reload

# Check proxy health
curl http://localhost:8000/health

# Run Pay-i setup (requires admin user)
curl -X POST http://localhost:3636/api/admin/payi-setup \
  -H "Authorization: Bearer <token>"
```

---

## Next Steps

After completing this learning path:

1. **Shadow a customer call** with a senior SA
2. **Build something** - add Pay-i to a personal project
3. **Read the official docs** at docs.pay-i.com
4. **Explore the dashboard** - create limits, view analytics
5. **Ask questions** - the team is here to help

Welcome to Pay-i! 🎉

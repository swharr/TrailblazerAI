# Claude Context Files

This directory contains context files for Claude Code sessions working on TrailBlazer AI.

## Files

| File | Purpose |
|------|---------|
| `session-state.md` | Current development progress, pending tasks, and session context |
| `README.md` | This file - explains the Claude context system |

## How to Use

### Starting a New Session

1. Read `session-state.md` to understand current progress
2. Check the "In Progress" and "Pending" sections for next steps
3. Update the file as you complete tasks

### Resuming Work

If picking up from a previous session:

```bash
# Check current state
cat .claude/session-state.md

# Check if database is running
docker compose ps

# Start database if needed
docker compose up -d

# Check migration status
npx prisma migrate status
```

### Key Context

- **Port**: Dev server runs on 3636 (not 3000)
- **Database**: PostgreSQL via Docker (`trailblazer-db` container)
- **Auth**: NextAuth v5 beta with Prisma adapter
- **AI**: Anthropic Claude primary, multi-provider support planned

### Current Architecture State

The trail analysis feature is **complete and working**:
- Image upload (multi-file, drag-drop)
- Vehicle configuration form
- AI analysis via Anthropic Claude
- Results display with vehicle-specific recommendations

**In progress**: Database persistence + user authentication

### Important Files to Know

| File | What It Does |
|------|--------------|
| `src/app/api/analyze/route.ts` | Main AI analysis endpoint |
| `src/lib/types.ts` | All TypeScript definitions |
| `src/lib/cost-tracker.ts` | Token/cost tracking (needs DB migration) |
| `prisma/schema.prisma` | Database schema |
| `docker-compose.yml` | PostgreSQL for local dev |

## Updating Session State

After completing significant work, update `session-state.md`:

1. Move completed items from "In Progress" to "Completed"
2. Add any new pending tasks discovered
3. Update the "Last updated" timestamp
4. Note any blockers or decisions made

## Project Links

- **GitHub**: https://github.com/swharr/TrailblazerAI
- **Local Dev**: http://localhost:3636
- **Prisma Studio**: `npx prisma studio` (after DB is running)

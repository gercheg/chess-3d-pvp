---
tracker:
  kind: linear
  project_slug: "2407928d4bf2"
  active_states:
    - Todo
    - In Progress
    - Human Review
    - Rework
    - Merging
  terminal_states:
    - Closed
    - Cancelled
    - Canceled
    - Duplicate
    - Done
polling:
  interval_ms: 10000
workspace:
  root: ~/chess-workspaces
hooks:
  after_create: |
    cp -r /d/Work/Symphony/TestForSymphony/. . 2>/dev/null || cp -r "D:/Work/Symphony/TestForSymphony/." . 2>/dev/null || true
    rm -rf .git create_issues*.ps1 2>/dev/null || true
    git init && git add -A && git commit -m "workspace init" 2>/dev/null || true
agent:
  max_concurrent_agents: 3
  max_turns: 20
codex:
  command: export PATH="/c/Users/gerch/AppData/Roaming/npm:$PATH" && codex app-server
  approval_policy: never
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: workspaceWrite
---

You are working on a Linear ticket `{{ issue.identifier }}` for the **3D Chess PvP Platform** project.

{% if attempt %}
**Continuation context:**
- This is retry attempt #{{ attempt }}. The ticket is still in an active state.
- Resume from the current workspace state instead of restarting from scratch.
- Do not repeat already-completed work unless needed for new changes.
{% endif %}

## Issue context

- **Identifier:** {{ issue.identifier }}
- **Title:** {{ issue.title }}
- **Status:** {{ issue.state }}
- **Labels:** {{ issue.labels }}
- **URL:** {{ issue.url }}

## Description

{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}

## Project context

This is a full-stack 3D chess platform with the following tech stack:
- **Monorepo**: pnpm workspaces with TypeScript
- **Frontend**: React 18 + Three.js (react-three-fiber) + Tailwind CSS + Vite
- **Backend**: Node.js + Fastify + Socket.io + Prisma ORM
- **Database**: PostgreSQL 16 + Redis 7
- **Testing**: Vitest (unit), Supertest (API), Playwright (E2E), k6 (load)
- **Infrastructure**: Docker, Terraform, GCP (Cloud Run, Cloud SQL, Memorystore)

## Project structure

```
packages/
  chess-engine/    # Pure chess logic library (zero deps)
  server/          # Fastify API + WebSocket server
  client/          # React + Three.js frontend
  admin/           # Admin panel (React)
  e2e/             # Playwright E2E tests
  loadtest/        # k6 load test scenarios
terraform/         # GCP infrastructure
docker-compose.yml # Local dev (Postgres + Redis)
```

## Instructions

1. This is an unattended orchestration session. Never ask a human to perform actions.
2. Only stop early for a true blocker (missing auth/permissions/secrets).
3. Write clean, production-quality TypeScript code.
4. Follow existing patterns in the codebase when present.
5. Add appropriate error handling and input validation.
6. Include unit tests for new functionality.
7. Commit your changes with clear commit messages.
8. Final message must report completed actions and blockers only.

## Workflow

- Start by understanding the current state of the codebase.
- If this is a new workspace, set up the project structure first.
- Implement the task described in the issue.
- Write tests as specified in the task description.
- Commit and push changes.
- Move the ticket to `In Progress` when starting work, and to `Done` when complete.

# task-inator — core MVP

A deliberately small, MCP-first personal task system focused on **capture → resurface → act → snooze/progress/complete**.

The product is optimized for ADHD-friendly use: very low-friction capture, small attention surfaces, reliable resurfacing, and minimal decision cost.

There is no frontend or calendar integration yet. The current repo is the deployable task backend: SQLite + JSON API + MCP.

## Product invariants

- **Capture first:** typing a title + Enter must always be enough.
- **Metadata is optional:** classification happens only when useful.
- **Small focus surface:** show what deserves attention, not the whole database.
- **Started is meaningful:** multi-session work can be started without being completed.
- **Snooze is legitimate:** snoozing changes resurfacing, never the real deadline.
- **Protect important/non-urgent work:** urgent trivia must not consume the whole focus view.
- **No productivity-system sprawl:** no projects, tags, kanban, habits, collaboration, or rich-text editor without a demonstrated need.

## Architecture

```text
future responsive PWA
        │
        ├── /api/*
        │
AI / MCP clients
        │
        ├── /mcp
        ▼
TaskService
        │
      SQLite
```

The same domain service backs local stdio MCP, remote MCP, and the JSON API.

## Stack

- TypeScript / Node.js 22+
- MCP TypeScript SDK v2
- stateless Streamable HTTP MCP endpoint
- local stdio MCP endpoint
- SQLite via `better-sqlite3`
- Drizzle ORM
- `chrono-node` for lightweight natural-language dates
- Vitest

## Local development

```bash
npm install
npm run typecheck
npm test
npm run dev:mcp
```

For the HTTP server, set one private bearer token:

```bash
export TASK_INATOR_TOKEN="$(openssl rand -hex 32)"
npm run dev
```

Then:

```text
GET  /healthz             public health check
GET  /api/focus           bearer auth
GET  /api/tasks           bearer auth
POST /api/tasks           bearer auth
GET  /api/tasks/:id       bearer auth
PATCH /api/tasks/:id      bearer auth
POST /api/tasks/:id/start
POST /api/tasks/:id/complete
POST /api/tasks/:id/snooze
POST /mcp                 remote MCP
```

Use:

```http
Authorization: Bearer <TASK_INATOR_TOKEN>
```

The database defaults to `./data/tasks.sqlite` and is bootstrapped automatically.

## Single-user production deployment

The intended initial host is `tasks.mhlmj.com` on the existing kmanweb infrastructure.

This is intentionally one app container and one SQLite file. No Postgres, Redis, queue, or account system.

```bash
cp .env.example .env
# replace TASK_INATOR_TOKEN with: openssl rand -hex 32
mkdir -p data
sudo chown 1000:1000 data

docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3000/healthz   # only if temporarily publishing a host port for debugging
```

`docker-compose.yml` does **not** publish the application port to the host. The app joins the existing external Docker network `reverse-proxy` and exposes port `3000` there.

The stable Docker alias is:

```text
tasks-mhlmj-com
```

With `ojs-inator/nginx-toolkit`, apply the public route using the running container rather than writing nginx config manually:

```bash
nginx apply \
  --domain tasks.mhlmj.com \
  --app service \
  --container task-inator \
  --container-port 3000 \
  --cdn-provider cloudflare

nginx smoke --domain tasks.mhlmj.com
```

The toolkit and application must both use the external `reverse-proxy` network.

## Local MCP client config

```json
{
  "mcpServers": {
    "tasks": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/absolute/path/to/task-inator"
    }
  }
}
```

For remote clients, use:

```text
https://tasks.mhlmj.com/mcp
```

with the bearer token configured by the client.

## MCP tools

- `create_task`
- `list_tasks`
- `get_task`
- `update_task`
- `start_task`
- `complete_task`
- `snooze_task`
- `get_focus`

Only `title` is required for capture.

`list_tasks` supports filters for `status`, `bucket`, `importance`, `urgency`, `dueBefore`, `dueAfter`, and views `today`, `tomorrow`, `this_week`, `urgent`, `important`, `overdue`, `inbox`.

## Focus behavior

`get_focus` returns separate, intentionally small groups:

- `critical`: overdue and/or urgent work
- `today`: work relevant today
- `should_start`: protected space for important non-urgent work
- `waiting`: explicit waiting tasks

A future `remindAt` suppresses a task until that time. Snoozing changes `remindAt`; it never changes `dueAt`.

## Dates and timezone

Dates are stored as ISO-8601 strings. `dueAt`, `remindAt`, and `startAt` stay independent.

Natural-language inputs include phrases such as `tomorrow morning`, `Friday`, `in 2 hours`, `this weekend`, and `next week`.

Set `TZ` for the server process so those phrases are interpreted in the user's local timezone. The production template currently uses `Europe/Prague`.

## Useful commands

```bash
npm run dev          # HTTP API + remote MCP
npm run dev:mcp      # local stdio MCP
npm run seed         # add development examples
npm run typecheck
npm test
npm run build
npm start            # compiled HTTP server
npm run start:mcp    # compiled stdio MCP
```

## Persistence

Production SQLite lives at:

```text
./data/tasks.sqlite
```

The Docker container sees it at `/app/data/tasks.sqlite`. Back up the host `data/` directory regularly.

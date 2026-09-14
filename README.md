# task-inator — core MVP

A deliberately small, MCP-first personal task system focused on **capture → resurface → act → snooze/progress/complete**.

The product is optimized for ADHD-friendly use: very low-friction capture, small attention surfaces, reliable resurfacing, and minimal decision cost.

This repository intentionally contains only the core backend. No frontend, Google Calendar, Apple integration, or custom notification engine yet.


## Product invariants

These are constraints, not wishlist items:

- **Capture first:** typing a title + Enter must always be enough.
- **Metadata is optional:** classification happens only when useful.
- **Small focus surface:** show what deserves attention, not the whole database.
- **Started is meaningful:** multi-session work can be started without being completed.
- **Snooze is legitimate:** snoozing changes resurfacing, never the real deadline.
- **Protect important/non-urgent work:** urgent trivia must not consume the whole focus view.
- **No productivity-system sprawl:** no projects, tags, kanban, habits, collaboration, or rich-text editor until there is a demonstrated need.

## Hosting

**GitHub Pages cannot host the backend in this repository.** Pages only serves static files; this core needs a running Node.js process and writable SQLite storage.

The intended deployment split is:

```text
GitHub Pages (later)
  └─ static responsive PWA
        │
        ▼
Task API / MCP service
  └─ Node.js + SQLite on a server with persistent storage
```

For now, run the MCP server locally. When the PWA is added, it can be deployed to GitHub Pages while the backend is deployed separately. The task domain/service code should remain independent of either transport.

## Stack

- TypeScript / Node.js 22.5+
- MCP TypeScript SDK v2, stdio transport
- SQLite via `better-sqlite3`
- Drizzle ORM
- chrono-node for lightweight natural-language dates
- Vitest

## Run

```bash
npm install
npm test
npm run mcp
```

The database defaults to `./data/tasks.sqlite` and is bootstrapped automatically on first run.

Optional:

```bash
npm run seed       # add 4 development tasks to an empty DB
npm run typecheck
npm run build
npm start          # run compiled dist/mcp/server.js
```

Override the database file with:

```bash
DB_FILE_NAME=/path/to/tasks.sqlite npm run mcp
```

Date parsing uses the Node process's local timezone. On a personal Mac this follows the machine timezone. You can explicitly set it when needed, e.g. `TZ=Europe/Prague npm run mcp`.

## MCP client config

After `npm install`, configure an MCP client to launch the server from this repository:

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

## Tools

- `create_task`
- `list_tasks`
- `get_task`
- `update_task`
- `start_task`
- `complete_task`
- `snooze_task`
- `get_focus`

`list_tasks` supports filters for `status`, `bucket`, `importance`, `urgency`, `dueBefore`, `dueAfter`, plus views: `today`, `tomorrow`, `this_week`, `urgent`, `important`, `overdue`, `inbox`.

## Example calls

Create with almost no metadata:

```json
{
  "name": "create_task",
  "arguments": {
    "title": "Reply to John"
  }
}
```

Create an urgent task with natural-language dates:

```json
{
  "name": "create_task",
  "arguments": {
    "title": "Reply to John",
    "importance": "important",
    "urgency": "urgent",
    "remindAt": "tomorrow morning",
    "reminderMode": "persistent"
  }
}
```

Start a multi-session task:

```json
{
  "name": "start_task",
  "arguments": {
    "task_id": "<uuid>"
  }
}
```

Snooze without moving the deadline:

```json
{
  "name": "snooze_task",
  "arguments": {
    "task_id": "<uuid>",
    "until": "tomorrow morning"
  }
}
```

Ask what deserves attention now:

```json
{
  "name": "get_focus",
  "arguments": {}
}
```

## Focus heuristic

`get_focus` deliberately returns separate groups instead of one giant sorted list:

- `critical`: overdue and/or urgent work
- `today`: due, starting, reminding, or explicitly bucketed today
- `should_start`: protected space for important non-urgent work that should begin soon
- `waiting`: explicit waiting tasks

Within each group, a simple score considers overdue state, urgency, importance, deadline proximity, whether important/urgent work is still unstarted, start time, and repeated snoozes.

A future `remindAt` suppresses a task from focus until that moment. Snoozing never changes `dueAt`.

## Schema notes

Dates are stored as ISO-8601 strings. `dueAt`, `remindAt`, and `startAt` are intentionally independent.

MVP-only internal fields `snoozeCount`, `lastSnoozedAt`, and `deletedAt` are included now because prioritization and future soft-delete support need them; no delete MCP tool is exposed yet.

Drizzle Kit is configured for later migration generation:

```bash
npm run db:generate
npm run db:push
```

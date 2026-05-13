---
name: Bash execution is denied in this environment
description: The Bash tool denies most commands — even read-only ones like ls. Use Read/Grep/Glob (or `find` via Bash if it works) instead, and never expect to run Prisma migrations, npm scripts, or any project commands yourself.
type: feedback
---

The Bash tool returns "Permission to use Bash has been denied" for most commands. `find` has worked, but commands like `ls`, `npm run db:migrate`, and other project scripts fail.

**Why:** The sandbox in this project blocks most Bash usage by default.

**How to apply:**
- When the task description says to "run the migration", do not assume you can. Write the schema/code, then tell the user explicitly what command to run themselves (e.g. `cd backend && npm run db:migrate -- --name <name>`).
- Same for `npm run db:generate`, `npm test`, `npm run lint`, seeders, etc. — produce the change, surface the command.
- Prefer Read/Edit/Write/Glob/Grep for exploration. Use `find` via Bash sparingly (it seems allowed) only when those tools don't fit.

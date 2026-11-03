# shipment-service

Node.js + TypeScript service for managing shipments. Business rules and data integrity matter more than speed here. **When in doubt, ask.**

## Stack

- Node.js 22, TypeScript (strict)
- Express for HTTP
- SQLite via better-sqlite3. No ORM, no database server
- SQL migrations in `migrations/`, numbered `NNN_description.sql`
- Vitest + supertest. Integration tests run against an in-memory SQLite database with migrations applied
- ESLint (typescript-eslint + SonarJS), Prettier, Husky

## How to work in this repo

- Grill me before coding. For any change, use me about anything unclear, then write the spec to `specs/<change>.md` with numbered acceptance criteria (AC1, AC2, ...).
- Tests first. Write failing tests for each acceptance criterion before the code. Put the AC id in the test name.
- Before you say a task is done, run `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:integration`. Show me the output.
- Keep changes small. Don't touch files the task doesn't need.

## Architecture

- `src/domain/` holds business rules as pure functions and types. No Express, no database, no `Date.now()`.
- `src/routes/` parses input, calls the domain and maps results to HTTP status codes. No business logic.
- `src/db/` holds all SQL. Repositories take the db handle so they can run inside a caller's transaction.
- Time comes from the `Clock` interface. Tests use a fixed clock. Never use real timers or sleeps in tests.

## TypeScript rules

- Model states as discriminated unions so invalid states can't be represented. An operation that only applies in one state accepts only that state's type.
- Validate external input once at the edge and turn it into branded types (for example `TerminalCode`).
- Domain functions return a `Result` (ok, or a named rule violation). Don't throw for business rule violations.
- No `any`. No non-null assertions.

## Data rules

- Foreign keys are on (`PRAGMA foreign_keys = ON`) for every connection.
- Every write that touches more than one table runs in one transaction.
- Updates to a shipment check `revision` in the WHERE clause and increment it. Zero rows updated means a conflict (error 409).
- Every change to a shipment writes a row to `shipment_audit` (shipment id, field, old value, new value, actor, timestamp) in the same transaction.
- Write endpoints require an `Idempotency-Key` header. A repeated key returns the stored response without changing data again.
- Rules the data must never break (allowed statuses, unique keys, references) are also enforced by database constraints.
- Migrations only add things. Never rename or drop in the same release as the code that stops using it.
- Never change the shape of an existing endpoint's response.

## Errors

- Rule violations return 422 with a machine-readable `code` and a readable `message`.
- Revision conflicts return 409. Unknown shipment returns 404. Invalid input returns 400.
- Unexpected errors are logged and return 500 without internal details.

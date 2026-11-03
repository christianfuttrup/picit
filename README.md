# shipment-service

Small Node.js + TypeScript service for shipments. Express 5, SQLite via better-sqlite3 (plain SQL, no ORM), Vitest + supertest. Rules for working in the repo are in [CLAUDE.md](CLAUDE.md).

## Run it

Needs Node 22.18 or newer (scripts run TypeScript directly, no build step).

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Then `curl http://localhost:3000/shipments/11111111-1111-4111-8111-111111111111`.

Seeded ids: `1111…` BOOKED, `2222…` LOADED, `3333…` IN_TRANSIT, `4444…` DELIVERED (each id repeats its digit, UUID shaped).

## Checks

```bash
npm run check   # lint, typecheck, unit tests, integration tests
```

Husky runs lint-staged (ESLint + Prettier), typecheck and unit tests on every commit. GitHub Actions runs the full check on pull requests and pushes to `main`.

Branch protection for `main` (require the `check` job to pass before merging) is a GitHub setting and is turned on in the repository settings, not in code.

## Credits

The `grill-me` and `grilling` skills in `.claude/skills/` are adapted from [Matt Pocock's skills](https://github.com/mattpocock/skills), used under the MIT License. See `.claude/skills/LICENSE`.

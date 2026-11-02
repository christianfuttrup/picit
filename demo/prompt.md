Paste everything below the line into Claude Code, started in the repo root.

---

A terminal operator needs to reroute a booked container. Add `PATCH /shipments/:id/destination`.

Request: body `{ "destination": "<terminal code>", "version": <number> }`, headers `Idempotency-Key` (required) and `X-Actor` (required).

Acceptance criteria:

- AC1: Allowed only while the shipment status is BOOKED. Rejected once it is LOADED, IN_TRANSIT or DELIVERED.
- AC2: The destination must be a known terminal.
- AC3: A stale `version` returns 409 and changes nothing.
- AC4: Sending the same idempotency key twice changes the shipment once and returns the first result.
- AC5: Idempotency keys expire after 24 hours.
- AC6: The shipment update, the audit row, the idempotency record and the outbox row commit together or not at all.
- AC7: A changed destination produces exactly one `ShipmentDestinationChanged` outbox event.

How to work, following CLAUDE.md:

1. Start in plan mode and use the grill-me skill (a hook on this repo also nudges Claude to run it). Ask me about anything unclear before you plan. I'll answer.
2. Write the agreed spec to `specs/change-destination.md` with AC1 to AC7.
3. Write the failing tests first, named by AC id: unit tests for the domain function, integration tests against a real in-memory SQLite database with migrations applied. Run them and show me they fail.
4. Then write the code: migration `002_change_destination.sql` (additive only), the domain function, the repository changes, the route.
5. Run `npm run check` and show me the output.

Don't commit. I'll review the diff and run the review agent myself.

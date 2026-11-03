# Reroute a booked shipment

A terminal operator needs to reroute a booked container to a different destination terminal.

## Endpoint

`PATCH /shipments/:id/destination`

- Header `X-Actor` (required): who made the change. Trimmed, 1 to 200 characters.
- Body: `{ "destination": "<terminal code>", "revision": <number> }`
- Success: `200` with the full updated shipment, including the new `revision`.

## Schema changes (migration `002_shipment_revision_and_audit.sql`, additive only)

- `shipments.revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1)`. Existing rows start at 1.
- New table `shipment_audit (id, shipment_id → shipments.id, field, old_value, new_value, actor, changed_at)`. `actor` must not be blank.
- `GET /shipments/:id` gains a `revision` field. No existing field changes.

## Order of checks

1. 400 input errors, in this order: id, actor, destination, revision.
2. 404 unknown shipment.
3. 409 stale revision.
4. 422 rule violations, in this order: not BOOKED, unknown terminal, destination unchanged, destination equals origin.

## Acceptance criteria

- **AC1**: The reroute is allowed only while the shipment status is `BOOKED`. For `LOADED`, `IN_TRANSIT` or `DELIVERED` it returns 422 `SHIPMENT_NOT_BOOKED`, with the current status in the message, and changes nothing.
- **AC2**: The destination must be a known terminal. A well-formed code (5 uppercase letters) that isn't in `terminals` returns 422 `UNKNOWN_TERMINAL`. A missing or malformed code (wrong length, lowercase, not a string) returns 400 `INVALID_DESTINATION`. Input is not normalised.
- **AC3**: A `revision` that doesn't match the stored revision returns 409 `REVISION_CONFLICT` and changes nothing: no update and no audit row. The `UPDATE` also checks `revision` in its `WHERE` clause and treats zero rows updated as a conflict.
- **AC4**: The shipment update and the audit row commit together or not at all. If the audit insert fails, the shipment is unchanged and the response is 500 `INTERNAL_ERROR` with no internal details.
- **AC5**: A successful reroute sets the new destination, increments `revision` by 1 and writes one `shipment_audit` row: field `destination`, old value, new value, actor and a timestamp from the injected clock.
- **AC6**: Rerouting to the current destination returns 422 `DESTINATION_UNCHANGED`. There is no revision bump and no audit row.
- **AC7**: Rerouting to the shipment's origin returns 422 `DESTINATION_EQUALS_ORIGIN`.
- **AC8**: A missing `X-Actor`, a blank one (after trimming) or one over 200 characters returns 400 `INVALID_ACTOR`. The audit row stores the trimmed value.
- **AC9**: A `revision` that isn't a positive integer (missing, 0, negative, fractional, string) returns 400 `INVALID_REVISION`.
- **AC10**: An unknown shipment id returns 404 `NOT_FOUND`. A malformed id returns 400 `INVALID_ID`.
- **AC11**: When a request breaks more than one rule, the error follows the order of checks above.
- **AC12**: `GET /shipments/:id` includes `revision`.
- **AC13**: A malformed JSON body returns 400 `INVALID_JSON` instead of 500.
- **AC14**: The database enforces `revision >= 1`, the audit row's reference to an existing shipment, and a non-blank audit `actor`.

## Out of scope

- Notifying carriers or booking systems. An `// INTEGRATION:` comment marks where that would go (an outbox row in the same transaction).
- Any other shipment field or status transition.

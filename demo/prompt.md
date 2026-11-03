A terminal operator needs to reroute a booked container. Add `PATCH /shipments/:id/destination`.

Request: body `{ "destination": "<terminal code>", "revision": <number> }`, headers `Idempotency-Key` (required) and `X-Actor` (required).

Acceptance criteria:

- AC1: Allowed only while the shipment status is BOOKED. Rejected once it is LOADED, IN_TRANSIT or DELIVERED.
- AC2: The destination must be a known terminal.
- AC3: A stale `revision` returns 409 and changes nothing.
- AC4: Sending the same idempotency key twice changes the shipment once and returns the first result.
- AC5: Idempotency keys expire after 24 hours.
- AC6: The shipment update, the audit row and the idempotency record commit together or not at all.

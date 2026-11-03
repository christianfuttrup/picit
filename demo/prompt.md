A terminal operator needs to reroute a booked container. Add `PATCH /shipments/:id/destination`.

Request: body `{ "destination": "<terminal code>", "revision": <number> }`, header `X-Actor` (required).

Acceptance criteria:

- AC1: Allowed only while the shipment status is BOOKED. Rejected once it is LOADED, IN_TRANSIT or DELIVERED.
- AC2: The destination must be a known terminal.
- AC3: A stale `revision` returns 409 and changes nothing.
- AC4: The shipment update and the audit row commit together or not at all.

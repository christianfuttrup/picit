import { Router } from 'express';
import type { Response } from 'express';
import type { Clock } from '../application/clock.ts';
import { rerouteDestination } from '../application/reroute-destination.ts';
import type { RerouteError } from '../application/reroute-destination.ts';
import type { Db } from '../db/connection.ts';
import { findById } from '../db/shipments-repo.ts';
import { parseActor, parseRevision, parseTerminalCode } from '../domain/brands.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REROUTE_STATUS: Record<RerouteError['code'], number> = {
    NOT_FOUND: 404,
    REVISION_CONFLICT: 409,
    SHIPMENT_NOT_BOOKED: 422,
    UNKNOWN_TERMINAL: 422,
    DESTINATION_UNCHANGED: 422,
    DESTINATION_EQUALS_ORIGIN: 422,
};

function badRequest(res: Response, code: string, message: string): void {
    res.status(400).json({ code, message });
}

function bodyFields(body: unknown): Record<string, unknown> {
    return typeof body === 'object' && body !== null && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
}

export function shipmentsRouter(db: Db, clock: Clock): Router {
    const router = Router();

    router.get('/shipments/:id', (req, res) => {
        const { id } = req.params;

        if (!UUID.test(id)) {
            res.status(400).json({ code: 'INVALID_ID', message: 'Shipment id must be a UUID' });
            return;
        }

        const shipment = findById(db, id);

        if (!shipment) {
            res.status(404).json({ code: 'NOT_FOUND', message: 'Shipment not found' });
            return;
        }

        res.json(shipment);
    });

    router.patch('/shipments/:id/destination', (req, res) => {
        const { id } = req.params;
        const body = bodyFields(req.body);

        if (!UUID.test(id)) {
            badRequest(res, 'INVALID_ID', 'Shipment id must be a UUID');
            return;
        }
        const actor = parseActor(req.get('X-Actor'));
        if (actor === undefined) {
            badRequest(res, 'INVALID_ACTOR', 'X-Actor header is required (1 to 200 characters)');
            return;
        }
        const destination = parseTerminalCode(body['destination']);
        if (destination === undefined) {
            badRequest(res, 'INVALID_DESTINATION', 'destination must be 5 uppercase letters');
            return;
        }
        const expectedRevision = parseRevision(body['revision']);
        if (expectedRevision === undefined) {
            badRequest(res, 'INVALID_REVISION', 'revision must be a positive integer');
            return;
        }

        const result = rerouteDestination(db, clock, {
            shipmentId: id,
            destination,
            expectedRevision,
            actor,
        });

        if (!result.ok) {
            const { code, message } = result.error;
            res.status(REROUTE_STATUS[code]).json({ code, message });
            return;
        }
        res.json(result.value);
    });

    return router;
}

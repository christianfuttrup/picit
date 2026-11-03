import type { Db } from '../db/connection.ts';
import { insertAuditEntry } from '../db/shipment-audit-repo.ts';
import { findById, updateDestination } from '../db/shipments-repo.ts';
import { terminalExists } from '../db/terminals-repo.ts';
import type { Actor, Revision, TerminalCode } from '../domain/brands.ts';
import { asBooked, rerouteBooked } from '../domain/reroute.ts';
import type { NotBooked, RerouteViolation } from '../domain/reroute.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { Shipment } from '../domain/shipment.ts';
import type { Clock } from './clock.ts';

export interface RerouteCommand {
    shipmentId: string;
    destination: TerminalCode;
    expectedRevision: Revision;
    actor: Actor;
}

export type RerouteError =
    | { code: 'NOT_FOUND'; message: string }
    | { code: 'REVISION_CONFLICT'; message: string }
    | NotBooked
    | RerouteViolation;

const NOT_FOUND: RerouteError = { code: 'NOT_FOUND', message: 'Shipment not found' };
const CONFLICT: RerouteError = {
    code: 'REVISION_CONFLICT',
    message: 'Shipment was changed by someone else. Reload it and try again.',
};

/** Reroutes a booked shipment. The update and its audit row commit in one transaction. */
export function rerouteDestination(
    db: Db,
    clock: Clock,
    cmd: RerouteCommand,
): Result<Shipment, RerouteError> {
    return db.transaction((): Result<Shipment, RerouteError> => {
        const current = findById(db, cmd.shipmentId);
        if (!current) return err(NOT_FOUND);
        if (current.revision !== cmd.expectedRevision) return err(CONFLICT);

        const booked = asBooked(current);
        if (!booked.ok) return err(booked.error);

        const rerouted = rerouteBooked(booked.value, cmd.destination, (code) =>
            terminalExists(db, code),
        );
        if (!rerouted.ok) return err(rerouted.error);

        if (!updateDestination(db, current.id, cmd.destination, cmd.expectedRevision)) {
            return err(CONFLICT);
        }
        insertAuditEntry(db, {
            shipmentId: current.id,
            field: 'destination',
            oldValue: current.destination,
            newValue: cmd.destination,
            actor: cmd.actor,
            changedAt: clock(),
        });
        // INTEGRATION: tell the carrier and booking system about the new destination.
        // Write an outbox row here, in this transaction, and let a worker deliver it.

        return ok({ ...rerouted.value, revision: current.revision + 1 });
    })();
}

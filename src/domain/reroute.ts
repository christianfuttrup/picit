import type { TerminalCode } from './brands.ts';
import { err, ok } from './result.ts';
import type { Result } from './result.ts';
import type { BookedShipment, Shipment } from './shipment.ts';

export interface NotBooked {
    code: 'SHIPMENT_NOT_BOOKED';
    message: string;
}

export interface RerouteViolation {
    code: 'UNKNOWN_TERMINAL' | 'DESTINATION_UNCHANGED' | 'DESTINATION_EQUALS_ORIGIN';
    message: string;
}

/** Narrows a shipment to BOOKED, the only state that can be rerouted. */
export function asBooked(shipment: Shipment): Result<BookedShipment, NotBooked> {
    if (shipment.status === 'BOOKED') return ok(shipment);
    return err({
        code: 'SHIPMENT_NOT_BOOKED',
        message: `Only BOOKED shipments can be rerouted; this one is ${shipment.status}`,
    });
}

/** Changes the destination of a booked shipment. Rules are checked in a fixed order. */
export function rerouteBooked(
    shipment: BookedShipment,
    destination: TerminalCode,
    isKnownTerminal: (code: TerminalCode) => boolean,
): Result<BookedShipment, RerouteViolation> {
    if (!isKnownTerminal(destination)) {
        return err({ code: 'UNKNOWN_TERMINAL', message: `Unknown terminal: ${destination}` });
    }
    if (destination === shipment.destination) {
        return err({
            code: 'DESTINATION_UNCHANGED',
            message: `Shipment is already going to ${destination}`,
        });
    }
    if (destination === shipment.origin) {
        return err({
            code: 'DESTINATION_EQUALS_ORIGIN',
            message: `Destination cannot be the origin terminal ${destination}`,
        });
    }
    return ok({ ...shipment, destination });
}

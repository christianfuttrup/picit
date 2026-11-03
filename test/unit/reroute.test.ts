import { describe, expect, it } from 'vitest';
import { parseActor, parseRevision, parseTerminalCode } from '../../src/domain/brands.ts';
import type { TerminalCode } from '../../src/domain/brands.ts';
import { asBooked, rerouteBooked } from '../../src/domain/reroute.ts';
import type { BookedShipment, Shipment } from '../../src/domain/shipment.ts';

const booked: BookedShipment = {
    id: '11111111-1111-4111-8111-111111111111',
    reference: 'SHP-0001',
    origin: 'DKAAR',
    destination: 'DEHAM',
    status: 'BOOKED',
    revision: 1,
    createdAt: '2026-10-01T08:00:00.000Z',
};

const KNOWN = new Set(['DKAAR', 'DKCPH', 'DEHAM', 'NLRTM']);
const isKnown = (code: TerminalCode): boolean => KNOWN.has(code);

function code(input: string): TerminalCode {
    const parsed = parseTerminalCode(input);
    if (parsed === undefined) throw new Error(`test setup: bad code ${input}`);
    return parsed;
}

describe('asBooked', () => {
    it('AC1: accepts a BOOKED shipment', () => {
        const result = asBooked(booked);
        expect(result.ok).toBe(true);
    });

    it.each(['LOADED', 'IN_TRANSIT', 'DELIVERED'] as const)(
        'AC1: rejects a %s shipment with SHIPMENT_NOT_BOOKED',
        (status) => {
            const shipment: Shipment = { ...booked, status };
            const result = asBooked(shipment);
            expect(result).toMatchObject({ ok: false, error: { code: 'SHIPMENT_NOT_BOOKED' } });
            if (!result.ok) expect(result.error.message).toContain(status);
        },
    );
});

describe('rerouteBooked', () => {
    it('AC5: returns the shipment with the new destination', () => {
        const result = rerouteBooked(booked, code('DKCPH'), isKnown);
        expect(result).toEqual({ ok: true, value: { ...booked, destination: 'DKCPH' } });
    });

    it('AC2: rejects an unknown terminal with UNKNOWN_TERMINAL', () => {
        const result = rerouteBooked(booked, code('SEGOT'), isKnown);
        expect(result).toMatchObject({ ok: false, error: { code: 'UNKNOWN_TERMINAL' } });
    });

    it('AC6: rejects the current destination with DESTINATION_UNCHANGED', () => {
        const result = rerouteBooked(booked, code('DEHAM'), isKnown);
        expect(result).toMatchObject({ ok: false, error: { code: 'DESTINATION_UNCHANGED' } });
    });

    it('AC7: rejects the origin with DESTINATION_EQUALS_ORIGIN', () => {
        const result = rerouteBooked(booked, code('DKAAR'), isKnown);
        expect(result).toMatchObject({ ok: false, error: { code: 'DESTINATION_EQUALS_ORIGIN' } });
    });

    it('AC11: checks unknown terminal before the other rules', () => {
        const result = rerouteBooked({ ...booked, destination: 'SEGOT' }, code('SEGOT'), isKnown);
        expect(result).toMatchObject({ ok: false, error: { code: 'UNKNOWN_TERMINAL' } });
    });
});

describe('parseTerminalCode', () => {
    it('AC2: accepts five uppercase letters', () => {
        expect(parseTerminalCode('DKCPH')).toBe('DKCPH');
    });

    it.each([['dkcph'], ['DKCP'], ['DKCPHX'], ['DK1PH'], [' DKCPH'], [123], [null], [undefined]])(
        'AC2: rejects %j',
        (input) => {
            expect(parseTerminalCode(input)).toBeUndefined();
        },
    );
});

describe('parseActor', () => {
    it('AC8: trims the actor', () => {
        expect(parseActor('  ops@terminal  ')).toBe('ops@terminal');
    });

    it('AC8: accepts 200 characters', () => {
        expect(parseActor('a'.repeat(200))).toBe('a'.repeat(200));
    });

    it.each([[undefined], [''], ['   '], ['a'.repeat(201)]])('AC8: rejects %j', (input) => {
        expect(parseActor(input)).toBeUndefined();
    });
});

describe('parseRevision', () => {
    it('AC9: accepts a positive integer', () => {
        expect(parseRevision(3)).toBe(3);
    });

    it.each([[undefined], [0], [-1], [1.5], ['1'], [null], [Number.MAX_SAFE_INTEGER + 1]])(
        'AC9: rejects %j',
        (input) => {
            expect(parseRevision(input)).toBeUndefined();
        },
    );
});

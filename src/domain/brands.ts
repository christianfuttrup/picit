declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** A UN/LOCODE-shaped terminal code: five uppercase letters. Says nothing about whether the terminal exists. */
export type TerminalCode = Brand<string, 'TerminalCode'>;
/** Who made a change: trimmed, 1 to 200 characters. */
export type Actor = Brand<string, 'Actor'>;
/** A shipment revision as sent by a client: a positive safe integer. */
export type Revision = Brand<number, 'Revision'>;

const TERMINAL_CODE = /^[A-Z]{5}$/;
const MAX_ACTOR_LENGTH = 200;

export function parseTerminalCode(input: unknown): TerminalCode | undefined {
    return typeof input === 'string' && TERMINAL_CODE.test(input)
        ? (input as TerminalCode)
        : undefined;
}

export function parseActor(input: unknown): Actor | undefined {
    if (typeof input !== 'string') return undefined;
    const trimmed = input.trim();
    return trimmed.length > 0 && trimmed.length <= MAX_ACTOR_LENGTH
        ? (trimmed as Actor)
        : undefined;
}

export function parseRevision(input: unknown): Revision | undefined {
    return typeof input === 'number' && Number.isSafeInteger(input) && input >= 1
        ? (input as Revision)
        : undefined;
}

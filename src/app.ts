import express from 'express';
import type { ErrorRequestHandler, Express } from 'express';
import { systemClock } from './application/clock.ts';
import type { Clock } from './application/clock.ts';
import type { Db } from './db/connection.ts';
import { shipmentsRouter } from './routes/shipments.ts';

function isJsonParseError(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'type' in err &&
        err.type === 'entity.parse.failed'
    );
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (isJsonParseError(err)) {
        res.status(400).json({ code: 'INVALID_JSON', message: 'Request body is not valid JSON' });
        return;
    }
    console.error(err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Something went wrong' });
};

export function buildApp(db: Db, clock: Clock = systemClock): Express {
    const app = express();
    app.use(express.json());
    app.use(shipmentsRouter(db, clock));
    app.use(errorHandler);
    return app;
}

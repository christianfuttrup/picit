import express from 'express';
import type { ErrorRequestHandler, Express } from 'express';
import type { Db } from './db/connection.ts';
import { shipmentsRouter } from './routes/shipments.ts';

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Something went wrong' });
};

export function buildApp(db: Db): Express {
    const app = express();
    app.use(express.json());
    app.use(shipmentsRouter(db));
    app.use(errorHandler);
    return app;
}

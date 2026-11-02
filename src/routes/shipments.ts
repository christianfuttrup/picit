import { Router } from 'express';
import type { Db } from '../db/connection.ts';
import { findById } from '../db/shipments-repo.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function shipmentsRouter(db: Db): Router {
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

  return router;
}

import type { Db } from './connection.ts';

export interface AuditEntry {
    shipmentId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    actor: string;
    changedAt: string;
}

export function insertAuditEntry(db: Db, entry: AuditEntry): void {
    db.prepare<[AuditEntry]>(
        `INSERT INTO shipment_audit (shipment_id, field, old_value, new_value, actor, changed_at)
         VALUES (@shipmentId, @field, @oldValue, @newValue, @actor, @changedAt)`,
    ).run(entry);
}

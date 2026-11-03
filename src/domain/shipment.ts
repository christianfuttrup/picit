interface ShipmentBase {
    id: string;
    reference: string;
    origin: string;
    destination: string;
    createdAt: string;
}

export interface BookedShipment extends ShipmentBase {
    status: 'BOOKED';
}
export interface LoadedShipment extends ShipmentBase {
    status: 'LOADED';
}
export interface InTransitShipment extends ShipmentBase {
    status: 'IN_TRANSIT';
}
export interface DeliveredShipment extends ShipmentBase {
    status: 'DELIVERED';
}

export type Shipment = BookedShipment | LoadedShipment | InTransitShipment | DeliveredShipment;
export type ShipmentStatus = Shipment['status'];

export interface OcexParty {
  id: string;
  name: string;
  qualifier?: string;
}

export interface OcexAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  street2?: string;
}

export interface OcexLineItem {
  lineNumber: number;
  sku: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  totalPrice: number;
  upc?: string;
  buyerPartNumber?: string;
  vendorPartNumber?: string;
}

interface OcexDocumentBase {
  id: string;
  version: string;
  sender: OcexParty;
  receiver: OcexParty;
  documentDate: string;
  metadata?: Record<string, unknown>;
}

export interface OcexInvoice extends OcexDocumentBase {
  type: 'invoice';
  invoiceNumber: string;
  purchaseOrderRef?: string;
  currency: string;
  lineItems: OcexLineItem[];
  subtotal?: number;
  tax?: number;
  total: number;
  shipTo?: OcexAddress;
  billTo?: OcexAddress;
  dueDate?: string;
  terms?: string;
}

export interface OcexOrder extends OcexDocumentBase {
  type: 'order';
  orderNumber: string;
  shipTo: OcexAddress;
  lineItems: OcexLineItem[];
  total: number;
  billTo?: OcexAddress;
  requestedDeliveryDate?: string;
  currency?: string;
}

export interface OcexCatalog extends OcexDocumentBase {
  type: 'catalog';
  catalogId: string;
  effectiveDate: string;
  expirationDate?: string;
  items: OcexLineItem[];
}

export interface OcexShipment extends OcexDocumentBase {
  type: 'shipment';
  shipmentId: string;
  orderRef: string;
  carrier: string;
  trackingNumber?: string;
  shipDate: string;
  estimatedDelivery?: string;
  shipFrom: OcexAddress;
  shipTo: OcexAddress;
  lineItems: OcexLineItem[];
}

export interface OcexAcknowledgment extends OcexDocumentBase {
  type: 'acknowledgment';
  referencedDocumentId: string;
  accepted: boolean;
  errors: Array<{ code: string; message: string }>;
}

export type OcexDocument =
  | OcexInvoice
  | OcexOrder
  | OcexCatalog
  | OcexShipment
  | OcexAcknowledgment;

export type OcexDocumentType = OcexDocument['type'];

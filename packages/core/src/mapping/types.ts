export interface FieldMapping {
  segment: string;
  element: number;
  component?: number;
  field: string;        // dot-path in OCEX JSON, e.g. "sender.id"
  transform?: 'trim' | 'number' | 'date' | 'acceptCode';
  qualifier?: string;   // e.g. "SE" for seller N1, "BY" for buyer N1
}

export interface LineItemMapping {
  loopSegment: string;  // segment that starts each line item loop (e.g. 'IT1')
  fields: FieldMapping[];
}

export interface TransactionMapping {
  transactionSet: string;
  ocexType: string;
  fields: FieldMapping[];
  lineItems?: LineItemMapping;
}

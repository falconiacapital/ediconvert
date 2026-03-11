export interface X12Delimiters {
  element: string;    // typically '*'
  segment: string;    // typically '~'
  component: string;  // typically ':'
  repetition: string; // typically '^'
}

export interface X12Element {
  value: string;
  components?: string[];
}

export interface X12Segment {
  tag: string;
  elements: X12Element[];
  raw: string;
}

export interface X12Envelope {
  delimiters: X12Delimiters;
  segments: X12Segment[];
  isaControlNumber: string;
  gsControlNumber: string;
  transactionSetCode: string;
}

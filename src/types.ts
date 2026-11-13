export type BillRow = {
  campus: string;
  customer: string;
  other: string;
  contract: string;
  fy: string;
  month: string;
  monthKey: string;
  kwh: number;
  amount: number;
};

export type Dataset = {
  rows: BillRow[];
  campuses: string[];
  customers: string[];
  fiscalYears: string[];
  monthKeys: string[];
};

export type Filters = {
  fiscalYears: Set<string>;
  campuses: Set<string>;
  customers: Set<string>;
  contracts: Set<string> | null;
};

export type TabId =
  | "detail-kwh"
  | "detail-amount"
  | "campus-kwh"
  | "campus-amount"
  | "bar-wo-manoa"
  | "bar-manoa"
  | "trend";

export type LeafRow = {
  campus: string;
  customer: string;
  other: string;
  contract: string;
  byMonth: Record<string, number>;
  total: number;
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPPLIER';
  company?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuctionConfig {
  id: string;
  rfq_id: string;
  trigger_window_mins: number;
  extension_mins: number;
  trigger_type: 'BID_RECEIVED' | 'ANY_RANK_CHANGE' | 'L1_RANK_CHANGE';
}

export interface Rfq {
  id: string;
  name: string;
  reference_id: string;
  description?: string;
  bid_start_time: string;
  bid_close_time: string;
  original_bid_close_time: string;
  forced_bid_close_time: string;
  pickup_date: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'FORCE_CLOSED';
  created_by_id: string;
  created_at: string;
  auction_config?: AuctionConfig;
  bid_count: number;
  lowest_bid?: number;
  created_by_name?: string;
  bids?: Bid[];
  activity_logs?: ActivityLog[];
}

export interface Bid {
  id: string;
  rfq_id: string;
  supplier_id: string | null;
  supplier_name?: string;
  supplier_company?: string;
  freight_charges: number;
  origin_charges: number;
  destination_charges: number;
  total_amount: number;
  transit_time: number;
  validity_date: string;
  created_at: string;
  rank: number;
}

export interface ActivityLog {
  id: string;
  rfq_id: string;
  event_type: string;
  description: string;
  metadata?: string;
  metadata_json?: string;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  label: string;
  input_type: string;
  category: string;
}

export interface BidSubmitPayload {
  freight_charges: number;
  origin_charges: number;
  destination_charges: number;
  transit_time: number;
  validity_date: string;
}

export interface MyBid {
  id: string;
  rfq_id: string;
  rfq_name: string;
  rfq_reference_id: string;
  rfq_status: string;
  bid_close_time: string;
  pickup_date: string;
  freight_charges: number;
  origin_charges: number;
  destination_charges: number;
  total_amount: number;
  transit_time: number;
  validity_date: string;
  created_at: string;
  rank: number;
  is_winning: boolean;
  is_auction_live: boolean;
  total_quotes_in_rfq: number;
  lowest_rfq_quote?: number | null;
}


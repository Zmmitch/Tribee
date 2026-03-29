export interface Expense {
  id: string;
  trip_id: string;
  paid_by: string;
  title: string;
  amount: number;
  category: 'transport' | 'accommodation' | 'food' | 'activity' | 'shopping' | 'other' | null;
  split_type: 'equal' | 'percentage' | 'exact' | 'by_attendee';
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  percentage: number | null;
}

export interface Settlement {
  id: string;
  trip_id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  status: 'pending' | 'paid' | 'confirmed';
  paid_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserBalance {
  user_id: string;
  total_paid: number;
  total_owed: number;
  net_balance: number;
}

// --- Request types ---

export interface CreateExpenseRequest {
  title: string;
  amount: number;
  category?: Expense['category'];
  split_type?: Expense['split_type'];
  receipt_url?: string;
  splits?: { user_id: string; amount?: number; percentage?: number }[];
}

export interface UpdateExpenseRequest {
  title?: string;
  amount?: number;
  category?: Expense['category'];
  split_type?: Expense['split_type'];
  splits?: { user_id: string; amount?: number; percentage?: number }[];
}

export interface UpdateSettlementRequest {
  status: 'paid' | 'confirmed';
}

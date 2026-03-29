import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExpenseSplit {
  user_id: string;
  amount?: number;
  percentage?: number;
}

export interface CreateExpensePayload {
  title: string;
  amount: number;
  category?: string;
  split_type?: 'equal' | 'exact' | 'percentage';
  splits?: ExpenseSplit[];
}

export interface UpdateExpensePayload {
  title?: string;
  amount?: number;
  category?: string;
  split_type?: string;
  splits?: ExpenseSplit[];
}

export interface Expense {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  category: string | null;
  split_type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  splits?: ExpenseSplit[];
}

export interface UserBalance {
  user_id: string;
  total_paid: number;
  total_owed: number;
  net_balance: number;
}

export interface Settlement {
  id: string;
  trip_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'confirmed';
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

export function createExpense(tripId: string, payload: CreateExpensePayload) {
  return api.post<Expense>(`/trips/${tripId}/expenses`, payload);
}

export function listExpenses(tripId: string) {
  return api.get<Expense[]>(`/trips/${tripId}/expenses`);
}

export function getExpense(tripId: string, expenseId: string) {
  return api.get<Expense>(`/trips/${tripId}/expenses/${expenseId}`);
}

export function updateExpense(tripId: string, expenseId: string, payload: UpdateExpensePayload) {
  return api.patch<Expense>(`/trips/${tripId}/expenses/${expenseId}`, payload);
}

export function deleteExpense(tripId: string, expenseId: string) {
  return api.delete<void>(`/trips/${tripId}/expenses/${expenseId}`);
}

export function getBalances(tripId: string) {
  return api.get<UserBalance[]>(`/trips/${tripId}/balances`);
}

export function listSettlements(tripId: string) {
  return api.get<Settlement[]>(`/trips/${tripId}/settlements`);
}

export function updateSettlement(
  tripId: string,
  settlementId: string,
  status: 'paid' | 'confirmed',
) {
  return api.patch<Settlement>(`/trips/${tripId}/settlements/${settlementId}`, { status });
}

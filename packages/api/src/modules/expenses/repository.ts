import { SupabaseClient } from '@supabase/supabase-js';
import type { Expense, ExpenseSplit, Settlement } from './types.js';

export class ExpenseRepository {
  constructor(private db: SupabaseClient) {}

  // --- Expenses ---

  async createExpense(
    expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<Expense> {
    const { data, error } = await this.db
      .from('expenses')
      .insert(expense)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getExpensesByTrip(tripId: string): Promise<Expense[]> {
    const { data, error } = await this.db
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async getExpenseById(expenseId: string): Promise<Expense | null> {
    const { data, error } = await this.db
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single();
    if (error) return null;
    return data;
  }

  async updateExpense(
    expenseId: string,
    updates: Partial<Omit<Expense, 'id' | 'trip_id' | 'paid_by' | 'created_at'>>,
  ): Promise<Expense> {
    const { data, error } = await this.db
      .from('expenses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', expenseId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const { error } = await this.db
      .from('expenses')
      .delete()
      .eq('id', expenseId);
    if (error) throw error;
  }

  // --- Splits ---

  async createSplits(splits: Omit<ExpenseSplit, 'id'>[]): Promise<ExpenseSplit[]> {
    const { data, error } = await this.db
      .from('expense_splits')
      .insert(splits)
      .select();
    if (error) throw error;
    return data ?? [];
  }

  async getSplitsByExpense(expenseId: string): Promise<ExpenseSplit[]> {
    const { data, error } = await this.db
      .from('expense_splits')
      .select('*')
      .eq('expense_id', expenseId);
    if (error) throw error;
    return data ?? [];
  }

  async deleteSplitsByExpense(expenseId: string): Promise<void> {
    const { error } = await this.db
      .from('expense_splits')
      .delete()
      .eq('expense_id', expenseId);
    if (error) throw error;
  }

  async getAllSplitsByTrip(
    tripId: string,
  ): Promise<{ expense: Expense; splits: ExpenseSplit[] }[]> {
    const expenses = await this.getExpensesByTrip(tripId);
    const result: { expense: Expense; splits: ExpenseSplit[] }[] = [];

    for (const expense of expenses) {
      const splits = await this.getSplitsByExpense(expense.id);
      result.push({ expense, splits });
    }
    return result;
  }

  // --- Settlements ---

  async getSettlementsByTrip(tripId: string): Promise<Settlement[]> {
    const { data, error } = await this.db
      .from('settlements')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async deletePendingSettlements(tripId: string): Promise<void> {
    const { error } = await this.db
      .from('settlements')
      .delete()
      .eq('trip_id', tripId)
      .eq('status', 'pending');
    if (error) throw error;
  }

  async createSettlements(
    settlements: Omit<Settlement, 'id' | 'paid_at' | 'confirmed_at' | 'created_at' | 'updated_at'>[],
  ): Promise<Settlement[]> {
    if (settlements.length === 0) return [];
    const { data, error } = await this.db
      .from('settlements')
      .insert(settlements)
      .select();
    if (error) throw error;
    return data ?? [];
  }

  async updateSettlement(
    settlementId: string,
    updates: Partial<Pick<Settlement, 'status' | 'paid_at' | 'confirmed_at'>>,
  ): Promise<Settlement> {
    const { data, error } = await this.db
      .from('settlements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', settlementId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getSettlementById(settlementId: string): Promise<Settlement | null> {
    const { data, error } = await this.db
      .from('settlements')
      .select('*')
      .eq('id', settlementId)
      .single();
    if (error) return null;
    return data;
  }
}

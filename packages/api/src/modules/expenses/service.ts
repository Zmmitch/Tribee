import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../shared/supabase.js';
import { eventBus } from '../../shared/event-bus.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../shared/errors.js';
import { ExpenseRepository } from './repository.js';
import { ExpenseEvents } from './events.js';
import { computeSettlements } from './settlement-engine.js';
import type {
  Expense,
  UserBalance,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  UpdateSettlementRequest,
} from './types.js';

export class ExpenseService {
  private repo: ExpenseRepository;
  private adminRepo: ExpenseRepository;

  constructor(userClient: SupabaseClient) {
    this.repo = new ExpenseRepository(userClient);
    this.adminRepo = new ExpenseRepository(supabaseAdmin);
  }

  private async recalculateSettlements(tripId: string, groupId: string): Promise<void> {
    const expenseData = await this.adminRepo.getAllSplitsByTrip(tripId);

    // Build balances: total_paid and total_owed per user
    const balanceMap = new Map<string, { paid: number; owed: number }>();

    for (const { expense, splits } of expenseData) {
      const entry = balanceMap.get(expense.paid_by) ?? { paid: 0, owed: 0 };
      entry.paid += Number(expense.amount);
      balanceMap.set(expense.paid_by, entry);

      for (const split of splits) {
        const splitEntry = balanceMap.get(split.user_id) ?? { paid: 0, owed: 0 };
        splitEntry.owed += Number(split.amount);
        balanceMap.set(split.user_id, splitEntry);
      }
    }

    const balances: UserBalance[] = Array.from(balanceMap.entries()).map(
      ([user_id, { paid, owed }]) => ({
        user_id,
        total_paid: paid,
        total_owed: owed,
        net_balance: paid - owed,
      }),
    );

    const transfers = computeSettlements(balances);

    // Replace only pending settlements
    await this.adminRepo.deletePendingSettlements(tripId);
    await this.adminRepo.createSettlements(
      transfers.map((t) => ({
        trip_id: tripId,
        group_id: groupId,
        from_user: t.from_user,
        to_user: t.to_user,
        amount: t.amount,
        status: 'pending' as const,
      })),
    );

    eventBus.emit(ExpenseEvents.SETTLEMENTS_RECALCULATED, { tripId });
  }

  async createExpense(
    userId: string,
    tripId: string,
    groupId: string,
    req: CreateExpenseRequest,
  ): Promise<{ expense: Expense; splits: { user_id: string; amount: number }[] }> {
    const expense = await this.repo.createExpense({
      trip_id: tripId,
      paid_by: userId,
      title: req.title,
      amount: req.amount,
      category: req.category ?? null,
      split_type: req.split_type ?? 'equal',
      receipt_url: req.receipt_url ?? null,
    });

    // Create splits
    const splits = (req.splits ?? []).map((s) => ({
      expense_id: expense.id,
      user_id: s.user_id,
      amount: s.amount ?? 0,
      percentage: s.percentage ?? null,
    }));

    if (splits.length > 0) {
      await this.repo.createSplits(splits);
    }

    await this.recalculateSettlements(tripId, groupId);
    eventBus.emit(ExpenseEvents.EXPENSE_CREATED, { expense, userId });

    return {
      expense,
      splits: splits.map((s) => ({ user_id: s.user_id, amount: s.amount })),
    };
  }

  async getExpenses(tripId: string): Promise<Expense[]> {
    return this.repo.getExpensesByTrip(tripId);
  }

  async getExpenseDetail(expenseId: string) {
    const expense = await this.repo.getExpenseById(expenseId);
    if (!expense) throw new NotFoundError('Expense', expenseId);
    const splits = await this.repo.getSplitsByExpense(expenseId);
    return { expense, splits };
  }

  async updateExpense(
    userId: string,
    expenseId: string,
    tripId: string,
    groupId: string,
    req: UpdateExpenseRequest,
  ) {
    const existing = await this.repo.getExpenseById(expenseId);
    if (!existing) throw new NotFoundError('Expense', expenseId);
    if (existing.paid_by !== userId) {
      throw new ForbiddenError('Only the payer can edit this expense');
    }

    const { splits: splitReq, ...expenseUpdates } = req;
    const expense = await this.repo.updateExpense(expenseId, expenseUpdates);

    if (splitReq) {
      await this.repo.deleteSplitsByExpense(expenseId);
      const splits = splitReq.map((s) => ({
        expense_id: expenseId,
        user_id: s.user_id,
        amount: s.amount ?? 0,
        percentage: s.percentage ?? null,
      }));
      await this.repo.createSplits(splits);
    }

    await this.recalculateSettlements(tripId, groupId);
    eventBus.emit(ExpenseEvents.EXPENSE_UPDATED, { expense, userId });
    return this.getExpenseDetail(expenseId);
  }

  async deleteExpense(
    userId: string,
    expenseId: string,
    tripId: string,
    groupId: string,
  ): Promise<void> {
    const existing = await this.repo.getExpenseById(expenseId);
    if (!existing) throw new NotFoundError('Expense', expenseId);
    if (existing.paid_by !== userId) {
      throw new ForbiddenError('Only the payer can delete this expense');
    }

    await this.repo.deleteExpense(expenseId);
    await this.recalculateSettlements(tripId, groupId);
    eventBus.emit(ExpenseEvents.EXPENSE_DELETED, { expenseId, userId });
  }

  async getBalances(tripId: string): Promise<UserBalance[]> {
    const expenseData = await this.repo.getAllSplitsByTrip(tripId);
    const balanceMap = new Map<string, { paid: number; owed: number }>();

    for (const { expense, splits } of expenseData) {
      const entry = balanceMap.get(expense.paid_by) ?? { paid: 0, owed: 0 };
      entry.paid += Number(expense.amount);
      balanceMap.set(expense.paid_by, entry);

      for (const split of splits) {
        const splitEntry = balanceMap.get(split.user_id) ?? { paid: 0, owed: 0 };
        splitEntry.owed += Number(split.amount);
        balanceMap.set(split.user_id, splitEntry);
      }
    }

    return Array.from(balanceMap.entries()).map(([user_id, { paid, owed }]) => ({
      user_id,
      total_paid: Math.round(paid * 100) / 100,
      total_owed: Math.round(owed * 100) / 100,
      net_balance: Math.round((paid - owed) * 100) / 100,
    }));
  }

  async getSettlements(tripId: string) {
    return this.repo.getSettlementsByTrip(tripId);
  }

  async updateSettlement(
    userId: string,
    settlementId: string,
    req: UpdateSettlementRequest,
  ) {
    const settlement = await this.repo.getSettlementById(settlementId);
    if (!settlement) throw new NotFoundError('Settlement', settlementId);

    if (req.status === 'paid') {
      if (settlement.from_user !== userId) {
        throw new ForbiddenError('Only the debtor can mark as paid');
      }
      return this.repo.updateSettlement(settlementId, {
        status: 'paid',
        paid_at: new Date().toISOString(),
      });
    }

    if (req.status === 'confirmed') {
      if (settlement.to_user !== userId) {
        throw new ForbiddenError('Only the creditor can confirm receipt');
      }
      return this.repo.updateSettlement(settlementId, {
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      });
    }

    throw new BadRequestError('Invalid status');
  }
}

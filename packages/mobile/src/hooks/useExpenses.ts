import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getBalances,
  listSettlements,
  updateSettlement,
  CreateExpensePayload,
  UpdateExpensePayload,
} from '../services/expenses';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  expenses: (tripId: string) => ['trips', tripId, 'expenses'] as const,
  expense: (tripId: string, id: string) => ['trips', tripId, 'expenses', id] as const,
  balances: (tripId: string) => ['trips', tripId, 'balances'] as const,
  settlements: (tripId: string) => ['trips', tripId, 'settlements'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useExpenses(tripId: string) {
  return useQuery({
    queryKey: keys.expenses(tripId),
    queryFn: () => listExpenses(tripId),
  });
}

export function useExpense(tripId: string, expenseId: string) {
  return useQuery({
    queryKey: keys.expense(tripId, expenseId),
    queryFn: () => getExpense(tripId, expenseId),
    enabled: !!expenseId,
  });
}

export function useBalances(tripId: string) {
  return useQuery({
    queryKey: keys.balances(tripId),
    queryFn: () => getBalances(tripId),
  });
}

export function useSettlements(tripId: string) {
  return useQuery({
    queryKey: keys.settlements(tripId),
    queryFn: () => listSettlements(tripId),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateExpense(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => createExpense(tripId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.expenses(tripId) });
      qc.invalidateQueries({ queryKey: keys.balances(tripId) });
      qc.invalidateQueries({ queryKey: keys.settlements(tripId) });
    },
  });
}

export function useUpdateExpense(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateExpensePayload }) =>
      updateExpense(tripId, id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.expenses(tripId) });
      qc.invalidateQueries({ queryKey: keys.balances(tripId) });
      qc.invalidateQueries({ queryKey: keys.settlements(tripId) });
    },
  });
}

export function useDeleteExpense(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => deleteExpense(tripId, expenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.expenses(tripId) });
      qc.invalidateQueries({ queryKey: keys.balances(tripId) });
      qc.invalidateQueries({ queryKey: keys.settlements(tripId) });
    },
  });
}

export function useUpdateSettlement(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'paid' | 'confirmed' }) =>
      updateSettlement(tripId, id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.settlements(tripId) });
      qc.invalidateQueries({ queryKey: keys.balances(tripId) });
    },
  });
}

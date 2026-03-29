import type { UserBalance } from './types.js';

interface SettlementTransfer {
  from_user: string;
  to_user: string;
  amount: number;
}

/**
 * Min-transaction settlement algorithm.
 *
 * 1. Compute net balance per user (total_paid - total_owed)
 * 2. Partition into creditors (positive) and debtors (negative)
 * 3. Sort creditors descending, debtors ascending by absolute value
 * 4. Match largest debtor with largest creditor
 * 5. Transfer min(|debt|, credit), reduce both
 * 6. Repeat until all balanced
 */
export function computeSettlements(
  balances: UserBalance[],
): SettlementTransfer[] {
  const creditors: { user_id: string; amount: number }[] = [];
  const debtors: { user_id: string; amount: number }[] = [];

  for (const b of balances) {
    const net = Math.round(b.net_balance * 100) / 100;
    if (net > 0.01) {
      creditors.push({ user_id: b.user_id, amount: net });
    } else if (net < -0.01) {
      debtors.push({ user_id: b.user_id, amount: Math.abs(net) });
    }
  }

  // Sort: largest first
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const transfer = Math.min(creditors[ci].amount, debtors[di].amount);
    const rounded = Math.round(transfer * 100) / 100;

    if (rounded > 0) {
      transfers.push({
        from_user: debtors[di].user_id,
        to_user: creditors[ci].user_id,
        amount: rounded,
      });
    }

    creditors[ci].amount -= transfer;
    debtors[di].amount -= transfer;

    if (creditors[ci].amount < 0.01) ci++;
    if (debtors[di].amount < 0.01) di++;
  }

  return transfers;
}

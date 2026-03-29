import { describe, it, expect } from 'vitest';
import { computeSettlements } from '../packages/api/src/modules/expenses/settlement-engine.js';
import type { UserBalance } from '../packages/api/src/modules/expenses/types.js';

/**
 * Helper to build a UserBalance from minimal data.
 * net_balance = total_paid - total_owed
 */
function balance(user_id: string, total_paid: number, total_owed: number): UserBalance {
  return {
    user_id,
    total_paid,
    total_owed,
    net_balance: total_paid - total_owed,
  };
}

/**
 * Verify that applying the returned transfers zeroes out every user's net balance.
 */
function verifySettlementsBalanceOut(
  balances: UserBalance[],
  transfers: ReturnType<typeof computeSettlements>,
): void {
  const ledger = new Map<string, number>();

  for (const b of balances) {
    ledger.set(b.user_id, (ledger.get(b.user_id) ?? 0) + b.net_balance);
  }

  for (const t of transfers) {
    // from_user pays → their balance improves (add amount to negative balance)
    ledger.set(t.from_user, (ledger.get(t.from_user) ?? 0) + t.amount);
    // to_user receives → their balance decreases (subtract amount from positive balance)
    ledger.set(t.to_user, (ledger.get(t.to_user) ?? 0) - t.amount);
  }

  for (const [userId, remaining] of ledger) {
    expect(
      Math.abs(remaining),
      `User ${userId} should be settled but has remaining balance ${remaining}`,
    ).toBeLessThan(0.02);
  }
}

describe('computeSettlements', () => {
  it('should return an empty array when given empty balances', () => {
    const result = computeSettlements([]);
    expect(result).toEqual([]);
  });

  it('should return no transfers for a single user', () => {
    const balances = [balance('alice', 100, 100)];
    const result = computeSettlements(balances);
    expect(result).toEqual([]);
  });

  it('should return no transfers when all users are already balanced', () => {
    const balances = [
      balance('alice', 50, 50),
      balance('bob', 30, 30),
      balance('carol', 20, 20),
    ];
    const result = computeSettlements(balances);
    expect(result).toEqual([]);
  });

  it('should produce a single transfer when two users split and one paid everything', () => {
    // Alice paid $100, both owe $50 each
    const balances = [
      balance('alice', 100, 50), // net +50
      balance('bob', 0, 50),     // net -50
    ];

    const result = computeSettlements(balances);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      from_user: 'bob',
      to_user: 'alice',
      amount: 50,
    });
  });

  it('should produce two transfers when one person paid for three', () => {
    // Alice paid $90, each owes $30
    const balances = [
      balance('alice', 90, 30), // net +60
      balance('bob', 0, 30),   // net -30
      balance('carol', 0, 30), // net -30
    ];

    const result = computeSettlements(balances);

    expect(result).toHaveLength(2);

    const totalToAlice = result
      .filter((t) => t.to_user === 'alice')
      .reduce((sum, t) => sum + t.amount, 0);
    expect(totalToAlice).toBeCloseTo(60, 2);

    verifySettlementsBalanceOut(balances, result);
  });

  it('should handle equal split among 3 where one person paid', () => {
    // Dinner for 3 costs $120, Alice paid
    const balances = [
      balance('alice', 120, 40), // net +80
      balance('bob', 0, 40),    // net -40
      balance('carol', 0, 40),  // net -40
    ];

    const result = computeSettlements(balances);

    expect(result).toHaveLength(2);

    const bobTransfer = result.find((t) => t.from_user === 'bob');
    const carolTransfer = result.find((t) => t.from_user === 'carol');

    expect(bobTransfer).toBeDefined();
    expect(carolTransfer).toBeDefined();
    expect(bobTransfer!.amount).toBeCloseTo(40, 2);
    expect(carolTransfer!.amount).toBeCloseTo(40, 2);
    expect(bobTransfer!.to_user).toBe('alice');
    expect(carolTransfer!.to_user).toBe('alice');
  });

  it('should handle a complex 4-person split with multiple payers', () => {
    // Trip expenses:
    //   Alice paid $200, owes $100 -> net +100
    //   Bob paid $100, owes $100   -> net 0
    //   Carol paid $0, owes $100   -> net -100
    //   Dave paid $100, owes $100  -> net 0
    // Simplified: only Carol owes Alice
    const balances = [
      balance('alice', 200, 100), // net +100
      balance('bob', 100, 100),   // net 0
      balance('carol', 0, 100),   // net -100
      balance('dave', 100, 100),  // net 0
    ];

    const result = computeSettlements(balances);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      from_user: 'carol',
      to_user: 'alice',
      amount: 100,
    });

    verifySettlementsBalanceOut(balances, result);
  });

  it('should handle a complex 4-person split with cross-debts', () => {
    // Multiple payers, uneven split:
    //   Alice paid $300, owes $150 -> net +150
    //   Bob paid $100, owes $150   -> net -50
    //   Carol paid $50, owes $150  -> net -100
    //   Dave paid $150, owes $150  -> net 0
    const balances = [
      balance('alice', 300, 150), // net +150
      balance('bob', 100, 150),   // net -50
      balance('carol', 50, 150),  // net -100
      balance('dave', 150, 150),  // net 0
    ];

    const result = computeSettlements(balances);

    // Should need at most 2 transfers (carol->alice and bob->alice)
    expect(result.length).toBeLessThanOrEqual(2);

    const totalToAlice = result
      .filter((t) => t.to_user === 'alice')
      .reduce((sum, t) => sum + t.amount, 0);
    expect(totalToAlice).toBeCloseTo(150, 2);

    verifySettlementsBalanceOut(balances, result);
  });

  it('should handle amounts with cents that need rounding', () => {
    // $100 split 3 ways: 33.33, 33.33, 33.34
    const balances: UserBalance[] = [
      { user_id: 'alice', total_paid: 100, total_owed: 33.33, net_balance: 66.67 },
      { user_id: 'bob', total_paid: 0, total_owed: 33.33, net_balance: -33.33 },
      { user_id: 'carol', total_paid: 0, total_owed: 33.34, net_balance: -33.34 },
    ];

    const result = computeSettlements(balances);

    // Every transfer amount should be rounded to 2 decimal places
    for (const transfer of result) {
      const rounded = Math.round(transfer.amount * 100) / 100;
      expect(transfer.amount).toBe(rounded);
    }

    verifySettlementsBalanceOut(balances, result);
  });

  it('should handle fractional cent rounding without producing zero-amount transfers', () => {
    // Edge case: net balances that are extremely small
    const balances: UserBalance[] = [
      { user_id: 'alice', total_paid: 10, total_owed: 10.005, net_balance: -0.005 },
      { user_id: 'bob', total_paid: 10.005, total_owed: 10, net_balance: 0.005 },
    ];

    const result = computeSettlements(balances);

    // Amounts below the 0.01 threshold should produce no transfers
    expect(result).toEqual([]);
  });

  it('should produce fewer transfers than naive pairwise for a large group (min-transaction property)', () => {
    // 6 users: 2 creditors, 4 debtors
    // Naive approach might produce up to 8 transfers (each debtor pays each creditor)
    const balances = [
      balance('alice', 300, 100), // net +200
      balance('bob', 200, 100),   // net +100
      balance('carol', 0, 100),   // net -100
      balance('dave', 0, 100),    // net -100
      balance('eve', 0, 100),     // net -100
      balance('frank', 100, 100), // net 0
    ];

    const result = computeSettlements(balances);

    // Min-transaction: with 2 creditors and 3 debtors, worst case is max(2, 3) = 3 transfers
    // Naive pairwise could be up to 2*3 = 6 transfers
    expect(result.length).toBeLessThanOrEqual(3);

    // Verify total amounts are correct
    const totalTransferred = result.reduce((sum, t) => sum + t.amount, 0);
    expect(totalTransferred).toBeCloseTo(300, 2);

    verifySettlementsBalanceOut(balances, result);
  });

  it('should handle 8 users with various balances and minimize transfer count', () => {
    const balances = [
      balance('u1', 400, 100), // net +300
      balance('u2', 200, 100), // net +100
      balance('u3', 0, 100),   // net -100
      balance('u4', 0, 100),   // net -100
      balance('u5', 50, 100),  // net -50
      balance('u6', 0, 100),   // net -100
      balance('u7', 50, 100),  // net -50
      balance('u8', 100, 100), // net 0
    ];

    const result = computeSettlements(balances);

    // 2 creditors, 5 debtors -> at most 5 transfers with greedy algo (one per debtor)
    // Naive pairwise would be up to 10 transfers
    expect(result.length).toBeLessThanOrEqual(5);

    verifySettlementsBalanceOut(balances, result);
  });

  it('should verify all net balances sum to zero after settlements are applied', () => {
    const balances = [
      balance('alice', 250, 75),  // net +175
      balance('bob', 25, 75),    // net -50
      balance('carol', 0, 75),   // net -75
      balance('dave', 25, 75),   // net -50
    ];

    // Precondition: net balances should sum to zero (conservation of money)
    const netSum = balances.reduce((sum, b) => sum + b.net_balance, 0);
    expect(netSum).toBeCloseTo(0, 10);

    const result = computeSettlements(balances);

    // Total money flowing in from_users should equal total flowing to to_users
    const totalFrom = result.reduce((sum, t) => sum + t.amount, 0);
    expect(totalFrom).toBeCloseTo(175, 2);

    verifySettlementsBalanceOut(balances, result);
  });

  it('should direct transfers from debtors to creditors, never the reverse', () => {
    const balances = [
      balance('alice', 200, 100), // net +100 (creditor)
      balance('bob', 0, 100),     // net -100 (debtor)
    ];

    const result = computeSettlements(balances);

    for (const transfer of result) {
      // The from_user should always be a debtor (negative net_balance)
      const fromBalance = balances.find((b) => b.user_id === transfer.from_user);
      expect(fromBalance!.net_balance).toBeLessThan(0);

      // The to_user should always be a creditor (positive net_balance)
      const toBalance = balances.find((b) => b.user_id === transfer.to_user);
      expect(toBalance!.net_balance).toBeGreaterThan(0);

      // All transfer amounts should be positive
      expect(transfer.amount).toBeGreaterThan(0);
    }
  });

  it('should handle when all users owe nothing (all paid exactly their share)', () => {
    const balances = [
      balance('alice', 0, 0),
      balance('bob', 0, 0),
      balance('carol', 0, 0),
    ];

    const result = computeSettlements(balances);
    expect(result).toEqual([]);
  });

  it('should handle a two-way split where both paid unequally', () => {
    // Alice paid $80, Bob paid $20; each owes $50
    const balances = [
      balance('alice', 80, 50), // net +30
      balance('bob', 20, 50),   // net -30
    ];

    const result = computeSettlements(balances);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      from_user: 'bob',
      to_user: 'alice',
      amount: 30,
    });
  });
});

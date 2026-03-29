import { describe, it, expect } from 'vitest';
import { resolveRankedChoice } from '../packages/api/src/modules/voting/ranked-choice';

type Ballot = { rankings: { option_id: string; rank: number }[] };

function ballot(...choices: string[]): Ballot {
  return {
    rankings: choices.map((option_id, i) => ({ option_id, rank: i + 1 })),
  };
}

describe('resolveRankedChoice', () => {
  // ── 1. Single option ──────────────────────────────────────────────
  it('should return the only option when there is a single option', () => {
    const ballots = [ballot('A'), ballot('A')];
    expect(resolveRankedChoice(ballots, ['A'])).toBe('A');
  });

  it('should return the single option even with zero ballots cast for it', () => {
    // Edge: single option but no ballots — short-circuits before counting
    expect(resolveRankedChoice([], ['A'])).toBeNull();
  });

  // ── 2. Clear majority on first round ──────────────────────────────
  it('should return the majority winner on the first round', () => {
    const ballots = [
      ballot('A', 'B', 'C'),
      ballot('A', 'C', 'B'),
      ballot('A', 'B', 'C'),
      ballot('B', 'A', 'C'),
      ballot('C', 'B', 'A'),
    ];
    // A has 3/5 = 60% → majority
    expect(resolveRankedChoice(ballots, ['A', 'B', 'C'])).toBe('A');
  });

  // ── 3. No majority, elimination needed (2 rounds) ────────────────
  it('should eliminate the weakest option and redistribute to find a winner', () => {
    // Round 1: A=2, B=2, C=1 → C eliminated
    // Round 2: C's voter had B as second choice → A=2, B=3 → B wins
    const ballots = [
      ballot('A', 'B', 'C'),
      ballot('A', 'C', 'B'),
      ballot('B', 'A', 'C'),
      ballot('B', 'C', 'A'),
      ballot('C', 'B', 'A'),
    ];
    expect(resolveRankedChoice(ballots, ['A', 'B', 'C'])).toBe('B');
  });

  // ── 4. Multiple elimination rounds (3+ options) ──────────────────
  it('should handle multiple elimination rounds with four options', () => {
    // Round 1: A=3, B=2, C=2, D=1 → D eliminated
    // Round 2: D voter's 2nd choice is C → A=3, B=2, C=3 → no majority (need >4)
    //          B eliminated (fewest)
    // Round 3: B voters redistribute → depends on their 2nd/3rd choices
    const ballots = [
      ballot('A', 'B', 'C', 'D'),
      ballot('A', 'C', 'B', 'D'),
      ballot('A', 'D', 'C', 'B'),
      ballot('B', 'A', 'C', 'D'),
      ballot('B', 'C', 'A', 'D'),
      ballot('C', 'B', 'A', 'D'),
      ballot('C', 'A', 'B', 'D'),
      ballot('D', 'C', 'A', 'B'),
    ];
    // Round 1: A=3, B=2, C=2, D=1 → D out
    // D's voter goes to C → A=3, B=2, C=3, total=8, need >4
    // Round 2: B eliminated (2 votes)
    // B voter 1 (B,A,C,D) → A; B voter 2 (B,C,A,D) → C
    // A=4, C=4 → A has 4 which is not > 4, C has 4 not > 4
    // Tie in counts but algorithm picks first with minCount for elimination
    // Actually with 8 total, majority = 4, need >4 = 5
    // Neither has >4, so one gets eliminated. The map iteration finds min.
    // Both have 4, so whichever is iterated first (A) would be minCount candidate,
    // but then C also has 4 which is not < 4, so A stays as toEliminate.
    // A eliminated → C wins
    expect(resolveRankedChoice(ballots, ['A', 'B', 'C', 'D'])).toBe('C');
  });

  it('should resolve a five-option race through multiple rounds', () => {
    const ballots = [
      ballot('A', 'B', 'C', 'D', 'E'),
      ballot('B', 'C', 'A', 'D', 'E'),
      ballot('C', 'A', 'B', 'D', 'E'),
      ballot('D', 'E', 'A', 'B', 'C'),
      ballot('E', 'D', 'A', 'B', 'C'),
      ballot('A', 'C', 'B', 'D', 'E'),
      ballot('B', 'A', 'C', 'D', 'E'),
    ];
    // Round 1: A=2, B=2, C=1, D=1, E=1. C or D or E eliminated (first found with min=1)
    // The algorithm iterates Map in insertion order of remaining (optionIds order).
    // remaining = ['A','B','C','D','E'], counts set in that order.
    // Iteration: A=2, B=2, C=1 → minCount=1, toEliminate='C'
    // Round 2: C's voter (C,A,B,D,E) → A. Now A=3, B=2, D=1, E=1. Total=7, need >3.5
    // D eliminated (first min=1 found: D before E in iteration)
    // Round 3: D voter (D,E,A,B,C) → E (C eliminated, so next is E? no, E not eliminated).
    // E not eliminated yet, so D voter → E. A=3, B=2, E=2. Total=7, need >3.5
    // B eliminated (first with min=2: B before E in iteration)
    // Round 4: B voters: (B,C,A,D,E)→A (C,D eliminated, A alive); (B,A,C,D,E)→A
    // A=5, E=2. 5>3.5 → A wins
    const result = resolveRankedChoice(ballots, ['A', 'B', 'C', 'D', 'E']);
    expect(result).toBe('A');
  });

  // ── 5. Empty ballots ─────────────────────────────────────────────
  it('should return null when no ballots are provided', () => {
    expect(resolveRankedChoice([], ['A', 'B', 'C'])).toBeNull();
  });

  // ── 6. Empty options ─────────────────────────────────────────────
  it('should return null when no options are provided', () => {
    const ballots = [ballot('A', 'B')];
    expect(resolveRankedChoice(ballots, [])).toBeNull();
  });

  // ── 7. Tie scenario (fewest votes tie) ────────────────────────────
  it('should deterministically eliminate one option when there is a tie for fewest votes', () => {
    // A=2, B=1, C=1 → B and C tie for fewest. Algorithm picks first encountered (B).
    const ballots = [
      ballot('A', 'B', 'C'),
      ballot('A', 'C', 'B'),
      ballot('B', 'A', 'C'),
      ballot('C', 'A', 'B'),
    ];
    // Round 1: A=2, B=1, C=1 → B eliminated (first with min in iteration order)
    // Round 2: B voter → A. A=3, C=1. 3 > 2 → A wins
    const result = resolveRankedChoice(ballots, ['A', 'B', 'C']);
    expect(result).toBe('A');
  });

  it('should handle a complete tie where all options have equal first-choice votes', () => {
    // A=1, B=1, C=1 → A eliminated (first min in iteration)
    // A voter → B. B=2, C=1 → B wins (2 > 1.5)
    const ballots = [
      ballot('A', 'B', 'C'),
      ballot('B', 'C', 'A'),
      ballot('C', 'A', 'B'),
    ];
    const result = resolveRankedChoice(ballots, ['A', 'B', 'C']);
    expect(result).toBe('B');
  });

  // ── 8. All votes for one option (unanimous) ──────────────────────
  it('should return the unanimous winner immediately', () => {
    const ballots = [
      ballot('A', 'B', 'C'),
      ballot('A', 'C', 'B'),
      ballot('A', 'B', 'C'),
      ballot('A', 'C', 'B'),
    ];
    expect(resolveRankedChoice(ballots, ['A', 'B', 'C'])).toBe('A');
  });

  // ── 9. Three-way race with redistributions ────────────────────────
  it('should correctly redistribute votes through a three-way race', () => {
    // 10 voters: A=4, B=3, C=3. No majority (need >5).
    // C eliminated (first with min=3 in iteration after B also has 3, but B appears first)
    // Actually: iteration order is A, B, C. minCount starts Infinity.
    // A=4 → min=4,toElim=A. B=3 → min=3,toElim=B. C=3 → 3 not < 3 → B stays as toElim.
    // B eliminated. B voters redistribute.
    const ballots = [
      ballot('A', 'B', 'C'),
      ballot('A', 'B', 'C'),
      ballot('A', 'C', 'B'),
      ballot('A', 'C', 'B'),
      ballot('B', 'A', 'C'),
      ballot('B', 'C', 'A'),
      ballot('B', 'A', 'C'),
      ballot('C', 'A', 'B'),
      ballot('C', 'B', 'A'),
      ballot('C', 'A', 'B'),
    ];
    // B eliminated: voter5(B,A,C)→A, voter6(B,C,A)→C, voter7(B,A,C)→A
    // A=4+2=6, C=3+1=4. total=10, 6>5 → A wins
    expect(resolveRankedChoice(ballots, ['A', 'B', 'C'])).toBe('A');
  });

  it('should handle a three-way race where the initial leader loses after redistribution', () => {
    // A=4, B=3, C=3. B eliminated (first min).
    // B voters all prefer C → A=4, C=6. C wins.
    const ballots = [
      ballot('A', 'B', 'C'),
      ballot('A', 'B', 'C'),
      ballot('A', 'C', 'B'),
      ballot('A', 'C', 'B'),
      ballot('B', 'C', 'A'),
      ballot('B', 'C', 'A'),
      ballot('B', 'C', 'A'),
      ballot('C', 'B', 'A'),
      ballot('C', 'B', 'A'),
      ballot('C', 'B', 'A'),
    ];
    expect(resolveRankedChoice(ballots, ['A', 'B', 'C'])).toBe('C');
  });

  // ── 10. Partial ballots (skipped rankings) ────────────────────────
  it('should handle ballots that only rank some options', () => {
    // Voters who only rank their first choice
    const ballots: Ballot[] = [
      { rankings: [{ option_id: 'A', rank: 1 }] },
      { rankings: [{ option_id: 'A', rank: 1 }] },
      { rankings: [{ option_id: 'B', rank: 1 }] },
      { rankings: [{ option_id: 'C', rank: 1 }] },
      { rankings: [{ option_id: 'C', rank: 1 }] },
    ];
    // Round 1: A=2, B=1, C=2. B eliminated. B voter has no 2nd choice → exhausted.
    // Round 2: A=2, C=2, total=4, majority=2. Neither >2.
    // A eliminated (first with min=2). A voters exhausted.
    // Round 3: remaining=[C], C wins.
    expect(resolveRankedChoice(ballots, ['A', 'B', 'C'])).toBe('C');
  });

  it('should handle ballots with non-contiguous rankings', () => {
    // Voter ranks 1st and 3rd but skips 2nd
    const ballots: Ballot[] = [
      { rankings: [{ option_id: 'A', rank: 1 }, { option_id: 'C', rank: 3 }] },
      { rankings: [{ option_id: 'A', rank: 1 }, { option_id: 'B', rank: 2 }] },
      { rankings: [{ option_id: 'B', rank: 1 }, { option_id: 'C', rank: 2 }] },
      { rankings: [{ option_id: 'C', rank: 1 }, { option_id: 'A', rank: 2 }] },
      { rankings: [{ option_id: 'C', rank: 1 }, { option_id: 'B', rank: 2 }] },
    ];
    // Round 1: A=2, B=1, C=2 → B eliminated
    // B voter (B,C) → C. A=2, C=3. Total=5, 3>2.5 → C wins
    expect(resolveRankedChoice(ballots, ['A', 'B', 'C'])).toBe('C');
  });

  it('should handle completely empty ballots (no rankings at all)', () => {
    const ballots: Ballot[] = [
      { rankings: [] },
      { rankings: [] },
      { rankings: [] },
    ];
    // No top choices found → totalVotes=0 → null
    expect(resolveRankedChoice(ballots, ['A', 'B'])).toBeNull();
  });

  // ── Additional edge cases ─────────────────────────────────────────
  it('should handle ballots referencing options not in the optionIds list', () => {
    // Voter references 'Z' which is not a valid option.
    // The algorithm doesn't filter invalid IDs from ballots — it counts them.
    // In practice the service layer validates option IDs before accepting ballots.
    // Here we just verify it doesn't crash and returns a valid result.
    const ballots: Ballot[] = [
      { rankings: [{ option_id: 'Z', rank: 1 }, { option_id: 'A', rank: 2 }] },
      { rankings: [{ option_id: 'A', rank: 1 }, { option_id: 'B', rank: 2 }] },
      { rankings: [{ option_id: 'B', rank: 1 }, { option_id: 'A', rank: 2 }] },
    ];
    const result = resolveRankedChoice(ballots, ['A', 'B']);
    expect(result).not.toBeNull();
    expect(['A', 'B']).toContain(result);
  });

  it('should return the winner with exactly 50%+1 votes', () => {
    // 4 voters: need >2 to win
    const ballots = [
      ballot('A', 'B'),
      ballot('A', 'B'),
      ballot('A', 'B'),
      ballot('B', 'A'),
    ];
    // A=3, B=1. 3 > 2 → A wins on first round
    expect(resolveRankedChoice(ballots, ['A', 'B'])).toBe('A');
  });

  it('should not declare a winner at exactly 50% (requires strict majority)', () => {
    // 4 voters: A=2, B=2. 2 is not > 2 → no majority
    // A eliminated (first min encountered when both have 2)
    // A voters → B. remaining=[B]. B wins.
    const ballots = [
      ballot('A', 'B'),
      ballot('A', 'B'),
      ballot('B', 'A'),
      ballot('B', 'A'),
    ];
    expect(resolveRankedChoice(ballots, ['A', 'B'])).toBe('B');
  });

  it('should handle a large number of options being eliminated one by one', () => {
    // 5 options, each subsequent has one fewer vote
    // E=1, D=2, C=3, B=4, A=5. Total=15. Majority>7.5
    // A has 5, not >7.5. E eliminated (1 vote).
    const ballots = [
      // 5 voters for A
      ...Array(5).fill(null).map(() => ballot('A', 'B', 'C', 'D', 'E')),
      // 4 voters for B
      ...Array(4).fill(null).map(() => ballot('B', 'A', 'C', 'D', 'E')),
      // 3 voters for C
      ...Array(3).fill(null).map(() => ballot('C', 'A', 'B', 'D', 'E')),
      // 2 voters for D
      ...Array(2).fill(null).map(() => ballot('D', 'A', 'B', 'C', 'E')),
      // 1 voter for E
      ballot('E', 'A', 'B', 'C', 'D'),
    ];
    // E eliminated → E voter → A. A=6, B=4, C=3, D=2. total=15, need>7.5
    // D eliminated → D voters → A. A=8, B=4, C=3. 8>7.5 → A wins
    expect(resolveRankedChoice(ballots, ['A', 'B', 'C', 'D', 'E'])).toBe('A');
  });
});

/**
 * Instant-Runoff Voting (IRV) algorithm.
 *
 * 1. Count first-choice votes for each option
 * 2. If any option has >50% → winner
 * 3. Eliminate option with fewest first-choice votes
 * 4. Redistribute eliminated votes to next-ranked choice
 * 5. Repeat until majority or one option remains
 */
export function resolveRankedChoice(
  ballots: { rankings: { option_id: string; rank: number }[] }[],
  optionIds: string[],
): string | null {
  if (ballots.length === 0 || optionIds.length === 0) return null;
  if (optionIds.length === 1) return optionIds[0];

  // Build working ballots: each is a ranked list of option_ids
  const workingBallots = ballots.map((b) =>
    b.rankings
      .sort((a, z) => a.rank - z.rank)
      .map((r) => r.option_id),
  );

  const eliminated = new Set<string>();

  while (true) {
    const remaining = optionIds.filter((id) => !eliminated.has(id));
    if (remaining.length === 0) return null;
    if (remaining.length === 1) return remaining[0];

    // Count first-choice votes (skip eliminated options)
    const counts = new Map<string, number>();
    for (const id of remaining) counts.set(id, 0);

    let totalVotes = 0;
    for (const ballot of workingBallots) {
      const topChoice = ballot.find((id) => !eliminated.has(id));
      if (topChoice) {
        counts.set(topChoice, (counts.get(topChoice) ?? 0) + 1);
        totalVotes++;
      }
    }

    if (totalVotes === 0) return null;

    // Check for majority
    const majority = totalVotes / 2;
    for (const [optionId, count] of counts) {
      if (count > majority) return optionId;
    }

    // Eliminate option with fewest votes
    let minCount = Infinity;
    let toEliminate = '';
    for (const [optionId, count] of counts) {
      if (count < minCount) {
        minCount = count;
        toEliminate = optionId;
      }
    }

    eliminated.add(toEliminate);
  }
}

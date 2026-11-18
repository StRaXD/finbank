// The gauge's one derivation, kept beside `GoalGauge.tsx` (a component file may export only components).

/**
 * The share of the target achieved, clamped to [0, 1]: 0 when the target is 0 (or not positive),
 * 1 when the achieved amount reaches or passes it. Only `GoalGauge` calls it; no other component
 * derives the ratio.
 */
export function gaugeRatio(achievedCents: number, targetCents: number): number {
  if (!(targetCents > 0) || !Number.isFinite(achievedCents)) return 0
  return Math.min(1, Math.max(0, achievedCents / targetCents))
}

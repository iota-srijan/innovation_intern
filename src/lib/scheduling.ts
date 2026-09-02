// True if [startA, startA+durationA) overlaps [startB, startB+durationB).
export function slotsOverlap(
  startA: Date,
  durationAMins: number,
  startB: Date,
  durationBMins: number,
): boolean {
  const endA = new Date(startA.getTime() + durationAMins * 60_000)
  const endB = new Date(startB.getTime() + durationBMins * 60_000)
  return startA < endB && startB < endA
}

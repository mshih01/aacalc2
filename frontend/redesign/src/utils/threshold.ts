export function computeThreshold(decimalPlaces: number): number {
  return Math.max(1e-12, 10 ** -((decimalPlaces + 3) * 2))
}

/**
 * Formats a probability percentage with a configurable number of decimals.
 * Non-zero values smaller than the smallest representable step are shown as
 * "<step%" instead of rounding down to "0.00%".
 */
export function formatPercent(value: number, places = 2): string {
  if (!Number.isFinite(value)) return '-';
  const smallest = 10 ** -places;
  if (value > 0 && value < smallest) {
    return `<${smallest.toFixed(places)}%`;
  }
  return `${value.toFixed(places)}%`;
}

/** Formats a plain numeric value with a configurable number of decimals. */
export function formatFixed(value: number, places = 1): string {
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(places);
}

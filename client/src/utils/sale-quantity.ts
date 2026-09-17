/**
 * Format a sale-line quantity for user-facing display in read-only contexts.
 *  - Exactly 0.5 → "½" (Unicode U+00BD).
 *  - Any other value → its string representation.
 *
 * Used by SaleModal summary and SaleHistoryCard line display. Edit inputs
 * (which let the user change the value) render the raw number instead.
 */
export function formatQuantityLabel(quantity: number): string {
  return quantity === 0.5 ? '½' : String(quantity);
}

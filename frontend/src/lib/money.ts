export function formatMoney(amount: string | number, currency = "TRY"): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${n.toFixed(2)} ${currency}`;
}

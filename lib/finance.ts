export interface SavingsRule {
  effective_from: string;
  effective_to: string | null;
  monthly_amount: number;
}

/**
 * Calculates total expected savings for a member from their join date to today,
 * accounting for rule changes (NPR 300 prior to 2024 -> NPR 500 current).
 */
export function calculateExpectedSavings(
  joinedDateStr: string,
  rules: SavingsRule[],
  asOfDate: Date = new Date()
): number {
  let total = 0;
  const joinedDate = new Date(joinedDateStr);
  let current = new Date(joinedDate.getFullYear(), joinedDate.getMonth(), 1);

  while (current <= asOfDate) {
    const activeRule = rules.find((rule) => {
      const from = new Date(rule.effective_from);
      const to = rule.effective_to ? new Date(rule.effective_to) : new Date('2099-12-31');
      return current >= from && current <= to;
    });

    total += activeRule ? Number(activeRule.monthly_amount) : 500;
    current.setMonth(current.getMonth() + 1);
  }

  return total;
}

/**
 * Calculates monthly interest accrued on remaining principal using the annual rate.
 */
export function calculateMonthlyInterest(remainingPrincipal: number, annualRate: number): number {
  if (remainingPrincipal <= 0) return 0;
  const monthlyRate = annualRate / 12 / 100;
  return Math.round(remainingPrincipal * monthlyRate);
}

/**
 * Calculates standard reducing-balance monthly EMI payment.
 */
export function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const r = annualRate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  return Math.round(emi);
}
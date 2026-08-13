// lib/savingsUtils.ts

// Helper: Generate all YYYY-MM months between two dates inclusive
export function getMonthsBetween(startYYYYMM: string, endYYYYMM: string): string[] {
  if (!startYYYYMM || !endYYYYMM || startYYYYMM > endYYYYMM) return [];
  
  const months: string[] = [];
  let [y, m] = startYYYYMM.split('-').map(Number);
  const [endY, endM] = endYYYYMM.split('-').map(Number);

  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${m.toString().padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

// Helper: Get required monthly rate for a specific YYYY-MM month based on contribution_rules
export function getSavingsRateForMonth(targetYYYYMM: string, rules: any[] = []): number {
  if (!rules || rules.length === 0) return 500;

  const matched = rules.find((r) => {
    const fromMonth = r.effective_from_month || (r.effective_from ? r.effective_from.slice(0, 7) : '2020-01');
    const toMonth = r.effective_to_month || (r.effective_to ? r.effective_to.slice(0, 7) : null);

    const fromOk = targetYYYYMM >= fromMonth;
    const toOk = !toMonth || targetYYYYMM <= toMonth;
    return fromOk && toOk;
  });

  return matched ? Number(matched.monthly_amount || matched.amount || 500) : 500;
}

/**
 * Calculates Multi-Month Compounding Late Savings Fine:
 * Adds +1 fine cycle for each elapsed monthly meeting cycle the deposit remains unpaid.
 */
export function calculateSavingsFine(
  missedYYYYMM: string, 
  baseAmount: number, 
  fineRules: any[] = [],
  todayDate: Date = new Date()
): number {
  if (!fineRules || fineRules.length === 0) return 0;

  const currentYYYYMM = todayDate.toISOString().slice(0, 7);
  const currentDay = todayDate.getDate();

  // RULE 1: Current month or future months have ZERO fine
  if (missedYYYYMM >= currentYYYYMM) return 0;

  const activeRule = fineRules.find((r) => {
    if (r.rule_type !== 'SAVINGS') return false;
    const fromMonth = r.effective_from_month;
    const toMonth = r.effective_to_month;
    return missedYYYYMM >= fromMonth && (!toMonth || missedYYYYMM <= toMonth);
  });

  if (!activeRule) return 0;

  const graceDays = Number(activeRule.grace_period_days || 0);

  // Calculate elapsed months between target month and current month
  const [mY, mM] = missedYYYYMM.split('-').map(Number);
  const [cY, cM] = currentYYYYMM.split('-').map(Number);
  const monthDiff = (cY - mY) * 12 + (cM - mM);

  if (monthDiff <= 0) return 0;

  // RULE 2: Calculate accumulated fine cycles based on monthly meeting cycles
  // Full past months = (monthDiff - 1). Plus current month if past grace date.
  const fineCycles = (monthDiff - 1) + (currentDay > graceDays ? 1 : 0);
  if (fineCycles <= 0) return 0;

  const rate = Number(activeRule.rate_value || 0);

  if (activeRule.fine_type === 'FLAT_MONTHLY') {
    return fineCycles * rate; // e.g. 2 cycles * 50 = 100
  } else if (activeRule.fine_type === 'PERCENTAGE') {
    return Math.round(fineCycles * ((baseAmount * rate) / 100));
  }

  return 0;
}

/**
 * Calculates Multi-Month Compounding Late Loan EMI Fine:
 * Uses identical monthly meeting cycle compounding logic as Savings deposits.
 */
export function calculateLoanFine(
  overdueEmiAmount: number, 
  dueMonthOrDays: string | number, // Accepts YYYY-MM due month OR days overdue
  fineRules: any[] = [],
  todayDate: Date = new Date()
): number {
  if (!fineRules || fineRules.length === 0 || overdueEmiAmount <= 0) return 0;

  const activeRule = fineRules.find((r) => r.rule_type === 'LOAN' && !r.effective_to_month);
  if (!activeRule) return 0;

  const currentYYYYMM = todayDate.toISOString().slice(0, 7);
  const currentDay = todayDate.getDate();
  const graceDays = Number(activeRule.grace_period_days || 0);
  const rate = Number(activeRule.rate_value || 0);

  let fineCycles = 0;

  if (typeof dueMonthOrDays === 'string' && dueMonthOrDays.includes('-')) {
    // String 'YYYY-MM' month passed
    const dueYYYYMM = dueMonthOrDays.slice(0, 7);
    if (dueYYYYMM >= currentYYYYMM) return 0;

    const [mY, mM] = dueYYYYMM.split('-').map(Number);
    const [cY, cM] = currentYYYYMM.split('-').map(Number);
    const monthDiff = (cY - mY) * 12 + (cM - mM);

    if (monthDiff <= 0) return 0;
    fineCycles = (monthDiff - 1) + (currentDay > graceDays ? 1 : 0);
  } else {
    // Numeric days overdue passed
    const daysOverdue = Number(dueMonthOrDays) || 0;
    if (daysOverdue <= graceDays) return 0;

    // Approximate monthly cycles from days overdue
    fineCycles = Math.max(1, Math.ceil((daysOverdue - graceDays) / 30));
  }

  if (fineCycles <= 0) return 0;

  if (activeRule.fine_type === 'PERCENTAGE') {
    return Math.round(fineCycles * ((overdueEmiAmount * rate) / 100));
  } else if (activeRule.fine_type === 'FLAT_MONTHLY' || activeRule.fine_type === 'FLAT_DAILY') {
    return fineCycles * rate;
  }

  return 0;
}
export interface UnpaidMonthBreakdown {
  monthStr: string;        // 'YYYY-MM'
  monthLabel: string;      // 'Jan 2026'
  emiAmount: number;       // Base EMI
  accruedFine: number;     // Late penalty for this month
  accruedInterest: number; // Interest for this month
  isGraceExpired: boolean;
}

export interface IndustryLoanCalculation {
  elapsedMonths: number;
  paidMonthsCount: number;
  unpaidMonthsCount: number;
  daysOverdue: number;
  oneMonthInterest: number;
  accruedInterestTotal: number;
  accruedFineTotal: number;
  unpaidMonthsBreakdown: UnpaidMonthBreakdown[];
  overdueEmiBase: number;
  totalCashDueNow: number;
  remainingPrincipal: number;
}

export interface WaterfallSplitResult {
  totalPaid: number;
  finePaid: number;
  interestPaid: number;
  principalPaid: number;
  unpaidFineRemaining: number;
  unpaidInterestRemaining: number;
  newPrincipalBalance: number;
}

function formatMonthLabel(monthStr: string): string {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Banking Standard Loan Calculation Engine
 * Reduces unpaid months count as principal payments clear monthly installment benchmarks
 */
export function calculateIndustryLoanDues(
  loan: any,
  payments: any[] = [],
  fineRules: any[] = [],
  asOfDate: Date = new Date()
): IndustryLoanCalculation {
  const today = new Date(asOfDate);
  today.setHours(0, 0, 0, 0);

  const principalAmount = Number(loan.principal_amount || 0);
  const monthlyEmi = Number(loan.monthly_emi || 0);
  const annualRate = Number(loan.current_rate || 12.0);

  // Total Principal Repaid across all payments
  const totalPrincipalRepaid = payments.reduce(
    (sum, p) => sum + Number(p.principal_paid || 0),
    0
  );
  const remainingPrincipal = Math.max(0, principalAmount - totalPrincipalRepaid);

  // Disbursement date
  const issueDateStr = String(loan.issue_date || '2026-01-01').slice(0, 10);
  const [iYear, iMonth, iDay] = issueDateStr.split('-').map(Number);
  const issueDate = new Date(iYear, (iMonth || 1) - 1, iDay || 1);
  issueDate.setHours(0, 0, 0, 0);

  // Fine rule parameters
  const activeRule = fineRules.find(
    (r) => r.rule_type === 'LOAN' || r.rule_type === 'LOANS'
  );
  const graceDays = Number(activeRule?.grace_period_days || 0);
  const fineType = activeRule?.fine_type || 'PERCENTAGE';
  const rateValue = activeRule ? Number(activeRule.rate_value || 0) : 2.0;

  // Single month interest = (Remaining Principal * Annual Rate) / 1,200
  const oneMonthInterest = remainingPrincipal > 0
    ? Math.round((remainingPrincipal * (annualRate / 100)) / 12)
    : 0;

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  let checkYear = iYear;
  let checkMonth = iMonth + 1; // 1st EMI due 1 month after disbursement
  if (checkMonth > 12) {
    checkMonth = 1;
    checkYear += 1;
  }

  let elapsedMonths = 0;
  let accruedFineTotal = 0;
  let accruedInterestTotal = 0;
  const unpaidMonthsBreakdown: UnpaidMonthBreakdown[] = [];

  // Calculate how many full installments have been cleared by repayments
  const paidMonthsCount = monthlyEmi > 0 ? Math.floor(totalPrincipalRepaid / monthlyEmi) : 0;

  while (
    checkYear < currentYear ||
    (checkYear === currentYear && checkMonth <= currentMonth)
  ) {
    elapsedMonths++;

    // Only step and add dues for months that have NOT been satisfied by repayments
    if (elapsedMonths > paidMonthsCount) {
      const monthStr = `${checkYear}-${String(checkMonth).padStart(2, '0')}`;
      const dueDate = new Date(checkYear, checkMonth - 1, iDay || 1);
      const graceDeadline = new Date(dueDate);
      graceDeadline.setDate(graceDeadline.getDate() + graceDays);

      const isGraceExpired = today > graceDeadline;
      let monthFine = 0;

      if (isGraceExpired) {
        if (fineType === 'PERCENTAGE') {
          monthFine = Math.round((monthlyEmi * rateValue) / 100);
        } else if (fineType === 'FLAT_MONTHLY') {
          monthFine = rateValue;
        } else if (fineType === 'FLAT_DAILY') {
          const daysLate = Math.max(
            1,
            Math.floor((today.getTime() - graceDeadline.getTime()) / (1000 * 3600 * 24))
          );
          monthFine = daysLate * rateValue;
        } else {
          monthFine = Math.round((monthlyEmi * 2) / 100);
        }
      }

      accruedFineTotal += monthFine;
      accruedInterestTotal += oneMonthInterest;

      unpaidMonthsBreakdown.push({
        monthStr,
        monthLabel: formatMonthLabel(monthStr),
        emiAmount: monthlyEmi,
        accruedFine: monthFine,
        accruedInterest: oneMonthInterest,
        isGraceExpired,
      });
    }

    checkMonth++;
    if (checkMonth > 12) {
      checkMonth = 1;
      checkYear += 1;
    }
  }

  const daysOverdue = Math.max(
    0,
    Math.floor((today.getTime() - issueDate.getTime()) / (1000 * 3600 * 24))
  );
  const unpaidMonthsCount = unpaidMonthsBreakdown.length;

  const overdueEmiBase = Math.min(remainingPrincipal, unpaidMonthsCount * monthlyEmi);
  const totalCashDueNow = overdueEmiBase + accruedInterestTotal + accruedFineTotal;

  return {
    elapsedMonths,
    paidMonthsCount,
    unpaidMonthsCount,
    daysOverdue,
    oneMonthInterest,
    accruedInterestTotal,
    accruedFineTotal,
    unpaidMonthsBreakdown,
    overdueEmiBase,
    totalCashDueNow,
    remainingPrincipal,
  };
}

// --- WATERFALL ALLOCATION ENGINE ---

export function allocateRepaymentWaterfall(
  totalCashEntered: number,
  accruedFine: number,
  accruedInterest: number,
  remainingPrincipal: number,
  fineDiscount: number = 0,
  interestDiscount: number = 0
): WaterfallSplitResult {
  const cash = Math.max(0, Number(totalCashEntered) || 0);

  const effectiveFineDue = Math.max(0, accruedFine - Math.max(0, fineDiscount));
  const effectiveInterestDue = Math.max(0, accruedInterest - Math.max(0, interestDiscount));

  let unallocatedCash = cash;

  // 1. Pay Fines First
  const finePaid = Math.min(unallocatedCash, effectiveFineDue);
  unallocatedCash -= finePaid;

  // 2. Pay Interest Second
  const interestPaid = Math.min(unallocatedCash, effectiveInterestDue);
  unallocatedCash -= interestPaid;

  // 3. Reduce Principal Third
  const principalPaid = Math.min(remainingPrincipal, unallocatedCash);

  return {
    totalPaid: cash,
    finePaid,
    interestPaid,
    principalPaid,
    unpaidFineRemaining: Math.max(0, effectiveFineDue - finePaid),
    unpaidInterestRemaining: Math.max(0, effectiveInterestDue - interestPaid),
    newPrincipalBalance: Math.max(0, remainingPrincipal - principalPaid),
  };
}
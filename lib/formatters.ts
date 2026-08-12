export function formatMonthLabel(forMonth?: string): string {
  if (!forMonth) return 'N/A';
  const parts = forMonth.split('-');
  if (parts.length < 2) return forMonth;

  const year = parts[0];
  const monthNum = parseInt(parts[1], 10);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return forMonth;
  return `${year}-${monthNames[monthNum - 1]}`;
}
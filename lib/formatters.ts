// formatMonthLabel logic (e.g. 2026-08 -> 2026-August)
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

/**
  Formats an ISO string into Nepal Standard Time (NPT)
  Example Output: "2026-08-12, 05:43 PM (NPT)"
 */
export function formatNptDateTime(isoString?: string): string {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  // Format into Asia/Kathmandu (NPT)
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' }); // YYYY-MM-DD
  const timeStr = date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kathmandu',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateStr}, ${timeStr} (NPT)`;
}

/**
  Formats time only in NPT
  Example Output: "05:43 PM (NPT)"
 */
export function formatNptTime(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const timeStr = date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kathmandu',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${timeStr} (NPT)`;
}
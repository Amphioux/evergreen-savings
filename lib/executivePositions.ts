export interface ExecutivePositionOption {
  value: string;
  label: string;
}

export const EXECUTIVE_POSITIONS: ExecutivePositionOption[] = [
  { value: 'CHAIRPERSON', label: 'Chairperson / President' },
  { value: 'VICE_CHAIRPERSON', label: 'Vice Chairperson' },
  { value: 'GENERAL_SECRETARY', label: 'General Secretary' },
  { value: 'SECRETARY', label: 'Secretary' },
  { value: 'JOINT_SECRETARY', label: 'Joint Secretary' },
  { value: 'TREASURER', label: 'Treasurer' },
  { value: 'VICE_TREASURER', label: 'Vice Treasurer' },
  { value: 'EXECUTIVE_MEMBER', label: 'Executive Committee Member' },
  { value: 'CHIEF_AUDITOR', label: 'Chief Auditor' },
  { value: 'INTERNAL_AUDITOR', label: 'Internal Auditor' },
  { value: 'LEGAL_ADVISOR', label: 'Legal Advisor' },
  { value: 'BOARD_ADVISOR', label: 'Board Advisory Member' },
  { value: 'LOAN_OFFICER', label: 'Loan & Credit Officer' },
];
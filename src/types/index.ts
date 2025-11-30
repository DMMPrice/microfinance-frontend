export type AppRole = 'admin' | 'region' | 'branch' | 'loan_officer' | 'borrower';

export interface User {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  linkedEntityId?: string;
}

export interface Region {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  regionId: string;
  createdAt: string;
}

export interface LoanOfficer {
  id: string;
  userId: string;
  name: string;
  email: string;
  branchId: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  branchId: string;
  loanOfficerId: string;
  createdAt: string;
}

export interface Borrower {
  id: string;
  name: string;
  phone: string;
  address: string;
  groupId: string;
  kycDetails: string;
  createdAt: string;
}

export type LoanStatus = 'active' | 'pending' | 'closed' | 'defaulted';

export interface Loan {
  id: string;
  borrowerId: string;
  groupId: string;
  loanOfficerId: string;
  branchId: string;
  regionId: string;
  productType: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  startDate: string;
  status: LoanStatus;
  outstanding: number;
  createdAt: string;
}

export type InstallmentStatus = 'pending' | 'paid' | 'overdue';

export interface RepaymentSchedule {
  id: string;
  loanId: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
  paidDate?: string;
}

export type TransactionType = 'disbursement' | 'repayment';

export interface Transaction {
  id: string;
  loanId: string;
  borrowerId: string;
  date: string;
  amount: number;
  type: TransactionType;
  status: string;
}

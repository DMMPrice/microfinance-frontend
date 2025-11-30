import { Region, Branch, LoanOfficer, Group, Borrower, Loan, RepaymentSchedule, Transaction, User } from '@/types';

const STORAGE_KEYS = {
  USERS: 'mf_users',
  REGIONS: 'mf_regions',
  BRANCHES: 'mf_branches',
  LOAN_OFFICERS: 'mf_loan_officers',
  GROUPS: 'mf_groups',
  BORROWERS: 'mf_borrowers',
  LOANS: 'mf_loans',
  REPAYMENTS: 'mf_repayments',
  TRANSACTIONS: 'mf_transactions',
};

function getFromStorage<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const adminUser: User = {
      id: '1',
      email: 'admin@mf.com',
      name: 'Admin User',
      role: 'admin',
    };
    saveToStorage(STORAGE_KEYS.USERS, [adminUser]);
  }
}

export const storage = {
  users: {
    getAll: () => getFromStorage<User>(STORAGE_KEYS.USERS),
    save: (users: User[]) => saveToStorage(STORAGE_KEYS.USERS, users),
    add: (user: User) => {
      const users = getFromStorage<User>(STORAGE_KEYS.USERS);
      users.push(user);
      saveToStorage(STORAGE_KEYS.USERS, users);
    },
  },
  regions: {
    getAll: () => getFromStorage<Region>(STORAGE_KEYS.REGIONS),
    save: (regions: Region[]) => saveToStorage(STORAGE_KEYS.REGIONS, regions),
    add: (region: Region) => {
      const regions = getFromStorage<Region>(STORAGE_KEYS.REGIONS);
      regions.push(region);
      saveToStorage(STORAGE_KEYS.REGIONS, regions);
    },
    delete: (id: string) => {
      const regions = getFromStorage<Region>(STORAGE_KEYS.REGIONS).filter(r => r.id !== id);
      saveToStorage(STORAGE_KEYS.REGIONS, regions);
    },
  },
  branches: {
    getAll: () => getFromStorage<Branch>(STORAGE_KEYS.BRANCHES),
    save: (branches: Branch[]) => saveToStorage(STORAGE_KEYS.BRANCHES, branches),
    add: (branch: Branch) => {
      const branches = getFromStorage<Branch>(STORAGE_KEYS.BRANCHES);
      branches.push(branch);
      saveToStorage(STORAGE_KEYS.BRANCHES, branches);
    },
    delete: (id: string) => {
      const branches = getFromStorage<Branch>(STORAGE_KEYS.BRANCHES).filter(b => b.id !== id);
      saveToStorage(STORAGE_KEYS.BRANCHES, branches);
    },
  },
  loanOfficers: {
    getAll: () => getFromStorage<LoanOfficer>(STORAGE_KEYS.LOAN_OFFICERS),
    save: (officers: LoanOfficer[]) => saveToStorage(STORAGE_KEYS.LOAN_OFFICERS, officers),
    add: (officer: LoanOfficer) => {
      const officers = getFromStorage<LoanOfficer>(STORAGE_KEYS.LOAN_OFFICERS);
      officers.push(officer);
      saveToStorage(STORAGE_KEYS.LOAN_OFFICERS, officers);
    },
    delete: (id: string) => {
      const officers = getFromStorage<LoanOfficer>(STORAGE_KEYS.LOAN_OFFICERS).filter(o => o.id !== id);
      saveToStorage(STORAGE_KEYS.LOAN_OFFICERS, officers);
    },
  },
  groups: {
    getAll: () => getFromStorage<Group>(STORAGE_KEYS.GROUPS),
    save: (groups: Group[]) => saveToStorage(STORAGE_KEYS.GROUPS, groups),
    add: (group: Group) => {
      const groups = getFromStorage<Group>(STORAGE_KEYS.GROUPS);
      groups.push(group);
      saveToStorage(STORAGE_KEYS.GROUPS, groups);
    },
    delete: (id: string) => {
      const groups = getFromStorage<Group>(STORAGE_KEYS.GROUPS).filter(g => g.id !== id);
      saveToStorage(STORAGE_KEYS.GROUPS, groups);
    },
  },
  borrowers: {
    getAll: () => getFromStorage<Borrower>(STORAGE_KEYS.BORROWERS),
    save: (borrowers: Borrower[]) => saveToStorage(STORAGE_KEYS.BORROWERS, borrowers),
    add: (borrower: Borrower) => {
      const borrowers = getFromStorage<Borrower>(STORAGE_KEYS.BORROWERS);
      borrowers.push(borrower);
      saveToStorage(STORAGE_KEYS.BORROWERS, borrowers);
    },
    delete: (id: string) => {
      const borrowers = getFromStorage<Borrower>(STORAGE_KEYS.BORROWERS).filter(b => b.id !== id);
      saveToStorage(STORAGE_KEYS.BORROWERS, borrowers);
    },
  },
  loans: {
    getAll: () => getFromStorage<Loan>(STORAGE_KEYS.LOANS),
    save: (loans: Loan[]) => saveToStorage(STORAGE_KEYS.LOANS, loans),
    add: (loan: Loan) => {
      const loans = getFromStorage<Loan>(STORAGE_KEYS.LOANS);
      loans.push(loan);
      saveToStorage(STORAGE_KEYS.LOANS, loans);
    },
  },
  repayments: {
    getAll: () => getFromStorage<RepaymentSchedule>(STORAGE_KEYS.REPAYMENTS),
    save: (repayments: RepaymentSchedule[]) => saveToStorage(STORAGE_KEYS.REPAYMENTS, repayments),
    add: (repayment: RepaymentSchedule) => {
      const repayments = getFromStorage<RepaymentSchedule>(STORAGE_KEYS.REPAYMENTS);
      repayments.push(repayment);
      saveToStorage(STORAGE_KEYS.REPAYMENTS, repayments);
    },
  },
  transactions: {
    getAll: () => getFromStorage<Transaction>(STORAGE_KEYS.TRANSACTIONS),
    save: (transactions: Transaction[]) => saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions),
    add: (transaction: Transaction) => {
      const transactions = getFromStorage<Transaction>(STORAGE_KEYS.TRANSACTIONS);
      transactions.push(transaction);
      saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
    },
  },
};

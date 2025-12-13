const STORAGE_KEYS = {
    USERS: "mf_users",
    REGIONS: "mf_regions",
    BRANCHES: "mf_branches",
    LOAN_OFFICERS: "mf_loan_officers",
    GROUPS: "mf_groups",
    BORROWERS: "mf_borrowers",
    LOANS: "mf_loans",
    REPAYMENTS: "mf_repayments",
    TRANSACTIONS: "mf_transactions",
};

function getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

export function initializeStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        const adminUser = {
            id: "1",
            email: "Common@mf.com",
            name: "Admin User",
            role: "Common",
        };
        saveToStorage(STORAGE_KEYS.USERS, [adminUser]);
    }
}

export const storage = {
    users: {
        getAll: () => getFromStorage(STORAGE_KEYS.USERS),
        save: (users) => saveToStorage(STORAGE_KEYS.USERS, users),
        add: (user) => {
            const users = getFromStorage(STORAGE_KEYS.USERS);
            users.push(user);
            saveToStorage(STORAGE_KEYS.USERS, users);
        },
    },
    regions: {
        getAll: () => getFromStorage(STORAGE_KEYS.REGIONS),
        save: (regions) => saveToStorage(STORAGE_KEYS.REGIONS, regions),
        add: (region) => {
            const regions = getFromStorage(STORAGE_KEYS.REGIONS);
            regions.push(region);
            saveToStorage(STORAGE_KEYS.REGIONS, regions);
        },
        delete: (id) => {
            const regions = getFromStorage(STORAGE_KEYS.REGIONS).filter(
                (r) => r.id !== id
            );
            saveToStorage(STORAGE_KEYS.REGIONS, regions);
        },
    },
    branches: {
        getAll: () => getFromStorage(STORAGE_KEYS.BRANCHES),
        save: (branches) => saveToStorage(STORAGE_KEYS.BRANCHES, branches),
        add: (branch) => {
            const branches = getFromStorage(STORAGE_KEYS.BRANCHES);
            branches.push(branch);
            saveToStorage(STORAGE_KEYS.BRANCHES, branches);
        },
        delete: (id) => {
            const branches = getFromStorage(STORAGE_KEYS.BRANCHES).filter(
                (b) => b.id !== id
            );
            saveToStorage(STORAGE_KEYS.BRANCHES, branches);
        },
    },
    loanOfficers: {
        getAll: () => getFromStorage(STORAGE_KEYS.LOAN_OFFICERS),
        save: (officers) => saveToStorage(STORAGE_KEYS.LOAN_OFFICERS, officers),
        add: (officer) => {
            const officers = getFromStorage(STORAGE_KEYS.LOAN_OFFICERS);
            officers.push(officer);
            saveToStorage(STORAGE_KEYS.LOAN_OFFICERS, officers);
        },
        delete: (id) => {
            const officers = getFromStorage(STORAGE_KEYS.LOAN_OFFICERS).filter(
                (o) => o.id !== id
            );
            saveToStorage(STORAGE_KEYS.LOAN_OFFICERS, officers);
        },
    },
    groups: {
        getAll: () => getFromStorage(STORAGE_KEYS.GROUPS),
        save: (groups) => saveToStorage(STORAGE_KEYS.GROUPS, groups),
        add: (group) => {
            const groups = getFromStorage(STORAGE_KEYS.GROUPS);
            groups.push(group);
            saveToStorage(STORAGE_KEYS.GROUPS, groups);
        },
        delete: (id) => {
            const groups = getFromStorage(STORAGE_KEYS.GROUPS).filter(
                (g) => g.id !== id
            );
            saveToStorage(STORAGE_KEYS.GROUPS, groups);
        },
    },
    borrowers: {
        getAll: () => getFromStorage(STORAGE_KEYS.BORROWERS),
        save: (borrowers) => saveToStorage(STORAGE_KEYS.BORROWERS, borrowers),
        add: (borrower) => {
            const borrowers = getFromStorage(STORAGE_KEYS.BORROWERS);
            borrowers.push(borrower);
            saveToStorage(STORAGE_KEYS.BORROWERS, borrowers);
        },
        delete: (id) => {
            const borrowers = getFromStorage(STORAGE_KEYS.BORROWERS).filter(
                (b) => b.id !== id
            );
            saveToStorage(STORAGE_KEYS.BORROWERS, borrowers);
        },
    },
    loans: {
        getAll: () => getFromStorage(STORAGE_KEYS.LOANS),
        save: (loans) => saveToStorage(STORAGE_KEYS.LOANS, loans),
        add: (loan) => {
            const loans = getFromStorage(STORAGE_KEYS.LOANS);
            loans.push(loan);
            saveToStorage(STORAGE_KEYS.LOANS, loans);
        },
    },
    repayments: {
        getAll: () => getFromStorage(STORAGE_KEYS.REPAYMENTS),
        save: (repayments) => saveToStorage(STORAGE_KEYS.REPAYMENTS, repayments),
        add: (repayment) => {
            const repayments = getFromStorage(STORAGE_KEYS.REPAYMENTS);
            repayments.push(repayment);
            saveToStorage(STORAGE_KEYS.REPAYMENTS, repayments);
        },
    },
    transactions: {
        getAll: () => getFromStorage(STORAGE_KEYS.TRANSACTIONS),
        save: (transactions) =>
            saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions),
        add: (transaction) => {
            const transactions = getFromStorage(STORAGE_KEYS.TRANSACTIONS);
            transactions.push(transaction);
            saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
        },
    },
};

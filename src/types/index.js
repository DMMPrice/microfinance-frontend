/**
 * @typedef {'Main Components' | 'region' | 'branch' | 'loan_officer' | 'borrower'} AppRole
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {AppRole} role
 * @property {string} [linkedEntityId]
 */

/**
 * @typedef {Object} Region
 * @property {string} id
 * @property {string} name
 * @property {string} code
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Branch
 * @property {string} id
 * @property {string} name
 * @property {string} code
 * @property {string} regionId
 * @property {string} createdAt
 */

/**
 * @typedef {Object} LoanOfficer
 * @property {string} id
 * @property {string} userId
 * @property {string} name
 * @property {string} email
 * @property {string} branchId
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Group
 * @property {string} id
 * @property {string} name
 * @property {string} code
 * @property {string} branchId
 * @property {string} loanOfficerId
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Borrower
 * @property {string} id
 * @property {string} name
 * @property {string} phone
 * @property {string} address
 * @property {string} groupId
 * @property {string} kycDetails
 * @property {string} createdAt
 */

/**
 * @typedef {'active' | 'pending' | 'closed' | 'defaulted'} LoanStatus
 */

/**
 * @typedef {Object} Loan
 * @property {string} id
 * @property {string} borrowerId
 * @property {string} groupId
 * @property {string} loanOfficerId
 * @property {string} branchId
 * @property {string} regionId
 * @property {string} productType
 * @property {number} principal
 * @property {number} interestRate
 * @property {number} tenureMonths
 * @property {string} startDate
 * @property {LoanStatus} status
 * @property {number} outstanding
 * @property {string} createdAt
 */

/**
 * @typedef {'pending' | 'paid' | 'overdue'} InstallmentStatus
 */

/**
 * @typedef {Object} RepaymentSchedule
 * @property {string} id
 * @property {string} loanId
 * @property {number} installmentNo
 * @property {string} dueDate
 * @property {number} amount
 * @property {InstallmentStatus} status
 * @property {string} [paidDate]
 */

/**
 * @typedef {'disbursement' | 'repayment'} TransactionType
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} loanId
 * @property {string} borrowerId
 * @property {string} date
 * @property {number} amount
 * @property {TransactionType} type
 * @property {string} status
 */

//
// No exports are needed — importing types in JS is unnecessary.
// If you want to enforce IntelliSense in a file, use:
//
//   /** @type {User} */
//   const user = { ... };
//

// src/config/roles.js

/* -------------------- Role Constants -------------------- */
export const ROLES = {
    ADMIN: "admin",
    REGIONAL_MANAGER: "regional_manager",
    BRANCH_MANAGER: "branch_manager",
    LOAN_OFFICER: "loan_officer",
    SUPER_ADMIN: "super_admin",
};

/* -------------------- Role Display Labels -------------------- */
export const ROLE_LABEL = {
    [ROLES.ADMIN]: "Admin",
    [ROLES.REGIONAL_MANAGER]: "Regional Manager",
    [ROLES.BRANCH_MANAGER]: "Branch Manager",
    [ROLES.LOAN_OFFICER]: "Loan Officer",
    [ROLES.SUPER_ADMIN]: "Super Admin",
};

/* -------------------- Numeric Role Mapping (Backend Ref) -------------------- */
export const ROLE_ORDER = {
    1: ROLES.ADMIN,
    2: ROLES.REGIONAL_MANAGER,
    3: ROLES.BRANCH_MANAGER,
    4: ROLES.LOAN_OFFICER,
    5: ROLES.SUPER_ADMIN,
};

/* -------------------- Helper Groups -------------------- */
export const ALL_ROLES = Object.values(ROLES);

export const ADMIN_ROLES = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
];

export const MANAGEMENT_ROLES = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.REGIONAL_MANAGER,
    ROLES.BRANCH_MANAGER,
];

export const FIELD_ROLES = [
    ROLES.LOAN_OFFICER,
];

/* -------------------- Permission Helpers -------------------- */

/**
 * Check if role is one of allowedRoles
 */
export const hasRole = (role, allowedRoles = []) => {
    if (!role) return false;
    return allowedRoles.includes(role);
};

/**
 * Check if role is admin or super admin
 */
export const isAdmin = (role) =>
    [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);

/**
 * Normalize role string (safety)
 */
export const normalizeRole = (role) =>
    String(role || "").trim().toLowerCase();

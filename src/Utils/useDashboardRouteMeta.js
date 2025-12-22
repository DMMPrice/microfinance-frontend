// src/Utils/useDashboardRouteMeta.js
import {matchPath, useLocation} from "react-router-dom";

const ROUTES = [
    {pattern: "/dashboard", title: "Dashboard", subtitle: "Overview"},
    {pattern: "/dashboard/regions", title: "Regions", subtitle: "Create and manage regions"},
    {pattern: "/dashboard/branches", title: "Branches", subtitle: "Create and manage branches"},
    {pattern: "/dashboard/officers", title: "Loan Officers", subtitle: "Create and manage loan officers"},
    {pattern: "/dashboard/groups", title: "Groups", subtitle: "Create and manage groups"},
    {pattern: "/dashboard/borrowers", title: "Members", subtitle: "Create and manage members"},
    {pattern: "/dashboard/users", title: "Users Management", subtitle: "Manage system users"},

    // Loans
    {pattern: "/dashboard/loans", title: "Loans", subtitle: "Loan dashboard"},
    {pattern: "/dashboard/loans/collection-entry", title: "Collection Entry", subtitle: "Record repayments"},
    {pattern: "/dashboard/loans/statement-download", title: "Statement Download", subtitle: "Download loan statements"},
    {pattern: "/dashboard/loans/view", title: "Loan View", subtitle: "Search and open a loan"},
    {pattern: "/dashboard/loans/view/:loan_id", title: "Loan View", subtitle: "Loan details"},
];

export function useDashboardRouteMeta() {
    const {pathname} = useLocation();

    // ✅ match most specific first (dynamic routes should come later if patterns overlap)
    const found =
        ROUTES.find((r) => matchPath({path: r.pattern, end: true}, pathname)) ||
        ROUTES.find((r) => matchPath({path: r.pattern, end: false}, pathname));

    return found || {title: "Dashboard", subtitle: ""};
}

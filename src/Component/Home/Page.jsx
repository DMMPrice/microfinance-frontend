// src/Component/Home/DashboardPage.jsx
import React, {useMemo} from "react";
import {useRegions} from "@/hooks/useRegions.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";
import {useGroups} from "@/hooks/useGroups.js";
import {useMembers} from "@/hooks/useMembers.js";
import {useLoanMaster} from "@/hooks/useLoans.js";
import {useBranchExpenses} from "@/hooks/useBranchExpenses.js"; // ✅ NEW

import DashboardHeader from "./DashboardHeader";
import DashboardStats from "./DashboardStats";
import DashboardTabs from "./DashboardTabs";

/* ✅ system month range */
function pad2(n) {
    return String(n).padStart(2, "0");
}
function toYmd(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function getMonthRange(d = new Date()) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {from: toYmd(start), to: toYmd(end)};
}

export default function DashboardPage({defaultTab = "regions"}) {
    const {regions = []} = useRegions();
    const {branches = []} = useBranches();
    const {loanOfficers = []} = useLoanOfficers();
    const {groups = []} = useGroups();
    const {members = [], isLoading: membersLoading} = useMembers();

    // ✅ ACTIVE loans
    const {data: activeLoansData, isLoading: loansLoading} = useLoanMaster({
        status: "ACTIVE",
        limit: 500,
        offset: 0,
    });

    const activeLoans = useMemo(() => {
        return Array.isArray(activeLoansData)
            ? activeLoansData
            : Array.isArray(activeLoansData?.items)
                ? activeLoansData.items
                : [];
    }, [activeLoansData]);

    // ✅ Total Outstanding
    const totalOutstanding = useMemo(() => {
        return activeLoans.reduce((sum, loan) => {
            const v = Number(loan?.outstanding ?? loan?.outstanding_amount ?? 0);
            return sum + (Number.isFinite(v) ? v : 0);
        }, 0);
    }, [activeLoans]);

    // ✅ Total Disbursed (ACTIVE loans)
    const totalDisbursedActive = useMemo(() => {
        return activeLoans.reduce((sum, loan) => {
            const v = Number(
                loan?.total_disbursed_amount ??
                loan?.disbursed_amount ??
                loan?.principal_disbursed ??
                0
            );
            return sum + (Number.isFinite(v) ? v : 0);
        }, 0);
    }, [activeLoans]);

    // ✅ Expenses for current system month
    const {from: monthFrom, to: monthTo} = useMemo(() => getMonthRange(), []);
    const {data: expenseRows = [], isLoading: expensesLoading} = useBranchExpenses({
        from_date: monthFrom,
        to_date: monthTo,
    });

    // ✅ Total Expense (current month)
    const totalExpenseThisMonth = useMemo(() => {
        const rows = Array.isArray(expenseRows) ? expenseRows : [];
        return rows.reduce((sum, r) => {
            const v = Number(r?.amount ?? 0);
            return sum + (Number.isFinite(v) ? v : 0);
        }, 0);
    }, [expenseRows]);

    // ✅ Optional: net outflow (Disbursement + Expenses)
    const netOutflowThisMonth = useMemo(() => {
        // If you want disbursements only for the month, tell me your loan API supports date filter.
        // For now: outflow uses expenses only (month-based) + active disburse total (overall).
        return totalExpenseThisMonth + totalDisbursedActive;
    }, [totalExpenseThisMonth, totalDisbursedActive]);

    return (
        <div className="bg-muted/30 min-h-full">
            <div className="container mx-auto p-6 space-y-6">
                <DashboardHeader />

                <DashboardStats
                    regions={regions}
                    branches={branches}
                    loanOfficers={loanOfficers}
                    members={members}
                    membersLoading={membersLoading}
                    activeLoans={loansLoading ? [] : activeLoans}
                    totalOutstanding={totalOutstanding}
                    // ✅ NEW props (use in cards)
                    totalDisbursedActive={totalDisbursedActive}
                    totalExpenseThisMonth={totalExpenseThisMonth}
                    expensesLoading={expensesLoading}
                    monthFrom={monthFrom}
                    monthTo={monthTo}
                    netOutflowThisMonth={netOutflowThisMonth}
                />

                <DashboardTabs
                    defaultTab={defaultTab}
                    regions={regions}
                    branches={branches}
                    loanOfficers={loanOfficers}
                    groups={groups}
                />
            </div>
        </div>
    );
}

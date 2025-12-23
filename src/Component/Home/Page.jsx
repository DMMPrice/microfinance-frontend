// src/Component/Home/DashboardPage.jsx
import {useRegions} from "@/hooks/useRegions.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";
import {useGroups} from "@/hooks/useGroups.js";
import {useMembers} from "@/hooks/useMembers.js";
import {useLoanMaster} from "@/hooks/useLoans.js";

import DashboardHeader from "./DashboardHeader";
import DashboardStats from "./DashboardStats";
import DashboardTabs from "./DashboardTabs";

export default function DashboardPage({defaultTab = "regions"}) {
    const {regions = []} = useRegions();
    const {branches = []} = useBranches();
    const {loanOfficers = []} = useLoanOfficers();
    const {groups = []} = useGroups();
    const {members = [], isLoading: membersLoading} = useMembers();

    // ✅ Fetch ACTIVE loans from backend
    const {
        data: activeLoansData,
        isLoading: loansLoading,
    } = useLoanMaster({status: "ACTIVE", limit: 500, offset: 0});

    // API might return {items, total} or a plain array depending on your backend
    const activeLoans = Array.isArray(activeLoansData)
        ? activeLoansData
        : Array.isArray(activeLoansData?.items)
            ? activeLoansData.items
            : [];

    // ✅ Total outstanding (safe)
    const totalOutstanding = activeLoans.reduce((sum, loan) => {
        const v = Number(loan?.outstanding ?? loan?.outstanding_amount ?? 0);
        return sum + (Number.isFinite(v) ? v : 0);
    }, 0);

    return (
        <div className="bg-muted/30 min-h-full">
            <div className="container mx-auto p-6 space-y-6">
                <DashboardHeader/>

                <DashboardStats
                    regions={regions}
                    branches={branches}
                    loanOfficers={loanOfficers}
                    members={members}
                    membersLoading={membersLoading}
                    activeLoans={loansLoading ? [] : activeLoans}
                    totalOutstanding={totalOutstanding}
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
// src/Component/Home/DashboardPage.jsx
import {useEffect, useState} from "react";
import {storage} from "@/lib/storage.js";

import {useRegions} from "@/hooks/useRegions.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";
import {useGroups} from "@/hooks/useGroups.js";
import {useMembers} from "@/hooks/useMembers.js";

import DashboardHeader from "./DashboardHeader";
import DashboardStats from "./DashboardStats";
import DashboardTabs from "./DashboardTabs";

export default function DashboardPage({defaultTab = "regions"}) {
    const {regions = []} = useRegions();
    const {branches = []} = useBranches();
    const {loanOfficers = []} = useLoanOfficers();
    const {groups = []} = useGroups();
    const {members = [], isLoading: membersLoading} = useMembers();

    const [loans, setLoans] = useState([]);

    useEffect(() => {
        setLoans(storage.loans.getAll());
    }, []);

    const activeLoans = loans.filter((l) => l.status === "active");
    const totalOutstanding = activeLoans.reduce(
        (sum, loan) => sum + loan.outstanding,
        0
    );

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
                    activeLoans={activeLoans}
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

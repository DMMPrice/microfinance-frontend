// src/Component/dashboard/Common/Page.jsx
import {useState, useEffect} from "react";
import {storage} from "@/lib/storage.js";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Building2, MapPin, Users, UserCircle, Wallet} from "lucide-react";

import RegionManagement from "@/Component/Common/RegionManagement.jsx";
import BranchManagement from "@/Component/Common/BranchManagement.jsx";
import LoanOfficerManagement from "@/Component/Common/LoanOfficerManagement.jsx";
import GroupManagement from "@/Component/Common/GroupManagement.jsx";
import MemberManagement from "@/Component/Common/MemberManagement.jsx";

import {useRegions} from "@/hooks/useRegions.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";
import {useGroups} from "@/hooks/useGroups.js";
import {useMembers} from "@/hooks/useMembers.js"; // ✅ members count from GET /members

// ✅ Small reusable KPI card (face card)
function StatCard({title, value, subtitle, Icon}) {
    return (
        <Card
            className="rounded-2xl border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {title}
                        </CardTitle>
                        <div className="text-3xl font-semibold tracking-tight text-foreground">
                            {value}
                        </div>
                    </div>

                    <div className="h-10 w-10 rounded-xl border bg-muted/40 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground"/>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                {subtitle ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {subtitle}
                    </p>
                ) : (
                    <div className="h-4"/>
                )}
            </CardContent>
        </Card>
    );
}

export default function Page({defaultTab = "overview"}) {
    // 🔹 Live data from backend via React Query hooks
    const {regions = []} = useRegions();
    const {branches = []} = useBranches();
    const {loanOfficers = []} = useLoanOfficers();
    const {groups = []} = useGroups();

    // ✅ Members count from backend: GET /members
    const {members = [], isLoading: membersLoading} = useMembers();

    // 🔹 Still using local storage for loans (until you add APIs/hooks)
    const [loans, setLoans] = useState([]);

    useEffect(() => {
        setLoans(storage.loans.getAll());
    }, []);

    const activeLoans = loans.filter((l) => l.status === "active");
    const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0);

    return (
        <div className="bg-muted/30 min-h-full">
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your entire micro finance organization
                    </p>
                </div>

                {/* ✅ KPI cards (Borrowers -> Members from API) */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <StatCard title="Regions" value={regions.length} Icon={MapPin}/>
                    <StatCard title="Branches" value={branches.length} Icon={Building2}/>
                    <StatCard title="Loan Officers" value={loanOfficers.length} Icon={UserCircle}/>
                    <StatCard
                        title="Members"
                        value={membersLoading ? "—" : members.length}
                        Icon={Users}
                    />
                    <StatCard
                        title="Active Loans"
                        value={activeLoans.length}
                        subtitle={`₹${totalOutstanding.toLocaleString()} outstanding`}
                        Icon={Wallet}
                    />
                </div>

                {/* Tabs */}
                <Tabs defaultValue={defaultTab} className="space-y-4">
                    <TabsList className="rounded-xl">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="regions">Regions</TabsTrigger>
                        <TabsTrigger value="branches">Branches</TabsTrigger>
                        <TabsTrigger value="officers">Loan Officers</TabsTrigger>
                        <TabsTrigger value="groups">Groups</TabsTrigger>
                        <TabsTrigger value="borrowers">Members</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Welcome to Admin Dashboard</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Use the sidebar to navigate to different management sections.
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="regions">
                        <RegionManagement/>
                    </TabsContent>

                    <TabsContent value="branches">
                        <BranchManagement/>
                    </TabsContent>

                    <TabsContent value="officers">
                        <LoanOfficerManagement/>
                    </TabsContent>

                    <TabsContent value="groups">
                        <GroupManagement
                            groups={groups}
                            branches={branches}
                            officers={loanOfficers}
                            regions={regions}
                        />
                    </TabsContent>

                    {/* ✅ Replace local BorrowerManagement with API-based MemberManagement */}
                    <TabsContent value="borrowers">
                        <MemberManagement
                            groups={groups}
                            branches={branches}
                            officers={loanOfficers}
                            regions={regions}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

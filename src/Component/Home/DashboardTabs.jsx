// src/Component/Home/components/DashboardTabs.jsx
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";

import RegionManagement from "@/Component/Regions/RegionManagement.jsx";
import BranchManagement from "@/Component/Branch/Home/BranchManagement.jsx";
import LoanOfficerManagement from "@/Component/Loan Officer/LoanOfficerManagement.jsx";
import GroupManagement from "@/Component/Groups/GroupManagement.jsx";
import MemberManagement from "@/Component/Members/MemberManagement.jsx";

export default function DashboardTabs({
                                          defaultTab = "regions",
                                          regions,
                                          branches,
                                          loanOfficers,
                                          groups,
                                      }) {
    return (
        <Tabs defaultValue={defaultTab} className="space-y-4">
            <TabsList className="rounded-xl">
                <TabsTrigger value="regions">Regions</TabsTrigger>
                <TabsTrigger value="branches">Branches</TabsTrigger>
                <TabsTrigger value="officers">Loan Officers</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
                <TabsTrigger value="borrowers">Members</TabsTrigger>
            </TabsList>

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

            <TabsContent value="borrowers">
                <MemberManagement
                    groups={groups}
                    branches={branches}
                    officers={loanOfficers}
                    regions={regions}
                />
            </TabsContent>
        </Tabs>
    );
}

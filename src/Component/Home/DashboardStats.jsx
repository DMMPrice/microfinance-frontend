// src/Component/Home/components/DashboardStats.jsx
import {Building2, MapPin, Users, UserCircle, Wallet} from "lucide-react";
import StatCard from "../../Utils/StatCard.jsx";

export default function DashboardStats({
                                           regions,
                                           branches,
                                           loanOfficers,
                                           members,
                                           membersLoading,
                                           activeLoans,
                                           totalOutstanding,
                                       }) {
    return (
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
    );
}
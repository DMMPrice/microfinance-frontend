// src/Component/Home/components/DashboardStats.jsx
import {Building2, MapPin, Users, UserCircle, Wallet} from "lucide-react";
import StatCard from "@/Utils/StatCard.jsx";

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
            <StatCard title="Regions" value={regions.length} Icon={MapPin} to="/dashboard/regions"/>

            <StatCard title="Branches" value={branches.length} Icon={Building2} to="/dashboard/branches"/>

            <StatCard
                title="Loan Officers"
                value={loanOfficers.length}
                Icon={UserCircle}
                to="/dashboard/officers"
            />

            <StatCard
                title="Members"
                value={membersLoading ? "—" : members.length}
                Icon={Users}
                to="/dashboard/borrowers"
            />

            <StatCard
                title="Active Loans"
                value={activeLoans.length}
                subtitle={`₹${Number(totalOutstanding || 0).toLocaleString()} outstanding`}
                Icon={Wallet}
                to="/dashboard/loans"
            />
        </div>
    );
}

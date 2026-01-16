// src/Component/Home/components/DashboardStats.jsx
import {Building2, MapPin, Users, UserCircle, Wallet} from "lucide-react";
import StatCard from "@/Utils/StatCard.jsx";

function formatINR(v) {
    return `₹${Number(v || 0).toLocaleString("en-IN")}`;
}

export default function DashboardStats({
                                           regions,
                                           branches,
                                           loanOfficers,
                                           members,
                                           membersLoading,
                                           activeLoans,
                                           totalOutstanding,

                                           totalDisbursedActive = 0,
                                           totalExpenseThisMonth = 0,
                                           expensesLoading = false,
                                       }) {
    const expenseText = expensesLoading ? "—" : formatINR(totalExpenseThisMonth);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard
                title="Regions"
                value={regions.length}
                Icon={MapPin}
                to="/dashboard/regions"
                variant="purple"
            />

            <StatCard
                title="Branches"
                value={branches.length}
                Icon={Building2}
                to="/dashboard/branches"
                variant="blue"
            />

            <StatCard
                title="Loan Officers"
                value={loanOfficers.length}
                Icon={UserCircle}
                to="/dashboard/officers"
                variant="amber"
            />

            <StatCard
                title="Members"
                value={membersLoading ? "—" : members.length}
                Icon={Users}
                to="/dashboard/borrowers"
                variant="green"
            />

            <StatCard
                title="Active Loans"
                value={activeLoans.length}
                Icon={Wallet}
                to="/dashboard/loans"
                variant="red"
                subtitle={
                    <div className="space-y-0.5">
                        <div className="text-xs text-muted-foreground">
                            Outstanding:{" "}
                            <span className="font-medium text-foreground">
                {formatINR(totalOutstanding)}
              </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Disbursed:{" "}
                            <span className="font-medium text-foreground">
                {formatINR(totalDisbursedActive)}
              </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Expense (This Month):{" "}
                            <span className="font-medium text-foreground">{expenseText}</span>
                        </div>
                    </div>
                }
            />
        </div>
    );
}

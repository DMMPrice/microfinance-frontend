// src/Component/Loan/LoanSummaryKpis.jsx
import React, {useMemo} from "react";
import StatCard from "@/Utils/StatCard.jsx";
import {
    IndianRupee,
    Wallet,
    BadgeCheck,
    AlertTriangle,
    CalendarClock,
    Coins,
    Receipt,
    Activity,
    User,
    Users,
} from "lucide-react";

import {toISTNaiveISO} from "@/Helpers/dateTimeIST";

function money(v) {
    const n = Number(v || 0);
    return `₹ ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function fmtDateIST(v) {
    if (!v) return "-";
    const s = toISTNaiveISO(v, false); // YYYY-MM-DDTHH:mm
    return s ? s.slice(0, 10) : "-";
}

export default function LoanSummaryKpis({summary, loanOfficerName}) {
    const kpi = useMemo(() => {
        const s = summary || {};
        return {
            principal: s.principal_amount,
            interest: s.interest_amount_total,
            disbursed: s.total_disbursed_amount,
            paid: s.total_paid,
            outstanding: s.outstanding,
            advance: s.advance_balance,
            nextDueDate: s.next_due_date,
            nextDueAmount: s.next_due_amount,
            chargesTotal: s.charges_total,
            chargesCollected: s.charges_collected,
            chargesPending: s.charges_pending,
            chargesWaived: s.charges_waived,
        };
    }, [summary]);

    return (
        <div className="space-y-3">
            {/* Top identity row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatCard
                    title="Member"
                    value={summary?.member_name || "-"}
                    subtitle={summary?.loan_account_no ? `Loan A/C: ${summary.loan_account_no}` : ""}
                    Icon={User}
                    variant="purple"
                />
                <StatCard
                    title="Group"
                    value={summary?.group_name || "-"}
                    subtitle={summary?.group_id != null ? `Group ID: ${summary.group_id}` : ""}
                    Icon={Users}
                    variant="blue"
                />
                <StatCard
                    title="Loan Officer"
                    value={loanOfficerName || "-"}
                    subtitle={summary?.lo_id != null ? `LO ID: ${summary.lo_id}` : ""}
                    Icon={BadgeCheck}
                    variant="green"
                />
            </div>

            {/* Financial KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard title="Principal" value={money(kpi.principal)} Icon={IndianRupee} variant="blue"/>
                <StatCard title="Total Interest" value={money(kpi.interest)} Icon={Activity} variant="purple"/>
                <StatCard title="Total Disbursed" value={money(kpi.disbursed)} Icon={Wallet} variant="green"/>
                <StatCard title="Total Paid" value={money(kpi.paid)} Icon={Coins} variant="amber"/>

                <StatCard title="Outstanding" value={money(kpi.outstanding)} Icon={AlertTriangle} variant="red"/>
                <StatCard title="Advance Balance" value={money(kpi.advance)} Icon={Receipt} variant="purple"/>

                <StatCard
                    title="Next Due Date (IST)"
                    value={fmtDateIST(kpi.nextDueDate)}
                    subtitle={kpi.nextDueAmount != null ? `Amount: ${money(kpi.nextDueAmount)}` : ""}
                    Icon={CalendarClock}
                    variant="amber"
                />

                <StatCard
                    title="Charges (Pending)"
                    value={money(kpi.chargesPending)}
                    subtitle={`Total: ${money(kpi.chargesTotal)} | Collected: ${money(kpi.chargesCollected)}`}
                    Icon={Receipt}
                    variant="red"
                />
            </div>
        </div>
    );
}

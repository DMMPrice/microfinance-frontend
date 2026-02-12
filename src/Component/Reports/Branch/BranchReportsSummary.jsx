// src/Component/Reports/BranchReports/BranchReportsSummary.jsx
import React from "react";
import StatCard from "@/Utils/StatCard.jsx";
import {formatINR} from "./branchReports.utils";
import {
    Wallet,
    ArrowDownCircle,
    ArrowUpCircle,
    Landmark,
    ListOrdered,
} from "lucide-react";

export default function BranchReportsSummary({summary, txCount}) {
    if (!summary) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
                title="Opening Balance"
                value={`₹${formatINR(summary.opening)}`}
                Icon={Wallet}
                variant="blue"
            />

            <StatCard
                title="Total Credit"
                value={`₹${formatINR(summary.totalCredit)}`}
                Icon={ArrowDownCircle}
                variant="green"
            />

            <StatCard
                title="Total Debit"
                value={`₹${formatINR(summary.totalDebit)}`}
                Icon={ArrowUpCircle}
                variant="red"
            />

            <StatCard
                title="Closing Balance"
                value={`₹${formatINR(summary.closing)}`}
                Icon={Landmark}
                variant="purple"
            />

            <StatCard
                title="Transactions"
                value={txCount}
                Icon={ListOrdered}
                variant="amber"
            />
        </div>
    );
}

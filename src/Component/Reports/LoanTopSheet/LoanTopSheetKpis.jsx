// src/Component/Reports/LoanTopSheet/LoanTopSheetKpis.jsx
import React, {useMemo} from "react";
import StatCard from "@/Utils/StatCard.jsx";
import {formatINR} from "@/Component/Reports/Branch Reports/branchReports.utils";

import {
    Building2,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Coins,
    AlertTriangle,
} from "lucide-react";

function safeNum(n) {
    const x = Number(n);
    return Number.isFinite(x) ? x : 0;
}

export default function LoanTopSheetKpis({branchLabel, data}) {
    const openingBranch = data?.opening_branch || null;
    const closingCalc = data?.closing_branch_calc || null;
    const closingBranch = data?.closing_branch || null;

    const kpis = useMemo(() => {
        return [
            {
                title: "Branch",
                value: branchLabel || String(data?.branch_id || "-"),
                Icon: Building2,
                variant: "blue",
            },
            {
                title: "Opening Outstanding",
                value: `₹${formatINR(safeNum(openingBranch?.outstanding_amt))}`,
                subtitle: openingBranch ? `${safeNum(openingBranch?.outstanding_cnt)} loans` : undefined,
                Icon: Wallet,
                variant: "purple",
            },
            {
                title: "Closing Balance (calc)",
                value: `₹${formatINR(safeNum(closingCalc?.closing_balance_amt))}`,
                subtitle: closingBranch ? `${safeNum(closingBranch?.outstanding_cnt)} loans` : undefined,
                Icon: Wallet,
                variant: "green",
            },
            {
                title: "Month Disbursed",
                value: `₹${formatINR(safeNum(closingCalc?.month_disb_amt))}`,
                Icon: ArrowUpRight,
                variant: "blue",
            },
            {
                title: "Month Realised",
                value: `₹${formatINR(safeNum(closingCalc?.month_realised_amt))}`,
                Icon: ArrowDownRight,
                variant: "green",
            },
            {
                title: "Month Realisable",
                value: `₹${formatINR(safeNum(closingCalc?.month_realisable_amt))}`,
                Icon: Coins,
                variant: "amber",
            },
            {
                title: "Closing Overdue (calc)",
                value: `₹${formatINR(safeNum(closingCalc?.closing_overdue_amt))}`,
                subtitle: closingBranch ? `${safeNum(closingBranch?.overdue_cnt)} overdue loans` : undefined,
                Icon: AlertTriangle,
                variant: "red",
            },
        ];
    }, [branchLabel, data, openingBranch, closingCalc, closingBranch]);

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {kpis.map((k) => (
                <StatCard
                    key={k.title}
                    title={k.title}
                    value={k.value}
                    subtitle={k.subtitle}
                    Icon={k.Icon}
                    variant={k.variant}
                />
            ))}
        </div>
    );
}
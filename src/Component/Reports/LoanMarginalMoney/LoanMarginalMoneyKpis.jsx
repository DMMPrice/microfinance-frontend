import React, {useMemo} from "react";
import StatCard from "@/Utils/StatCard.jsx";
import {formatINR} from "@/Component/Reports/Branch Reports/branchReports.utils";

import {
    Building2,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Landmark,
    Coins,
    Calculator,
} from "lucide-react";

function safeNum(n) {
    const x = Number(n);
    return Number.isFinite(x) ? x : 0;
}

export default function LoanMarginalMoneyKpis({branchLabel, data}) {
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
                title: "Opening Advance Balance",
                value: `₹${formatINR(safeNum(openingBranch?.advance_balance_amt))}`,
                subtitle: openingBranch ? `${safeNum(openingBranch?.loans_with_advance)} loans` : undefined,
                Icon: Wallet,
                variant: "purple",
            },
            {
                title: "Closing Advance Balance",
                value: `₹${formatINR(safeNum(closingBranch?.advance_balance_amt))}`,
                subtitle: closingBranch ? `${safeNum(closingBranch?.loans_with_advance)} loans` : undefined,
                Icon: Landmark,
                variant: "green",
            },
            {
                title: "Month Advance Add",
                value: `₹${formatINR(safeNum(closingCalc?.month_advance_add_amt))}`,
                Icon: ArrowUpRight,
                variant: "blue",
            },
            {
                title: "Month Advance Deduct",
                value: `₹${formatINR(safeNum(closingCalc?.month_advance_deduct_amt))}`,
                Icon: ArrowDownRight,
                variant: "amber",
            },
            {
                title: "Net Movement",
                value: `₹${formatINR(
                    safeNum(closingCalc?.month_advance_add_amt) - safeNum(closingCalc?.month_advance_deduct_amt)
                )}`,
                Icon: Coins,
                variant: "purple",
            },
            {
                title: "Closing Balance (Calc)",
                value: `₹${formatINR(safeNum(closingCalc?.closing_balance_amt))}`,
                Icon: Calculator,
                variant: "green",
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
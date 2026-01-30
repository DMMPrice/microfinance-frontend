import React, {useMemo} from "react";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import StatCard from "@/Utils/StatCard.jsx";

const VARIANT_BY_KEY = {
    TOTAL_DISBURSED: "blue",
    TOTAL_EARNED: "green",

    DISBURSED: "blue",
    ACTIVE: "green",
    CLOSED: "purple",
};

function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function formatINR(n) {
    const x = safeNum(n);
    return x.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export default function LoansKpiRow({statsQ}) {
    const {cards} = useMemo(() => {
        const data = statsQ?.data || {};

        // ✅ New API shape: { status: {...}, amounts: {...} }
        // ✅ Backward compatible: old API might return counts directly
        const status = data.status && typeof data.status === "object" ? data.status : data;
        const amounts = data.amounts && typeof data.amounts === "object" ? data.amounts : {};

        const cards = [
            {
                k: "TOTAL AMOUNT DISBURSED",
                key: "TOTAL_DISBURSED",
                v: safeNum(amounts.total_disbursed),
                isMoney: true,
            },
            {
                k: "TOTAL AMOUNT EARNED",
                key: "TOTAL_EARNED",
                v: safeNum(amounts.total_earned),
                isMoney: true,
            },
            {k: "LOANS DISBURSED", key: "DISBURSED", v: safeNum(status.DISBURSED)},
            {k: "LOANS ACTIVE", key: "ACTIVE", v: safeNum(status.ACTIVE)},
            {k: "LOANS CLOSED", key: "CLOSED", v: safeNum(status.CLOSED)},
        ];

        return {cards};
    }, [statsQ?.data]);

    const loading = !!statsQ?.isLoading;

    return (
        <div className="space-y-4">
            {/* ✅ All KPI cards in ONE ROW (desktop) */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {loading
                    ? Array.from({length: 5}).map((_, i) => (
                        <div key={i} className="rounded-xl border p-4">
                            <Skeleton className="h-4 w-32"/>
                            <Skeleton className="h-8 w-24 mt-3"/>
                        </div>
                    ))
                    : cards.map((x) => (
                        <StatCard
                            key={x.key}
                            title={x.k}
                            value={x.isMoney ? `₹ ${formatINR(x.v)}` : x.v}
                            subtitle={null}
                            Icon={null}
                            variant={VARIANT_BY_KEY[x.key] || "blue"}
                            className="rounded-xl"
                        />
                    ))}
            </div>
        </div>
    );
}

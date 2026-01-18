import React, {useMemo} from "react";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import StatCard from "@/Utils/StatCard.jsx";

const VARIANT_BY_KEY = {
    DISBURSED: "blue",
    ACTIVE: "green",
    CLOSED: "purple",
    CANCELLED: "red",
    OTHER: "amber",
};

// (optional) if you want icons later you can wire them here
const ICON_BY_KEY = {
    // DISBURSED: Banknote,
    // ACTIVE: Activity,
    // CLOSED: CheckCircle2,
    // CANCELLED: XCircle,
    // OTHER: Layers,
};

export default function LoansKpiRow({statsQ}) {
    const statsCards = useMemo(() => {
        const d = statsQ?.data || {};

        const preferred = ["DISBURSED", "ACTIVE", "CLOSED", "CANCELLED", "OTHER"];
        const available = preferred.filter((k) =>
            Object.prototype.hasOwnProperty.call(d, k)
        );
        const extras = Object.keys(d).filter((k) => !preferred.includes(k));
        const keys = [...available, ...extras];

        const finalKeys = keys.length ? keys : ["DISBURSED", "ACTIVE", "CLOSED", "OTHER"];
        return finalKeys.map((k) => ({k, v: Number(d[k] ?? 0)}));
    }, [statsQ?.data]);

    const cols = Math.min(statsCards.length || 4, 5);

    return (
        <div
            className="grid gap-4 sm:grid-cols-2"
            style={{gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`}}
        >
            {statsQ?.isLoading
                ? Array.from({length: statsCards.length || 4}).map((_, i) => (
                    <div key={i} className="rounded-xl border p-4">
                        <Skeleton className="h-4 w-24"/>
                        <Skeleton className="h-8 w-16 mt-3"/>
                    </div>
                ))
                : statsCards.map((x) => {
                    const variant = VARIANT_BY_KEY[x.k] || "blue";
                    const Icon = ICON_BY_KEY[x.k];

                    return (
                        <StatCard
                            key={x.k}
                            title={x.k}
                            value={x.v}
                            subtitle={null}
                            Icon={Icon}
                            variant={variant}
                            className="rounded-xl"
                        />
                    );
                })}
        </div>
    );
}

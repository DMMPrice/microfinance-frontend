// src/pages/loans/LoanStatsSection.jsx
import React, {useMemo} from "react";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {useLoanStats} from "@/hooks/useLoans";

export default function LoanStatsSection() {
    const statsQ = useLoanStats();

    const cards = useMemo(() => {
        const d = statsQ.data || {};
        const keys = ["DISBURSED", "ACTIVE", "CLOSED", "CANCELLED", "OTHER"];
        return keys.map((k) => ({k, v: d[k] ?? 0}));
    }, [statsQ.data]);

    return (
        <Card className="rounded-xl">
            <CardHeader>
                <CardTitle>Loan Stats</CardTitle>
                <CardDescription>Counts by status</CardDescription>
            </CardHeader>

            <CardContent>
                {statsQ.isLoading ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {Array.from({length: 5}).map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-lg"/>
                        ))}
                    </div>
                ) : statsQ.isError ? (
                    <div className="text-sm text-destructive">
                        {statsQ.error?.response?.data?.detail || statsQ.error?.message || "Failed to load"}
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {cards.map((x) => (
                            <div key={x.k} className="rounded-lg border p-4">
                                <div className="text-xs text-muted-foreground">{x.k}</div>
                                <div className="text-2xl font-bold">{x.v}</div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

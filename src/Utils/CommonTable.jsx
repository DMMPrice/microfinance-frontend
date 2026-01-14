import React from "react";
import {Skeleton} from "@/components/ui/skeleton";
import {ErrBox, EmptyHint, SkRows} from "@/Component/Loan/loans.ui.jsx";

/**
 * CommonTable
 * - columns: string[] (header labels)
 * - rows: { key: string; cells: React.ReactNode[] }[]
 * - isLoading / isError / error: optional for common handling
 * - emptyTitle / emptyDesc: optional empty state texts
 */
export default function CommonTable({
                                        columns = [],
                                        rows = [],
                                        isLoading = false,
                                        isError = false,
                                        error = null,
                                        emptyTitle = "No data found.",
                                        emptyDesc = "Try changing filters.",
                                        loadingRows = 3,
                                        className = "",
                                    }) {
    if (isLoading) return <SkRows/>;

    if (isError) return <ErrBox err={error}/>;

    if (!rows?.length) {
        return <EmptyHint title={emptyTitle} desc={emptyDesc}/>;
    }

    return (
        <div className={`border rounded-lg overflow-hidden ${className}`}>
            <table className="w-full text-sm">
                <thead className="bg-muted/40">
                <tr>
                    {columns.map((c, i) => (
                        <th
                            key={i}
                            className={`text-left font-semibold px-3 py-2 ${c === "" ? "w-[120px]" : ""}`}
                        >
                            {c}
                        </th>
                    ))}
                </tr>
                </thead>

                <tbody>
                {rows.map((r, idx) => (
                    <tr
                        key={r.key}
                        className={`border-t ${idx % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                    >
                        {r.cells.map((cell, i) => (
                            <td key={i} className="px-3 py-2 align-top">
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

// src/pages/loans/loans.ui.jsx
import React from "react";
import {Skeleton} from "@/components/ui/skeleton";

export function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export function fmtMoney(n) {
    const x = Number(n || 0);
    return x.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

export function ErrBox({err}) {
    return (
        <div className="text-sm text-destructive">
            {err?.response?.data?.detail || err?.message || "Failed to load"}
        </div>
    );
}

export function SkRows() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-10 w-full"/>
            <Skeleton className="h-10 w-full"/>
            <Skeleton className="h-10 w-full"/>
        </div>
    );
}

export function EmptyHint({title, desc, action}) {
    return (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
            <div className="font-semibold">{title}</div>
            {desc && <div className="text-sm text-muted-foreground">{desc}</div>}
            {action && <div className="pt-2 flex justify-center">{action}</div>}
        </div>
    );
}

export function DataTable({columns, rows}) {
    return (
        <div className="border rounded-lg overflow-hidden">
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
                    <tr key={r.key} className={`border-t ${idx % 2 === 0 ? "bg-background" : "bg-muted/10"}`}>
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

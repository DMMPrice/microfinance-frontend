// src/Component/Reports/LoanTopSheet/LoanTopSheetFilters.jsx
import React from "react";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Skeleton} from "@/components/ui/skeleton";
import {Badge} from "@/components/ui/badge";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function LoanTopSheetFilters({
                                                branchId,
                                                setBranchId,

                                                monthStart,
                                                setMonthStart,
                                                monthEnd,
                                                setMonthEnd,

                                                persist,
                                                setPersist,

                                                loadDisabled,
                                                loading,
                                                onThisMonth,
                                                onLoad,

                                                branches,
                                                branchesLoading,
                                                branchSelectDisabled,
                                            }) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                {/* Branch */}
                <div className="space-y-1 md:col-span-5">
                    <Label>Branch</Label>

                    {branchesLoading ? (
                        <Skeleton className="h-10 w-full"/>
                    ) : (
                        <Select
                            value={branchId || ""}
                            onValueChange={(v) => setBranchId(v)}
                            disabled={branchSelectDisabled}
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select branch"/>
                            </SelectTrigger>
                            <SelectContent>
                                {(branches || []).map((b) => (
                                    <SelectItem key={String(b.id)} value={String(b.id)}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {branchSelectDisabled && (
                        <div className="pt-1">
                            <Badge variant="secondary">Branch locked by role</Badge>
                        </div>
                    )}
                </div>

                {/* Month Start */}
                <div className="space-y-1 md:col-span-3">
                    <Label>Month Start</Label>
                    <Input
                        type="date"
                        value={monthStart || ""}
                        onChange={(e) => setMonthStart(e.target.value)}
                    />
                </div>

                {/* Month End */}
                <div className="space-y-1 md:col-span-3">
                    <Label>Month End</Label>
                    <Input
                        type="date"
                        value={monthEnd || ""}
                        onChange={(e) => setMonthEnd(e.target.value)}
                    />
                </div>

                {/* Load button */}
                <div className="flex items-end md:col-span-1">
                    <Button onClick={onLoad} disabled={loadDisabled}>
                        {loading ? "Loading..." : "Load"}
                    </Button>
                </div>
            </div>

            {/* Persist + This month */}
            <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!persist}
                        onChange={(e) => setPersist(e.target.checked)}
                    />
                    Persist
                </label>

                <Button variant="outline" size="sm" onClick={onThisMonth}>
                    This Month
                </Button>
            </div>
        </div>
    );
}
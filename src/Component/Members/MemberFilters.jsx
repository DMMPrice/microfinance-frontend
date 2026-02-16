// src/Component/Members/MemberFilters.jsx
import React from "react";
import {Input} from "@/components/ui/input.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import {Search} from "lucide-react";

export default function MemberFilters({
                                          q, setQ,
                                          onlyActive, setOnlyActive,

                                          filterRegionId, setFilterRegionId,
                                          filterBranchId, setFilterBranchId,
                                          filterOfficerId, setFilterOfficerId,
                                          filterGroupId, setFilterGroupId,

                                          regions = [],
                                          branches = [],
                                          officers = [],
                                          groups = [],
                                          role = "",
                                      }) {
    const r = String(role || "").toLowerCase();
    const hideBranchRegion = r === "loan_officer" || r === "branch_manager";

    const normDay = (v) => {
        if (v == null) return "";
        if (typeof v === "object") return normDay(v?.name ?? v?.day ?? v?.label ?? "");
        if (typeof v === "number") {
            const map0 = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            return map0[v] || "";
        }
        const s = String(v).trim();
        if (!s) return "";
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    const groupLabel = (g) => {
        const name = g?.name ?? g?.group_name ?? "";
        const md =
            g?.meeting_day ??
            g?.meetingDay ??
            g?.meeting_day_name ??
            g?.meetingDayName ??
            "";
        const mdStr = normDay(md);
        return mdStr ? `${name} (${mdStr})` : name;
    };

    return (
        <div className={`grid grid-cols-1 gap-3 ${hideBranchRegion ? "lg:grid-cols-4" : "lg:grid-cols-6"}`}>
            {/* Search */}
            <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name / phone / group / officer..."
                    className="pl-9"
                />
            </div>

            {/* ✅ Region (only for Admin / RM / Super Admin etc.) */}
            {!hideBranchRegion && (
                <Select value={filterRegionId} onValueChange={setFilterRegionId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Region"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        {regions.map((rg) => (
                            <SelectItem key={rg.id ?? rg.region_id} value={String(rg.id ?? rg.region_id)}>
                                {rg.name ?? rg.region_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* ✅ Branch (only for Admin / RM / Super Admin etc.) */}
            {!hideBranchRegion && (
                <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Branch"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {branches.map((b) => (
                            <SelectItem key={b.id ?? b.branch_id} value={String(b.id ?? b.branch_id)}>
                                {b.name ?? b.branch_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Loan Officer */}
            <Select value={filterOfficerId} onValueChange={setFilterOfficerId}>
                <SelectTrigger>
                    <SelectValue placeholder="Loan Officer" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Officers</SelectItem>

                    {(officers || []).map((o) => {
                        const oid = String(o?.id ?? o?.lo_id ?? o?.user_id ?? "");
                        if (!oid) return null;

                        const oname =
                            o?.name ?? o?.full_name ?? o?.loan_officer_name ?? `Officer ${oid}`;

                        return (
                            <SelectItem key={oid} value={oid}>
                                {oname}
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>

            {/* Group (with Meeting Day) */}
            <Select value={filterGroupId} onValueChange={setFilterGroupId}>
                <SelectTrigger>
                    <SelectValue placeholder="Group"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map((g) => (
                        <SelectItem key={g.id ?? g.group_id} value={String(g.id ?? g.group_id)}>
                            {groupLabel(g)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border px-3 h-10">
                <div className="text-sm">Active only</div>
                <Switch checked={onlyActive} onCheckedChange={setOnlyActive}/>
            </div>
        </div>
    );
}

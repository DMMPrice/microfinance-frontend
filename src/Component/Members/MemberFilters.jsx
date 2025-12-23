// src/Component/Home/Main Components/Members/MemberFilters.jsx
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
                                          q,
                                          setQ,
                                          onlyActive,
                                          setOnlyActive,
                                          filterRegionId,
                                          setFilterRegionId,
                                          filterBranchId,
                                          setFilterBranchId,
                                          filterOfficerId,
                                          setFilterOfficerId,
                                          filterGroupId,
                                          setFilterGroupId,
                                          regions = [],
                                          branches = [],
                                          officers = [],
                                          groups = [],
                                      }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name / phone / group / branch / region..."
                    className="pl-9"
                />
            </div>

            <Select value={filterRegionId} onValueChange={setFilterRegionId}>
                <SelectTrigger>
                    <SelectValue placeholder="Region"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map((r) => (
                        <SelectItem key={r.id ?? r.region_id} value={String(r.id ?? r.region_id)}>
                            {r.name ?? r.region_name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

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

            <Select value={filterOfficerId} onValueChange={setFilterOfficerId}>
                <SelectTrigger>
                    <SelectValue placeholder="Loan Officer"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Officers</SelectItem>
                    {officers.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                            {o.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={filterGroupId} onValueChange={setFilterGroupId}>
                <SelectTrigger>
                    <SelectValue placeholder="Group"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map((g) => (
                        <SelectItem key={g.id ?? g.group_id} value={String(g.id ?? g.group_id)}>
                            {g.name ?? g.group_name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="flex items-center justify-between rounded-lg border px-3 h-10 lg:col-span-1">
                <div className="text-sm">Active only</div>
                <Switch checked={onlyActive} onCheckedChange={setOnlyActive}/>
            </div>
        </div>
    );
}

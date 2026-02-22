import React, {useMemo} from "react";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import {Loader2, RotateCw} from "lucide-react";

export default function CollectionEntryFilters({
                                                   asOn,
                                                   onAsOnChange,

                                                   // role/UI
                                                   hideBranchField,
                                                   hideLoField,

                                                   // values
                                                   branchId,
                                                   loId,
                                                   groupId,

                                                   // setters
                                                   onBranchChange,
                                                   onLoChange,
                                                   setGroupId,

                                                   // lists/loading
                                                   anyMasterLoading,
                                                   branches,
                                                   filteredLOs,
                                                   filteredGroups,

                                                   // actions
                                                   onLoadDue,
                                                   isLoadingDue,

                                                   // gating
                                                   disableLoadDue,
                                                   loadDueLabel,
                                               }) {
    // ✅ keep all parts in same row on desktop
    // we use flex + wrap for mobile, but md keeps a single row
    const groupDisabled = !branchId;

    const branchPlaceholder = anyMasterLoading ? "Loading..." : "Select Branch";

    const loPlaceholder = !branchId
        ? "Select Branch first"
        : "Select Loan Officer";

    const groupPlaceholder = !branchId ? "Select Branch first" : "All Groups";

    return (
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
            {/* As On Date */}
            <div className="w-full md:w-[220px] space-y-1">
                <Label>As On Date</Label>
                <Input
                    type="date"
                    value={asOn}
                    onChange={(e) => onAsOnChange(e.target.value)}
                />
            </div>

            {/* Branch (hidden if auto-selected) */}
            {!hideBranchField ? (
                <div className="w-full md:w-[240px] space-y-1">
                    <Label>Branch</Label>
                    <Select value={branchId} onValueChange={onBranchChange}>
                        <SelectTrigger>
                            <SelectValue placeholder={branchPlaceholder}/>
                        </SelectTrigger>
                        <SelectContent>
                            {(branches || []).map((b) => (
                                <SelectItem key={b.branch_id} value={String(b.branch_id)}>
                                    {b.branch_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ) : null}

            {/* Loan Officer (hidden if auto-selected) */}
            {!hideLoField ? (
                <div className="w-full md:w-[260px] space-y-1">
                    <Label>Loan Officer</Label>
                    <Select value={loId} onValueChange={onLoChange} disabled={!branchId}>
                        <SelectTrigger>
                            <SelectValue placeholder={loPlaceholder}/>
                        </SelectTrigger>
                        <SelectContent>
                            {filteredLOs.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No Loan Officer found for this branch
                                </div>
                            ) : (
                                filteredLOs.map((lo) => (
                                    <SelectItem key={lo.lo_id} value={String(lo.lo_id)}>
                                        {lo?.employee?.full_name || "Loan Officer"}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
            ) : null}

            {/* Group */}
            <div className="w-full md:w-[260px] space-y-1">
                <Label>Group (optional)</Label>
                <Select value={groupId} onValueChange={setGroupId} disabled={groupDisabled}>
                    <SelectTrigger>
                        <SelectValue placeholder={groupPlaceholder}/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Groups</SelectItem>
                        {(filteredGroups || []).map((g) => (
                            <SelectItem key={g.group_id} value={String(g.group_id)}>
                                {g.group_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Load Due button */}
            <div className="w-full md:flex-1 md:min-w-[220px]">
                <Button
                    onClick={onLoadDue}
                    disabled={disableLoadDue}
                    className="w-full"
                    title={disableLoadDue ? (loadDueLabel || "Cannot load") : "Load Due"}
                >
                    {isLoadingDue ? (
                        <Loader2 className="h-4 w-4 animate-spin"/>
                    ) : (
                        <RotateCw className="h-4 w-4"/>
                    )}
                    <span className="ml-2">{loadDueLabel || "Load Due"}</span>
                </Button>
            </div>
        </div>
    );
}
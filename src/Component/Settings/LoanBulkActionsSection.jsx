// src/Component/Settings/LoanBulkActionsSection.jsx
import React, {useMemo, useState} from "react";
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";
import {Separator} from "@/components/ui/separator";
import {Alert, AlertTitle, AlertDescription} from "@/components/ui/alert";
import {Loader2, PauseCircle, PlayCircle} from "lucide-react";
import {toast} from "@/components/ui/use-toast";
import SimpleDatePicker from "@/Utils/SimpleDatePicker";

import SearchableSelect from "@/Utils/SearchableSelect";
import {useBranches} from "@/hooks/useBranches";
import {useGroups} from "@/hooks/useGroups";
import {useBulkPauseLoans, useBulkResumeLoans} from "@/hooks/useSettings";

function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

export default function LoanBulkActionsSection() {
    const [mode, setMode] = useState("GROUP"); // GROUP | BRANCH
    const [action, setAction] = useState("PAUSE"); // PAUSE | RESUME

    // selection ids
    const [branchId, setBranchId] = useState(""); // string
    const [groupId, setGroupId] = useState(""); // string

    const [resumeFrom, setResumeFrom] = useState(""); // YYYY-MM-DD
    const [resequence, setResequence] = useState(true);
    const [reallocatePayments, setReallocatePayments] = useState(true);

    const [remarks, setRemarks] = useState("");
    const [result, setResult] = useState(null);

    const {branches = [], isLoading: branchesLoading} = useBranches();

    // ✅ Filter groups by selected branch (when branch selected)
    const {groups = [], isLoading: groupsLoading} = useGroups(
        branchId ? {branch_id: safeNum(branchId)} : {}
    );

    const bulkPause = useBulkPauseLoans();
    const bulkResume = useBulkResumeLoans();

    const branchOptions = useMemo(() => {
        return (branches || []).map((b) => ({
            value: String(b.branch_id),
            label: `${b.branch_name}`,
            keywords: `${b.branch_name} ${b.branch_id}`,
        }));
    }, [branches]);

    const groupOptions = useMemo(() => {
        return (groups || []).map((g) => ({
            value: String(g.group_id),
            label: `${g.group_name} (${g.meeting_day})`,
            keywords: `${g.group_name} ${g.group_id}`,
            branch_id: g.branch_id,
        }));
    }, [groups]);

    const isBusy = bulkPause.loading || bulkResume.loading;

    const effectiveBranchId = safeNum(branchId) || null;
    const effectiveGroupId = safeNum(groupId) || null;

    const params = useMemo(() => {
        const p = {};

        if (mode === "GROUP") p.group_id = effectiveGroupId || undefined;
        if (mode === "BRANCH") p.branch_id = effectiveBranchId || undefined;

        if (remarks.trim()) p.remarks = remarks.trim();

        if (action === "RESUME") {
            if (resumeFrom) p.resume_from = resumeFrom;
            p.resequence = !!resequence;
            p.reallocate_payments = !!reallocatePayments;
        }

        return p;
    }, [mode, action, effectiveGroupId, effectiveBranchId, remarks, resumeFrom, resequence, reallocatePayments]);

    const validate = () => {
        if (mode === "BRANCH") {
            if (!effectiveBranchId) return "Please select a Branch Reports.";
        }
        if (mode === "GROUP") {
            if (!effectiveBranchId) return "Please select a Branch Reports first (to filter groups).";
            if (!effectiveGroupId) return "Please select a Group.";
        }
        if (action === "RESUME" && resumeFrom && !/^\d{4}-\d{2}-\d{2}$/.test(resumeFrom)) {
            return "resume_from must be YYYY-MM-DD";
        }
        return null;
    };

    const onSubmit = async () => {
        const err = validate();
        if (err) {
            toast({title: "Invalid input", description: err, variant: "destructive"});
            return;
        }

        setResult(null);
        try {
            const data =
                action === "PAUSE"
                    ? await bulkPause.mutate(params)
                    : await bulkResume.mutate(params);

            setResult(data);

            toast({
                title: `Bulk ${action.toLowerCase()} successful`,
                description:
                    data?.message ||
                    `Updated ${data?.updated_loans ?? data?.reinstated_installments ?? ""}`.trim(),
            });
        } catch (e) {
            toast({
                title: "Request failed",
                description: e?.response?.data?.detail || e?.message || "Unknown error",
                variant: "destructive",
            });
        }
    };

    return (
        <Card className="border-slate-200/70">
            <CardHeader>
                <CardTitle>Loan Bulk Actions</CardTitle>
                <CardDescription>
                    Pause or resume all loans for a given <b>Group</b> or <b>Branch</b>.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Scope</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={mode === "GROUP" ? "default" : "outline"}
                                onClick={() => {
                                    setMode("GROUP");
                                    setGroupId("");
                                }}
                            >
                                Group
                            </Button>
                            <Button
                                type="button"
                                variant={mode === "BRANCH" ? "default" : "outline"}
                                onClick={() => {
                                    setMode("BRANCH");
                                    setGroupId("");
                                }}
                            >
                                Branch
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Action</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={action === "PAUSE" ? "default" : "outline"}
                                onClick={() => setAction("PAUSE")}
                            >
                                <PauseCircle className="h-4 w-4 mr-2"/>
                                Pause
                            </Button>
                            <Button
                                type="button"
                                variant={action === "RESUME" ? "default" : "outline"}
                                onClick={() => setAction("RESUME")}
                            >
                                <PlayCircle className="h-4 w-4 mr-2"/>
                                Resume
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Remarks</Label>
                        <Input
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Optional note for ledger narration / audit"
                        />
                    </div>
                </div>

                <Separator/>

                {/* Branch Reports select (always shown) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Branch</Label>
                        <SearchableSelect
                            value={branchId}
                            onValueChange={(v) => {
                                setBranchId(v || "");
                                setGroupId(""); // reset group on branch change
                            }}
                            options={branchOptions}
                            placeholder={branchesLoading ? "Loading branches..." : "Select branch..."}
                        />
                        {mode === "GROUP" ? (
                            <div className="text-xs text-muted-foreground">
                                Group list will be filtered by selected branch.
                            </div>
                        ) : null}
                    </div>

                    {/* Group select (only if mode GROUP) */}
                    {mode === "GROUP" ? (
                        <div className="space-y-2">
                            <Label>Group</Label>
                            <SearchableSelect
                                value={groupId}
                                onValueChange={(v) => setGroupId(v || "")}
                                options={groupOptions}
                                placeholder={
                                    !branchId
                                        ? "Select branch first..."
                                        : (groupsLoading ? "Loading groups..." : "Select group...")
                                }
                                disabled={!branchId}
                            />
                        </div>
                    ) : null}
                </div>

                {action === "RESUME" ? (
                    <>
                        <Separator/>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Resume from (optional)</Label>
                                <SimpleDatePicker
                                    value={resumeFrom}
                                    onChange={setResumeFrom}
                                    placeholder="Select resume date"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    Resequence unpaid installments
                                    <Switch checked={resequence} onCheckedChange={setResequence}/>
                                </Label>
                                <div className="text-xs text-muted-foreground">
                                    If enabled, unpaid installments will be re-dated weekly from resume_from.
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    Reallocate previous payments
                                    <Switch checked={reallocatePayments} onCheckedChange={setReallocatePayments}/>
                                </Label>
                                <div className="text-xs text-muted-foreground">
                                    If enabled, previous payments will be mapped to the new schedule.
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}

                <div className="flex items-center gap-3">
                    <Button type="button" onClick={onSubmit} disabled={isBusy}>
                        {isBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                        Run Bulk {action === "PAUSE" ? "Pause" : "Resume"}
                    </Button>
                </div>

                {result ? (
                    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold">Bulk Action Result</div>

                            {/* tiny badge */}
                            <div
                                className={`text-xs px-2 py-1 rounded-full border ${
                                    (result?.matched_loans || 0) > 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                                }`}
                            >
                                {(result?.matched_loans || 0) > 0 ? "Completed" : "No loans found"}
                            </div>
                        </div>

                        {/* summary grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-lg border bg-background p-3">
                                <div className="text-xs text-muted-foreground">Scope</div>
                                <div className="text-sm font-medium mt-1">
                                    Branch: <span className="font-semibold">{result?.scope?.branch_id ?? "-"}</span>
                                </div>
                                <div className="text-sm font-medium">
                                    Group: <span className="font-semibold">{result?.scope?.group_id ?? "-"}</span>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-background p-3">
                                <div className="text-xs text-muted-foreground">Matched Loans</div>
                                <div className="text-2xl font-bold mt-1">{result?.matched_loans ?? 0}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Loans that satisfied the filter (status + branch/group)
                                </div>
                            </div>

                            <div className="rounded-lg border bg-background p-3">
                                <div className="text-xs text-muted-foreground">
                                    {action === "PAUSE" ? "Paused Loans" : "Resumed Loans"}
                                </div>
                                <div className="text-2xl font-bold mt-1">
                                    {action === "PAUSE" ? (result?.paused_loans ?? 0) : (result?.resumed_loans ?? 0)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Loans successfully updated
                                </div>
                            </div>
                        </div>

                        {/* warning if 0 */}
                        {(result?.matched_loans ?? 0) === 0 ? (
                            <Alert variant="destructive">
                                <AlertTitle>No loans matched</AlertTitle>
                                <AlertDescription>
                                    Check if the selected Branch/Group has loans in
                                    status <b>ACTIVE</b> or <b>DISBURSED</b> (for pause),
                                    or <b>PAUSED</b> (for resume). Also confirm the correct Branch/Group IDs.
                                </AlertDescription>
                            </Alert>
                        ) : null}

                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}

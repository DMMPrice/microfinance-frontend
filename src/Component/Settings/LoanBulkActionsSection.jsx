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
            if (!effectiveBranchId) return "Please select a Branch.";
        }
        if (mode === "GROUP") {
            if (!effectiveBranchId) return "Please select a Branch first (to filter groups).";
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
                <Alert>
                    <AlertTitle>Backend requirement</AlertTitle>
                    <AlertDescription>
                        This expects <code>group_id</code> / <code>branch_id</code> query params on:
                        <code className="ml-1">PATCH /loans/pause</code> and
                        <code className="ml-1">PATCH /loans/resume</code>.
                    </AlertDescription>
                </Alert>

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

                {/* Branch select (always shown) */}
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
                                <Input
                                    value={resumeFrom}
                                    onChange={(e) => setResumeFrom(e.target.value)}
                                    placeholder="YYYY-MM-DD"
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

                    <div className="text-xs text-muted-foreground">
                        {mode === "BRANCH"
                            ? (effectiveBranchId ? `Selected Branch ID: ${effectiveBranchId}` : "No branch selected")
                            : (effectiveGroupId ? `Selected Group ID: ${effectiveGroupId}` : "No group selected")}
                    </div>
                </div>

                {result ? (
                    <div className="rounded-xl border bg-muted/20 p-3">
                        <div className="text-sm font-medium mb-2">Response</div>
                        <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}

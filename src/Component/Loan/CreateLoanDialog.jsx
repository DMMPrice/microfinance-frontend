// src/Component/Loan/CreateLoanDialog.jsx
import React, {useEffect, useMemo, useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Skeleton} from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {useCreateLoan} from "@/hooks/useLoans";
import {apiClient} from "@/hooks/useApi.js";
import {toast} from "@/components/ui/use-toast";

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function addDaysISO(isoDate, days) {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * ✅ Perfect error message extraction for axios/FastAPI
 * Handles:
 * - {detail: "..."}
 * - {detail: [{loc: [...], msg: "..."}]}  (422 validation)
 * - string response
 * - network errors
 */
function extractApiError(err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    // network / CORS / server down
    if (!err?.response) {
        return {
            title: "Network error",
            description: err?.message || "Unable to reach server.",
        };
    }

    // FastAPI typical shapes
    const detail = data?.detail ?? data;

    // 422 validation error list
    if (status === 422 && Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        const loc = Array.isArray(first?.loc) ? first.loc.join(" → ") : "Validation";
        const msg = first?.msg || "Invalid input";
        return {
            title: "Validation error",
            description: `${loc}: ${msg}`,
        };
    }

    // detail is string
    if (typeof detail === "string") {
        // nicer title for conflict
        if (status === 409) {
            return {title: "Cannot create loan", description: detail};
        }
        return {title: "Request failed", description: detail};
    }

    // detail exists but not string (object)
    if (detail && typeof detail === "object") {
        return {
            title: "Request failed",
            description: JSON.stringify(detail),
        };
    }

    // fallback
    return {
        title: "Request failed",
        description: err?.message || "Something went wrong.",
    };
}

export default function CreateLoanDialog({open, onOpenChange}) {
    const createLoan = useCreateLoan();

    // ----------------------------
    // Defaults
    // ----------------------------
    const defaults = useMemo(() => {
        const today = todayISO();
        const first = addDaysISO(today, 7);
        return {
            loan_account_no: "",
            group_id: "",
            member_id: "",
            product_id: 1,
            disburse_date: today,
            first_installment_date: first,
            duration_weeks: 12,
            principal_amount: "",
            weekly_interest_percent: "",
        };
    }, []);

    const [form, setForm] = useState(defaults);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (open) {
            setForm(defaults);
            setShowPreview(false);
        }
    }, [open, defaults]);

    const set = (k) => (e) => setForm((p) => ({...p, [k]: e.target.value}));

    // ----------------------------
    // Load Groups + Members
    // ----------------------------
    const [groups, setGroups] = useState([]);
    const [members, setMembers] = useState([]);

    const [gLoading, setGLoading] = useState(false);
    const [mLoading, setMLoading] = useState(false);
    const [gErr, setGErr] = useState("");
    const [mErr, setMErr] = useState("");

    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        async function loadGroups() {
            setGLoading(true);
            setGErr("");
            try {
                const res = await apiClient.get("/groups/");
                if (!cancelled) setGroups(Array.isArray(res.data) ? res.data : []);
            } catch (e) {
                if (!cancelled)
                    setGErr(e?.response?.data?.detail || e.message || "Failed to load groups");
            } finally {
                if (!cancelled) setGLoading(false);
            }
        }

        async function loadMembersWithFallback() {
            setMLoading(true);
            setMErr("");
            try {
                let res;
                try {
                    res = await apiClient.get("/members/");
                } catch {
                    res = await apiClient.get("/borrowers/");
                }
                if (!cancelled) setMembers(Array.isArray(res.data) ? res.data : []);
            } catch (e) {
                if (!cancelled)
                    setMErr(e?.response?.data?.detail || e.message || "Failed to load members");
            } finally {
                if (!cancelled) setMLoading(false);
            }
        }

        loadGroups();
        loadMembersWithFallback();

        return () => {
            cancelled = true;
        };
    }, [open]);

    const groupNameById = useMemo(() => {
        const map = {};
        (groups || []).forEach((g) => {
            map[String(g.group_id)] = g.group_name || `Group-${g.group_id}`;
        });
        return map;
    }, [groups]);

    const memberOptions = useMemo(() => {
        const gid = form.group_id ? String(form.group_id) : "";
        const list = (members || []).filter((m) => {
            if (!gid) return true;
            return String(m.group_id) === gid;
        });

        const key = (m) => {
            const gName = (groupNameById[String(m.group_id)] || "").toLowerCase();
            const name = (m.full_name || "").toLowerCase();
            return `${gName}__${name}`;
        };

        list.sort((a, b) => key(a).localeCompare(key(b)));

        return list.map((m) => {
            const gName = groupNameById[String(m.group_id)] || `Group-${m.group_id}`;
            const name = m.full_name || `Member-${m.member_id}`;
            const phone = m.phone ? ` · ${m.phone}` : "";
            return {
                value: String(m.member_id),
                label: `${gName} — ${name} (MID-${m.member_id})${phone}`,
            };
        });
    }, [members, form.group_id, groupNameById]);

    useEffect(() => {
        setForm((p) => ({...p, member_id: ""}));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.group_id]);

    // ----------------------------
    // Interest calculation (weekly %)
    // ----------------------------
    const principal = safeNum(form.principal_amount);
    const weeks = Math.max(0, safeNum(form.duration_weeks));
    const weeklyRate = safeNum(form.weekly_interest_percent);

    const weeklyInterestAmount = round2((principal * weeklyRate) / 100);
    const totalInterestAuto = round2(weeklyInterestAmount * weeks);

    // ----------------------------
    // Schedule Preview
    // ----------------------------
    const scheduleRows = useMemo(() => {
        if (!weeks) return [];
        if (!principal) return [];

        const principalPer = weeks ? principal / weeks : 0;
        const interestPer = weeklyInterestAmount;

        const first = form.first_installment_date || todayISO();
        let bal = principal;

        const rows = [];
        for (let i = 0; i < weeks; i++) {
            const dueDate = addDaysISO(first, i * 7);
            const p = principalPer;
            const it = interestPer;
            const total = p + it;
            bal = Math.max(0, bal - p);

            rows.push({
                inst_no: i + 1,
                due_date: dueDate,
                principal_due: round2(p),
                interest_due: round2(it),
                total_due: round2(total),
                principal_balance: round2(bal),
            });
        }
        return rows;
    }, [weeks, principal, weeklyInterestAmount, form.first_installment_date]);

    // ----------------------------
    // Submit
    // ----------------------------
    const onSubmit = async () => {
        if (!form.loan_account_no?.trim())
            return toast({title: "Loan A/C No is required", variant: "destructive"});
        if (!form.group_id)
            return toast({title: "Group is required", variant: "destructive"});
        if (!form.member_id)
            return toast({title: "Member is required", variant: "destructive"});
        if (!form.principal_amount)
            return toast({title: "Principal is required", variant: "destructive"});
        if (!form.weekly_interest_percent)
            return toast({title: "Weekly Interest (%) is required", variant: "destructive"});

        const payload = {
            loan_account_no: form.loan_account_no.trim(),
            member_id: Number(form.member_id),
            product_id: Number(form.product_id),
            disburse_date: form.disburse_date,
            first_installment_date: form.first_installment_date,
            duration_weeks: Number(form.duration_weeks),
            principal_amount: Number(form.principal_amount),

            // ✅ backend expects this
            flat_interest_total: Number(totalInterestAuto),
        };

        try {
            await createLoan.mutateAsync(payload);
            toast({title: "Loan created successfully ✅"});
            setForm(defaults);
            setShowPreview(false);
            onOpenChange(false);
        } catch (err) {
            const {title, description} = extractApiError(err);
            toast({
                title,
                description,
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Create Loan</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Loan Account No</Label>
                        <Input
                            value={form.loan_account_no}
                            onChange={set("loan_account_no")}
                            placeholder="LN-0001"
                        />
                    </div>

                    {/* Group */}
                    <div className="space-y-2">
                        <Label>Group</Label>
                        {gLoading ? (
                            <Skeleton className="h-10 w-full"/>
                        ) : gErr ? (
                            <div className="text-sm text-destructive">{gErr}</div>
                        ) : (
                            <Select
                                value={form.group_id ? String(form.group_id) : ""}
                                onValueChange={(v) => setForm((p) => ({...p, group_id: v}))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Group"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {(groups || []).map((g) => (
                                        <SelectItem key={g.group_id} value={String(g.group_id)}>
                                            {g.group_name} (G-{g.group_id})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Member */}
                    <div className="space-y-2">
                        <Label>Member</Label>
                        {mLoading ? (
                            <Skeleton className="h-10 w-full"/>
                        ) : mErr ? (
                            <div className="text-sm text-destructive">{mErr}</div>
                        ) : (
                            <Select
                                value={form.member_id ? String(form.member_id) : ""}
                                onValueChange={(v) => setForm((p) => ({...p, member_id: v}))}
                                disabled={!form.group_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={form.group_id ? "Select Member" : "Select Group first"}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {memberOptions.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">
                                            No members found for this group
                                        </div>
                                    ) : (
                                        memberOptions.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {o.label}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Product ID</Label>
                        <Input value={form.product_id} onChange={set("product_id")} placeholder="1"/>
                    </div>

                    <div className="space-y-2">
                        <Label>Duration (weeks)</Label>
                        <Input value={form.duration_weeks} onChange={set("duration_weeks")} placeholder="12"/>
                    </div>

                    <div className="space-y-2">
                        <Label>Disburse Date</Label>
                        <Input type="date" value={form.disburse_date} onChange={set("disburse_date")}/>
                    </div>

                    <div className="space-y-2">
                        <Label>First Installment Date</Label>
                        <Input
                            type="date"
                            value={form.first_installment_date}
                            onChange={set("first_installment_date")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Principal Amount</Label>
                        <Input value={form.principal_amount} onChange={set("principal_amount")} placeholder="10000"/>
                    </div>

                    {/* Weekly Interest */}
                    <div className="space-y-2">
                        <Label>Weekly Interest (%)</Label>
                        <Input
                            value={form.weekly_interest_percent}
                            onChange={set("weekly_interest_percent")}
                            placeholder="e.g. 2"
                        />
                        <div className="text-xs text-muted-foreground">
                            Weekly Interest Amount:{" "}
                            <span className="font-medium text-foreground">{weeklyInterestAmount || 0}</span>
                            {" "}· Total Interest (auto):{" "}
                            <span className="font-medium text-foreground">{totalInterestAuto || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="text-sm text-muted-foreground">
                        Preview schedule from{" "}
                        <span className="font-medium text-foreground">{form.first_installment_date || "-"}</span>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPreview((s) => !s)}
                        disabled={!weeks || !principal || !form.first_installment_date}
                    >
                        {showPreview ? "Hide Preview" : "Preview Schedule"}
                    </Button>
                </div>

                {showPreview ? (
                    <div className="mt-3 rounded-lg border overflow-auto max-h-[260px]">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 sticky top-0">
                            <tr>
                                <th className="px-3 py-2 text-center whitespace-nowrap">Inst #</th>
                                <th className="px-3 py-2 text-center whitespace-nowrap">Due Date</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Principal</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Interest</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Total</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Balance</th>
                            </tr>
                            </thead>
                            <tbody>
                            {scheduleRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                                        Enter Duration / Principal / Weekly Interest to preview schedule.
                                    </td>
                                </tr>
                            ) : (
                                scheduleRows.map((x) => (
                                    <tr key={x.inst_no} className="border-t">
                                        <td className="px-3 py-2 text-center">{x.inst_no}</td>
                                        <td className="px-3 py-2 text-center">{x.due_date}</td>
                                        <td className="px-3 py-2 text-right">{x.principal_due.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right">{x.interest_due.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right font-medium">{x.total_due.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right">{x.principal_balance.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                ) : null}

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>

                    <Button onClick={onSubmit} disabled={createLoan.isPending}>
                        {createLoan.isPending ? "Creating..." : "Create Loan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

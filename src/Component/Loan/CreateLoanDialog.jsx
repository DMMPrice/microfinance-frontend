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
import PreviewScheduleDialog from "./PreviewScheduleDialog";

/* ---------------------------------------------------------
   ✅ Loan Account suggestions cache (LOAD ONCE + MEMORY)
--------------------------------------------------------- */
let LOAN_ACCOUNTS_CACHE = null; // in-memory cache (module-level)
const LOAN_ACCOUNTS_LS_KEY = "mf.loanAccountNos.v1";

async function getLoanAccountNosOnce() {
    // 1) in-memory cache
    if (Array.isArray(LOAN_ACCOUNTS_CACHE) && LOAN_ACCOUNTS_CACHE.length) {
        return LOAN_ACCOUNTS_CACHE;
    }

    // 2) localStorage cache
    try {
        const raw = localStorage.getItem(LOAN_ACCOUNTS_LS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length) {
                LOAN_ACCOUNTS_CACHE = parsed;
                return parsed;
            }
        }
    } catch {
        // ignore storage errors
    }

    // 3) fetch once
    const res = await apiClient.get("/loans/master", {
        params: {limit: 5000, offset: 0},
    });
    const list = Array.isArray(res.data) ? res.data : [];

    // Extract unique loan_account_no
    const uniq = Array.from(
        new Set(
            list
                .map((x) => (x?.loan_account_no ? String(x.loan_account_no).trim() : ""))
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b));

    LOAN_ACCOUNTS_CACHE = uniq;

    // save to localStorage
    try {
        localStorage.setItem(LOAN_ACCOUNTS_LS_KEY, JSON.stringify(uniq));
    } catch {
        // ignore storage errors
    }

    return uniq;
}

/* --------------------------------------------------------- */

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function addDaysISO(isoDate, days) {
    // isoDate is "YYYY-MM-DD" or compatible
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
 */
function extractApiError(err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    if (!err?.response) {
        return {
            title: "Network error",
            description: err?.message || "Unable to reach server.",
        };
    }

    const detail = data?.detail ?? data;

    if (status === 422 && Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        const loc = Array.isArray(first?.loc) ? first.loc.join(" → ") : "Validation";
        const msg = first?.msg || "Invalid input";
        return {
            title: "Validation error",
            description: `${loc}: ${msg}`,
        };
    }

    if (typeof detail === "string") {
        if (status === 409) return {title: "Cannot create loan", description: detail};
        return {title: "Request failed", description: detail};
    }

    if (detail && typeof detail === "object") {
        return {title: "Request failed", description: JSON.stringify(detail)};
    }

    return {
        title: "Request failed",
        description: err?.message || "Something went wrong.",
    };
}

// Defaults until you add settings keys later
const DEFAULT_PROCESSING_PCT = 1; // 1%
const DEFAULT_INSURANCE_PCT = 0.5; // 0.5%

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
            product_id: 1, // ✅ keep in payload, UI removed
            disburse_date: today,
            first_installment_date: first, // ✅ auto disburse+7
            duration_weeks: 12, // ✅ will auto load from settings
            principal_amount: "",
            annual_interest_percent: "",

            // ✅ new fee fields
            processing_fee_percent: DEFAULT_PROCESSING_PCT,
            insurance_fee_percent: DEFAULT_INSURANCE_PCT,
        };
    }, []);

    const [form, setForm] = useState(defaults);

    // Preview modal
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setForm(defaults);
            setPreviewOpen(false);
        }
    }, [open, defaults]);

    const set = (k) => (e) => setForm((p) => ({...p, [k]: e.target.value}));

    // ----------------------------
    // ✅ Auto: First installment = disburse + 7 days
    // ----------------------------
    useEffect(() => {
        if (!open) return;
        if (!form.disburse_date) return;

        const next = addDaysISO(form.disburse_date, 7);
        setForm((p) => ({...p, first_installment_date: next}));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.disburse_date, open]);

    // ----------------------------
    // ✅ Settings: duration from MAX_WEEK_SETTING
    // ----------------------------
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsErr, setSettingsErr] = useState("");

    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        (async () => {
            setSettingsLoading(true);
            setSettingsErr("");
            try {
                const res = await apiClient.get("/settings");
                const list = Array.isArray(res.data) ? res.data : [];

                const maxWeekRaw = list.find((x) => x.key === "MAX_WEEK_SETTING")?.value;
                const maxWeek = Number(maxWeekRaw || 12);

                // later you will create these keys
                const procPctRaw = list.find((x) => x.key === "PROCESSING_FEES")?.value;
                const insPctRaw = list.find((x) => x.key === "INSURANCE_FEES")?.value;

                const procPct = Number(procPctRaw ?? DEFAULT_PROCESSING_PCT);
                const insPct = Number(insPctRaw ?? DEFAULT_INSURANCE_PCT);

                if (!cancelled) {
                    setForm((p) => ({
                        ...p,
                        duration_weeks: Number.isFinite(maxWeek) && maxWeek > 0 ? maxWeek : 12,
                        processing_fee_percent: Number.isFinite(procPct)
                            ? procPct
                            : DEFAULT_PROCESSING_PCT,
                        insurance_fee_percent: Number.isFinite(insPct)
                            ? insPct
                            : DEFAULT_INSURANCE_PCT,
                    }));
                }
            } catch (e) {
                if (!cancelled) {
                    setSettingsErr(
                        e?.response?.data?.detail || e?.message || "Failed to load settings"
                    );
                }
            } finally {
                if (!cancelled) setSettingsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open]);

    // ----------------------------
    // ✅ Loan Account suggestions
    // ----------------------------
    const [loanAccountNos, setLoanAccountNos] = useState([]);
    const [laLoading, setLaLoading] = useState(false);
    const [laErr, setLaErr] = useState("");

    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        (async () => {
            setLaLoading(true);
            setLaErr("");
            try {
                const list = await getLoanAccountNosOnce();
                if (!cancelled) setLoanAccountNos(Array.isArray(list) ? list : []);
            } catch (e) {
                if (!cancelled)
                    setLaErr(
                        e?.response?.data?.detail || e?.message || "Failed to load loan accounts"
                    );
            } finally {
                if (!cancelled) setLaLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open]);

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
                    setMErr(e?.response?.data?.detail || e.message || "Failed to load Members");
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
    // ✅ Interest calculation (Simple Interest for 12 months)
    // ----------------------------
    const principal = safeNum(form.principal_amount);
    const weeks = Math.max(0, safeNum(form.duration_weeks));
    const annualRate = safeNum(form.annual_interest_percent);

    const totalInterestAuto = round2((principal * annualRate) / 100);

    const principalPerWeek = weeks ? round2(principal / weeks) : 0;
    const interestPerWeek = weeks ? round2(totalInterestAuto / weeks) : 0;

    const installmentPerWeek = weeks ? round2((principal + totalInterestAuto) / weeks) : 0;

    // ----------------------------
    // ✅ Fees (percent of principal) - only first installment
    // ----------------------------
    const processingPct = safeNum(form.processing_fee_percent);
    const insurancePct = safeNum(form.insurance_fee_percent);

    const processingFeeAmt = round2((principal * processingPct) / 100);
    const insuranceFeeAmt = round2((principal * insurancePct) / 100);
    const firstInstFees = round2(processingFeeAmt + insuranceFeeAmt);

    // ----------------------------
    // Schedule Preview rows (with fees on first installment only)
    // ----------------------------
    const scheduleRows = useMemo(() => {
        if (!weeks) return [];
        if (!principal) return [];

        const first = form.first_installment_date || todayISO();
        let bal = principal;

        const rows = [];
        for (let i = 0; i < weeks; i++) {
            const dueDate = addDaysISO(first, i * 7);

            const p = principalPerWeek;
            const it = interestPerWeek;
            const fees = i === 0 ? firstInstFees : 0;

            const total = round2(p + it + fees);

            bal = Math.max(0, round2(bal - p));

            rows.push({
                inst_no: i + 1,
                due_date: dueDate,
                principal_due: p,
                interest_due: it,
                fees_due: fees,
                total_due: total,
                principal_balance: bal,
            });
        }
        return rows;
    }, [
        weeks,
        principal,
        principalPerWeek,
        interestPerWeek,
        form.first_installment_date,
        firstInstFees,
    ]);

    // ----------------------------
    // Submit
    // ----------------------------
    const onSubmit = async () => {
        if (!form.loan_account_no?.trim())
            return toast({title: "Loan A/C No is required", variant: "destructive"});
        if (!form.group_id) return toast({title: "Group is required", variant: "destructive"});
        if (!form.member_id) return toast({title: "Member is required", variant: "destructive"});
        if (!form.principal_amount)
            return toast({title: "Principal is required", variant: "destructive"});
        if (!form.annual_interest_percent)
            return toast({title: "Annual Interest (%) is required", variant: "destructive"});

        const payload = {
            loan_account_no: form.loan_account_no.trim(),
            member_id: Number(form.member_id),

            // ✅ keep product_id (UI removed)
            product_id: Number(form.product_id),

            disburse_date: form.disburse_date,
            first_installment_date: form.first_installment_date,

            // ✅ auto from settings
            duration_weeks: Number(form.duration_weeks),

            principal_amount: Number(form.principal_amount),

            // ✅ backend expects this total interest amount
            flat_interest_total: Number(totalInterestAuto),

            // optional
            annual_interest_percent: Number(form.annual_interest_percent),
            installment_amount: Number(installmentPerWeek),

            // ✅ NEW: fees
            processing_fee_percent: Number(processingPct),
            insurance_fee_percent: Number(insurancePct),
            processing_fee_amount: Number(processingFeeAmt),
            insurance_fee_amount: Number(insuranceFeeAmt),
            first_installment_extra_amount: Number(firstInstFees),
        };

        try {
            await createLoan.mutateAsync(payload);
            toast({title: "Loan created successfully ✅"});

            // Update cache instantly
            const newAcc = payload.loan_account_no;
            if (newAcc) {
                const next = Array.from(new Set([...(loanAccountNos || []), newAcc])).sort((a, b) =>
                    a.localeCompare(b)
                );
                LOAN_ACCOUNTS_CACHE = next;
                setLoanAccountNos(next);
                try {
                    localStorage.setItem(LOAN_ACCOUNTS_LS_KEY, JSON.stringify(next));
                } catch {
                    // ignore
                }
            }

            setForm(defaults);
            setPreviewOpen(false);
            onOpenChange(false);
        } catch (err) {
            const {title, description} = extractApiError(err);
            toast({title, description, variant: "destructive"});
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                {/* ✅ ONLY SCROLLABLE MODAL (no sticky header/footer) */}
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="space-y-3">
                        <DialogTitle>Create Loan</DialogTitle>

                        {/* ✅ Static/Auto fields placed right after header */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border p-3 bg-muted/20">
                            {/* Duration (auto from settings) */}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Duration (weeks)</Label>

                                {settingsLoading ? (
                                    <Skeleton className="h-10 w-full"/>
                                ) : (
                                    <>
                                        <Input value={form.duration_weeks} disabled/>
                                        <div className="text-[11px] text-muted-foreground">
                                            Auto from system settings (MAX_WEEK_SETTING)
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* First Installment Date (auto +7 days) */}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">First Installment Date</Label>
                                <Input type="date" value={form.first_installment_date} disabled/>
                                <div className="text-[11px] text-muted-foreground">
                                    Auto: Disburse date + 7 days
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Settings warning (optional) */}
                    {settingsErr ? <div className="text-sm text-destructive">{settingsErr}</div> : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ✅ Loan Account No suggestions */}
                        <div className="space-y-2">
                            <Label>Loan Account No</Label>

                            {laLoading ? (
                                <Skeleton className="h-10 w-full"/>
                            ) : laErr ? (
                                <div className="text-sm text-destructive">{laErr}</div>
                            ) : (
                                <>
                                    <Input
                                        value={form.loan_account_no}
                                        onChange={set("loan_account_no")}
                                        placeholder="LN-0001"
                                        list="loan-account-suggestions"
                                        autoComplete="off"
                                    />
                                    <datalist id="loan-account-suggestions">
                                        {(loanAccountNos || []).map((acc) => (
                                            <option key={acc} value={acc}/>
                                        ))}
                                    </datalist>
                                </>
                            )}
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
                                        <SelectValue
                                            placeholder={form.group_id ? "Select Member" : "Select Group first"}
                                        />
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

                        {/* Disburse Date */}
                        <div className="space-y-2">
                            <Label>Disburse Date</Label>
                            <Input type="date" value={form.disburse_date} onChange={set("disburse_date")}/>
                        </div>

                        {/* Principal */}
                        <div className="space-y-2">
                            <Label>Principal Amount</Label>
                            <Input
                                value={form.principal_amount}
                                onChange={set("principal_amount")}
                                placeholder="10000"
                            />
                        </div>

                        {/* Annual Interest */}
                        <div className="space-y-2">
                            <Label>Annual Interest (%)</Label>
                            <Input
                                value={form.annual_interest_percent}
                                onChange={set("annual_interest_percent")}
                                placeholder="e.g. 24"
                            />
                            <div className="text-xs text-muted-foreground">
                                Total Interest (12 months):{" "}
                                <span className="font-medium text-foreground">{totalInterestAuto || 0}</span>{" "}
                                · Weekly Installment:{" "}
                                <span className="font-medium text-foreground">{installmentPerWeek || 0}</span>
                            </div>
                        </div>

                        {/* Processing Fees */}
                        <div className="space-y-2">
                            <Label>Processing Fees (%)</Label>
                            <Input
                                value={form.processing_fee_percent}
                                onChange={set("processing_fee_percent")}
                                placeholder="e.g. 1"
                            />
                            <div className="text-xs text-muted-foreground">
                                Amount: <span className="font-medium text-foreground">{processingFeeAmt}</span>
                            </div>
                        </div>

                        {/* Insurance Fees */}
                        <div className="space-y-2">
                            <Label>Insurance Fees (%)</Label>
                            <Input
                                value={form.insurance_fee_percent}
                                onChange={set("insurance_fee_percent")}
                                placeholder="e.g. 0.5"
                            />
                            <div className="text-xs text-muted-foreground">
                                Amount: <span className="font-medium text-foreground">{insuranceFeeAmt}</span>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="mt-4 flex items-center justify-between gap-2">
                        <div className="text-sm text-muted-foreground">
                            Preview schedule from{" "}
                            <span className="font-medium text-foreground">
                {form.first_installment_date || "-"}
              </span>{" "}
                            · 1st installment includes fees:{" "}
                            <span className="font-medium text-foreground">{firstInstFees}</span>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPreviewOpen(true)}
                            disabled={!weeks || !principal || !form.first_installment_date}
                        >
                            Preview Schedule
                        </Button>
                    </div>

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

            {/* ✅ Separate modal for preview */}
            <PreviewScheduleDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                scheduleRows={scheduleRows}
            />
        </>
    );
}

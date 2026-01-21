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
import {
    apiClient,
    getUserRole,
    getUserBranchId,
    getUserRegionId,
    isAdminLikeRole,
    isRegionalManagerRole,
    isBranchManagerRole,
} from "@/hooks/useApi.js";
import {toast} from "@/components/ui/use-toast";
import PreviewScheduleDialog from "./PreviewScheduleDialog";

import {
    todayISO,
    addDaysISO,
    safeNum,
    computeLoanNumbers,
} from "./Loan Dashboard/loanCalc.js";

/* ---------------------------------------------------------
   ✅ Loan Account suggestions cache (LOAD ONCE + MEMORY)
--------------------------------------------------------- */
let LOAN_ACCOUNTS_CACHE = null;
const LOAN_ACCOUNTS_LS_KEY = "mf.loanAccountNos.v1";

async function getLoanAccountNosOnce() {
    if (Array.isArray(LOAN_ACCOUNTS_CACHE) && LOAN_ACCOUNTS_CACHE.length) {
        return LOAN_ACCOUNTS_CACHE;
    }

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
    }

    const res = await apiClient.get("/loans/master", {params: {limit: 5000, offset: 0}});
    const list = Array.isArray(res.data) ? res.data : [];

    const uniq = Array.from(
        new Set(
            list
                .map((x) => (x?.loan_account_no ? String(x.loan_account_no).trim() : ""))
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b));

    LOAN_ACCOUNTS_CACHE = uniq;

    try {
        localStorage.setItem(LOAN_ACCOUNTS_LS_KEY, JSON.stringify(uniq));
    } catch {
    }

    return uniq;
}

/**
 * ✅ Perfect error message extraction for axios/FastAPI
 */
function extractApiError(err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    if (!err?.response) {
        return {title: "Network error", description: err?.message || "Unable to reach server."};
    }

    const detail = data?.detail ?? data;

    if (status === 422 && Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        const loc = Array.isArray(first?.loc) ? first.loc.join(" → ") : "Validation";
        const msg = first?.msg || "Invalid input";
        return {title: "Validation error", description: `${loc}: ${msg}`};
    }

    if (typeof detail === "string") {
        if (status === 409) return {title: "Cannot create loan", description: detail};
        return {title: "Request failed", description: detail};
    }

    if (detail && typeof detail === "object") {
        return {title: "Request failed", description: JSON.stringify(detail)};
    }

    return {title: "Request failed", description: err?.message || "Something went wrong."};
}

// Defaults if /settings missing
const DEFAULT_PROCESSING_PCT = 1;
const DEFAULT_INSURANCE_PCT = 0.5;
const DEFAULT_BOOK_PRICE = 0;

export default function CreateLoanDialog({open, onOpenChange}) {
    const createLoan = useCreateLoan();

    // ✅ role/scope
    const role = getUserRole();
    const myBranchId = getUserBranchId();
    const myRegionId = getUserRegionId();

    const defaults = useMemo(() => {
        const today = todayISO();
        return {
            loan_account_no: "",
            group_id: "",
            member_id: "",
            product_id: 1,
            disburse_date: today,
            first_installment_date: addDaysISO(today, 7),
            duration_weeks: 12,
            principal_amount: "",

            // from settings (TOTAL % for duration)
            annual_interest_percent: "",

            processing_fee_percent: DEFAULT_PROCESSING_PCT,
            insurance_fee_percent: DEFAULT_INSURANCE_PCT,
            book_price_amount: DEFAULT_BOOK_PRICE,
        };
    }, []);

    const [form, setForm] = useState(defaults);
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setForm(defaults);
            setPreviewOpen(false);
        }
    }, [open, defaults]);

    const set = (k) => (e) => setForm((p) => ({...p, [k]: e.target.value}));

    // Auto first installment = disburse + 7 days
    useEffect(() => {
        if (!open) return;
        if (!form.disburse_date) return;
        setForm((p) => ({...p, first_installment_date: addDaysISO(form.disburse_date, 7)}));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.disburse_date, open]);

    // Settings fetch
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

                const getVal = (key) => list.find((x) => x?.key === key)?.value;

                const maxWeek = Number(getVal("MAX_WEEK_SETTING") ?? 12);
                const procPct = Number(getVal("PROCESSING_FEES") ?? DEFAULT_PROCESSING_PCT);
                const insPct = Number(getVal("INSURANCE_FEES") ?? DEFAULT_INSURANCE_PCT);
                const bookAmt = Number(getVal("BOOK_PRICE") ?? DEFAULT_BOOK_PRICE);

                const interestPct = Number(getVal("INTEREST_RATE"));

                if (!cancelled) {
                    setForm((p) => ({
                        ...p,
                        duration_weeks: Number.isFinite(maxWeek) && maxWeek > 0 ? maxWeek : 12,
                        processing_fee_percent: Number.isFinite(procPct) ? procPct : DEFAULT_PROCESSING_PCT,
                        insurance_fee_percent: Number.isFinite(insPct) ? insPct : DEFAULT_INSURANCE_PCT,
                        book_price_amount: Number.isFinite(bookAmt) ? bookAmt : DEFAULT_BOOK_PRICE,
                        annual_interest_percent: Number.isFinite(interestPct) ? String(interestPct) : "",
                    }));
                }
            } catch (e) {
                if (!cancelled) setSettingsErr(e?.response?.data?.detail || e?.message || "Failed to load settings");
            } finally {
                if (!cancelled) setSettingsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open]);

    // Loan A/C suggestions
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
                if (!cancelled) setLaErr(e?.response?.data?.detail || e?.message || "Failed to load loan accounts");
            } finally {
                if (!cancelled) setLaLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open]);

    // Branches (for showing branch_name in group dropdown)
    const [branches, setBranches] = useState([]);
    const [bLoading, setBLoading] = useState(false);
    const [bErr, setBErr] = useState("");

    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        (async () => {
            setBLoading(true);
            setBErr("");
            try {
                const res = await apiClient.get("/branches/");
                if (!cancelled) setBranches(Array.isArray(res.data) ? res.data : []);
            } catch (e) {
                if (!cancelled) setBErr(e?.response?.data?.detail || e?.message || "Failed to load branches");
            } finally {
                if (!cancelled) setBLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open]);

    const branchNameById = useMemo(() => {
        const map = {};
        (branches || []).forEach((b) => {
            const id = b.branch_id ?? b.id;
            if (id != null) map[String(id)] = b.branch_name || b.name || `Branch-${id}`;
        });
        return map;
    }, [branches]);

    // Groups + Members
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
                if (!cancelled) setGErr(e?.response?.data?.detail || e?.message || "Failed to load groups");
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
                if (!cancelled) setMErr(e?.response?.data?.detail || e?.message || "Failed to load Members");
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

    // ✅ scope based visible groups
    const visibleGroups = useMemo(() => {
        const list = Array.isArray(groups) ? groups : [];

        if (isAdminLikeRole(role)) return list;

        if (isRegionalManagerRole(role)) {
            if (myRegionId == null) return [];
            return list.filter((g) => String(g.region_id ?? g.regionId ?? "") === String(myRegionId));
        }

        if (isBranchManagerRole(role)) {
            if (myBranchId == null) return [];
            return list.filter((g) => String(g.branch_id ?? g.branchId ?? "") === String(myBranchId));
        }

        // safe default
        return [];
    }, [groups, role, myRegionId, myBranchId]);

    // used for member sort labels
    const groupNameById = useMemo(() => {
        const map = {};
        (groups || []).forEach((g) => {
            map[String(g.group_id)] = g.group_name || `Group-${g.group_id}`;
        });
        return map;
    }, [groups]);

    const memberOptions = useMemo(() => {
        const gid = form.group_id ? String(form.group_id) : "";
        const list = (members || []).filter((m) => (!gid ? true : String(m.group_id) === gid));

        const sortKey = (m) => {
            const gName = (groupNameById[String(m.group_id)] || "").toLowerCase();
            const name = (m.full_name || "").toLowerCase();
            return `${gName}__${name}`;
        };

        list.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

        return list.map((m) => {
            const gName = groupNameById[String(m.group_id)] || `Group-${m.group_id}`;
            const name = m.full_name || `Member-${m.member_id}`;
            const phone = m.phone ? `${m.phone}` : "";
            return {
                value: String(m.member_id),
                label: `${gName} — ${name} - ${phone}`,
            };
        });
    }, [members, form.group_id, groupNameById]);

    useEffect(() => {
        setForm((p) => ({...p, member_id: ""}));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.group_id]);

    // ✅ All math via helper
    const weeks = safeNum(form.duration_weeks);
    const principal = safeNum(form.principal_amount);

    const calc = useMemo(() => {
        return computeLoanNumbers({
            principal,
            weeks,
            totalInterestPercent: safeNum(form.annual_interest_percent),
            processingPct: safeNum(form.processing_fee_percent),
            insurancePct: safeNum(form.insurance_fee_percent),
            bookPriceAmt: safeNum(form.book_price_amount),
            firstInstallmentDate: form.first_installment_date,
        });
    }, [
        principal,
        weeks,
        form.annual_interest_percent,
        form.processing_fee_percent,
        form.insurance_fee_percent,
        form.book_price_amount,
        form.first_installment_date,
    ]);

    const onSubmit = async () => {
        if (!form.loan_account_no?.trim())
            return toast({title: "Loan A/C No is required", variant: "destructive"});
        if (!form.group_id) return toast({title: "Group is required", variant: "destructive"});
        if (!form.member_id) return toast({title: "Member is required", variant: "destructive"});
        if (!form.principal_amount)
            return toast({title: "Principal is required", variant: "destructive"});
        if (!String(form.annual_interest_percent || "").trim())
            return toast({
                title: "Interest rate not loaded",
                description: "Please set INTEREST_RATE in System Settings.",
                variant: "destructive",
            });

        const payload = {
            loan_account_no: form.loan_account_no.trim(),
            member_id: Number(form.member_id),
            product_id: Number(form.product_id),

            disburse_date: form.disburse_date,
            first_installment_date: form.first_installment_date,
            duration_weeks: Number(form.duration_weeks),

            principal_amount: Number(form.principal_amount),

            // ✅ total interest amount derived from TOTAL % for duration
            flat_interest_total: Number(calc.totalInterestAmount),

            // ✅ keep backend field name, meaning = TOTAL % for duration
            annual_interest_percent: Number(calc.totalInterestPercent),

            installment_amount: Number(calc.installmentPerWeek),

            processing_fee_percent: Number(form.processing_fee_percent),
            insurance_fee_percent: Number(form.insurance_fee_percent),
            processing_fee_amount: Number(calc.processingFeeAmt),
            insurance_fee_amount: Number(calc.insuranceFeeAmt),

            book_price_amount: Number(calc.bookPriceAmt),
            first_installment_extra_amount: Number(calc.firstInstallmentExtra),
        };

        try {
            await createLoan.mutateAsync(payload);
            toast({title: "Loan created successfully ✅"});

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
                {/* ✅ fixed header/footer + scroll body (prevents select overflow issues) */}
                <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="space-y-2">
                        <DialogTitle>Create Loan</DialogTitle>

                        {/* compact strip */}
                        <div className="rounded-xl border bg-muted/20 px-3 py-2">
                            {settingsLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                    <Skeleton className="h-9 w-full"/>
                                    <Skeleton className="h-9 w-full"/>
                                    <Skeleton className="h-9 w-full"/>
                                    <Skeleton className="h-9 w-full"/>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                    <div className="rounded-lg bg-background border px-3 py-2">
                                        <div className="text-[11px] text-muted-foreground">Duration (weeks)</div>
                                        <div className="text-sm font-medium">{form.duration_weeks}</div>
                                        <div className="text-[10px] text-muted-foreground">MAX_WEEK_SETTING</div>
                                    </div>

                                    <div className="rounded-lg bg-background border px-3 py-2">
                                        <div className="text-[11px] text-muted-foreground">Interest Rate (total %)</div>
                                        <div className="text-sm font-medium">{form.annual_interest_percent || "-"}</div>
                                        <div className="text-[10px] text-muted-foreground">
                                            weekly: {calc.weeklyInterestPercent || 0}%
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-background border px-3 py-2">
                                        <div className="text-[11px] text-muted-foreground">1st Installment</div>
                                        <div className="text-sm font-medium">{form.first_installment_date}</div>
                                        <div className="text-[10px] text-muted-foreground">Disburse + 7 days</div>
                                    </div>

                                    <div className="rounded-lg bg-background border px-3 py-2">
                                        <div className="text-[11px] text-muted-foreground">Fees (% + ₹)</div>
                                        <div className="text-sm font-medium">
                                            {form.processing_fee_percent}% · {form.insurance_fee_percent}% ·
                                            ₹{form.book_price_amount}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            PROCESSING_FEES · INSURANCE_FEES · BOOK_PRICE
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {/* ✅ scrollable content area */}
                    <div className="flex-1 overflow-y-auto pr-1">
                        {settingsErr ? <div className="text-sm text-destructive">{settingsErr}</div> : null}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
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

                            <div className="space-y-2">
                                <Label>Group</Label>
                                {(gLoading || bLoading) ? (
                                    <Skeleton className="h-10 w-full"/>
                                ) : (gErr || bErr) ? (
                                    <div className="text-sm text-destructive">{gErr || bErr}</div>
                                ) : (
                                    <Select
                                        value={form.group_id ? String(form.group_id) : ""}
                                        onValueChange={(v) => setForm((p) => ({...p, group_id: v}))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Branch"/>
                                        </SelectTrigger>

                                        {/* ✅ prevent overflow / tall dropdown */}
                                        <SelectContent className="max-h-72 overflow-y-auto" position="popper">
                                            {visibleGroups.length === 0 ? (
                                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                                    No groups available for your scope
                                                </div>
                                            ) : (
                                                visibleGroups.map((g) => {
                                                    const bid = g.branch_id ?? g.branchId;
                                                    const bName =
                                                        branchNameById[String(bid)] ||
                                                        (bid ? `Branch-${bid}` : "Branch");
                                                    return (
                                                        <SelectItem key={g.group_id} value={String(g.group_id)}>
                                                            {bName} — {g.group_name}
                                                        </SelectItem>
                                                    );
                                                })
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

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
                                                placeholder={form.group_id ? "Select Member" : "Select Group first"}/>
                                        </SelectTrigger>

                                        {/* ✅ prevent overflow / tall dropdown */}
                                        <SelectContent className="max-h-72 overflow-y-auto" position="popper">
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
                                <Label>Disburse Date</Label>
                                <Input type="date" value={form.disburse_date} onChange={set("disburse_date")}/>
                            </div>

                            <div className="space-y-2">
                                <Label>Principal Amount</Label>
                                <Input value={form.principal_amount} onChange={set("principal_amount")}
                                       placeholder="10000"/>
                            </div>

                            {/* Interest (not editable) */}
                            <div className="space-y-2">
                                <Label>Interest Rate (total %)</Label>
                                {settingsLoading ? (
                                    <Skeleton className="h-10 w-full"/>
                                ) : (
                                    <>
                                        <Input value={form.annual_interest_percent} disabled/>
                                        <div className="text-xs text-muted-foreground">
                                            Weekly rate:{" "}
                                            <span
                                                className="font-medium text-foreground">{calc.weeklyInterestPercent || 0}%</span>{" "}
                                            · Total Interest:{" "}
                                            <span
                                                className="font-medium text-foreground">{calc.totalInterestAmount || 0}</span>{" "}
                                            · Weekly Installment:{" "}
                                            <span
                                                className="font-medium text-foreground">{calc.installmentPerWeek || 0}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Processing Fee Amount</Label>
                                <Input value={calc.processingFeeAmt} disabled/>
                            </div>

                            <div className="space-y-2">
                                <Label>Insurance Fee Amount</Label>
                                <Input value={calc.insuranceFeeAmt} disabled/>
                            </div>

                            <div className="space-y-2">
                                <Label>Book Price (1st installment)</Label>
                                <Input value={calc.bookPriceAmt} disabled/>
                            </div>

                            <div className="space-y-2">
                                <Label>First Installment Extra Total</Label>
                                <Input value={calc.firstInstallmentExtra} disabled/>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2">
                            <div className="text-sm text-muted-foreground">
                                Preview schedule from{" "}
                                <span
                                    className="font-medium text-foreground">{form.first_installment_date || "-"}</span> ·
                                1st installment extra:{" "}
                                <span className="font-medium text-foreground">{calc.firstInstallmentExtra}</span>
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

            <PreviewScheduleDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                scheduleRows={calc.scheduleRows}
            />
        </>
    );
}

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

import {useCreateLoan} from "@/hooks/useLoans";
import {apiClient, getUserBranchId} from "@/hooks/useApi.js";
import {toast} from "@/components/ui/use-toast";
import PreviewScheduleDialog from "./PreviewScheduleDialog";

import {useGroups} from "@/hooks/useGroups";
import {useMembers} from "@/hooks/useMembers";
import {useLoanOfficers} from "@/hooks/useLoanOfficers";

import SearchableSelect from "@/Utils/SearchableSelect";

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

function safeHookError(e) {
    return e?.response?.data?.detail || e?.message || "";
}

// Defaults if /settings missing
const DEFAULT_PROCESSING_PCT = 1;
const DEFAULT_INSURANCE_PCT = 0.5;
const DEFAULT_BOOK_PRICE = 0;

export default function CreateLoanDialog({open, onOpenChange}) {
    const createLoan = useCreateLoan();

    // ✅ Branch scope from profileData (NO UI)
    const branchId = useMemo(() => {
        const bid = getUserBranchId();
        return bid != null ? String(bid) : "";
    }, []);

    const defaults = useMemo(() => {
        const today = todayISO();
        return {
            loan_account_no: "",

            // ✅ NOW: store selected LO's lo_id (3/4/6/8/...)
            loan_officer_id: "",

            group_id: "",
            member_id: "",
            product_id: 1,
            disburse_date: today,
            first_installment_date: addDaysISO(today, 7),
            duration_weeks: 12,
            principal_amount: "",

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

    const {groups, isLoading: gLoading, error: gError} = useGroups();

    // ✅ IMPORTANT: Members are now fetched using lo_id after LO selection
    const {members, isLoading: mLoading, error: mError} = useMembers({
        branch_id: branchId || null,
        lo_id: form.loan_officer_id || null,
        group_id: form.group_id || null,
    });

    const {
        loanOfficers,
        isLoading: loLoading,
        error: loError,
    } = useLoanOfficers();

    const gErr = safeHookError(gError);
    const mErr = safeHookError(mError);
    const loErr = safeHookError(loError);

    // ✅ Loan Officer options (filter by branch) + store lo_id
    // API shape:
    // [{ lo_id, employee_id, employee: { branch_id, full_name, phone, user:{username,email,is_active} } }]
    const loanOfficerOptions = useMemo(() => {
        const list = Array.isArray(loanOfficers) ? loanOfficers : [];
        const scoped = !branchId
            ? list
            : list.filter((x) => String(x?.employee?.branch_id ?? "") === branchId);

        const sortKey = (x) =>
            String(x?.employee?.full_name || x?.employee?.user?.username || "").toLowerCase();

        scoped.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

        return scoped.map((x) => {
            const loId = x?.lo_id; // ✅ VALUE MUST BE lo_id
            const employeeId = x?.employee_id ?? x?.employee?.employee_id ?? "";
            const fullName = x?.employee?.full_name || "Loan Officer";
            const username = x?.employee?.user?.username ? ` (${x.employee.user.username})` : "";
            const phone = x?.employee?.phone ? ` - ${x.employee.phone}` : "";
            const email = x?.employee?.user?.email || "";

            return {
                value: String(loId),
                label: `${fullName}${username}${phone}`,
                keywords: `${fullName} ${x?.employee?.user?.username || ""} ${phone} ${email} lo_id:${loId} employee_id:${employeeId}`
                    .replace(/\s+/g, " ")
                    .trim(),
            };
        });
    }, [loanOfficers, branchId]);

    const groupNameById = useMemo(() => {
        const map = {};
        (groups || []).forEach((g) => {
            map[String(g.group_id)] = g.group_name || `Group-${g.group_id}`;
        });
        return map;
    }, [groups]);

    // ✅ Filter groups by Branch + selected Loan Officer (lo_id)
    const visibleGroups = useMemo(() => {
        const list = Array.isArray(groups) ? groups : [];
        const oid = form.loan_officer_id ? String(form.loan_officer_id) : "";

        return list.filter((g) => {
            const gBid = g.branch_id ?? g.branchId ?? g.branch?.branch_id ?? g.branch?.id;

            // ✅ include lo_id possibilities
            const gOid =
                g.lo_id ??
                g.loId ??
                g.loan_officer_id ??
                g.loanOfficerId ??
                g.assigned_loan_officer_id ??
                g.created_by_lo_id ??
                g.created_by_employee_id ??
                g.created_by_user_id;

            const okBranch = !branchId ? true : String(gBid ?? "") === branchId;
            const okOfficer = !oid ? true : String(gOid ?? "") === oid;

            return okBranch && okOfficer;
        });
    }, [groups, branchId, form.loan_officer_id]);

    const groupOptions = useMemo(() => {
        return (visibleGroups || []).map((g) => {
            const gName = g.group_name || `Group-${g.group_id}`;
            return {
                value: String(g.group_id),
                label: gName,
                keywords: `${gName} ${g.group_id}`.trim(),
            };
        });
    }, [visibleGroups]);

    const memberOptions = useMemo(() => {
        const gid = form.group_id ? String(form.group_id) : "";
        const list = (members || []).filter((m) => (!gid ? true : String(m.group_id) === gid));

        list.sort((a, b) => {
            const ga = (groupNameById[String(a.group_id)] || "").toLowerCase();
            const gb = (groupNameById[String(b.group_id)] || "").toLowerCase();
            const na = (a.full_name || "").toLowerCase();
            const nb = (b.full_name || "").toLowerCase();
            return `${ga}__${na}`.localeCompare(`${gb}__${nb}`);
        });

        return list.map((m) => {
            const gName = groupNameById[String(m.group_id)] || `Group-${m.group_id}`;
            const name = m.full_name || `Member-${m.member_id}`;
            const phone = m.phone ? `${m.phone}` : "";
            return {
                value: String(m.member_id),
                label: `${gName} — ${name}${phone ? ` - ${phone}` : ""}`,
                keywords: `${gName} ${name} ${phone} ${m.member_id}`.trim(),
            };
        });
    }, [members, form.group_id, groupNameById]);

    // ✅ Reset group & member when loan officer changes
    useEffect(() => {
        setForm((p) => ({...p, group_id: "", member_id: ""}));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.loan_officer_id]);

    // ✅ Reset member when group changes
    useEffect(() => {
        setForm((p) => ({...p, member_id: ""}));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.group_id]);

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
        if (!form.loan_officer_id)
            return toast({title: "Loan Officer is required", variant: "destructive"});
        if (!form.group_id) return toast({title: "Group is required", variant: "destructive"});
        if (!form.member_id) return toast({title: "Member is required", variant: "destructive"});
        if (!form.principal_amount)
            return toast({title: "Principal is required", variant: "destructive"});

        const money2 = (v) => Number((Number(v || 0)).toFixed(2));

        const payload = {
            loan_account_no: form.loan_account_no.trim(),
            member_id: Number(form.member_id),
            product_id: Number(form.product_id),

            disburse_date: form.disburse_date,
            first_installment_date: form.first_installment_date,
            duration_weeks: Number(form.duration_weeks),

            principal_amount: Number(form.principal_amount),

            insurance_fee: money2(calc.insuranceFeeAmt),
            processing_fee: money2(calc.processingFeeAmt),
            book_price: money2(calc.bookPriceAmt),
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
                <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="space-y-2">
                        <DialogTitle>Create Loan</DialogTitle>

                        {branchId ? (
                            <div className="text-xs text-muted-foreground">
                                Branch scope: <span className="font-medium text-foreground">{branchId}</span>
                            </div>
                        ) : (
                            <div className="text-xs text-destructive">
                                Branch scope missing: profileData.branch_id is not set.
                            </div>
                        )}

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
                                        <div className="text-[11px] text-muted-foreground">Charges (Disbursement)</div>
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

                            {/* ✅ LOAN OFFICER (value = lo_id) */}
                            <div className="space-y-2">
                                <Label>Loan Officer</Label>
                                {!branchId ? (
                                    <div className="text-sm text-destructive">
                                        profileData.branch_id not found. Please store branch_id in profileData at login.
                                    </div>
                                ) : loLoading ? (
                                    <Skeleton className="h-10 w-full"/>
                                ) : loErr ? (
                                    <div className="text-sm text-destructive">{loErr}</div>
                                ) : (
                                    <div className="space-y-2">
                                        <SearchableSelect
                                            value={form.loan_officer_id ? String(form.loan_officer_id) : ""}
                                            onValueChange={(v) => setForm((p) => ({...p, loan_officer_id: v}))}
                                            options={loanOfficerOptions}
                                            placeholder="Select Loan Officer"
                                            searchPlaceholder="Search officer..."
                                            disabled={!branchId}
                                        />
                                        {branchId && loanOfficerOptions.length === 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                No loan officers found for Branch ID {branchId}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ✅ GROUP (depends on Loan Officer) */}
                            <div className="space-y-2">
                                <Label>Group</Label>
                                {gLoading ? (
                                    <Skeleton className="h-10 w-full"/>
                                ) : gErr ? (
                                    <div className="text-sm text-destructive">{gErr}</div>
                                ) : (
                                    <div className="space-y-2">
                                        <SearchableSelect
                                            value={form.group_id ? String(form.group_id) : ""}
                                            onValueChange={(v) => setForm((p) => ({...p, group_id: v}))}
                                            options={groupOptions}
                                            placeholder={!form.loan_officer_id ? "Select Loan Officer first" : "Select Group"}
                                            searchPlaceholder="Search group..."
                                            disabled={!form.loan_officer_id}
                                        />
                                        {form.loan_officer_id && visibleGroups.length === 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                No groups found for this loan officer
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ✅ MEMBER (fetched via useMembers({lo_id, group_id})) */}
                            <div className="space-y-2">
                                <Label>Member</Label>
                                {mLoading ? (
                                    <Skeleton className="h-10 w-full"/>
                                ) : mErr ? (
                                    <div className="text-sm text-destructive">{mErr}</div>
                                ) : (
                                    <div className="space-y-2">
                                        <SearchableSelect
                                            value={form.member_id ? String(form.member_id) : ""}
                                            onValueChange={(v) => setForm((p) => ({...p, member_id: v}))}
                                            options={memberOptions}
                                            placeholder={form.group_id ? "Select Member" : "Select Group first"}
                                            searchPlaceholder="Search member..."
                                            disabled={!form.group_id}
                                        />
                                        {form.group_id && memberOptions.length === 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                No members found for this group
                                            </div>
                                        )}
                                    </div>
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

                            <div className="space-y-2">
                                <Label>Interest Rate (total %)</Label>
                                {settingsLoading ? (
                                    <Skeleton className="h-10 w-full"/>
                                ) : (
                                    <>
                                        <Input value={form.annual_interest_percent} disabled/>
                                        <div className="text-xs text-muted-foreground">
                                            Weekly rate:{" "}
                                            <span className="font-medium text-foreground">
                                                {calc.weeklyInterestPercent || 0}%
                                            </span>
                                            {" "}· Total Interest:{" "}
                                            <span className="font-medium text-foreground">
                                                {calc.totalInterestAmount || 0}
                                            </span>
                                            {" "}· Weekly Installment:{" "}
                                            <span className="font-medium text-foreground">
                                                {calc.installmentPerWeek || 0}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Processing Fee Amount (Disbursement)</Label>
                                <Input
                                    value={calc.processingFeeAmt?.toFixed ? calc.processingFeeAmt.toFixed(2) : calc.processingFeeAmt}
                                    disabled
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Insurance Fee Amount (Disbursement)</Label>
                                <Input
                                    value={calc.insuranceFeeAmt?.toFixed ? calc.insuranceFeeAmt.toFixed(2) : calc.insuranceFeeAmt}
                                    disabled
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Book Price (Disbursement)</Label>
                                <Input
                                    value={calc.bookPriceAmt?.toFixed ? calc.bookPriceAmt.toFixed(2) : calc.bookPriceAmt}
                                    disabled
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Total Charges (Disbursement)</Label>
                                <Input
                                    value={calc.disbursementChargesTotal?.toFixed ? calc.disbursementChargesTotal.toFixed(2) : calc.disbursementChargesTotal}
                                    disabled
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2">
                            <div className="text-sm text-muted-foreground">
                                Preview schedule from{" "}
                                <span className="font-medium text-foreground">
                                    {form.first_installment_date || "-"}
                                </span>
                                {" "}· Charges collected on{" "}
                                <span className="font-medium text-foreground">
                                    {form.disburse_date || "-"}
                                </span>
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
                disburseDate={form.disburse_date}
                processingFeeAmt={calc.processingFeeAmt}
                insuranceFeeAmt={calc.insuranceFeeAmt}
                bookPriceAmt={calc.bookPriceAmt}
            />
        </>
    );
}

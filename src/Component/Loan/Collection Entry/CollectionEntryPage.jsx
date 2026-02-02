// ✅ UPDATED: CollectionEntryPage.jsx
// Requirement:
// 1) NOTHING shows until user clicks "Load Due"
// 2) After Load Due -> show group-wise accordion in MAIN window
// 3) Each group has an "Open" button -> opens that group's rows in a MODAL
// 4) If user tries Open/View before Load Due -> show WARNING modal

import React, {useEffect, useMemo, useRef, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {CheckCircle2, Eye, Loader2, RotateCw, Download, ExternalLink} from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";

import {useBranches} from "@/hooks/useBranches.js";
import {useGroups} from "@/hooks/useGroups.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

import {
    useCollectionsByLOManual,
    useCreateLoanPayment,
    useLoanPayments,
} from "@/hooks/useLoans.js";

function todayYYYYMMDD() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}


function isOverdueDate(dueDateLike) {
    // Overdue = due date strictly before today (local)
    if (!dueDateLike) return false;

    // Try native Date parsing first (supports ISO strings)
    let d = new Date(dueDateLike);

    // Fallback for plain 'YYYY-MM-DD'
    if (Number.isNaN(d.getTime())) {
        const s = String(dueDateLike).trim();
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
            const yyyy = Number(m[1]);
            const mm = Number(m[2]);
            const dd = Number(m[3]);
            d = new Date(yyyy, mm - 1, dd);
        }
    }

    if (Number.isNaN(d.getTime())) return false;

    const dueStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return dueStart < todayStart;
}

const MODE_OPTIONS = ["CASH", "UPI", "BANK", "CARD", "OTHER"];

/** ✅ CSV helpers */
function csvEscape(v) {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function downloadCSV(filename, rows) {
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export default function CollectionEntryPage() {
    const [asOn, setAsOn] = useState(todayYYYYMMDD());

    const [branchId, setBranchId] = useState("");
    const [loId, setLoId] = useState("");
    const [groupId, setGroupId] = useState("ALL");

    // ✅ MUST click Load Due first
    const [applyFilters, setApplyFilters] = useState(false);

    const [rowForm, setRowForm] = useState({});
    const [posting, setPosting] = useState({});
    const [posted, setPosted] = useState({});

    // ✅ bulk collect all (per group modal)
    const [collectAllRunning, setCollectAllRunning] = useState(false);
    const [collectAllProgress, setCollectAllProgress] = useState({ done: 0, total: 0 });

    // ✅ amount validation warnings (per row)
    const [amountErrors, setAmountErrors] = useState({});

    // ✅ warning modal
    const [warnOpen, setWarnOpen] = useState(false);

    // ✅ View Payments modal
    const [openPayments, setOpenPayments] = useState(false);
    const [selectedLoanId, setSelectedLoanId] = useState(null);

    // ✅ Group-wise modal
    const [openGroupModal, setOpenGroupModal] = useState(false);
    const [selectedGroupKey, setSelectedGroupKey] = useState(null);

    /* -------------------- MASTER DROPDOWNS -------------------- */
    const {branches, isLoading: branchesLoading} = useBranches();
    const {groups, isLoading: groupsLoading} = useGroups();
    const {loanOfficers, isLoading: losLoading} = useLoanOfficers();

    const anyMasterLoading = branchesLoading || groupsLoading || losLoading;

    const filteredLOs = useMemo(() => {
        if (!branchId) return [];
        const bId = Number(branchId);
        return (loanOfficers || []).filter((lo) => lo?.employee?.branch_id === bId);
    }, [loanOfficers, branchId]);

    const filteredGroups = useMemo(() => {
        if (!branchId) return [];
        const bId = Number(branchId);
        const lId = loId ? Number(loId) : null;

        return (groups || [])
            .filter((g) => g.branch_id === bId)
            .filter((g) => (lId ? g.lo_id === lId : true));
    }, [groups, branchId, loId]);

    /* -------------------- DUE COLLECTIONS (NO AUTO FETCH) -------------------- */
    const effectiveLoId = applyFilters ? loId : null;
    const effectiveAsOn = applyFilters ? asOn : null;

    const {
        data: rows = [],
        isLoading: rowsLoading,
        isFetching: rowsFetching,
        refetch: refetchDue,
    } = useCollectionsByLOManual(effectiveLoId, effectiveAsOn, applyFilters);

    const isLoadingDue = rowsLoading || rowsFetching;

    const createPayment = useCreateLoanPayment();

    const {data: paymentRows = [], isLoading: paymentsLoading} = useLoanPayments(
        selectedLoanId,
        openPayments && !!selectedLoanId
    );

    /* -------------------- Helpers -------------------- */
    function updateForm(key, patch) {
        setRowForm((prev) => ({
            ...prev,
            [key]: {...(prev[key] || {}), ...patch},
        }));
    }


    // ✅ keep Amount input stable + numeric-only (supports up to 2 decimals)
    function sanitizeAmountInput(raw) {
        const s = String(raw ?? "");
        // allow digits and a single dot
        let out = "";
        let dotUsed = false;
        for (const ch of s) {
            if (ch >= "0" && ch <= "9") out += ch;
            else if (ch === "." && !dotUsed) {
                dotUsed = true;
                out += ch;
            }
        }
        // limit decimals to 2
        if (dotUsed) {
            const [a, b = ""] = out.split(".");
            out = a + "." + b.slice(0, 2);
        }
        return out;
    }

    function setAmountError(key, msg) {
        setAmountErrors((p) => {
            if (!msg) {
                const n = { ...(p || {}) };
                delete n[key];
                return n;
            }
            return { ...(p || {}), [key]: msg };
        });
    }

    function resetTableState() {
        setApplyFilters(false);
        setRowForm({});
        setPosted({});
        setPosting({});
        setSelectedGroupKey(null);
        setOpenGroupModal(false);
    }

    function onBranchChange(v) {
        setBranchId(v);
        setLoId("");
        setGroupId("ALL");
        resetTableState();
    }

    function onLoChange(v) {
        setLoId(v);
        setGroupId("ALL");
        resetTableState();
    }

    function onAsOnChange(v) {
        setAsOn(v);
        resetTableState();
    }

    function requireLoadOrWarn() {
        if (!applyFilters) {
            setWarnOpen(true);
            return false;
        }
        return true;
    }

    async function loadDue() {
        setPosted({});
        setApplyFilters(true);
        await refetchDue();
    }

    /* ✅ helper: loan account no */
    const loanAccountById = useMemo(() => {
        const m = new Map();
        (rows || []).forEach((r) => {
            if (r?.loan_id != null) m.set(r.loan_id, r.loan_account_no);
        });
        return m;
    }, [rows]);

    const selectedLoanAccountNo = useMemo(() => {
        if (!selectedLoanId) return "";
        return loanAccountById.get(selectedLoanId) || "";
    }, [selectedLoanId, loanAccountById]);

    /* -------------------- init row form -------------------- */
    const rowsStringified = useMemo(() => {
        return JSON.stringify((rows || []).map(r => `${r.installment_no}:${r.loan_id}`));
    }, [rows]);

    useEffect(() => {
        // ✅ only init after data arrives (after Load Due)
        if (!applyFilters || rows.length === 0) return;

        setRowForm((prev) => {
            const next = { ...(prev || {}) };

            (rows || []).forEach((r) => {
                const key = `${r.installment_no}:${r.loan_id}`;

                // ✅ DON'T overwrite if field already exists (prevents cursor/focus loss)
                if (next[key]) return;

                next[key] = {
                    amount_received: r.due_left ? String(r.due_left) : "",
                    payment_mode: "CASH",
                    receipt_no: "",
                    remarks: "",
                    payment_date: new Date().toISOString().slice(0, 16),
                };
            });

            return next;
        });
    }, [rowsStringified, applyFilters]);

    /* -------------------- filtering / grouping -------------------- */
    const displayRows = useMemo(() => {
        if (!applyFilters) return []; // ✅ nothing before Load Due
        if (groupId === "ALL") return rows;
        const gId = Number(groupId);
        return (rows || []).filter((r) => r.group_id === gId);
    }, [rows, groupId, applyFilters]);

    const grouped = useMemo(() => {
        const map = new Map();
        for (const r of displayRows) {
            const key = `${r.group_id}__${r.group_name}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(r);
        }
        return Array.from(map.entries()).map(([k, items]) => {
            const [, groupName] = k.split("__");
            return {key: k, groupName, items};
        });
    }, [displayRows]);

    const selectedGroup = useMemo(() => {
        if (!selectedGroupKey) return null;
        return grouped.find((g) => g.key === selectedGroupKey) || null;
    }, [grouped, selectedGroupKey]);

    /* -------------------- submit row -------------------- */
    async function submitRow(r) {
        if (!requireLoadOrWarn()) return;

        const key = `${r.installment_no}:${r.loan_id}`;
        const f = rowForm[key] || {};

        const amount = Number(f.amount_received || 0);
        if (!amount || amount <= 0) return;

        setPosting((p) => ({ ...p, [key]: true }));

        try {
            await createPayment.mutateAsync({
                payload: {
                    loan_id: r.loan_id, // ✅ REQUIRED in payload
                    amount_received: amount,
                    payment_mode: f.payment_mode || "CASH",
                    receipt_no: f.receipt_no || null,
                    remarks: f.remarks || null,
                    payment_date: f.payment_date ? new Date(f.payment_date).toISOString() : null,
                },
            });

            setPosted((x) => ({ ...x, [key]: true }));
        } catch (e) {
            console.error("Payment submit failed:", e);
        } finally {
            setPosting((p) => ({ ...p, [key]: false }));
        }
    }

    // ✅ Collect All: sequentially submits every pending row (backend-safe)
    // UX: user clicks ONCE, we process one-by-one and show progress in the button text.
    async function collectAllRows(items) {
        if (!requireLoadOrWarn()) return;
        if (!Array.isArray(items) || items.length === 0) return;
        if (collectAllRunning) return;

        // build queue: only not submitted, valid amount > 0
        const queue = (items || []).filter((r) => {
            const key = `${r.installment_no}:${r.loan_id}`;
            const f = rowForm[key] || {};
            const amount = Number(f.amount_received || 0);
            return !posted[key] && amount > 0;
        });

        setCollectAllProgress({ done: 0, total: queue.length });
        setCollectAllRunning(true);

        try {
            let done = 0;
            for (const r of queue) {
                await submitRow(r); // ✅ one-by-one
                done += 1;
                setCollectAllProgress({ done, total: queue.length });
            }
        } finally {
            setCollectAllRunning(false);
        }
    }



    function downloadStatementCSV() {
        if (!selectedLoanId) return;

        const accNo = selectedLoanAccountNo || `#${selectedLoanId}`;
        const header = ["Loan A/c No", "Txn Date", "Paid Amount (Credit)", "Outstanding After", "Narration"];

        const data = (paymentRows || []).map((x) => ([
            accNo,
            x.txn_date ? new Date(x.txn_date).toLocaleString() : "-",
            Number(x.credit || 0).toFixed(2),
            Number(x.balance_outstanding || 0).toFixed(2),
            x.narration || "-",
        ]));

        const filename = `loan_${accNo}_statement_${todayYYYYMMDD()}.csv`;
        downloadCSV(filename, [header, ...data]);
    }

    /* -------------------- table renderer (re-used) -------------------- */
    /* -------------------- table renderer (re-used) -------------------- */
    const renderGroupTable = (items) => {
        // ✅ Excel-style totals row (under columns)
        let dueTotal = 0;
        let enteredTotal = 0;
        let submittedTotal = 0;

        for (const r of items || []) {
            const k = `${r.installment_no}:${r.loan_id}`;
            const f = rowForm[k] || {};
            const due = Number(r.due_left ?? 0);
            const entered = Number(f.amount_received ?? 0);
            const isDone = !!posted[k];

            dueTotal += Number.isFinite(due) ? due : 0;
            enteredTotal += Number.isFinite(entered) ? entered : 0;
            if (isDone) submittedTotal += Number.isFinite(entered) ? entered : 0;
        }

        return (
            <div className="w-full overflow-x-auto">
                <table className="w-full text-sm border rounded-md">
                    <thead className="bg-muted">
                    <tr>
                        <th className="p-2 border text-left">Member</th>
                        <th className="p-2 border">Due Date</th>
                        <th className="p-2 border">Inst</th>
                        <th className="p-2 border">Due Left</th>
                        <th className="p-2 border">Amount</th>
                        <th className="p-2 border">Mode</th>
                        <th className="p-2 border">Receipt</th>
                        <th className="p-2 border">DateTime</th>
                        <th className="p-2 border">Remarks</th>
                        <th className="p-2 border">Action</th>
                    </tr>
                    </thead>

                    <tbody>
                    {(items || []).map((r) => {
                        const key = `${r.installment_no}:${r.loan_id}`;
                        const f = rowForm[key] || {};
                        const isPosting = !!posting[key];
                        const isDone = !!posted[key];

                        return (
                            <tr key={key} className={isDone ? "opacity-70" : ""}>
                                <td className="p-2 border">
                                    <div className="font-medium">{r.member_name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {(() => {
                                            const overdue = isOverdueDate(r.due_date || r.installment_due_date);
                                            const accNo = r.loan_account_no || `#${r.loan_id}`;

                                            return (
                                                <>
                                                    Loan A/c:{" "}
                                                    <span className="inline-flex items-center gap-2">
                                                        {overdue && (
                                                            <span className="relative flex h-3 w-3">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                                                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                                                            </span>
                                                        )}
                                                        <span className={overdue ? "text-red-600 font-semibold" : "font-medium"}>
                                                            {accNo}
                                                        </span>
                                                    </span>{" "}
                                                    • Advance: {Number(r.advance_balance || 0).toFixed(2)}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </td>

                                <td className="p-2 border text-center">{String(r.due_date || "").slice(0, 10)}</td>
                                <td className="p-2 border text-center">{r.installment_no}</td>
                                <td className="p-2 border text-center">{Number(r.due_left || 0).toFixed(2)}</td>

                                <td className="p-2 border">
                                    <div className="space-y-1">
                                        <Input
                                            inputMode="decimal"
                                            value={f.amount_received ?? ""}
                                            onChange={(e) => {
                                                const raw = e.target.value;

                                                // allow empty while typing
                                                if (raw === "") {
                                                    setAmountError(key, "");
                                                    updateForm(key, { amount_received: "" });
                                                    return;
                                                }

                                                const cleaned = sanitizeAmountInput(raw);

                                                // if user typed invalid char -> keep cleaned, warn
                                                if (cleaned !== raw) {
                                                    setAmountError(key, "Only numbers and dot allowed");
                                                } else {
                                                    setAmountError(key, "");
                                                }

                                                // validate max
                                                const max = Number(r.due_left ?? 0);
                                                const n = Number(cleaned);
                                                if (Number.isFinite(max) && Number.isFinite(n) && n > max) {
                                                    setAmountError(key, `Max ${max.toFixed(2)}`);
                                                } else {
                                                    // clear max error only if it was max error
                                                    if ((amountErrors[key] || "").startsWith("Max ")) setAmountError(key, "");
                                                }

                                                updateForm(key, { amount_received: cleaned });
                                            }}
                                            placeholder="0.00"
                                            disabled={isDone || isPosting || collectAllRunning}
                                        />

                                        {amountErrors[key] ? (
                                            <div className="text-xs text-red-600">{amountErrors[key]}</div>
                                        ) : null}
                                    </div>
                                </td>

                                <td className="p-2 border">
                                    <Select
                                        value={f.mode || "CASH"}
                                        onValueChange={(v) => updateForm(key, { mode: v })}
                                        disabled={isDone || isPosting || collectAllRunning}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Select mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CASH">CASH</SelectItem>
                                            <SelectItem value="UPI">UPI</SelectItem>
                                            <SelectItem value="BANK">BANK</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>

                                <td className="p-2 border">
                                    <Input
                                        value={f.receipt_no ?? ""}
                                        onChange={(e) => updateForm(key, { receipt_no: e.target.value })}
                                        placeholder="Receipt No"
                                        disabled={isDone || isPosting || collectAllRunning}
                                    />
                                </td>

                                <td className="p-2 border">
                                    <Input
                                        type="datetime-local"
                                        value={f.collected_at ?? ""}
                                        onChange={(e) => updateForm(key, { collected_at: e.target.value })}
                                        disabled={isDone || isPosting || collectAllRunning}
                                    />
                                </td>

                                <td className="p-2 border">
                                    <Input
                                        value={f.remarks ?? ""}
                                        onChange={(e) => updateForm(key, { remarks: e.target.value })}
                                        placeholder="Remarks"
                                        disabled={isDone || isPosting || collectAllRunning}
                                    />
                                </td>

                                <td className="p-2 border">
                                    <div className="flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => submitRow(r)}
                                            disabled={isDone || isPosting || collectAllRunning}
                                        >
                                            {isDone ? (
                                                <>
                                                    <CheckCircle2 className="h-4 w-4"/>
                                                    <span className="ml-2">Done</span>
                                                </>
                                            ) : isPosting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                                    <span className="ml-2">Saving</span>
                                                </>
                                            ) : (
                                                "Submit"
                                            )}
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                if (collectAllRunning) return;
                                                if (!requireLoadOrWarn()) return;
                                                setSelectedLoanId(r.loan_id);
                                                setOpenPayments(true);
                                            }}
                                        >
                                            <Eye className="h-4 w-4 mr-2"/>
                                            View
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}

                    {/* ✅ Totals row (Excel-style) */}
                    <tr className="bg-muted/40 font-semibold border-t">
                        <td className="p-2 border">TOTAL</td>
                        <td className="p-2 border" />
                        <td className="p-2 border" />
                        <td className="p-2 border text-right">{dueTotal.toFixed(2)}</td>
                        <td className="p-2 border text-right">{enteredTotal.toFixed(2)}</td>
                        <td className="p-2 border" />
                        <td className="p-2 border" />
                        <td className="p-2 border" />
                        <td className="p-2 border" />
                        <td className="p-2 border text-right">{submittedTotal.toFixed(2)}</td>
                    </tr>
</tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Collection Entry</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <span className="font-medium">Loan Installment Dues</span> to fetch and view due collections.
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Filters</CardTitle>
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="space-y-1">
                            <Label>As On Date</Label>
                            <Input type="date" value={asOn} onChange={(e) => onAsOnChange(e.target.value)}/>
                        </div>

                        <div className="space-y-1">
                            <Label>Branch</Label>
                            <Select value={branchId} onValueChange={onBranchChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder={anyMasterLoading ? "Loading..." : "Select Branch"}/>
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

                        <div className="space-y-1">
                            <Label>Loan Officer</Label>
                            <Select value={loId} onValueChange={onLoChange} disabled={!branchId}>
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={!branchId ? "Select Branch first" : "Select Loan Officer"}/>
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

                        <div className="space-y-1">
                            <Label>Group (optional)</Label>
                            <Select value={groupId} onValueChange={setGroupId} disabled={!branchId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={!branchId ? "Select Branch first" : "All Groups"}/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Groups</SelectItem>
                                    {filteredGroups.map((g) => (
                                        <SelectItem key={g.group_id} value={String(g.group_id)}>
                                            {g.group_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end gap-2">
                            <Button onClick={loadDue} disabled={isLoadingDue || !branchId || !loId} className="w-full">
                                {isLoadingDue ? (
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                ) : (
                                    <RotateCw className="h-4 w-4"/>
                                )}
                                <span className="ml-2">Load Due</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ✅ MAIN WINDOW GROUP-WISE VIEW */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Due Collections</CardTitle>
                </CardHeader>

                <CardContent>
                    {!applyFilters ? (
                        <div className="text-sm text-muted-foreground">
                            Please click <span className="font-medium">Load Due</span> to view due collections.
                        </div>
                    ) : isLoadingDue ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full"/>
                            <Skeleton className="h-24 w-full"/>
                            <Skeleton className="h-24 w-full"/>
                        </div>
                    ) : grouped.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No due rows found.</p>
                    ) : (
                        <Accordion type="multiple" className="w-full">
                            {grouped.map((g) => (
                                <AccordionItem key={g.key} value={g.key}>
                                    <AccordionTrigger>
                                        <div className="flex items-center justify-between w-full pr-3">
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium">{g.groupName}</span>
                                                <span className="text-xs text-muted-foreground">
                          Rows: {g.items.length}
                        </span>
                                            </div>

                                            {/* ✅ Open group in modal */}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!requireLoadOrWarn()) return;

                                                    setSelectedGroupKey(g.key);
                                                    setOpenGroupModal(true);
                                                }}
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2"/>
                                                Open
                                            </Button>
                                        </div>
                                    </AccordionTrigger>

                                    <AccordionContent>
                                        {renderGroupTable(g.items)}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>

            {/* ✅ GROUP MODAL (selected group only) */}
            <Dialog open={openGroupModal} onOpenChange={setOpenGroupModal}>
                <DialogContent className="max-w-7xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle>
                                Due Collections - {selectedGroup?.groupName || "Group"}
                            </DialogTitle>

                            <Button
                                size="sm"
                                onClick={() => collectAllRows(selectedGroup?.items || [])}
                                disabled={!selectedGroup || collectAllRunning}
                                title="Submit all pending rows in this group"
                            >
                                {collectAllRunning ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="ml-2">
                                            Collecting {collectAllProgress.done}/{collectAllProgress.total}
                                        </span>
                                    </>
                                ) : (
                                    "Collect All"
                                )}
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="max-h-[75vh] overflow-auto pr-1">
                        {selectedGroup ? (
                            renderGroupTable(selectedGroup.items)
                        ) : (
                            <p className="text-sm text-muted-foreground">No group selected.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ✅ WARNING MODAL */}
            <Dialog open={warnOpen} onOpenChange={setWarnOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Load Due Required</DialogTitle>
                    </DialogHeader>

                    <div className="text-sm text-muted-foreground">
                        Please click <span className="font-medium text-foreground">“Load Due”</span> first to fetch
                        data.
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                        <Button variant="outline" onClick={() => setWarnOpen(false)}>Close</Button>
                        <Button
                            onClick={async () => {
                                setWarnOpen(false);
                                await loadDue();
                            }}
                            disabled={!branchId || !loId}
                        >
                            Load Due Now
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ✅ PAYMENTS MODAL */}
            <Dialog open={openPayments} onOpenChange={setOpenPayments}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle>
                                Previous Payments{" "}
                                {selectedLoanId
                                    ? `(Loan A/c: ${selectedLoanAccountNo || `#${selectedLoanId}`})`
                                    : ""}
                            </DialogTitle>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={downloadStatementCSV}
                                disabled={paymentsLoading || !selectedLoanId || paymentRows.length === 0}
                            >
                                <Download className="h-4 w-4 mr-2"/>
                                Download Statement
                            </Button>
                        </div>
                    </DialogHeader>

                    {paymentsLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full"/>
                            <Skeleton className="h-24 w-full"/>
                        </div>
                    ) : paymentRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No previous payments found.</p>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-sm border rounded-md">
                                <thead className="bg-muted">
                                <tr>
                                    <th className="p-2 border">Date & Time</th>
                                    <th className="p-2 border">Paid Amount</th>
                                    <th className="p-2 border">Outstanding After</th>
                                    <th className="p-2 border">Narration</th>
                                </tr>
                                </thead>
                                <tbody>
                                {paymentRows.map((x) => (
                                    <tr key={x.ledger_id}>
                                        <td className="p-2 border">
                                            {x.txn_date ? new Date(x.txn_date).toLocaleString() : "-"}
                                        </td>
                                        <td className="p-2 border text-right">
                                            {Number(x.credit || 0).toFixed(2)}
                                        </td>
                                        <td className="p-2 border text-right">
                                            {Number(x.balance_outstanding || 0).toFixed(2)}
                                        </td>
                                        <td className="p-2 border">{x.narration || "-"}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

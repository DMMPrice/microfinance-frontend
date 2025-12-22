import React, {useEffect, useMemo, useState} from "react";
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
import {CheckCircle2, Eye, Loader2, RotateCw, Download} from "lucide-react";

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

const MODE_OPTIONS = ["CASH", "UPI", "BANK", "CARD", "OTHER"];

/** ✅ CSV helpers */
function csvEscape(v) {
    if (v === null || v === undefined) return "";
    const s = String(v);
    // wrap with quotes if needed
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

    // ✅ to control manual load
    const [loadEnabled, setLoadEnabled] = useState(false);

    // per-row form states
    const [rowForm, setRowForm] = useState({});
    const [posting, setPosting] = useState({});
    const [posted, setPosted] = useState({});

    // ✅ View Payments modal state
    const [openPayments, setOpenPayments] = useState(false);
    const [selectedLoanId, setSelectedLoanId] = useState(null);

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

    /* -------------------- DUE COLLECTIONS (MANUAL HOOK) -------------------- */
    const {
        data: rows = [],
        isLoading: rowsLoading,
        isFetching: rowsFetching,
        refetch: refetchDue,
    } = useCollectionsByLOManual(loId, asOn, loadEnabled);

    const isLoadingDue = rowsLoading || rowsFetching;

    /* -------------------- CREATE PAYMENT MUTATION -------------------- */
    const createPayment = useCreateLoanPayment();

    /* -------------------- PAYMENTS MODAL HOOK -------------------- */
    const {
        data: paymentRows = [],
        isLoading: paymentsLoading,
    } = useLoanPayments(selectedLoanId, openPayments && !!selectedLoanId);

    /* -------------------- Helpers -------------------- */
    function updateForm(key, patch) {
        setRowForm((prev) => ({
            ...prev,
            [key]: {...(prev[key] || {}), ...patch},
        }));
    }

    function resetTableState() {
        setLoadEnabled(false);
        setRowForm({});
        setPosted({});
        setPosting({});
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

    async function loadDue() {
        if (!loId) return;
        setPosted({});
        setLoadEnabled(true);

        // if already enabled and user clicks again
        await refetchDue();
    }

    /* -------------------- Initialize rowForm when rows arrive -------------------- */
    useEffect(() => {
        if (!loadEnabled) return;

        const init = {};
        (rows || []).forEach((r) => {
            const key = `${r.installment_no}:${r.loan_id}`;
            init[key] = {
                amount_received: r.due_left ? String(r.due_left) : "",
                payment_mode: "CASH",
                receipt_no: "",
                remarks: "",
                payment_date: new Date().toISOString().slice(0, 16),
            };
        });

        setRowForm(init);
    }, [rows, loadEnabled]);

    /* -------------------- Filtering / Grouping -------------------- */
    const displayRows = useMemo(() => {
        if (groupId === "ALL") return rows;
        const gId = Number(groupId);
        return (rows || []).filter((r) => r.group_id === gId);
    }, [rows, groupId]);

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

    /* -------------------- Submit Row -------------------- */
    async function submitRow(r) {
        const key = `${r.installment_no}:${r.loan_id}`;
        const f = rowForm[key] || {};

        const amount = Number(f.amount_received || 0);
        if (!amount || amount <= 0) return;

        setPosting((p) => ({...p, [key]: true}));
        try {
            await createPayment.mutateAsync({
                loan_id: r.loan_id,
                payload: {
                    amount_received: amount,
                    payment_mode: f.payment_mode || "CASH",
                    receipt_no: f.receipt_no || null,
                    remarks: f.remarks || null,
                    payment_date: f.payment_date ? new Date(f.payment_date).toISOString() : null,
                },
            });

            setPosted((x) => ({...x, [key]: true}));
        } finally {
            setPosting((p) => ({...p, [key]: false}));
        }
    }

    /** ✅ Download statement from the payments modal */
    function downloadStatementCSV() {
        if (!selectedLoanId) return;

        const header = ["Loan ID", "Txn Date", "Paid Amount (Credit)", "Outstanding After", "Narration"];
        const data = (paymentRows || []).map((x) => ([
            selectedLoanId,
            x.txn_date ? new Date(x.txn_date).toLocaleString() : "-",
            Number(x.credit || 0).toFixed(2),
            Number(x.balance_outstanding || 0).toFixed(2),
            x.narration || "-",
        ]));

        const filename = `loan_${selectedLoanId}_statement_${todayYYYYMMDD()}.csv`;
        downloadCSV(filename, [header, ...data]);
    }

    return (
        <div className="space-y-4">
            {/* ✅ 1) HEADER BOX */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Collection Entry</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    Select Branch and Loan Officer, load due installments, then submit row-wise collections.
                </CardContent>
            </Card>

            {/* ✅ 2) FILTERS BOX */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="space-y-1">
                            <Label>As On Date</Label>
                            <Input type="date" value={asOn} onChange={(e) => setAsOn(e.target.value)}/>
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
                                            {b.branch_name} (#{b.branch_id})
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
                                        placeholder={!branchId ? "Select Branch first" : "Select Loan Officer"}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredLOs.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">
                                            No Loan Officer found for this branch
                                        </div>
                                    ) : (
                                        filteredLOs.map((lo) => (
                                            <SelectItem key={lo.lo_id} value={String(lo.lo_id)}>
                                                {lo?.employee?.full_name || "Loan Officer"} (LO #{lo.lo_id})
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
                                            {g.group_name} (#{g.group_id})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end gap-2">
                            <Button onClick={loadDue} disabled={!loId || isLoadingDue} className="w-full">
                                {isLoadingDue ? <Loader2 className="h-4 w-4 animate-spin"/> :
                                    <RotateCw className="h-4 w-4"/>}
                                <span className="ml-2">Load Due</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ✅ 3) TABLE BOX */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Due Collections</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingDue ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full"/>
                            <Skeleton className="h-24 w-full"/>
                            <Skeleton className="h-24 w-full"/>
                        </div>
                    ) : grouped.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No due rows loaded. Use the filters above and click <b>Load Due</b>.
                        </p>
                    ) : (
                        <Accordion type="multiple" className="w-full">
                            {grouped.map((g) => (
                                <AccordionItem key={g.key} value={g.key}>
                                    <AccordionTrigger>
                                        <div className="flex items-center justify-between w-full pr-3">
                                            <span className="font-medium">{g.groupName}</span>
                                            <span
                                                className="text-xs text-muted-foreground">Rows: {g.items.length}</span>
                                        </div>
                                    </AccordionTrigger>

                                    <AccordionContent>
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
                                                {g.items.map((r) => {
                                                    const key = `${r.installment_no}:${r.loan_id}`;
                                                    const f = rowForm[key] || {};
                                                    const isPosting = !!posting[key];
                                                    const isDone = !!posted[key];

                                                    return (
                                                        <tr key={key} className={isDone ? "opacity-70" : ""}>
                                                            <td className="p-2 border">
                                                                <div className="font-medium">{r.member_name}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Loan #{r.loan_id} •
                                                                    Advance: {Number(r.advance_balance || 0).toFixed(2)}
                                                                </div>
                                                            </td>

                                                            <td className="p-2 border text-center">
                                                                {String(r.due_date || "").slice(0, 10)}
                                                            </td>
                                                            <td className="p-2 border text-center">{r.installment_no}</td>
                                                            <td className="p-2 border text-center">{Number(r.due_left || 0).toFixed(2)}</td>

                                                            <td className="p-2 border">
                                                                <Input
                                                                    value={f.amount_received ?? ""}
                                                                    onChange={(e) => updateForm(key, {amount_received: e.target.value})}
                                                                    placeholder="0.00"
                                                                    disabled={isDone}
                                                                />
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Select
                                                                    value={f.payment_mode || "CASH"}
                                                                    onValueChange={(v) => updateForm(key, {payment_mode: v})}
                                                                    disabled={isDone}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Mode"/>
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {MODE_OPTIONS.map((m) => (
                                                                            <SelectItem key={m}
                                                                                        value={m}>{m}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Input
                                                                    value={f.receipt_no ?? ""}
                                                                    onChange={(e) => updateForm(key, {receipt_no: e.target.value})}
                                                                    placeholder="Receipt"
                                                                    disabled={isDone}
                                                                />
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Input
                                                                    type="datetime-local"
                                                                    value={f.payment_date ?? ""}
                                                                    onChange={(e) => updateForm(key, {payment_date: e.target.value})}
                                                                    disabled={isDone}
                                                                />
                                                            </td>

                                                            <td className="p-2 border">
                                                                <Input
                                                                    value={f.remarks ?? ""}
                                                                    onChange={(e) => updateForm(key, {remarks: e.target.value})}
                                                                    placeholder="Remarks"
                                                                    disabled={isDone}
                                                                />
                                                            </td>

                                                            {/* ✅ ACTION: Submit + View */}
                                                            <td className="p-2 border text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => submitRow(r)}
                                                                        disabled={isPosting || isDone}
                                                                    >
                                                                        {isDone ? (
                                                                            <>
                                                                                <CheckCircle2 className="h-4 w-4"/>
                                                                                <span className="ml-2">Done</span>
                                                                            </>
                                                                        ) : isPosting ? (
                                                                            <>
                                                                                <Loader2
                                                                                    className="h-4 w-4 animate-spin"/>
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
                                                </tbody>
                                            </table>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>

            {/* ✅ View Payments Dialog + Download Statement */}
            <Dialog open={openPayments} onOpenChange={setOpenPayments}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle>
                                Previous Payments {selectedLoanId ? `(Loan #${selectedLoanId})` : ""}
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
                                        <td className="p-2 border text-right">{Number(x.credit || 0).toFixed(2)}</td>
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

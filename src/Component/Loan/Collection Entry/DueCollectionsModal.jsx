// ✅ UPDATED: src/pages/loans/DueCollectionsModal.jsx
import React, {useEffect, useMemo, useRef, useState} from "react";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import {CheckCircle2, Eye, Loader2} from "lucide-react";

const MODE_OPTIONS = ["CASH", "UPI", "BANK", "CARD", "OTHER"];

export default function DueCollectionsModal({
                                                open,
                                                onOpenChange,
                                                rows = [],
                                                isLoading = false,
                                                onSubmitRow,
                                                onViewLoan,
                                            }) {
    const [rowForm, setRowForm] = useState({});
    const [posting, setPosting] = useState({});
    const [posted, setPosted] = useState({});

    const [amountErrors, setAmountErrors] = useState({});
    const [collectAllRunning, setCollectAllRunning] = useState(false);
    const [collectAllProgress, setCollectAllProgress] = useState({done: 0, total: 0});

    function updateForm(key, patch) {
        setRowForm((prev) => ({
            ...prev,
            [key]: {...(prev[key] || {}), ...patch},
        }));
    }


    function sanitizeAmountInput(raw) {
        const s = String(raw ?? "");
        let out = "";
        let dotUsed = false;
        for (const ch of s) {
            if (ch >= "0" && ch <= "9") out += ch;
            else if (ch === "." && !dotUsed) {
                dotUsed = true;
                out += ch;
            }
        }
        if (dotUsed) {
            const [a, b = ""] = out.split(".");
            out = a + "." + b.slice(0, 2);
        }
        return out;
    }

    function setAmountError(key, msg) {
        setAmountErrors((p) => {
            if (!msg) {
                const n = {...(p || {})};
                delete n[key];
                return n;
            }
            return {...(p || {}), [key]: msg};
        });
    }

// ✅ init/reset on open - use a flag to track if already initialized
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!open) {
            setIsInitialized(false);
            return;
        }

        if (isInitialized) return; // Don't re-initialize

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
        setPosted({});
        setPosting({});
        setAmountErrors({});
        setIsInitialized(true);
    }, [open, rows, isInitialized]);

    const grouped = useMemo(() => {
        const map = new Map();
        for (const r of rows || []) {
            const key = `${r.group_id}__${r.group_name}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(r);
        }
        return Array.from(map.entries()).map(([k, items]) => {
            const [, groupName] = k.split("__");
            return {key: k, groupName, items};
        });
    }, [rows]);

    async function submitRow(r) {
        const key = `${r.installment_no}:${r.loan_id}`;
        const f = rowForm[key] || {};

        // ✅ Empty = do not submit
        const raw = (f.amount_received ?? "").toString().trim();
        if (raw === "") {
            setAmountError(key, "Amount is required (0 allowed).");
            return;
        }

        const amount = Number(raw);

        // ✅ block invalid / negative
        if (!Number.isFinite(amount)) {
            setAmountError(key, "Invalid amount.");
            return;
        }
        if (amount < 0) {
            setAmountError(key, "Amount cannot be negative.");
            return;
        }

        setAmountError(key, "");

        // ✅ If amount is 0: do not post to API. Mark as done locally.
        // Unpaid due will automatically carry forward.
        if (amount === 0) {
            setPosted((x) => ({...x, [key]: true}));
            return;
        }

        setPosting((p) => ({...p, [key]: true}));
        try {
            await onSubmitRow?.(r, {
                ...f,
                amount_received: amount, // ✅ can be 0
            });
            setPosted((x) => ({...x, [key]: true}));
        } finally {
            setPosting((p) => ({...p, [key]: false}));
        }
    }


    async function collectAllRows(allRows) {
        if (collectAllRunning) return;

        const queue = (allRows || []).filter((r) => {
            const key = `${r.installment_no}:${r.loan_id}`;
            if (posted[key]) return false;

            const f = rowForm[key] || {};
            const raw = (f.amount_received ?? "").toString().trim();
            if (raw === "") return false; // must be provided

            const amount = Number(raw);
            if (!Number.isFinite(amount)) return false;
            if (amount < 0) return false;

            return amount > 0; // ✅ submit only positive amounts
        });

        setCollectAllProgress({done: 0, total: queue.length});
        setCollectAllRunning(true);

        try {
            let done = 0;
            for (const r of queue) {
                await submitRow(r);
                done += 1;
                setCollectAllProgress({done, total: queue.length});
            }
        } finally {
            setCollectAllRunning(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl w-[200vw] max-h-[102vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center  justify-around gap-3">
                        <DialogTitle>Due Collections (Group-wise)</DialogTitle>

                        <Button
                            size="sm"
                            onClick={() => collectAllRows(rows)}
                            disabled={collectAllRunning || (rows || []).length === 0}
                            title="Submit all pending rows"
                        >
                            {collectAllRunning ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin"/>
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

                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full"/>
                        <Skeleton className="h-24 w-full"/>
                        <Skeleton className="h-24 w-full"/>
                    </div>
                ) : grouped.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No due rows found.</div>
                ) : (
                    <Accordion type="multiple" className="w-full">
                        {grouped.map((g) => (
                            <AccordionItem key={g.key} value={g.key}>
                                <AccordionTrigger>
                                    <div className="flex items-center justify-between w-full pr-3">
                                        <span className="font-medium">{g.groupName}</span>
                                        <span className="text-xs text-muted-foreground">Rows: {g.items.length}</span>
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
                                                                Loan A/c:{" "}
                                                                <span className="font-medium">
                                    {r.loan_account_no || `#${r.loan_id}`}
                                  </span>{" "}
                                                                • Advance: {Number(r.advance_balance || 0).toFixed(2)}
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

                                                                        if (raw === "") {
                                                                            setAmountError(key, "");
                                                                            updateForm(key, {amount_received: ""});
                                                                            return;
                                                                        }

                                                                        const cleaned = sanitizeAmountInput(raw);
                                                                        if (cleaned !== raw) {
                                                                            setAmountError(key, "Only numbers are allowed.");
                                                                        } else {
                                                                            setAmountError(key, "");
                                                                        }

                                                                        updateForm(key, {amount_received: cleaned});
                                                                    }}
                                                                    placeholder="0.00"
                                                                    disabled={isDone}
                                                                />
                                                                {amountErrors[key] ? (
                                                                    <div
                                                                        className="text-xs text-red-600">{amountErrors[key]}</div>
                                                                ) : null}
                                                            </div>
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
                                                                        <SelectItem key={m} value={m}>
                                                                            {m}
                                                                        </SelectItem>
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

                                                        <td className="p-2 border text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Button size="sm" onClick={() => submitRow(r)}
                                                                        disabled={isPosting || isDone || collectAllRunning}>
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

                                                                <Button size="sm" variant="outline"
                                                                        onClick={() => {
                                                                            if (collectAllRunning) return;
                                                                            onViewLoan?.(r.loan_id);
                                                                        }}>
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

                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

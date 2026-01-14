// ✅ UPDATED: src/pages/loans/DueCollectionsModal.jsx
import React, {useEffect, useMemo, useState} from "react";
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

    function updateForm(key, patch) {
        setRowForm((prev) => ({
            ...prev,
            [key]: {...(prev[key] || {}), ...patch},
        }));
    }

    // ✅ init/reset on open
    useEffect(() => {
        if (!open) return;
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
    }, [open, rows]);

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
        const amount = Number(f.amount_received || 0);
        if (!amount || amount <= 0) return;

        setPosting((p) => ({...p, [key]: true}));
        try {
            await onSubmitRow?.(r, {
                ...f,
                amount_received: amount,
            });
            setPosted((x) => ({...x, [key]: true}));
        } finally {
            setPosting((p) => ({...p, [key]: false}));
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl w-[100vw] max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Due Collections (Group-wise)</DialogTitle>
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
                                                                        disabled={isPosting || isDone}>
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
                                                                        onClick={() => onViewLoan?.(r.loan_id)}>
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

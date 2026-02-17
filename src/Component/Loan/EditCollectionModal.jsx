import React, {useEffect, useMemo, useState} from "react";
import dayjs from "dayjs";

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

import {useEditLoanPayment} from "@/hooks/useLoans";

const MODES = ["CASH", "UPI", "BANK", "CARD", "OTHER"];

export default function EditCollectionModal({
                                                open,
                                                onOpenChange,
                                                loanId,
                                                row, // the clicked row (must contain payment_id at least)
                                            }) {
    const editPayment = useEditLoanPayment();

    const paymentId = row?.payment_id;

    const [amount, setAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState("");
    const [mode, setMode] = useState("CASH");
    const [receiptNo, setReceiptNo] = useState("");
    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        if (!row) return;

        setAmount(
            row?.amount_received != null
                ? String(row.amount_received)
                : row?.collected_amount != null
                    ? String(row.collected_amount)
                    : ""
        );

        // backend expects ISO timestamp or null
        setPaymentDate(
            row?.payment_date
                ? dayjs(row.payment_date).format("YYYY-MM-DDTHH:mm")
                : ""
        );

        setMode(row?.payment_mode || "CASH");
        setReceiptNo(row?.receipt_no || "");
        setRemarks(row?.remarks || "");
    }, [row]);

    const canSave = useMemo(() => {
        if (!paymentId) return false;
        if (amount === "") return false;
        const n = Number(amount);
        return !Number.isNaN(n) && n >= 0;
    }, [paymentId, amount]);

    const onSave = () => {
        if (!canSave) return;

        const payload = {
            amount_received: Number(amount),
            payment_mode: mode || null,
            receipt_no: receiptNo?.trim() || null,
            remarks: remarks?.trim() || null,
            payment_date: paymentDate ? new Date(paymentDate).toISOString() : null,
        };

        editPayment.mutate(
            {loanId, paymentId, payload},
            {
                onSuccess: () => onOpenChange(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Collection</DialogTitle>
                </DialogHeader>

                {!paymentId ? (
                    <div className="text-sm text-muted-foreground">
                        This row does not contain <b>payment_id</b>, so it can’t be edited.
                    </div>
                ) : (
                    <div className="grid gap-3">
                        <div className="grid gap-1">
                            <Label>Amount Received</Label>
                            <Input
                                type="number"
                                min="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        <div className="grid gap-1">
                            <Label>Payment Date</Label>
                            <Input
                                type="datetime-local"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-1">
                            <Label>Payment Mode</Label>
                            <select
                                className="h-10 rounded-md border bg-background px-3 text-sm"
                                value={mode}
                                onChange={(e) => setMode(e.target.value)}
                            >
                                {MODES.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid gap-1">
                            <Label>Receipt No</Label>
                            <Input
                                value={receiptNo}
                                onChange={(e) => setReceiptNo(e.target.value)}
                                placeholder="Optional"
                            />
                        </div>

                        <div className="grid gap-1">
                            <Label>Remarks</Label>
                            <Input
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Optional"
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onSave} disabled={!canSave || editPayment.isPending}>
                        {editPayment.isPending ? "Saving..." : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// src/Component/Loan/EditCollectionModal.jsx
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

import {useEditCollectionByLedger} from "@/hooks/useLoans"; // ✅ ledger route hook
import {toISTNaiveISO} from "@/Helpers/dateTimeIST";        // ✅ IST helper

const MODES = ["CASH", "UPI", "BANK", "CARD", "OTHER"];

/**
 * datetime-local gives: "YYYY-MM-DDTHH:mm"
 * Backend wants: "YYYY-MM-DDTHH:mm:ss" (naive IST)
 */
function localToNaiveIstWithSeconds(dtLocal) {
    if (!dtLocal) return null;
    // If already includes seconds, keep first 19 chars
    if (dtLocal.length >= 19) return dtLocal.slice(0, 19);
    // Add ":00" seconds
    return `${dtLocal}:00`;
}

export default function EditCollectionModal({open, onOpenChange, loanId, row}) {
    const editByLedger = useEditCollectionByLedger();

    const ledgerId = row?.ledger_id;

    const [amount, setAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState(""); // "YYYY-MM-DDTHH:mm" (IST in UI)
    const [mode, setMode] = useState("CASH");
    const [receiptNo, setReceiptNo] = useState("");
    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        if (!row) return;

        const amt = row?.amount_received ?? row?.collected_amount ?? row?.credit ?? "";
        setAmount(amt !== "" && amt != null ? String(amt) : "");

        // ✅ Prefill in IST for datetime-local (no seconds)
        // row.txn_date can be ISO with/without Z; we normalize to IST
        setPaymentDate(row?.txn_date ? toISTNaiveISO(row.txn_date, false) : "");

        setMode(row?.payment_mode || "CASH");
        setReceiptNo(row?.receipt_no || "");
        setRemarks(row?.remarks || "");
    }, [row]);

    const canSave = useMemo(() => {
        if (!ledgerId) return false;
        if (amount === "") return false;
        const n = Number(amount);
        return !Number.isNaN(n) && n >= 0;
    }, [ledgerId, amount]);

    const onSave = () => {
        if (!canSave) return;

        const payload = {
            amount_received: Number(amount),
            payment_mode: mode || null,
            receipt_no: receiptNo?.trim() || null,
            remarks: remarks?.trim() || null,

            // ✅ Send naive IST with seconds
            payment_date: localToNaiveIstWithSeconds(paymentDate),
        };

        editByLedger.mutate(
            {ledger_id: ledgerId, payload, loanRef: loanId},
            {onSuccess: () => onOpenChange(false)}
        );
    };

    const txnDateIstLabel = row?.txn_date ? toISTNaiveISO(row.txn_date, true)?.replace("T", " ") : "-";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Collection</DialogTitle>
                </DialogHeader>

                {!ledgerId ? (
                    <div className="text-sm text-muted-foreground">
                        This row does not contain <b>ledger_id</b>, so it can’t be edited.
                    </div>
                ) : (
                    <div className="grid gap-3">
                        <div className="text-xs text-muted-foreground">
                            Ledger ID: <b>{ledgerId}</b> | Current Txn Date (IST): <b>{txnDateIstLabel}</b>
                        </div>

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
                            <Label>Payment Date (IST)</Label>
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
                    <Button onClick={onSave} disabled={!canSave || editByLedger.isPending}>
                        {editByLedger.isPending ? "Saving..." : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

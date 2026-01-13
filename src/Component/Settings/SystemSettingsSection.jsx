// src/Component/Settings/SystemSettingsSection.jsx
import React, {useMemo, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Switch} from "@/components/ui/switch";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {toast} from "@/components/ui/use-toast";

import {useSettings, useUpdateSetting, useCreateSetting} from "@/hooks/useSettings";

// ---- helpers ----
function inferType(value) {
    if (value === "true" || value === "false") return "boolean";
    if (!Number.isNaN(Number(value)) && String(value).trim() !== "") return "number";
    return "string";
}

function prettyTypeLabel(type) {
    if (type === "boolean") return "Boolean";
    if (type === "number") return "Number";
    return "Text";
}

function displayKey(key = "") {
    return String(key)
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SystemSettingsSection() {
    const {settings: rows, loading, refetch, updateLocalValue, addLocalSetting} = useSettings();

    const [savingKey, setSavingKey] = useState(null);

    // Edit dialog
    const [open, setOpen] = useState(false);
    const [activeRow, setActiveRow] = useState(null);
    const [draftValue, setDraftValue] = useState("");

    // Add dialog
    const [addOpen, setAddOpen] = useState(false);
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    const [newDesc, setNewDesc] = useState("");

    // ✅ FIX: your hook returns { mutate, loading } not { mutateAsync, isPending }
    const {mutate: patchSetting, loading: patching} = useUpdateSetting({
        onSuccess: (data) => {
            toast({title: "Setting updated", description: `${data.key} = ${String(data.value)}`});
        },
        onError: (err) => {
            toast({
                title: "Update failed",
                description: err?.response?.data?.detail || err.message,
                variant: "destructive",
            });
        },
    });

    // ✅ FIX: your hook returns { mutate, loading } not { mutateAsync, isPending }
    const {mutate: createSetting, loading: creating} = useCreateSetting({
        onSuccess: (data) => {
            toast({title: "Setting created", description: `${data.key} = ${String(data.value)}`});
        },
        onError: (err) => {
            toast({
                title: "Create failed",
                description: err?.response?.data?.detail || err.message,
                variant: "destructive",
            });
        },
    });

    const normalized = useMemo(() => {
        return (rows || []).map((r) => ({...r, type: inferType(r.value ?? "")}));
    }, [rows]);

    async function onPatch(key, value) {
        setSavingKey(key);
        try {
            const data = await patchSetting({key, value: String(value)});
            updateLocalValue(key, data?.value ?? value);
            return data;
        } finally {
            setSavingKey(null);
        }
    }

    function openEditDialog(row) {
        setActiveRow(row);
        setDraftValue(row?.value ?? "");
        setOpen(true);
    }

    function closeDialogSafely(nextOpen) {
        if (!nextOpen && activeRow?.key && savingKey === activeRow.key) return;
        setOpen(nextOpen);
        if (!nextOpen) {
            setActiveRow(null);
            setDraftValue("");
        }
    }

    async function saveDialog() {
        if (!activeRow) return;
        await onPatch(activeRow.key, draftValue);
        setOpen(false);
        setActiveRow(null);
        setDraftValue("");
    }

    const isDialogSaving = !!activeRow?.key && savingKey === activeRow.key;

    async function onCreate() {
        const key = newKey.trim();
        const value = newValue.trim();

        if (!key) return toast({title: "Key is required", variant: "destructive"});
        if (!value) return toast({title: "Value is required", variant: "destructive"});

        const exists = (rows || []).some((r) => r.key === key);
        if (exists) {
            toast({title: "Key already exists", description: key, variant: "destructive"});
            return;
        }

        const data = await createSetting({key, value, description: newDesc});

        addLocalSetting({
            key: data.key,
            value: String(data.value),
            description: data.description || "",
        });

        setNewKey("");
        setNewValue("");
        setNewDesc("");
        setAddOpen(false);
    }

    return (
        <Card className="rounded-2xl">
            {/* ✅ All Settings header + actions on same row */}
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                    <CardTitle>All Settings</CardTitle>
                    <CardDescription>
                        Values are stored as strings in DB (e.g., <code>true</code>, <code>4</code>).
                    </CardDescription>
                </div>

                <div className="flex gap-2 md:pt-1">
                    <Button onClick={() => setAddOpen(true)} disabled={loading || !!savingKey || patching || creating}>
                        Add Setting
                    </Button>
                    <Button onClick={refetch} variant="outline"
                            disabled={loading || !!savingKey || patching || creating}>
                        {loading ? "Loading..." : "Refresh"}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {loading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-16 w-full"/>
                        <Skeleton className="h-16 w-full"/>
                        <Skeleton className="h-16 w-full"/>
                    </div>
                ) : normalized.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No settings found.</div>
                ) : (
                    <div className="space-y-3">
                        {normalized.map((row) => {
                            const rowSaving = savingKey === row.key;

                            return (
                                <div
                                    key={row.key}
                                    className="border rounded-2xl p-4 flex items-start justify-between gap-4"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <div className="font-semibold">{displayKey(row.key)}</div>
                                            <Badge variant="secondary">{prettyTypeLabel(row.type)}</Badge>
                                        </div>

                                        <div className="text-xs text-muted-foreground">{row.key}</div>
                                        <div className="text-sm text-muted-foreground">{row.description}</div>

                                        <div className="mt-2 text-sm">
                                            <span className="text-muted-foreground">Current value:</span>{" "}
                                            <span className="font-medium">{String(row.value)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {row.type === "boolean" ? (
                                            <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {row.value === "true" ? "Enabled" : "Disabled"}
                        </span>
                                                <Switch
                                                    checked={row.value === "true"}
                                                    disabled={rowSaving}
                                                    onCheckedChange={(checked) => onPatch(row.key, checked ? "true" : "false")}
                                                />
                                            </div>
                                        ) : (
                                            <Button variant="outline" onClick={() => openEditDialog(row)}
                                                    disabled={rowSaving}>
                                                {rowSaving ? "Saving..." : "Edit"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            {/* Edit Setting Dialog */}
            <Dialog open={open} onOpenChange={closeDialogSafely}>
                <DialogContent className="sm:max-w-[520px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Setting</DialogTitle>
                        <DialogDescription>
                            {displayKey(activeRow?.key)} — {activeRow?.description}
                            {activeRow?.key ? (
                                <div className="mt-1 text-xs text-muted-foreground">{activeRow.key}</div>
                            ) : null}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Value</div>
                        <Input
                            value={draftValue}
                            onChange={(e) => setDraftValue(e.target.value)}
                            placeholder="Enter new value"
                            type={activeRow?.type === "number" ? "number" : "text"}
                            disabled={isDialogSaving}
                        />
                        <div className="text-xs text-muted-foreground">
                            Stored as string in DB. Example: <code>4</code>, <code>true</code>.
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => closeDialogSafely(false)} disabled={isDialogSaving}>
                            Cancel
                        </Button>
                        <Button onClick={saveDialog} disabled={!activeRow || isDialogSaving}>
                            {isDialogSaving ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Setting Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-[560px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Setting</DialogTitle>
                        <DialogDescription>Create a new system setting key/value pair.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Key</div>
                            <Input
                                value={newKey}
                                onChange={(e) => setNewKey(e.target.value)}
                                placeholder="e.g., MAX_LOAN_AMOUNT"
                                disabled={creating}
                            />
                            <div className="text-xs text-muted-foreground">Tip: Use UPPER_SNAKE_CASE for consistency.
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Value</div>
                            <Input
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                placeholder="e.g., 50000 or true"
                                disabled={creating}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Description</div>
                            <Input
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder="Short explanation of the setting"
                                disabled={creating}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setAddOpen(false)} disabled={creating}>
                            Cancel
                        </Button>
                        <Button onClick={onCreate} disabled={creating}>
                            {creating ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

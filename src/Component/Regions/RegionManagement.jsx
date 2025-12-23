// src/Component/Home/Main Components/RegionManagement.jsx
import {useMemo, useState} from "react";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Plus, Trash2, Pencil, MapPin} from "lucide-react";
import {useToast} from "@/hooks/use-toast.ts";
import {useRegions} from "@/hooks/useRegions.js";
import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx";

import StatCard from "@/Utils/StatCard.jsx";

/**
 * Props:
 * - variant: "compact" | "page"
 * - showHeader: boolean (default false)
 * - showKpis: boolean (default true on page)
 */
export default function RegionManagement({
                                             variant = "compact",
                                             showHeader = false,
                                             showKpis = variant === "page",
                                         }) {
    const isPage = variant === "page";

    const [open, setOpen] = useState(false); // Add
    const [editOpen, setEditOpen] = useState(false); // Edit
    const [confirmOpen, setConfirmOpen] = useState(false); // Delete confirm

    const [name, setName] = useState("");
    const [editName, setEditName] = useState("");
    const [editingRegionId, setEditingRegionId] = useState(null);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const {toast} = useToast();

    const {
        regions,
        isLoading,
        isError,
        error,
        createRegion,
        deleteRegion,
        updateRegion,
        isCreating,
        isDeleting,
        isUpdating,
    } = useRegions();

    const regionsCount = useMemo(() => (Array.isArray(regions) ? regions.length : 0), [regions]);

    // -------------------------
    // CREATE
    // -------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {region_name: name.trim()};

        try {
            await createRegion(payload);
            toast({title: "Region created successfully"});
            setName("");
            setOpen(false);
        } catch (err) {
            toast({
                title: "Error creating region",
                description: err?.response?.data?.detail || err?.message || "Failed to create region",
                variant: "destructive",
            });
        }
    };

    // -------------------------
    // EDIT
    // -------------------------
    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            await updateRegion({
                region_id: editingRegionId,
                region_name: editName.trim(),
            });
            toast({title: "Region updated successfully"});
            setEditOpen(false);
        } catch (err) {
            toast({
                title: "Error updating region",
                description: err?.response?.data?.detail || err?.message || "Failed to update region",
                variant: "destructive",
            });
        }
    };

    const openEditModal = (region) => {
        setEditingRegionId(region.region_id);
        setEditName(region.region_name);
        setEditOpen(true);
    };

    // -------------------------
    // DELETE
    // -------------------------
    const openDeleteConfirm = (region_id) => {
        setPendingDeleteId(region_id);
        setConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!pendingDeleteId) return;
        try {
            await deleteRegion(pendingDeleteId);
            toast({title: "Region deleted"});
        } catch (err) {
            toast({
                title: "Error deleting region",
                description: err?.response?.data?.detail || err?.message || "Failed to delete region",
                variant: "destructive",
            });
        } finally {
            setConfirmOpen(false);
            setPendingDeleteId(null);
        }
    };

    // -------------------------
    // UI tokens (boxy)
    // -------------------------
    const boxCard =
        "rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow";

    return (
        <div className="space-y-4">
            {/* ✅ Optional internal header (useful if this is used as widget in Overview) */}
            {showHeader ? (
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-semibold leading-none">Region Management</h3>
                        <p className="text-sm text-muted-foreground">Create and manage regions</p>
                    </div>
                </div>
            ) : null}

            {/* ✅ KPI cards */}
            {showKpis ? (
                <div className={`grid gap-3 ${isPage ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
                    <StatCard
                        title="Total Regions"
                        value={regionsCount}
                        subtitle="Registered regions"
                        Icon={MapPin}
                    />
                    <StatCard
                        title="Active"
                        value={regionsCount}
                        subtitle="Currently usable"
                        Icon={MapPin}
                    />
                    <StatCard
                        title="Pending"
                        value={0}
                        subtitle="No pending state"
                        Icon={MapPin}
                    />
                </div>
            ) : null}

            {/* ✅ Action row (Add button) — no repeated title */}
            <div className="flex items-center justify-end">
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-lg">
                            <Plus className="mr-2 h-4 w-4"/> Add Region
                        </Button>
                    </DialogTrigger>

                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Region</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Region Name</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} required/>
                            </div>

                            <Button
                                type="submit"
                                disabled={isCreating || !name.trim()}
                                className="w-full rounded-lg"
                            >
                                {isCreating ? "Creating..." : "Create"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ✅ Loading / Error */}
            {isLoading ? (
                <Card className={boxCard}>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        Loading regions...
                    </CardContent>
                </Card>
            ) : null}

            {isError && !isLoading ? (
                <Card className={boxCard}>
                    <CardContent className="py-10 text-center text-destructive">
                        Failed to load regions: {error?.message || "Unknown error"}
                    </CardContent>
                </Card>
            ) : null}

            {/* ✅ Regions grid */}
            {!isLoading && !isError ? (
                regionsCount > 0 ? (
                    <div className={`grid gap-4 ${isPage ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
                        {regions.map((region) => (
                            <Card key={region.region_id} className={boxCard}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm text-muted-foreground">Region</p>
                                            <p className="text-base font-semibold truncate">{region.region_name}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-lg border bg-muted/40 px-2.5 py-1 text-xs">
                          ID: {region.region_id}
                        </span>
                                                <span
                                                    className="inline-flex items-center rounded-lg border bg-muted/40 px-2.5 py-1 text-xs">
                          Active
                        </span>
                                            </div>
                                        </div>

                                        <span
                                            className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs">
                      <MapPin className="mr-1 h-4 w-4 text-primary"/>
                      Region
                    </span>
                                    </div>

                                    <div className="mt-4 pt-4 border-t flex items-center justify-between gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg"
                                            onClick={() => openEditModal(region)}
                                        >
                                            <Pencil className="h-4 w-4 mr-2"/>
                                            Edit
                                        </Button>

                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="rounded-lg"
                                            onClick={() => openDeleteConfirm(region.region_id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2"/>
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className={boxCard}>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No regions created yet.
                        </CardContent>
                    </Card>
                )
            ) : null}

            {/* ✅ Edit dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Region</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Region Name</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} required/>
                        </div>

                        <Button
                            type="submit"
                            disabled={isUpdating || !editName.trim()}
                            className="w-full rounded-lg"
                        >
                            {isUpdating ? "Updating..." : "Save Changes"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ✅ Delete Confirm */}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete this region?"
                description="This action cannot be undone. All branches under this region (if any) must be handled separately."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={handleDelete}
                isLoading={isDeleting}
            />
        </div>
    );
}

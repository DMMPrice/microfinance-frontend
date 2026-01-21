// src/Component/Home/Main Components/BranchManagement.jsx
import {useMemo, useState, useEffect} from "react";
import {Button} from "@/components/ui/button.tsx";
import {Badge} from "@/components/ui/badge.tsx";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import {Plus, Trash2, Pencil, Building2, MapPin} from "lucide-react";
import {useToast} from "@/hooks/use-toast.ts";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";
import {confirmDelete} from "@/Utils/confirmDelete.js";
import {getUserRole, getUserRegionId, isRegionalManagerRole} from "@/hooks/useApi.js";
import StatCard from "@/Utils/StatCard.jsx";

/**
 * Props:
 * - variant: "compact" | "page"
 * - showHeader: boolean (default false)
 * - showKpis: boolean (default true on page)
 */
export default function BranchManagement({
                                             variant = "compact",
                                             showHeader = false,
                                             showKpis = variant === "page",
                                         }) {
    const isPage = variant === "page";

    // Create modal state
    const [open, setOpen] = useState(false);
    const [branchName, setBranchName] = useState("");
    const [regionId, setRegionId] = useState("");

    // Edit modal state
    const [editOpen, setEditOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [editBranchName, setEditBranchName] = useState("");
    const [editRegionId, setEditRegionId] = useState("");

    const {toast} = useToast();

    /* =========================================================
       ✅ Role based logic
    ========================================================= */
    const role = getUserRole();
    const myRegionId = getUserRegionId();
    const isRegionalManager = isRegionalManagerRole(role);

    const {
        regions,
        isLoading: isRegionsLoading,
        isError: isRegionsError,
        error: regionsError,
    } = useRegions();

    const {
        branches,
        isLoading: isBranchesLoading,
        isError: isBranchesError,
        error: branchesError,
        createBranchMutation,
        updateBranchMutation,
        deleteBranchMutation,
    } = useBranches();

    const loading = isRegionsLoading || isBranchesLoading;

    // ✅ Restrict regions list for Regional Manager
    const visibleRegions = useMemo(() => {
        if (!Array.isArray(regions)) return [];
        if (isRegionalManager) {
            if (myRegionId == null) return [];
            return regions.filter((r) => (r.region_id ?? r.id) === myRegionId);
        }
        return regions;
    }, [regions, isRegionalManager, myRegionId]);

    // ✅ Restrict branches list for Regional Manager
    const visibleBranches = useMemo(() => {
        if (!Array.isArray(branches)) return [];
        if (isRegionalManager) {
            if (myRegionId == null) return [];
            return branches.filter((b) => Number(b.region_id) === Number(myRegionId));
        }
        return branches;
    }, [branches, isRegionalManager, myRegionId]);

    // ✅ Auto-set region in Create modal for Regional Manager
    useEffect(() => {
        if (open && isRegionalManager) {
            if (myRegionId != null) setRegionId(String(myRegionId));
        }
    }, [open, isRegionalManager, myRegionId]);

    // -------------------------
    // Region name resolver (based on visibleRegions or full regions both ok)
    // -------------------------
    const regionMap = useMemo(() => {
        const m = new Map();
        (regions || []).forEach((r) => m.set(Number(r.region_id), r.region_name));
        return m;
    }, [regions]);

    const getRegionName = (id) => {
        const key = Number(id);
        return regionMap.get(key) || "Unknown";
    };

    // -------------------------
    // KPIs (use visibleBranches + visibleRegions)
    // -------------------------
    const branchesCount = useMemo(
        () => (Array.isArray(visibleBranches) ? visibleBranches.length : 0),
        [visibleBranches]
    );

    const regionsCount = useMemo(
        () => (Array.isArray(visibleRegions) ? visibleRegions.length : 0),
        [visibleRegions]
    );

    const branchesWithRegion = useMemo(() => {
        if (!visibleBranches?.length) return 0;
        return visibleBranches.filter((b) => b.region_id !== null && b.region_id !== undefined).length;
    }, [visibleBranches]);

    // ======================
    // CREATE HANDLER
    // ======================
    const handleSubmit = (e) => {
        e.preventDefault();

        // ✅ Force regional manager to use their own region only
        const finalRegionId = isRegionalManager ? myRegionId : regionId;

        if (!finalRegionId) {
            toast({
                title: "Select region",
                description: "Please select a region before creating a branch.",
                variant: "destructive",
            });
            return;
        }

        createBranchMutation.mutate(
            {
                branch_name: branchName.trim(),
                region_id: Number(finalRegionId),
            },
            {
                onSuccess: () => {
                    toast({title: "Branch created successfully"});
                    setBranchName("");
                    setRegionId(isRegionalManager && myRegionId != null ? String(myRegionId) : "");
                    setOpen(false);
                },
                onError: (err) => {
                    const detail =
                        err?.response?.data?.detail || "Failed to create branch. Please try again.";
                    toast({
                        title: "Error creating branch",
                        description: detail,
                        variant: "destructive",
                    });
                },
            }
        );
    };

    // ======================
    // EDIT HANDLERS
    // ======================
    const openEditModal = (branch) => {
        setEditingBranch(branch);
        setEditBranchName(branch.branch_name || "");

        // ✅ Regional manager should always edit inside their region only
        if (isRegionalManager && myRegionId != null) {
            setEditRegionId(String(myRegionId));
        } else {
            setEditRegionId(String(branch.region_id || ""));
        }

        setEditOpen(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editingBranch) return;

        const finalEditRegionId = isRegionalManager ? myRegionId : editRegionId;

        if (!finalEditRegionId) {
            toast({
                title: "Select region",
                description: "Please select a region before updating the branch.",
                variant: "destructive",
            });
            return;
        }

        updateBranchMutation.mutate(
            {
                branch_id: editingBranch.branch_id,
                branch_name: editBranchName.trim(),
                region_id: Number(finalEditRegionId),
            },
            {
                onSuccess: () => {
                    toast({title: "Branch updated successfully"});
                    setEditOpen(false);
                    setEditingBranch(null);
                },
                onError: (err) => {
                    const detail =
                        err?.response?.data?.detail || "Failed to update branch. Please try again.";
                    toast({
                        title: "Error updating branch",
                        description: detail,
                        variant: "destructive",
                    });
                },
            }
        );
    };

    // ======================
    // DELETE HANDLER
    // ======================
    const handleDelete = (branch_id, branch_name) => {
        if (
            !confirmDelete(
                `Are you sure you want to delete branch "${branch_name}"? This action cannot be undone.`
            )
        ) {
            return;
        }

        deleteBranchMutation.mutate(branch_id, {
            onSuccess: () => toast({title: "Branch deleted"}),
            onError: (err) => {
                const detail =
                    err?.response?.data?.detail || "Failed to delete branch. Please try again.";
                toast({
                    title: "Error deleting branch",
                    description: detail,
                    variant: "destructive",
                });
            },
        });
    };

    // -------------------------
    // UI Tokens (boxy)
    // -------------------------
    const boxCard =
        "rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow";

    return (
        <div className="space-y-4">
            {/* ✅ Optional internal header (useful in Overview widgets) */}
            {showHeader ? (
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-semibold leading-none">Branch Management</h3>
                        <p className="text-sm text-muted-foreground">Create and manage branches</p>
                    </div>
                </div>
            ) : null}

            {/* ✅ KPI cards */}
            {showKpis ? (
                <div className={`grid gap-4 ${isPage ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
                    <StatCard
                        title="Total Branches"
                        value={branchesCount}
                        subtitle="Registered branches"
                        Icon={Building2}
                    />
                    <StatCard
                        title="Regions"
                        value={regionsCount}
                        subtitle="Available regions"
                        Icon={MapPin}
                    />
                    <StatCard
                        title="Mapped Branches"
                        value={branchesWithRegion}
                        subtitle="Branches linked to region"
                        Icon={MapPin}
                    />
                    <StatCard
                        title="Unmapped"
                        value={Math.max(0, branchesCount - branchesWithRegion)}
                        subtitle="Needs region assignment"
                        Icon={MapPin}
                    />
                </div>
            ) : null}

            {/* ✅ Action row */}
            <div className="flex items-center justify-end">
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="rounded-lg"
                            disabled={(visibleRegions?.length ?? 0) === 0 || loading}
                        >
                            <Plus className="mr-2 h-4 w-4"/>
                            Add Branch
                        </Button>
                    </DialogTrigger>

                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Branch</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="region">Region</Label>

                                <Select
                                    value={regionId}
                                    onValueChange={setRegionId}
                                    disabled={isRegionalManager} // ✅ lock for RM
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select region"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {visibleRegions.map((region) => (
                                            <SelectItem
                                                key={region.region_id}
                                                value={String(region.region_id)}
                                            >
                                                {region.region_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {isRegionalManager ? (
                                    <p className="text-xs text-muted-foreground">
                                        Region is locked to your assigned region.
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Branch Name</Label>
                                <Input
                                    id="name"
                                    value={branchName}
                                    onChange={(e) => setBranchName(e.target.value)}
                                    placeholder="e.g., Kolkata Main"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full rounded-lg"
                                disabled={createBranchMutation.isPending || !branchName.trim()}
                            >
                                {createBranchMutation.isPending ? "Creating..." : "Create Branch"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ✅ Error states */}
            {isRegionsError ? (
                <Card className={boxCard}>
                    <CardContent className="py-6 text-sm text-destructive">
                        Failed to load regions:{" "}
                        {regionsError?.response?.data?.detail || regionsError?.message || "Unknown error"}
                    </CardContent>
                </Card>
            ) : null}

            {isBranchesError ? (
                <Card className={boxCard}>
                    <CardContent className="py-6 text-sm text-destructive">
                        Failed to load branches:{" "}
                        {branchesError?.response?.data?.detail || branchesError?.message || "Unknown error"}
                    </CardContent>
                </Card>
            ) : null}

            {/* ✅ Loading state */}
            {loading ? (
                <Card className={boxCard}>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        Loading branches...
                    </CardContent>
                </Card>
            ) : null}

            {/* ✅ Branch cards (uses visibleBranches) */}
            {!loading && !isBranchesError && !isRegionsError ? (
                visibleBranches?.length ? (
                    <div className={`grid gap-4 ${isPage ? "md:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
                        {visibleBranches.map((branch) => (
                            <Card key={branch.branch_id} className={boxCard}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm text-muted-foreground">Branch</p>
                                            <p className="text-base font-semibold truncate">
                                                {branch.branch_name}
                                            </p>

                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                {/* ✅ Hide ID for Regional Manager */}
                                                {!isRegionalManager ? (
                                                    <Badge variant="secondary" className="rounded-lg px-2.5 py-1 text-xs">
                                                        ID: {branch.branch_id}
                                                    </Badge>
                                                ) : null}

                                                <Badge variant="outline" className="rounded-lg px-2.5 py-1 text-xs">
                                                    <MapPin className="mr-1 h-3.5 w-3.5"/>
                                                    {getRegionName(branch.region_id)}
                                                </Badge>
                                            </div>
                                        </div>

                                        {isPage ? (
                                            <Badge className="rounded-lg px-2.5 py-1 text-xs">Active</Badge>
                                        ) : null}
                                    </div>

                                    <div className="mt-4 pt-4 border-t flex items-center justify-between gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg"
                                            onClick={() => openEditModal(branch)}
                                        >
                                            <Pencil className="mr-2 h-4 w-4"/>
                                            Edit
                                        </Button>

                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="rounded-lg"
                                            onClick={() => handleDelete(branch.branch_id, branch.branch_name)}
                                            disabled={deleteBranchMutation.isPending}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4"/>
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <>
                        {(visibleRegions?.length ?? 0) > 0 ? (
                            <Card className={boxCard}>
                                <CardContent className="flex flex-col items-center justify-center py-10">
                                    <p className="text-muted-foreground mb-4">No branches created yet</p>
                                    <Button className="rounded-lg" onClick={() => setOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4"/>
                                        Create First Branch
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className={boxCard}>
                                <CardContent className="flex flex-col items-center justify-center py-10">
                                    <p className="text-muted-foreground">
                                        {isRegionalManager
                                            ? "No region is assigned to your account."
                                            : "Create a region first to add branches"}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )
            ) : null}

            {/* ✅ Edit Branch modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Edit Branch
                            {editingBranch ? ` - ${editingBranch.branch_name}` : ""}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-region">Region</Label>

                            <Select
                                value={editRegionId}
                                onValueChange={setEditRegionId}
                                disabled={isRegionalManager} // ✅ lock for RM
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select region"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {(isRegionalManager ? visibleRegions : regions).map((region) => (
                                        <SelectItem key={region.region_id} value={String(region.region_id)}>
                                            {region.region_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {isRegionalManager ? (
                                <p className="text-xs text-muted-foreground">
                                    Region is locked to your assigned region.
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Branch Name</Label>
                            <Input
                                id="edit-name"
                                value={editBranchName}
                                onChange={(e) => setEditBranchName(e.target.value)}
                                placeholder="e.g., Kolkata Main"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full rounded-lg"
                            disabled={updateBranchMutation.isPending || !editBranchName.trim()}
                        >
                            {updateBranchMutation.isPending ? "Updating..." : "Update Branch"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

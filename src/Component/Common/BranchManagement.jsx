// src/Component/dashboard/Common/BranchManagement.jsx
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Plus, Trash2, Pencil} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";
import {confirmDelete} from "@/Utils/confirmDelete.js";

export default function BranchManagement() {
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

    // ======================
    //  CREATE HANDLER
    // ======================
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!regionId) {
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
                region_id: Number(regionId),
            },
            {
                onSuccess: () => {
                    toast({title: "Branch created successfully"});
                    setBranchName("");
                    setRegionId("");
                    setOpen(false);
                },
                onError: (err) => {
                    const detail =
                        err?.response?.data?.detail ||
                        "Failed to create branch. Please try again.";
                    toast({
                        title: "Error creating branch",
                        description: detail,
                        variant: "destructive",
                    });
                },
            },
        );
    };

    // ======================
    //  EDIT HANDLERS
    // ======================
    const openEditModal = (branch) => {
        setEditingBranch(branch);
        setEditBranchName(branch.branch_name || "");
        setEditRegionId(String(branch.region_id || ""));
        setEditOpen(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editingBranch) return;

        if (!editRegionId) {
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
                region_id: Number(editRegionId),
            },
            {
                onSuccess: () => {
                    toast({title: "Branch updated successfully"});
                    setEditOpen(false);
                    setEditingBranch(null);
                },
                onError: (err) => {
                    const detail =
                        err?.response?.data?.detail ||
                        "Failed to update branch. Please try again.";
                    toast({
                        title: "Error updating branch",
                        description: detail,
                        variant: "destructive",
                    });
                },
            },
        );
    };

    // ======================
    //  DELETE HANDLER
    // ======================
    const handleDelete = (branch_id, branch_name) => {
        if (
            !confirmDelete(
                `Are you sure you want to delete branch "${branch_name}"? This action cannot be undone.`,
            )
        ) {
            return;
        }

        deleteBranchMutation.mutate(branch_id, {
            onSuccess: () => {
                toast({title: "Branch deleted"});
            },
            onError: (err) => {
                const detail =
                    err?.response?.data?.detail ||
                    "Failed to delete branch. Please try again.";
                toast({
                    title: "Error deleting branch",
                    description: detail,
                    variant: "destructive",
                });
            },
        });
    };

    const getRegionName = (id) =>
        regions.find((r) => r.region_id === id)?.region_name || "Unknown";

    return (
        <div className="space-y-4">
            {/* HEADER + CREATE MODAL */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Branch Management</h3>
                    <p className="text-sm text-muted-foreground">
                        Create and manage branches
                    </p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="lg"
                            disabled={regions.length === 0 || loading}
                        >
                            <Plus className="mr-2 h-5 w-5"/>
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
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select region"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {regions.map((region) => (
                                            <SelectItem
                                                key={region.region_id}
                                                value={String(region.region_id)}
                                            >
                                                {region.region_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Branch Name</Label>
                                <Input
                                    id="name"
                                    value={branchName}
                                    onChange={(e) =>
                                        setBranchName(e.target.value)
                                    }
                                    placeholder="e.g., Kolkata Main"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={createBranchMutation.isPending}
                            >
                                {createBranchMutation.isPending
                                    ? "Creating..."
                                    : "Create Branch"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ERROR STATES */}
            {isRegionsError && (
                <p className="text-sm text-red-500">
                    Failed to load regions:{" "}
                    {regionsError?.response?.data?.detail ||
                        regionsError?.message}
                </p>
            )}
            {isBranchesError && (
                <p className="text-sm text-red-500">
                    Failed to load branches:{" "}
                    {branchesError?.response?.data?.detail ||
                        branchesError?.message}
                </p>
            )}

            {/* BRANCH CARDS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {branches.map((branch) => (
                    <Card key={branch.branch_id}>
                        <CardHeader>
                            <CardTitle>{branch.branch_name}</CardTitle>
                            <CardDescription>
                                Region: {getRegionName(branch.region_id)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-end items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(branch)}
                            >
                                <Pencil className="mr-2 h-4 w-4"/>
                                Edit
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                    handleDelete(
                                        branch.branch_id,
                                        branch.branch_name,
                                    )
                                }
                                disabled={deleteBranchMutation.isPending}
                            >
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Delete
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* EMPTY STATES */}
            {!loading && branches.length === 0 && regions.length > 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-muted-foreground mb-4">
                            No branches created yet
                        </p>
                        <Button onClick={() => setOpen(true)}>
                            <Plus className="mr-2 h-4 w-4"/>
                            Create First Branch
                        </Button>
                    </CardContent>
                </Card>
            )}

            {!loading && regions.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-muted-foreground">
                            Create a region first to add branches
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* EDIT BRANCH MODAL */}
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
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select region"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {regions.map((region) => (
                                        <SelectItem
                                            key={region.region_id}
                                            value={String(region.region_id)}
                                        >
                                            {region.region_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                            className="w-full"
                            disabled={updateBranchMutation.isPending}
                        >
                            {updateBranchMutation.isPending
                                ? "Updating..."
                                : "Update Branch"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

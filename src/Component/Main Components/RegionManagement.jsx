// src/Component/Home/Main Components/RegionManagement.jsx
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Plus, Trash2, Pencil} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import {useRegions} from "@/hooks/useRegions.js";
import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx";

export default function RegionManagement() {
    const [open, setOpen] = useState(false);          // Add Region
    const [editOpen, setEditOpen] = useState(false);  // Edit Region
    const [confirmOpen, setConfirmOpen] = useState(false); // Delete confirm

    const [name, setName] = useState("");
    const [editName, setEditName] = useState("");
    const [editingRegionId, setEditingRegionId] = useState(null);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const {toast} = useToast();

    const {
        regions, isLoading, isError, createRegion, deleteRegion, updateRegion, isCreating, isDeleting, isUpdating,
    } = useRegions();

    // CREATE
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createRegion({region_name: name.trim()});
            toast({title: "Region created successfully"});
            setName("");
            setOpen(false);
        } catch (err) {
            toast({
                title: "Error creating region", description: err?.response?.data?.detail, variant: "destructive",
            });
        }
    };

    // DELETE (actual API call)
    const handleDelete = async () => {
        if (!pendingDeleteId) return;
        try {
            await deleteRegion(pendingDeleteId);
            toast({title: "Region deleted"});
        } catch (err) {
            toast({
                title: "Error deleting region", description: err?.response?.data?.detail, variant: "destructive",
            });
        } finally {
            setConfirmOpen(false);
            setPendingDeleteId(null);
        }
    };

    // EDIT
    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            await updateRegion({
                region_id: editingRegionId, region_name: editName.trim(),
            });
            toast({title: "Region updated successfully"});
            setEditOpen(false);
        } catch (err) {
            toast({
                title: "Error updating region", description: err?.response?.data?.detail, variant: "destructive",
            });
        }
    };

    const openEditModal = (region) => {
        setEditingRegionId(region.region_id);
        setEditName(region.region_name);
        setEditOpen(true);
    };

    const openDeleteConfirm = (region_id) => {
        setPendingDeleteId(region_id);
        setConfirmOpen(true);
    };

    return (<div className="space-y-6">
            {/* Header + Add button */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Region Management</h3>
                    <p className="text-sm text-muted-foreground">
                        Create and manage regions
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4"/> Add Region
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Region</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Label>Region Name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <Button
                                type="submit"
                                disabled={isCreating || !name.trim()}
                                className="w-full"
                            >
                                {isCreating ? "Creating..." : "Create"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Cards */}
            {!isLoading && !isError && regions.length > 0 && (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {regions.map((region) => (<Card key={region.region_id} className="shadow-sm">
                            <CardHeader>
                                <CardTitle>{region.region_name}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditModal(region)}
                                >
                                    <Pencil className="h-4 w-4 mr-1"/>
                                    Edit
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => openDeleteConfirm(region.region_id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Delete
                                </Button>
                            </CardContent>
                        </Card>))}
                </div>)}

            {/* Edit modal (unchanged except for using handleEdit) */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Region</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <Label>Region Name</Label>
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            required
                        />
                        <Button
                            type="submit"
                            disabled={isUpdating || !editName.trim()}
                            className="w-full"
                        >
                            {isUpdating ? "Updating..." : "Save Changes"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog (from Utils) */}
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
        </div>);
}

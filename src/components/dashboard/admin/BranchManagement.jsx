import {useState} from "react";
import {storage} from "@/lib/storage";
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
import {Plus, Trash2} from "lucide-react";
import {useToast} from "@/hooks/use-toast";

export default function BranchManagement({branches, regions, onUpdate}) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [regionId, setRegionId] = useState("");
    const {toast} = useToast();

    const handleSubmit = (e) => {
        e.preventDefault();
        const newBranch = {
            id: Date.now().toString(),
            name,
            code,
            regionId,
            createdAt: new Date().toISOString(),
        };
        storage.branches.add(newBranch);
        toast({title: "Branch created successfully"});
        setName("");
        setCode("");
        setRegionId("");
        setOpen(false);
        onUpdate();
    };

    const handleDelete = (id) => {
        storage.branches.delete(id);
        toast({title: "Branch deleted"});
        onUpdate();
    };

    const getRegionName = (id) =>
        regions.find((r) => r.id === id)?.name || "Unknown";

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Branch Management</h3>
                    <p className="text-sm text-muted-foreground">
                        Create and manage branches
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" disabled={regions.length === 0}>
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
                                <Select value={regionId} onValueChange={setRegionId} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select region"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {regions.map((region) => (
                                            <SelectItem key={region.id} value={region.id}>
                                                {region.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Branch Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Kolkata Main"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code">Branch Code</Label>
                                <Input
                                    id="code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="e.g., KM01"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Create Branch
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {branches.map((branch) => (
                    <Card key={branch.id}>
                        <CardHeader>
                            <CardTitle>{branch.name}</CardTitle>
                            <CardDescription>
                                Code: {branch.code} | Region: {getRegionName(branch.regionId)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(branch.id)}
                            >
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Delete
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {branches.length === 0 && regions.length > 0 && (
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

            {regions.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-muted-foreground">
                            Create a region first to add branches
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

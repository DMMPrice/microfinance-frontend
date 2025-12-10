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

export default function LoanOfficerManagement({
                                                  officers,
                                                  branches,
                                                  regions,
                                                  onUpdate,
                                              }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [branchId, setBranchId] = useState("");
    const {toast} = useToast();

    const handleSubmit = (e) => {
        e.preventDefault();
        const newOfficer = {
            id: Date.now().toString(),
            userId: Date.now().toString(),
            name,
            email,
            branchId,
            createdAt: new Date().toISOString(),
        };
        storage.loanOfficers.add(newOfficer);
        toast({title: "Loan Officer created successfully"});
        setName("");
        setEmail("");
        setBranchId("");
        setOpen(false);
        onUpdate();
    };

    const handleDelete = (id) => {
        storage.loanOfficers.delete(id);
        toast({title: "Loan Officer deleted"});
        onUpdate();
    };

    const getBranchInfo = (branchId) => {
        const branch = branches.find((b) => b.id === branchId);
        if (!branch) return "Unknown";
        const region = regions.find((r) => r.id === branch.regionId);
        return `${branch.name} (${region?.name || "Unknown"})`;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Loan Officer Management</h3>
                    <p className="text-sm text-muted-foreground">
                        Create and manage loan officers
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" disabled={branches.length === 0}>
                            <Plus className="mr-2 h-5 w-5"/>
                            Add Loan Officer
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Loan Officer</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Rahul Kumar"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="e.g., rahul@mf.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="branch">Assign to Branch</Label>
                                <Select
                                    value={branchId}
                                    onValueChange={setBranchId}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select branch"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id}>
                                                {branch.name} (
                                                {regions.find((r) => r.id === branch.regionId)
                                                    ?.name || "Unknown"}
                                                )
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full">
                                Create Loan Officer
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {officers.map((officer) => (
                    <Card key={officer.id}>
                        <CardHeader>
                            <CardTitle>{officer.name}</CardTitle>
                            <CardDescription>
                                {officer.email}
                                <br/>
                                Branch: {getBranchInfo(officer.branchId)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(officer.id)}
                            >
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Delete
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {officers.length === 0 && branches.length > 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-muted-foreground mb-4">
                            No loan officers created yet
                        </p>
                        <Button onClick={() => setOpen(true)}>
                            <Plus className="mr-2 h-4 w-4"/>
                            Create First Loan Officer
                        </Button>
                    </CardContent>
                </Card>
            )}

            {branches.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-muted-foreground">
                            Create branches first to add loan officers
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

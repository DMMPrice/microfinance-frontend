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
import {Textarea} from "@/components/ui/textarea";
import {Plus, Trash2} from "lucide-react";
import {useToast} from "@/hooks/use-toast";

export default function BorrowerManagement({
                                               borrowers,
                                               groups,
                                               branches,
                                               officers,
                                               regions,
                                               onUpdate,
                                           }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [groupId, setGroupId] = useState("");
    const [kycDetails, setKycDetails] = useState("");
    const {toast} = useToast();

    const handleSubmit = (e) => {
        e.preventDefault();
        const newBorrower = {
            id: Date.now().toString(),
            name,
            phone,
            address,
            groupId,
            kycDetails,
            createdAt: new Date().toISOString(),
        };
        storage.borrowers.add(newBorrower);
        toast({title: "Borrower created successfully"});
        setName("");
        setPhone("");
        setAddress("");
        setGroupId("");
        setKycDetails("");
        setOpen(false);
        onUpdate();
    };

    const handleDelete = (id) => {
        storage.borrowers.delete(id);
        toast({title: "Borrower deleted"});
        onUpdate();
    };

    const getBorrowerInfo = (borrower) => {
        const group = groups.find((g) => g.id === borrower.groupId);
        const officer = officers.find((o) => o.id === group?.loanOfficerId);
        const branch = branches.find((b) => b.id === group?.branchId);
        const region = regions.find((r) => r.id === branch?.regionId);
        return {
            group: group?.name || "Unknown",
            officer: officer?.name || "Unknown",
            branch: branch?.name || "Unknown",
            region: region?.name || "Unknown",
        };
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Borrower Management</h3>
                    <p className="text-sm text-muted-foreground">
                        Create and manage borrowers
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" disabled={groups.length === 0}>
                            <Plus className="mr-2 h-5 w-5"/>
                            Add Borrower
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Borrower</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="group">Assign to Group</Label>
                                <Select value={groupId} onValueChange={setGroupId} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select group"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {groups.map((group) => (
                                            <SelectItem key={group.id} value={group.id}>
                                                {group.name} (
                                                {officers.find((o) => o.id === group.loanOfficerId)
                                                    ?.name || "Unknown"}
                                                )
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Priya Sharma"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="e.g., +91 9876543210"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                    id="address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Full address"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="kyc">KYC Details</Label>
                                <Input
                                    id="kyc"
                                    value={kycDetails}
                                    onChange={(e) => setKycDetails(e.target.value)}
                                    placeholder="e.g., Aadhaar: XXXX-XXXX-1234"
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Create Borrower
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {borrowers.map((borrower) => {
                    const info = getBorrowerInfo(borrower);
                    return (
                        <Card key={borrower.id}>
                            <CardHeader>
                                <CardTitle>{borrower.name}</CardTitle>
                                <CardDescription>
                                    Phone: {borrower.phone}
                                    <br/>
                                    Group: {info.group}
                                    <br/>
                                    Officer: {info.officer}
                                    <br/>
                                    Branch: {info.branch} | Region: {info.region}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(borrower.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Delete
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {borrowers.length === 0 && groups.length > 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-muted-foreground mb-4">
                            No borrowers created yet
                        </p>
                        <Button onClick={() => setOpen(true)}>
                            <Plus className="mr-2 h-4 w-4"/>
                            Create First Borrower
                        </Button>
                    </CardContent>
                </Card>
            )}

            {groups.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-muted-foreground">
                            Create groups first to add borrowers
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

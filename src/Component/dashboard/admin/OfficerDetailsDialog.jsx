// src/Component/dashboard/admin/OfficerDetailsDialog.jsx
import {useEffect, useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Trash2} from "lucide-react";

export default function OfficerDetailsDialog({
                                                 open,
                                                 onClose,
                                                 officer,
                                                 onDelete,
                                                 branchRegionLabel,
                                                 groupCount,
                                             }) {
    const [isEditing, setIsEditing] = useState(false);

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");

    useEffect(() => {
        if (officer) {
            const emp = officer.employee;
            const user = emp?.user;

            setFullName(emp?.full_name || "");
            setPhone(emp?.phone || "");
            setEmail(user?.email || "");
            setUsername(user?.username || "");
        }
        setIsEditing(false); // reset edit mode when officer/open changes
    }, [officer, open]);

    if (!officer) return null;

    const emp = officer.employee;

    const handleSave = () => {
        // 🔹 Currently only updates local dialog state and exits edit mode.
        // You can later wire this to a backend update API.
        setIsEditing(false);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Loan Officer Details</DialogTitle>
                </DialogHeader>

                {!isEditing ? (
                    // ===== VIEW MODE =====
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="font-medium">Full Name</p>
                                <p className="text-muted-foreground">
                                    {emp?.full_name || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className="font-medium">Email</p>
                                <p className="text-muted-foreground">
                                    {email || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className="font-medium">Phone</p>
                                <p className="text-muted-foreground">
                                    {emp?.phone || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className="font-medium">Username</p>
                                <p className="text-muted-foreground">
                                    {username || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className="font-medium">Branch / Region</p>
                                <p className="text-muted-foreground">
                                    {branchRegionLabel}
                                </p>
                            </div>

                            <div>
                                <p className="font-medium">Groups Assigned</p>
                                <p className="text-muted-foreground">
                                    {groupCount}
                                </p>
                            </div>

                            <div>
                                <p className="font-medium">Loan Officer ID</p>
                                <p className="text-muted-foreground">
                                    {officer.lo_id}
                                </p>
                            </div>

                            <div>
                                <p className="font-medium">Employee ID</p>
                                <p className="text-muted-foreground">
                                    {officer.employee_id}
                                </p>
                            </div>
                        </div>

                        <div className="border-t pt-4 flex justify-between gap-2">
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                Edit
                            </Button>

                            <Button
                                variant="destructive"
                                onClick={() => onDelete(officer.lo_id)}
                            >
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Delete
                            </Button>
                        </div>
                    </div>
                ) : (
                    // ===== EDIT MODE =====
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="font-medium text-xs uppercase">
                                    Full Name
                                </Label>
                                <Input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="font-medium text-xs uppercase">
                                    Email
                                </Label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="font-medium text-xs uppercase">
                                    Phone
                                </Label>
                                <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="font-medium text-xs uppercase">
                                    Username
                                </Label>
                                <Input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="font-medium text-xs uppercase">
                                    Branch / Region
                                </Label>
                                <Input value={branchRegionLabel} disabled/>
                            </div>

                            <div className="space-y-1">
                                <Label className="font-medium text-xs uppercase">
                                    Groups Assigned
                                </Label>
                                <Input value={groupCount} disabled/>
                            </div>

                            <div className="space-y-1">
                                <Label className="font-medium text-xs uppercase">
                                    Loan Officer ID
                                </Label>
                                <Input value={officer.lo_id} disabled/>
                            </div>

                            <div className="space-y-1">
                                <Label className="font-medium text-xs uppercase">
                                    Employee ID
                                </Label>
                                <Input value={officer.employee_id} disabled/>
                            </div>
                        </div>

                        <div className="border-t pt-4 flex justify-between gap-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

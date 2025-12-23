// src/Component/Home/Main Components/OfficerDetailsDialog.jsx
import {useEffect, useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Trash2} from "lucide-react";

export default function OfficerDetailsDialog({
                                                 open,
                                                 onClose,
                                                 officer,
                                                 onDelete,
                                                 branchRegionLabel,
                                                 groupCount,
                                             }) {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");

    useEffect(() => {
        if (officer) {
            const emp = officer.employee;
            const user = emp?.user;

            setEmail(user?.email || "");
            setUsername(user?.username || "");
        }
    }, [officer, open]);

    if (!officer) return null;

    const emp = officer.employee;

    // ✅ Replace IDs with names
    const loanOfficerName = emp?.full_name || "N/A";
    const employeeName = username || email || "N/A";

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Loan Officer Details</DialogTitle>
                </DialogHeader>

                {/* ===== VIEW ONLY MODE ===== */}
                <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="font-medium">Full Name</p>
                            <p className="text-muted-foreground">{loanOfficerName}</p>
                        </div>

                        <div>
                            <p className="font-medium">Email</p>
                            <p className="text-muted-foreground">{email || "N/A"}</p>
                        </div>

                        <div>
                            <p className="font-medium">Phone</p>
                            <p className="text-muted-foreground">{emp?.phone || "N/A"}</p>
                        </div>

                        <div>
                            <p className="font-medium">Username</p>
                            <p className="text-muted-foreground">{username || "N/A"}</p>
                        </div>

                        <div>
                            <p className="font-medium">Branch / Region</p>
                            <p className="text-muted-foreground">{branchRegionLabel || "N/A"}</p>
                        </div>

                        <div>
                            <p className="font-medium">Groups Assigned</p>
                            <p className="text-muted-foreground">{groupCount ?? 0}</p>
                        </div>

                        {/* ✅ REPLACED */}
                        <div>
                            <p className="font-medium">Loan Officer</p>
                            <p className="text-muted-foreground">{loanOfficerName}</p>
                        </div>

                        {/* ✅ REPLACED */}
                        <div>
                            <p className="font-medium">Employee</p>
                            <p className="text-muted-foreground">{employeeName}</p>
                        </div>
                    </div>

                    <div className="border-t pt-4 flex justify-end gap-2">
                        <Button
                            variant="destructive"
                            onClick={() => onDelete(officer.lo_id)}
                        >
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

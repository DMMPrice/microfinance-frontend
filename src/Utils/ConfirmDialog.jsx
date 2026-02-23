// src/Utils/ConfirmDialog.jsx
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
                                  open,
                                  onOpenChange,
                                  title = "Are you sure?",
                                  description = "This action cannot be undone.",
                                  confirmLabel = "Confirm",
                                  cancelLabel = "Cancel",
                                  onConfirm,
                                  isLoading = false,
                                  children,
                                  confirmDisabled = false,
                              }) {
    const handleConfirm = () => {
        if (!isLoading && !confirmDisabled && onConfirm) {
            onConfirm();
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>

                    {/* ✅ If children NOT provided, show description normally */}
                    {!children && description && (
                        <AlertDialogDescription>
                            {description}
                        </AlertDialogDescription>
                    )}
                </AlertDialogHeader>

                {/* ✅ If children provided, render custom body */}
                {children && (
                    <div className="mt-2 space-y-3">
                        {description && (
                            <p className="text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                        {children}
                    </div>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                        <Button variant="outline" type="button">
                            {cancelLabel}
                        </Button>
                    </AlertDialogCancel>

                    <AlertDialogAction asChild>
                        <Button
                            variant="destructive"
                            onClick={handleConfirm}
                            disabled={isLoading || confirmDisabled}
                        >
                            {isLoading ? "Processing..." : confirmLabel}
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
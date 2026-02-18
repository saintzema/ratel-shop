"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "default";
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default",
}: ConfirmationModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-900">{title}</DialogTitle>
                    <DialogDescription className="text-gray-500 mt-2">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="hover:bg-gray-100">
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === "danger" ? "destructive" : "default"}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={variant === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-ratel-green-600 hover:bg-ratel-green-700 text-white"}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Users, Sparkles, Loader2 } from "lucide-react";
import { DemoStore } from "@/lib/demo-store";

interface BroadcastModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCustomerIds: string[];
    onSuccess?: () => void;
}

const TEMPLATES = [
    {
        id: "discount",
        label: "VIP Discount Offer",
        content: "Hi there! As a valued customer, enjoy 20% off your next purchase with code VIP20 at checkout."
    },
    {
        id: "new_arrival",
        label: "New Arrivals",
        content: "We just dropped new exciting items in the store! Check them out before they sell out."
    },
    {
        id: "custom",
        label: "Custom Message",
        content: ""
    }
];

export function BroadcastModal({ open, onOpenChange, selectedCustomerIds, onSuccess }: BroadcastModalProps) {
    const [template, setTemplate] = useState("custom");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (!open) {
            setTemplate("custom");
            setMessage("");
            setIsSending(false);
        }
    }, [open]);

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setTemplate(val);
        const tpl = TEMPLATES.find(t => t.id === val);
        if (tpl) {
            setMessage(tpl.content);
        }
    };

    const handleSend = () => {
        if (!message.trim() || selectedCustomerIds.length === 0) return;
        setIsSending(true);

        setTimeout(() => {
            const sellerId = DemoStore.getCurrentSellerId();
            if (sellerId) {
                DemoStore.sendBroadcastMessage(selectedCustomerIds, message);
            }

            setIsSending(false);
            alert(`Successfully sent message to ${selectedCustomerIds.length} customer(s).`);
            onOpenChange(false);
            if (onSuccess) onSuccess();
        }, 800);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
                <div className="bg-gradient-to-br from-indigo-50 to-white px-6 py-6 border-b border-indigo-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -m-8 opacity-10">
                        <Sparkles className="w-40 h-40 text-indigo-600" />
                    </div>
                    <DialogHeader className="relative">
                        <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-indigo-100 flex items-center justify-center mb-4 relative z-10">
                            <Send className="w-6 h-6 text-indigo-600" />
                        </div>
                        <DialogTitle className="text-xl font-black text-gray-900">Broadcast Message</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-gray-500 mt-1">
                            Send direct offers to your customers' inboxes.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                        <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">Recipients</p>
                            <p className="text-sm font-black text-gray-900">{selectedCustomerIds.length} Selected Customer(s)</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Message Template</Label>
                            <select
                                value={template}
                                onChange={handleTemplateChange}
                                className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                            >
                                {TEMPLATES.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Your Message</Label>
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your message here..."
                                className="min-h-[120px] resize-none bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-indigo-600 text-sm font-medium shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl flex-1 font-bold border-gray-200">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={!message.trim() || selectedCustomerIds.length === 0 || isSending}
                        className="rounded-xl flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md shadow-indigo-500/20"
                    >
                        {isSending ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                        ) : (
                            <><Send className="w-4 h-4 mr-2" /> Send Broadcast</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

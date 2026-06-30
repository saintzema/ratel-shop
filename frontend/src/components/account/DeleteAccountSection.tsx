"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * In-app account deletion (Apple App Store Guideline 5.1.1(v) + NDPR / ISO 27701 right to
 * erasure). A logged-in user can permanently delete their own account and all associated
 * data directly in the app — not via an email request. Requires typing DELETE to confirm.
 */
export function DeleteAccountSection() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!user?.id) return null;

    const handleDelete = async () => {
        setBusy(true);
        setError(null);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
            const res = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Deletion failed (${res.status})`);
            }
            // Clear local session/data and leave the app.
            try {
                localStorage.removeItem("fp_token");
                localStorage.removeItem("fp_user");
            } catch { /* ignore */ }
            await logout?.();
            router.replace("/?account_deleted=1");
        } catch (e: any) {
            setError(e?.message || "Could not delete your account. Please try again.");
            setBusy(false);
        }
    };

    return (
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50/40 p-6">
            <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="text-base font-bold text-red-700">Delete account</h3>
                    <p className="text-sm text-red-600/80 mt-1 max-w-prose">
                        Permanently delete your FairPrice account and all associated data — profile,
                        addresses, orders, favorites, and (if you sell) your store. This cannot be undone.
                    </p>

                    {!open ? (
                        <Button
                            onClick={() => setOpen(true)}
                            className="mt-4 rounded-full bg-white text-red-600 border border-red-300 hover:bg-red-50 font-semibold h-10 px-5"
                        >
                            Delete my account
                        </Button>
                    ) : (
                        <div className="mt-4 space-y-3">
                            <label className="block text-sm font-medium text-red-700">
                                Type <span className="font-mono font-bold">DELETE</span> to confirm
                            </label>
                            <input
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                autoComplete="off"
                                className="w-full max-w-xs rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                placeholder="DELETE"
                            />
                            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handleDelete}
                                    disabled={confirmText.trim().toUpperCase() !== "DELETE" || busy}
                                    className="rounded-full bg-red-600 text-white hover:bg-red-700 font-semibold h-10 px-5 disabled:opacity-50"
                                >
                                    {busy ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</>) : "Permanently delete"}
                                </Button>
                                <Button
                                    onClick={() => { setOpen(false); setConfirmText(""); setError(null); }}
                                    disabled={busy}
                                    className="rounded-full bg-transparent text-gray-600 hover:bg-gray-100 font-semibold h-10 px-5"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { Globe, Loader2, Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataSyncService } from "@/lib/sync-store";

/**
 * Storefront address settings.
 *
 * The App Integrations "Custom Domain Linking" card links its Manage button
 * here, and this route did not exist — it 404'd. What the card actually
 * controls is the seller's storeUrl, which is the slug in
 * fairprice.ng/store/<slug>, so that is what this page edits.
 *
 * Pointing a real custom domain (shop.mybusiness.com) needs a DNS record on the
 * seller's side plus the domain being added to the Vercel project, which is not
 * self-serve. That half is presented as a request rather than pretending a
 * button provisions it.
 */
export default function DomainSettingsPage() {
    const [slug, setSlug] = useState("");
    const [initialSlug, setInitialSlug] = useState("");
    const [sellerId, setSellerId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const seller = DataSyncService.getCurrentSeller();
        if (!seller) return;
        setSellerId(seller.id);
        const current = (seller as any).store_url || (seller as any).storeUrl || "";
        setSlug(current);
        setInitialSlug(current);
    }, []);

    // Slugs land in a URL, so keep them to what a URL can carry losslessly.
    const normalise = (raw: string) =>
        raw.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");

    const storefrontUrl = `https://www.fairprice.ng/store/${slug || "your-store"}`;

    const handleSave = async () => {
        const clean = normalise(slug);
        if (!clean) { setError("Pick a storefront address — it can't be empty."); return; }
        if (clean.length < 3) { setError("Storefront addresses need at least 3 characters."); return; }
        if (!sellerId) { setError("We couldn't identify your store. Reload and try again."); return; }

        setSaving(true);
        setError(null);
        try {
            const token = localStorage.getItem("fp_token");
            const res = await fetch(`/api/sellers/${sellerId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ store_url: clean }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                // storeUrl is @unique — the collision case is the one sellers hit.
                setError(res.status === 409 || /unique|taken/i.test(body?.error || "")
                    ? "That address is already taken. Try another."
                    : body?.error || "Could not save. Please try again.");
                return;
            }
            DataSyncService.updateSeller(sellerId, { store_url: clean } as any);
            setSlug(clean);
            setInitialSlug(clean);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {
            setError("Could not save. Check your connection and try again.");
        } finally {
            setSaving(false);
        }
    };

    const copyUrl = () => {
        navigator.clipboard.writeText(storefrontUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
    };

    return (
        <div className="max-w-3xl space-y-6 pb-20">
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Storefront Address</h1>
                <p className="text-sm text-gray-500 mt-1">Choose the link buyers use to find your store.</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-5">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Your FairPrice address</label>
                    <div className="flex items-stretch gap-2">
                        <div className="flex items-center px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500 font-medium whitespace-nowrap">
                            fairprice.ng/store/
                        </div>
                        <Input
                            value={slug}
                            onChange={(e) => { setSlug(e.target.value); setError(null); }}
                            onBlur={() => setSlug(s => normalise(s))}
                            placeholder="your-store"
                            className="rounded-xl h-12 flex-1 min-w-0 font-semibold"
                        />
                    </div>
                    <p className="text-xs text-gray-400">Letters, numbers and hyphens only.</p>
                    {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
                </div>

                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-200">
                    <a
                        href={storefrontUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-indigo-600 hover:underline truncate flex items-center gap-1.5 min-w-0"
                    >
                        <span className="truncate">{storefrontUrl}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                    <Button variant="outline" size="sm" onClick={copyUrl} className="rounded-lg shrink-0 gap-1.5">
                        {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                    </Button>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={saving || normalise(slug) === initialSlug}
                    className="h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto px-8"
                >
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</>
                        : saved ? <><Check className="h-4 w-4 mr-2" /> Saved</>
                        : "Save address"}
                </Button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 shrink-0">
                        <Globe className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-bold text-gray-900">Use your own domain</h2>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                            Want <span className="font-semibold text-gray-700">shop.yourbusiness.com</span> to open your
                            FairPrice storefront? That needs a DNS record on your side and your domain added on ours, so
                            we set it up with you rather than through a button here.
                        </p>
                        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                            Email <a href="mailto:support@fairprice.ng?subject=Custom%20domain%20request" className="font-semibold text-indigo-600 hover:underline">support@fairprice.ng</a> with
                            the domain you own and your store address above, and we'll send the exact DNS record to add.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

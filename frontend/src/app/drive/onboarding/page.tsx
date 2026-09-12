"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Upload, CheckCircle2, Clock, XCircle, Loader2, ScanLine, Pencil, Check, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";

const CLASSES: { value: "ev" | "newer" | "standard"; label: string; blurb: string }[] = [
    { value: "ev", label: "Electric (EV)", blurb: "Fully electric vehicle" },
    { value: "newer", label: "Newer Vehicle", blurb: "2018 or newer, petrol/diesel" },
    { value: "standard", label: "Standard", blurb: "Older than 2018" },
];

/**
 * A driver submits their vehicle for inspection here — nothing goes live until
 * an admin reviews the photos, VIN and licence (see /admin/drivers). No
 * self-certification, which is exactly the vetting gap Nigerian riders
 * distrusted about ride-hailing before.
 */
export default function DriveOnboardingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [existing, setExisting] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [make, setMake] = useState("");
    const [model, setModel] = useState("");
    const [year, setYear] = useState("");
    const [plateNumber, setPlateNumber] = useState("");
    const [color, setColor] = useState("");
    const [vin, setVin] = useState("");
    const [vehicleClass, setVehicleClass] = useState<"ev" | "newer" | "standard">("standard");
    const [operatingState, setOperatingState] = useState("");
    const [photos, setPhotos] = useState<string[]>([]);
    const [licensePhotoUrl, setLicensePhotoUrl] = useState("");
    const [uploading, setUploading] = useState<string | null>(null);
    const [scanningPlate, setScanningPlate] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    // Inline "update plate/color" for an already-approved vehicle — a repaint
    // or a plate swap shouldn't require re-submitting the whole vehicle for
    // inspection, since make/model/VIN/photos are unchanged.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPlate, setEditPlate] = useState("");
    const [editColor, setEditColor] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    useEffect(() => {
        if (!user) return;
        fetch("/api/vehicles", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => setExisting(d?.vehicles || []))
            .finally(() => setLoading(false));
    }, [user]);

    const upload = async (file: File, target: "photo" | "license") => {
        setUploading(target);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("folder", "vehicles");
            const res = await fetch("/api/upload", { method: "POST", headers: authHeaders(), body: fd });
            const data = await res.json();
            if (!res.ok || !data?.url) throw new Error(data?.error || "Upload failed");
            if (target === "photo") setPhotos(prev => [...prev, data.url]);
            else setLicensePhotoUrl(data.url);
        } catch (e: any) {
            setError(e.message || "Upload failed. Please try again.");
        } finally {
            setUploading(null);
        }
    };

    const scanPlate = async (file: File) => {
        setScanningPlate(true);
        setScanError(null);
        try {
            const imageBase64: string = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const res = await fetch("/api/vehicles/ocr-plate", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ imageBase64 }),
            });
            const data = await res.json();
            if (!res.ok) { setScanError(data?.error || "Couldn't read the plate — enter it manually."); return; }
            if (data.guess) setPlateNumber(data.guess);
            else setScanError("Couldn't make out the plate clearly — enter it manually.");
        } catch {
            setScanError("Couldn't read the photo — enter the plate manually.");
        } finally {
            setScanningPlate(false);
        }
    };

    const saveVehicleEdit = async (id: string) => {
        setSavingEdit(true);
        try {
            const res = await fetch(`/api/vehicles/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ plateNumber: editPlate, color: editColor }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Could not update vehicle");
            setExisting(prev => prev.map(v => v.id === id ? data.vehicle : v));
            setEditingId(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSavingEdit(false);
        }
    };

    const submit = async () => {
        setError(null);
        if (!make || !model || !plateNumber || !vin || !operatingState) { setError("Fill in make, model, plate number, VIN and where you'll drive."); return; }
        if (photos.length < 2) { setError("Add at least 2 photos of the vehicle."); return; }
        setSubmitting(true);
        try {
            const res = await fetch("/api/vehicles", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ make, model, year, plateNumber, color, vin, vehicleClass, photos, licensePhotoUrl, operatingState }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Could not submit vehicle");
            setSuccess(true);
            setExisting(prev => [data.vehicle, ...prev]);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <div>
                        <p className="font-bold text-gray-900 mb-4">Sign in to register as a driver</p>
                        <Button onClick={() => router.push("/login?redirect=/drive/onboarding")}>Sign In</Button>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const approvedVehicle = existing.find(v => v.status === "approved");

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-brand-green-50 flex items-center justify-center">
                        <Car className="h-6 w-6 text-brand-green-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Drive with FairPrice</h1>
                        <p className="text-sm text-gray-500">Register your vehicle — passes inspection before you can accept rides.</p>
                    </div>
                </div>

                {approvedVehicle && (
                    <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            <div>
                                <p className="font-bold text-emerald-900">You're approved to drive</p>
                                <p className="text-xs text-emerald-700">{approvedVehicle.make} {approvedVehicle.model} · {approvedVehicle.plateNumber}</p>
                            </div>
                        </div>
                        <Button onClick={() => router.push("/drive/dashboard")} className="bg-emerald-600 hover:bg-emerald-700">Go to Dashboard</Button>
                    </div>
                )}

                {existing.length > 0 && (
                    <div className="mb-8 space-y-2">
                        {existing.map(v => (
                            <div key={v.id} className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
                                {editingId === v.id ? (
                                    <div className="flex items-center gap-2">
                                        <Input value={editPlate} onChange={e => setEditPlate(e.target.value.toUpperCase())} placeholder="Plate number" className="h-8 text-xs" />
                                        <Input value={editColor} onChange={e => setEditColor(e.target.value)} placeholder="Color" className="h-8 text-xs" />
                                        <button onClick={() => saveVehicleEdit(v.id)} disabled={savingEdit} className="h-8 w-8 shrink-0 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                            {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="h-8 w-8 shrink-0 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-800">{v.make} {v.model} · {v.plateNumber}{v.color ? ` · ${v.color}` : ""}</span>
                                        <div className="flex items-center gap-3">
                                            {v.status === "pending" && <span className="flex items-center gap-1 text-amber-600 font-bold text-xs"><Clock className="h-3.5 w-3.5" /> Under review</span>}
                                            {v.status === "approved" && <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Approved</span>}
                                            {v.status === "rejected" && <span className="flex items-center gap-1 text-rose-600 font-bold text-xs"><XCircle className="h-3.5 w-3.5" /> {v.rejectionReason || "Not approved"}</span>}
                                            {v.status === "approved" && (
                                                <button
                                                    onClick={() => { setEditingId(v.id); setEditPlate(v.plateNumber); setEditColor(v.color || ""); }}
                                                    className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {success ? (
                    <div className="bg-brand-green-50 border border-brand-green-200 rounded-2xl p-6 text-center">
                        <CheckCircle2 className="h-10 w-10 text-brand-green-600 mx-auto mb-3" />
                        <p className="font-bold text-gray-900">Vehicle submitted for inspection</p>
                        <p className="text-sm text-gray-500 mt-1">We'll notify you once it's reviewed — usually within a day.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="Make (e.g. Toyota)" value={make} onChange={e => setMake(e.target.value)} />
                            <Input placeholder="Model (e.g. Corolla)" value={model} onChange={e => setModel(e.target.value)} />
                            <Input placeholder="Year" type="number" value={year} onChange={e => setYear(e.target.value)} />
                            <div className="relative">
                                <Input placeholder="Plate number" value={plateNumber} onChange={e => setPlateNumber(e.target.value.toUpperCase())} className="pr-10" />
                                <label className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center cursor-pointer">
                                    {scanningPlate ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : <ScanLine className="h-4 w-4 text-gray-500" />}
                                    <input
                                        type="file" accept="image/*" capture="environment" className="hidden"
                                        onChange={e => e.target.files?.[0] && scanPlate(e.target.files[0])}
                                    />
                                </label>
                            </div>
                        </div>
                        {scanError && <p className="text-xs text-amber-600 font-semibold -mt-3">{scanError}</p>}
                        <Input placeholder="Color (e.g. White)" value={color} onChange={e => setColor(e.target.value)} />
                        <Input placeholder="VIN (Vehicle Identification Number)" value={vin} onChange={e => setVin(e.target.value.toUpperCase())} />

                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-2">Vehicle class</label>
                            <div className="grid grid-cols-3 gap-2">
                                {CLASSES.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setVehicleClass(c.value)}
                                        className={cn(
                                            "rounded-xl border-2 p-3 text-left transition-colors",
                                            vehicleClass === c.value ? "border-brand-green-600 bg-brand-green-50" : "border-gray-200"
                                        )}
                                    >
                                        <p className="text-xs font-black text-gray-900">{c.label}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{c.blurb}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-2">Where will you drive?</label>
                            <select
                                value={operatingState}
                                onChange={e => setOperatingState(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-input bg-white text-sm"
                            >
                                <option value="">Select your state</option>
                                {NIGERIAN_STATES.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-2">Vehicle photos (at least 2)</label>
                            <div className="flex flex-wrap gap-3">
                                {photos.map((p, i) => (
                                    <img key={i} src={p} alt="" className="h-20 w-20 rounded-xl object-cover border border-gray-200" />
                                ))}
                                <label className="h-20 w-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-brand-green-400">
                                    {uploading === "photo" ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : <Upload className="h-5 w-5 text-gray-400" />}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0], "photo")} />
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-2">Driver's licence photo (optional but speeds up review)</label>
                            {licensePhotoUrl ? (
                                <img src={licensePhotoUrl} alt="" className="h-20 w-20 rounded-xl object-cover border border-gray-200" />
                            ) : (
                                <label className="h-20 w-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-brand-green-400">
                                    {uploading === "license" ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : <Upload className="h-5 w-5 text-gray-400" />}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0], "license")} />
                                </label>
                            )}
                        </div>

                        {error && <p className="text-sm text-rose-600 font-semibold">{error}</p>}

                        <Button onClick={submit} disabled={submitting} className="w-full h-12 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 font-black">
                            {submitting ? "Submitting..." : "Submit for Inspection"}
                        </Button>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}

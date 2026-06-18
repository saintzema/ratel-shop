"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useState, useRef, useEffect } from "react";
import { User, Mail, Lock, Phone, MapPin, Camera, Loader2, Save, ChevronLeft, LogOut, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNotification } from "@/components/ui/NotificationProvider";
import { LocationModal } from "@/components/modals/LocationModal";
import { useLocation } from "@/context/LocationContext";
import { DataSyncService } from "@/lib/sync-store";
import { CountryCodeSelect } from "@/components/ui/CountryCodeSelect";
import { COUNTRY_CODES } from "@/lib/constants/countries";

export default function ProfilePage() {
    const { user, updateUser, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const { showNotification } = useNotification();
    const { location: globalLocation, setLocation } = useLocation();

    // Parse a stored E.164 digits string (e.g. "2348012345678") into {code:"+234", local:"8012345678"}
    const splitWaNumber = (stored: string): { code: string; local: string } => {
        if (!stored) return { code: "+234", local: "" };
        const digits = stored.replace(/^\+/, "");
        // Try to match the longest country code first
        const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
        for (const c of sorted) {
            const cc = c.code.replace(/^\+/, "");
            if (digits.startsWith(cc)) {
                return { code: c.code, local: digits.substring(cc.length) };
            }
        }
        return { code: "+234", local: digits };
    };

    // Form State — reads whatsappNumber (DB field) with fallback to legacy whatsapp key
    const getWaNumber = (u: any) => u?.whatsappNumber || u?.whatsapp || "";

    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: (user as any)?.phone || "",
        whatsapp: getWaNumber(user),
        address: (user as any)?.address || "",
        password: "",
        location: user?.location || globalLocation || "Lagos, Nigeria"
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || "",
                email: user.email || "",
                phone: (user as any)?.phone || "",
                whatsapp: getWaNumber(user),
                address: (user as any)?.address || "",
                location: user.location || prev.location || globalLocation || "Lagos, Nigeria"
            }));
        }
    }, [user, globalLocation]);

    // WhatsApp country code + local number (split for the picker)
    const [waCountryCode, setWaCountryCode] = useState(() => splitWaNumber(getWaNumber(user)).code);
    const [waLocal, setWaLocal] = useState(() => splitWaNumber(getWaNumber(user)).local);

    // Sync WA fields when user loads from context
    useEffect(() => {
        const { code, local } = splitWaNumber(getWaNumber(user));
        setWaCountryCode(code);
        setWaLocal(local);
    }, [(user as any)?.whatsappNumber]); // eslint-disable-line

    // State to track editing
    const [editingField, setEditingField] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [profilePic, setProfilePic] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('fp_profile_pic');
        if (saved) {
            setProfilePic(saved);
        } else if (user?.avatar_url) {
            setProfilePic(user.avatar_url);
        }
    }, [user?.avatar_url]);

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            setProfilePic(dataUrl);
            localStorage.setItem('fp_profile_pic', dataUrl);
            
            // Persist to AuthContext and DB
            updateUser({ avatar_url: dataUrl });
            
            showNotification({
                title: "Avatar Updated",
                message: "Your profile picture has been saved successfully.",
                type: "success"
            });
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Persist to DB
            const token = typeof window !== 'undefined' ? localStorage.getItem('fp_token') : null;
            await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    id: user?.id,
                    email: formData.email,
                    name: formData.name,
                    location: formData.location,
                    // Combine country code + local into full number; server normalises to E.164
                    whatsappNumber: waLocal.trim()
                        ? `${waCountryCode}${waLocal.replace(/\D/g, '')}`
                        : undefined,
                }),
            });

            // Update local auth context
            const combinedWa = waLocal.trim()
                ? `${waCountryCode.replace(/^\+/, '')}${waLocal.replace(/\D/g, '')}`
                : undefined;
            updateUser({
                name: formData.name,
                email: formData.email,
                location: formData.location,
                ...(combinedWa ? { whatsappNumber: combinedWa } : {}),
            } as any);

            if (formData.location) setLocation(formData.location);

            // Track profile updated
            if (typeof window !== "undefined" && (window as any).pendo) {
                (window as any).pendo.track("profile_updated", {
                    has_whatsapp: !!combinedWa,
                    has_location: !!formData.location,
                });
            }

            setEditingField(null);
            showNotification({
                title: "Profile Updated",
                message: "Your profile details have been saved.",
                type: "success",
            });
        } catch {
            showNotification({ title: "Error", message: "Could not save profile. Please try again.", type: "error" });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChange = () => {
        if (!newPassword || newPassword !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }
        setIsLoading(true);
        updateUser({ password: newPassword } as any);

        // Track password changed
        if (typeof window !== "undefined" && (window as any).pendo) {
            (window as any).pendo.track("password_changed", {});
        }
        
        if (user?.id) {
            DataSyncService.addNotification({
                userId: user.id,
                type: "system",
                title: "Security Alert: Password Changed",
                message: "Your account password was just successfully updated. If you did not make this change, please contact support immediately.",
                link: "/account/profile",
            });
        }

        setTimeout(() => {
            setIsLoading(false);
            setNewPassword("");
            setConfirmPassword("");
            setEditingField(null);
            showNotification({
                title: "Security Updated",
                message: "Password updated successfully!",
                type: "success"
            });
        }, 500);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-black">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.history.back()}
                        className="h-10 w-10 rounded-full hover:bg-gray-100 shrink-0"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-700" />
                    </Button>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">Login & Security</h1>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    {/* Header / Avatar */}
                    <div className="p-6 bg-gradient-to-r from-emerald-900 to-emerald-700 text-white flex items-center gap-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black border-2 border-white/30 text-white overflow-hidden">
                                {profilePic || user?.avatar_url ? (
                                    <img src={profilePic || user?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    formData.name.charAt(0) || "U"
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="h-6 w-6 text-white" />
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleProfilePicChange}
                            />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{formData.name}</h2>
                            <p className="text-emerald-100 text-xs font-medium bg-white/10 px-2.5 py-0.5 rounded-full inline-block backdrop-blur-sm mt-1">
                                {user?.role === 'seller' ? 'Elite Seller' : user?.role === 'admin' ? 'Administrator' : 'Premium Member'}
                            </p>
                        </div>
                    </div>

                    <div className="p-1 px-6 bg-emerald-50 text-[10px] font-bold text-emerald-700 uppercase tracking-tighter flex items-center justify-center gap-1 border-b border-emerald-100">
                        <Camera className="h-3 w-3" /> Tap avatar to change photo
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Name */}
                        <div className="flex gap-4 items-start pb-6 border-b border-gray-100">
                            <div className="mt-1"><User className="h-5 w-5 text-gray-400" /></div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                                {editingField === "name" ? (
                                    <Input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="h-10 border-emerald-500 focus:ring-emerald-500/20"
                                        autoFocus
                                    />
                                ) : (
                                    <p className="text-gray-900 h-10 flex items-center">{formData.name}</p>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                className="mt-6"
                                onClick={() => setEditingField(editingField === "name" ? null : "name")}
                            >
                                {editingField === "name" ? "Cancel" : "Edit"}
                            </Button>
                        </div>

                        {/* Email */}
                        <div className="flex gap-4 items-start pb-6 border-b border-gray-100">
                            <div className="mt-1"><Mail className="h-5 w-5 text-gray-400" /></div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                {editingField === "email" ? (
                                    <Input
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="h-10 border-emerald-500 focus:ring-emerald-500/20"
                                        autoFocus
                                    />
                                ) : (
                                    <p className="text-gray-900 h-10 flex items-center">{formData.email}</p>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                className="mt-6"
                                onClick={() => setEditingField(editingField === "email" ? null : "email")}
                            >
                                {editingField === "email" ? "Cancel" : "Edit"}
                            </Button>
                        </div>

                        {/* Phone */}
                        <div className="flex gap-4 items-start pb-6 border-b border-gray-100">
                            <div className="mt-1"><Phone className="h-5 w-5 text-gray-400" /></div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Mobile Phone Number</label>
                                {editingField === "phone" ? (
                                    <Input
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="h-10 border-emerald-500 focus:ring-emerald-500/20"
                                        autoFocus
                                    />
                                ) : (
                                    <p className="text-gray-900 h-10 flex items-center">{formData.phone || "Not set"}</p>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                className="mt-6"
                                onClick={() => setEditingField(editingField === "phone" ? null : "phone")}
                            >
                                {editingField === "phone" ? "Cancel" : "Edit"}
                            </Button>
                        </div>

                        {/* WhatsApp */}
                        <div className="flex gap-4 items-start pb-6 border-b border-gray-100">
                            <div className="mt-1"><MessageSquare className="h-5 w-5 text-emerald-500" /></div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    WhatsApp Number
                                    {waLocal && (
                                        <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ LINKED</span>
                                    )}
                                </label>
                                {editingField === "whatsapp" ? (
                                    <div className="space-y-1">
                                        <div className="flex gap-2">
                                            <CountryCodeSelect value={waCountryCode} onChange={setWaCountryCode} />
                                            <Input
                                                value={waLocal}
                                                onChange={e => setWaLocal(e.target.value.replace(/\D/g, ''))}
                                                placeholder="8012345678"
                                                className="flex-1 h-12 border-emerald-400 focus:ring-emerald-500/20"
                                                type="tel"
                                                autoFocus
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400">
                                            Select your country flag, then enter digits only — e.g. <strong>8012345678</strong> for +234
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-gray-900 h-10 flex items-center gap-2">
                                        {waLocal ? (
                                            <>
                                                <span className="text-base">{COUNTRY_CODES.find(c => c.code === waCountryCode)?.flag}</span>
                                                <span className="font-semibold">{waCountryCode} {waLocal}</span>
                                            </>
                                        ) : (
                                            <span className="text-gray-400 italic text-sm">Not linked — add to receive order updates &amp; broadcasts via WhatsApp</span>
                                        )}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                className="mt-6 shrink-0"
                                onClick={() => setEditingField(editingField === "whatsapp" ? null : "whatsapp")}
                            >
                                {editingField === "whatsapp" ? "Cancel" : (waLocal ? "Edit" : "Add")}
                            </Button>
                        </div>

                        {/* Password */}
                        <div className="flex gap-4 items-start pb-6 border-b border-gray-100">
                            <div className="mt-1"><Lock className="h-5 w-5 text-gray-400" /></div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                                {editingField === "password" ? (
                                    <div className="space-y-3 pt-2">
                                        <Input
                                            type="password"
                                            placeholder="New Password"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="h-10 border-emerald-500"
                                        />
                                        <Input
                                            type="password"
                                            placeholder="Confirm New Password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="h-10 border-emerald-500"
                                        />
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                                            onClick={handlePasswordChange}
                                            disabled={isLoading}
                                        >
                                            Update Password
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-gray-900 h-10 flex items-center">••••••••••••</p>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                className="mt-6"
                                onClick={() => setEditingField(editingField === "password" ? null : "password")}
                            >
                                {editingField === "password" ? "Cancel" : "Edit"}
                            </Button>
                        </div>

                        {/* Location */}
                        <div className="flex gap-4 items-start pb-6">
                            <div className="mt-1"><MapPin className="h-5 w-5 text-gray-400" /></div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Primary Location</label>
                                <p className="text-gray-900 h-10 flex items-center">{formData.location}</p>
                            </div>
                            <Button
                                variant="outline"
                                className="mt-6"
                                onClick={() => setIsLocationModalOpen(true)}
                            >
                                Edit
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between gap-3 items-center">
                        <Button
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                                logout();
                                window.location.href = '/';
                            }}
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                        </Button>
                        {editingField && editingField !== "password" && (
                            <Button
                                className="bg-emerald-600 text-white font-bold hover:bg-emerald-700 min-w-[120px]"
                                onClick={handleSave}
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Changes
                            </Button>
                        )}
                    </div>
                </div>
            </main>

            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                currentLocation={formData.location}
                onSelectLocation={(loc) => {
                    setFormData(prev => ({ ...prev, location: loc }));
                    // Auto-save location immediately
                    updateUser({ ...user, location: loc } as any);
                    setLocation(loc);
                    showNotification({
                        title: "Location Updated",
                        message: `Your primary location is now set to ${loc}.`,
                        type: "success"
                    });
                }}
            />

            <Footer />
        </div>
    );
}

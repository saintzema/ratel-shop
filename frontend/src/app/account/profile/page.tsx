"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useState, useRef, useEffect } from "react";
import { User, Mail, Lock, Phone, MapPin, Camera, Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: (user as any)?.phone || "",
        address: (user as any)?.address || "",
        password: "",
        location: user?.location || "Lagos, Nigeria"
    });

    // State to track editing
    const [editingField, setEditingField] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [profilePic, setProfilePic] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('fp_profile_pic');
        if (saved) setProfilePic(saved);
    }, []);

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            setProfilePic(dataUrl);
            localStorage.setItem('fp_profile_pic', dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        setIsLoading(true);
        // Simulate API call and update context
        setTimeout(() => {
            updateUser({
                name: formData.name,
                email: formData.email,
                location: formData.location,
                phone: formData.phone,
                address: formData.address
            } as any);
            setIsLoading(false);
            setEditingField(null);
        }, 1000);
    };

    const handlePasswordChange = () => {
        if (!newPassword || newPassword !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            // In a real app, we'd call an API. Here we just mock success.
            setIsLoading(false);
            setNewPassword("");
            setConfirmPassword("");
            setEditingField(null);
            alert("Password updated successfully!");
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-black">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">Login & Security</h1>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    {/* Header / Avatar */}
                    <div className="p-6 bg-gradient-to-r from-emerald-900 to-emerald-700 text-white flex items-center gap-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black border-2 border-white/30 text-white overflow-hidden">
                                {profilePic ? (
                                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    formData.name.charAt(0)
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
                            <p className="text-emerald-200 text-sm">Personal Member</p>
                        </div>
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
                                {editingField === "location" ? (
                                    <Input
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="h-10 border-emerald-500 focus:ring-emerald-500/20"
                                        autoFocus
                                    />
                                ) : (
                                    <p className="text-gray-900 h-10 flex items-center">{formData.location}</p>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                className="mt-6"
                                onClick={() => setEditingField(editingField === "location" ? null : "location")}
                            >
                                {editingField === "location" ? "Cancel" : "Edit"}
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
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

            <Footer />
        </div>
    );
}

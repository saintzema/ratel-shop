"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MapPin, Plus, Trash2, Edit2, Check, Home, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface Address {
    id: string;
    label: string;
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    isDefault: boolean;
    type: "home" | "work" | "other";
}

const STORAGE_KEY = "ratel_saved_addresses";

export default function AddressesPage() {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", street: "", city: "", state: "", type: "home" as "home" | "work" | "other" });

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setAddresses(JSON.parse(saved));
    }, []);

    const save = (updated: Address[]) => {
        setAddresses(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const handleAdd = () => {
        if (!form.firstName || !form.phone || !form.street || !form.state) return;
        const newAddr: Address = {
            ...form, id: `addr_${Date.now()}`, label: form.type === "home" ? "Home" : form.type === "work" ? "Work" : "Other",
            isDefault: addresses.length === 0
        };
        save([...addresses, newAddr]);
        setForm({ firstName: "", lastName: "", phone: "", street: "", city: "", state: "", type: "home" });
        setIsAdding(false);
    };

    const handleDelete = (id: string) => {
        const updated = addresses.filter(a => a.id !== id);
        if (updated.length > 0 && !updated.some(a => a.isDefault)) updated[0].isDefault = true;
        save(updated);
    };

    const setDefault = (id: string) => save(addresses.map(a => ({ ...a, isDefault: a.id === id })));

    const STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl"><MapPin className="h-5 w-5 text-emerald-600" /></div>
                        <h1 className="text-2xl font-bold text-gray-900">Your Addresses</h1>
                    </div>
                    <Button onClick={() => setIsAdding(!isAdding)} className="bg-black text-white rounded-xl font-semibold">
                        <Plus className="h-4 w-4 mr-1" /> Add Address
                    </Button>
                </div>

                {isAdding && (
                    <div className="mb-6 p-5 border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50/50 space-y-3">
                        <h3 className="font-bold text-gray-900">New Address</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="First Name *" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                            <Input placeholder="Last Name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                        </div>
                        <Input placeholder="Phone Number *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        <Input placeholder="Street Address *" value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="City / Area" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                            <select className="h-10 rounded-lg border border-gray-300 px-3 text-sm" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
                                <option value="">Select State *</option>
                                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            {(["home", "work", "other"] as const).map(t => (
                                <button key={t} onClick={() => setForm({ ...form, type: t })} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${form.type === t ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-300 hover:border-emerald-400"}`}>
                                    {t === "home" ? "🏠 Home" : t === "work" ? "💼 Work" : "📍 Other"}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleAdd} className="bg-emerald-600 text-white rounded-xl font-bold">Save Address</Button>
                            <Button onClick={() => setIsAdding(false)} variant="outline" className="rounded-xl">Cancel</Button>
                        </div>
                    </div>
                )}

                {addresses.length === 0 && !isAdding ? (
                    <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-bold text-gray-700 mb-1">No saved addresses</h3>
                        <p className="text-sm text-gray-500 mb-4">Add an address for faster checkout.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {addresses.map(addr => (
                            <div key={addr.id} className={`p-4 rounded-2xl border-2 transition-all ${addr.isDefault ? "border-emerald-500 bg-emerald-50/30" : "border-gray-200 hover:border-gray-300"}`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {addr.type === "home" ? <Home className="h-4 w-4 text-emerald-600" /> : <Briefcase className="h-4 w-4 text-blue-600" />}
                                            <span className="font-bold text-gray-900">{addr.firstName} {addr.lastName}</span>
                                            {addr.isDefault && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">DEFAULT</span>}
                                        </div>
                                        <p className="text-sm text-gray-600">{addr.street}</p>
                                        <p className="text-sm text-gray-600">{addr.city}, {addr.state}</p>
                                        <p className="text-sm text-gray-500">{addr.phone}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        {!addr.isDefault && (
                                            <button onClick={() => setDefault(addr.id)} className="text-xs text-emerald-600 hover:underline px-2 py-1">Set Default</button>
                                        )}
                                        <button onClick={() => handleDelete(addr.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}

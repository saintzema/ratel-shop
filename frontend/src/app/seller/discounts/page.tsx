"use client";

import { useState } from "react";
import {
    Tag,
    Plus,
    Link as LinkIcon,
    Percent,
    Banknote,
    Clock,
    MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash, BarChart, X, CheckCircle2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Mock Discount Data
const MOCK_DISCOUNTS = [
    {
        id: "d_1",
        code: "WELCOME20",
        type: "Percentage",
        value: "20%",
        status: "Active",
        usage: "45 / Unlimited",
        expires: "Never"
    },
    {
        id: "d_2",
        code: "FLASHSALE5K",
        type: "Fixed Amount",
        value: "₦5,000",
        status: "Active",
        usage: "12 / 50",
        expires: "Ends in 2 days"
    },
    {
        id: "d_3",
        code: "FREESHIPLAGOS",
        type: "Free Shipping",
        value: "Free",
        status: "Scheduled",
        usage: "0 / 100",
        expires: "Starts Oct 1"
    },
    {
        id: "d_4",
        code: "SUMMERCLEARANCE",
        type: "Percentage",
        value: "50%",
        status: "Expired",
        usage: "210 / 210",
        expires: "Ended Aug 31"
    }
];

export default function DiscountsPage() {
    const [discounts, setDiscounts] = useState(MOCK_DISCOUNTS);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newDiscount, setNewDiscount] = useState({
        code: "",
        type: "Percentage",
        value: "",
        usageLimit: "Unlimited",
        expiry: "Never"
    });
    const [copySuccess, setCopySuccess] = useState<string | null>(null);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopySuccess(code);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    const handleCreate = () => {
        if (!newDiscount.code || !newDiscount.value) return;

        const discount = {
            id: `d_${Date.now()}`,
            ...newDiscount,
            status: "Active",
            usage: `0 / ${newDiscount.usageLimit}`,
            expires: newDiscount.expiry === "Never" ? "Never" : `Expires ${newDiscount.expiry}`
        };

        setDiscounts([discount, ...discounts]);
        setIsCreateOpen(false);
        setNewDiscount({
            code: "",
            type: "Percentage",
            value: "",
            usageLimit: "Unlimited",
            expiry: "Never"
        });
    };

    const handleDelete = (id: string) => {
        setDiscounts(discounts.filter(d => d.id !== id));
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Discounts & Coupons</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Create promotional codes to boost your store's sales and reward loyal customers.</p>
                </div>
                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-wide h-12 px-6 shadow-lg shadow-indigo-600/20"
                >
                    <Plus className="h-4 w-4 mr-2" /> Create Discount
                </Button>
            </div>

            {/* Quick Create Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                        <Percent className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Percentage Discount</h3>
                    <p className="text-xs text-gray-500 font-medium">E.g. 20% off all Electronics</p>
                </div>
                <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                        <Banknote className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Fixed Amount Discount</h3>
                    <p className="text-xs text-gray-500 font-medium">E.g. ₦5,000 off orders over ₦50k</p>
                </div>
                <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <Tag className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Buy X, Get Y</h3>
                    <p className="text-xs text-gray-500 font-medium">Buy 2 items, get 1 free</p>
                </div>
            </div>

            {/* Discounts Table */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="font-bold text-gray-900">Active Promos & Codes</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" className="text-xs font-bold text-gray-500 hover:text-gray-900">All</Button>
                        <Button variant="outline" className="text-xs font-bold bg-white h-8 rounded-lg border-gray-200">Active</Button>
                        <Button variant="ghost" className="text-xs font-bold text-gray-500 hover:text-gray-900">Scheduled</Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white border-b border-gray-100 text-left">
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Discount Code</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Type & Value</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Usage</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {discounts.map((discount) => (
                                <tr key={discount.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-gray-900 tracking-wider text-sm bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">{discount.code}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-indigo-600" onClick={() => handleCopy(discount.code)}>
                                                {copySuccess === discount.code ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <LinkIcon className="h-3.5 w-3.5" />}
                                            </Button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {discount.status === 'Active' && <span className="flex w-fit items-center gap-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active</span>}
                                        {discount.status === 'Scheduled' && <span className="flex w-fit items-center gap-1.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md"><Clock className="h-3 w-3" /> Scheduled</span>}
                                        {discount.status === 'Expired' && <span className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">Expired</span>}
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="font-bold text-gray-900">{discount.value}</p>
                                        <p className="text-xs text-gray-500 font-medium">{discount.type}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="font-bold text-gray-700">{discount.usage}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{discount.expires}</p>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                                                    <MoreHorizontal className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-100 shadow-xl rounded-xl p-2">
                                                <DropdownMenuItem onClick={() => handleDelete(discount.id)} className="flex items-center gap-2 cursor-pointer rounded-lg hover:bg-red-50 p-2 font-medium text-sm text-red-600 focus:text-red-600 focus:bg-red-50">
                                                    <Trash className="h-4 w-4" /> Delete Discount
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Discount Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-8 pb-4 bg-gray-50/50">
                        <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">Create New Discount</DialogTitle>
                        <DialogDescription className="font-medium text-gray-500">Configure your promotional code and rules.</DialogDescription>
                    </DialogHeader>

                    <div className="p-8 pt-4 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Discount Code</Label>
                            <Input
                                placeholder="e.g. SUMMER50"
                                className="h-12 rounded-xl border-gray-100 font-black tracking-widest uppercase placeholder:font-normal placeholder:tracking-normal bg-gray-50/50 focus:bg-white transition-all"
                                value={newDiscount.code}
                                onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Type</Label>
                                <select
                                    className="w-full h-12 bg-gray-50/50 border border-gray-100 rounded-xl px-4 text-sm font-bold focus:bg-white outline-none transition-all"
                                    value={newDiscount.type}
                                    onChange={(e) => setNewDiscount({ ...newDiscount, type: e.target.value })}
                                >
                                    <option value="Percentage">Percentage (%)</option>
                                    <option value="Fixed Amount">Fixed Amount (₦)</option>
                                    <option value="Free Shipping">Free Shipping</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Value</Label>
                                <Input
                                    placeholder={newDiscount.type === "Percentage" ? "20" : "5000"}
                                    className="h-12 rounded-xl border-gray-100 font-bold bg-gray-50/50 focus:bg-white transition-all"
                                    value={newDiscount.value}
                                    onChange={(e) => setNewDiscount({ ...newDiscount, value: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Usage Limit</Label>
                                <Input
                                    placeholder="Unlimited"
                                    className="h-12 rounded-xl border-gray-100 font-bold bg-gray-50/50 focus:bg-white transition-all"
                                    value={newDiscount.usageLimit}
                                    onChange={(e) => setNewDiscount({ ...newDiscount, usageLimit: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Expiry Date</Label>
                                <Input
                                    type="date"
                                    className="h-12 rounded-xl border-gray-100 font-bold bg-gray-50/50 focus:bg-white transition-all p-3"
                                    onChange={(e) => setNewDiscount({ ...newDiscount, expiry: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 pt-0 flex gap-3">
                        <Button
                            variant="ghost"
                            className="flex-1 h-12 rounded-xl font-bold text-gray-500"
                            onClick={() => setIsCreateOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-600/20"
                            onClick={handleCreate}
                        >
                            Create Code
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

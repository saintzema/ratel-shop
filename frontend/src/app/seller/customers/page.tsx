"use client";

import { useState } from "react";
import {
    Users,
    Search,
    Filter,
    Mail,
    Phone,
    MapPin,
    ArrowUpRight,
    Star,
    MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Mock CRM Data
const MOCK_CUSTOMERS = [
    {
        id: "cus_1",
        name: "Abiola Ojo",
        email: "abiola.o@example.com",
        phone: "+234 801 234 5678",
        location: "Lagos, Nigeria",
        totalSpend: "₦450,000",
        orders: 12,
        source: "Instagram",
        status: "VIP",
        lastActive: "2 hours ago"
    },
    {
        id: "cus_2",
        name: "Sarah Ibrahim",
        email: "sarah.ibr@example.com",
        phone: "+234 705 987 6543",
        location: "Abuja, Nigeria",
        totalSpend: "₦125,500",
        orders: 3,
        source: "Direct Traffic",
        status: "Active",
        lastActive: "1 day ago"
    },
    {
        id: "cus_3",
        name: "Chukwudi Nze",
        email: "chuks.n@example.com",
        phone: "+234 812 345 6789",
        location: "Port Harcourt, Nigeria",
        totalSpend: "₦85,000",
        orders: 2,
        source: "Organic Search",
        status: "New",
        lastActive: "3 days ago"
    },
    {
        id: "cus_4",
        name: "Grace Etim",
        email: "grace.e@example.com",
        phone: "+234 903 456 7890",
        location: "Calabar, Nigeria",
        totalSpend: "₦0",
        orders: 0,
        source: "Facebook Ads",
        status: "Lead",
        lastActive: "5 mins ago"
    },
    {
        id: "cus_5",
        name: "David Adeleke",
        email: "davido@example.com",
        phone: "+234 802 111 2222",
        location: "Lagos, Nigeria",
        totalSpend: "₦1,250,000",
        orders: 45,
        source: "Referral",
        status: "VIP",
        lastActive: "Just now"
    }
];

export default function CustomersCRMPage() {
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Customer Directory</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Manage relationships, view purchase history, and track customer sources.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-xl border-gray-200">
                        Export CSV
                    </Button>
                    <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-wide shadow-indigo-600/20 shadow-lg">
                        <Users className="h-4 w-4 mr-2" /> Add Customer
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Contacts</p>
                        <p className="text-2xl font-black text-gray-900">1,248</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Star className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">VIP Customers</p>
                        <p className="text-2xl font-black text-gray-900">42</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                        <ArrowUpRight className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Avg. Lifetime Value</p>
                        <p className="text-2xl font-black text-gray-900">₦84,500</p>
                    </div>
                </div>
            </div>

            {/* Customer List */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, email, or phone..."
                            className="pl-10 h-12 bg-white border-gray-200 rounded-xl focus-visible:ring-indigo-600 focus-visible:border-indigo-600 w-full"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-12 rounded-xl bg-white text-gray-600 font-bold">
                            <Filter className="h-4 w-4 mr-2" /> Filter
                        </Button>
                    </div>
                </div>

                {/* Table View */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white border-b border-gray-100 text-left">
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Orders & Spend</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Acquisition Source</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {MOCK_CUSTOMERS.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase())).map((customer) => (
                                <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold uppercase shrink-0">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-gray-900">{customer.name}</p>
                                                    {customer.status === 'VIP' && (
                                                        <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">VIP</span>
                                                    )}
                                                    {customer.status === 'New' && (
                                                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">New</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <MapPin className="h-3 w-3" /> {customer.location}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-600 flex items-center gap-2">
                                                <Mail className="h-3.5 w-3.5 text-gray-400" /> {customer.email}
                                            </p>
                                            <p className="text-sm text-gray-600 flex items-center gap-2">
                                                <Phone className="h-3.5 w-3.5 text-gray-400" /> {customer.phone}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="font-black text-gray-900">{customer.totalSpend}</p>
                                        <p className="text-xs text-gray-500 font-medium">{customer.orders} {customer.orders === 1 ? 'order' : 'orders'} total</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
                                            {customer.source}
                                        </span>
                                        <p className="text-[11px] text-gray-400 mt-1">Active {customer.lastActive}</p>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

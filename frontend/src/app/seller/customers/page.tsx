"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Users,
    Search,
    Filter,
    ArrowUpRight,
    Star,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { BroadcastModal } from "@/components/modals/BroadcastModal";
import { Checkbox } from "@/components/ui/checkbox";

export default function CustomersCRMPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterBy, setFilterBy] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;

        // Aggregate orders by customer to create the CRM list
        const allOrders = DemoStore.getOrders().filter(o => o.seller_id === sellerId);
        const cusMap = new Map<string, any>();

        allOrders.forEach(order => {
            const cid = order.customer_id;
            if (!cusMap.has(cid)) {
                cusMap.set(cid, {
                    id: cid,
                    name: order.customer_name || "Unknown Customer",
                    email: "Not Provided", // email is not stored on the Order object
                    location: typeof order.shipping_address === 'string' ? order.shipping_address.split(',')[0] : "Unknown Location",
                    totalSpend: 0,
                    orders: 0,
                    source: "FairPrice Store",
                    lastActive: new Date(order.created_at),
                    status: "Active"
                });
            }
            const c = cusMap.get(cid);
            c.totalSpend += order.amount;
            c.orders += 1;
            const orderDate = new Date(order.created_at);
            if (orderDate > c.lastActive) c.lastActive = orderDate;
        });

        // Determine VIP Status
        const cList = Array.from(cusMap.values()).map(c => ({
            ...c,
            status: c.totalSpend > 500000 ? "VIP" : c.orders === 1 ? "New" : "Active"
        }));

        setCustomers(cList.sort((a, b) => b.totalSpend - a.totalSpend));
    }, [user]);

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            if (filterBy === "vip" && c.status !== "VIP") return false;
            if (filterBy === "new" && c.status !== "New") return false;
            return true;
        });
    }, [customers, searchTerm, filterBy]);

    const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1;
    const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const totalSpendAll = customers.reduce((sum, c) => sum + c.totalSpend, 0);
    const avgLTV = customers.length > 0 ? totalSpendAll / customers.length : 0;
    const vipCount = customers.filter(c => c.status === "VIP").length;

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedCustomers(new Set(paginatedCustomers.map(c => c.id)));
        } else {
            setSelectedCustomers(new Set());
        }
    };

    const handleSelectCustomer = (id: string, checked: boolean) => {
        const next = new Set(selectedCustomers);
        if (checked) next.add(id);
        else next.delete(id);
        setSelectedCustomers(next);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Customer Directory</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Manage relationships, view purchase history, and message buyers.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-xl border-gray-200">
                        Export CSV
                    </Button>
                    <Button
                        onClick={() => setIsBroadcastModalOpen(true)}
                        disabled={selectedCustomers.size === 0}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold gap-2"
                    >
                        <MessageSquare className="h-4 w-4" />
                        Broadcast Message {selectedCustomers.size > 0 && `(${selectedCustomers.size})`}
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
                        <p className="text-2xl font-black text-gray-900">{customers.length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Star className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">VIP Customers</p>
                        <p className="text-2xl font-black text-gray-900">{vipCount}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                        <ArrowUpRight className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Avg. Lifetime Value</p>
                        <p className="text-2xl font-black text-gray-900">{formatPrice(avgLTV)}</p>
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
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            placeholder="Search by name or email..."
                            className="pl-10 h-10 bg-white border-gray-200 rounded-xl focus-visible:ring-indigo-600 focus-visible:border-indigo-600 w-full"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={filterBy}
                            onChange={(e) => { setFilterBy(e.target.value); setCurrentPage(1); }}
                            className="h-10 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 px-3 outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                            <option value="all">All Customers</option>
                            <option value="vip">VIP Only</option>
                            <option value="new">New Customers</option>
                        </select>
                    </div>
                </div>

                {/* Table View */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white border-b border-gray-100 text-left">
                                <th className="px-6 py-4 w-12">
                                    <Checkbox
                                        checked={paginatedCustomers.length > 0 && selectedCustomers.size === paginatedCustomers.length}
                                        onCheckedChange={handleSelectAll}
                                        className="border-gray-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                    />
                                </th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Customer Details</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Orders & Spend</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status / Last Active</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">
                                        No customers found. Try adjusting your filters.
                                    </td>
                                </tr>
                            ) : paginatedCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <Checkbox
                                            checked={selectedCustomers.has(customer.id)}
                                            onCheckedChange={(checked) => handleSelectCustomer(customer.id, !!checked)}
                                            className="border-gray-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
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
                                    <td className="px-6 py-4">
                                        <p className="font-black text-gray-900">{formatPrice(customer.totalSpend)}</p>
                                        <p className="text-xs text-gray-500 font-medium">{customer.orders} {customer.orders === 1 ? 'order' : 'orders'} total</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
                                            {customer.source}
                                        </span>
                                        <p className="text-[11px] text-gray-400 mt-1">{customer.lastActive.toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/seller/dashboard/messages?customer=${customer.id}`}>
                                            <Button variant="outline" size="sm" className="rounded-xl border-gray-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 shadow-sm font-bold gap-1.5 h-9">
                                                <MessageSquare className="h-3.5 w-3.5" /> Message
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white px-6">
                        <p className="text-sm font-medium text-gray-500">
                            Showing <span className="font-bold text-gray-900">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)}</span> of <span className="font-bold text-gray-900">{filteredCustomers.length}</span>
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <BroadcastModal
                open={isBroadcastModalOpen}
                onOpenChange={setIsBroadcastModalOpen}
                selectedCustomerIds={Array.from(selectedCustomers)}
                onSuccess={() => setSelectedCustomers(new Set())}
            />
        </div>
    );
}

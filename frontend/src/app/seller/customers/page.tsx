"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Users,
    Search,
    Filter,
    ArrowUpRight,
    Star,
    MessageSquare,
    ChevronRight,
    MapPin,
    Package,
    Calendar,
    CreditCard,
    ExternalLink,
    X,
    FileText,
    Save,
    ShoppingBag,
    Tag,
    Plus,
    XCircle,
    ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataSyncService } from "@/lib/sync-store";
import { formatPrice, cn } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { BroadcastModal } from "@/components/modals/BroadcastModal";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Customer {
    id: string;
    name: string;
    email: string;
    location: string;
    totalSpend: number;
    orders: number;
    source: string;
    lastActive: Date;
    status: "VIP" | "New" | "Active";
    tags: string[];
}

export default function CustomersCRMPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterBy, setFilterBy] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerNotes, setCustomerNotes] = useState("");
    const [customerTags, setCustomerTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        const sellerId = DataSyncService.getCurrentSellerId();
        if (!sellerId) return;

        // Aggregate orders by customer to create the CRM list
        const allOrders = DataSyncService.getOrders().filter(o => o.seller_id === sellerId);
        const cusMap = new Map<string, Omit<Customer, 'tags'>>();

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
            if (!c) return;

            c.totalSpend += order.amount;
            c.orders += 1;
            const orderDate = new Date(order.created_at);
            if (orderDate > c.lastActive) c.lastActive = orderDate;
        });

        // Determine VIP Status and attach Tags
        const cList = Array.from(cusMap.values()).map(c => ({
            ...c,
            status: (c.totalSpend > 500000 ? "VIP" : c.orders === 1 ? "New" : "Active") as "VIP" | "New" | "Active",
            tags: DataSyncService.getCustomerTags(c.id)
        }));

        setCustomers(cList.sort((a, b) => b.totalSpend - a.totalSpend));
    }, [user]);

    useEffect(() => {
        if (selectedCustomer) {
            setCustomerNotes(DataSyncService.getCustomerNotes(selectedCustomer.id));
            setCustomerTags(DataSyncService.getCustomerTags(selectedCustomer.id));
        } else {
            setCustomerNotes("");
            setCustomerTags([]);
        }
    }, [selectedCustomer]);

    const handleSaveNotes = () => {
        if (!selectedCustomer) return;
        DataSyncService.saveCustomerNotes(selectedCustomer.id, customerNotes);
    };

    const handleAddTag = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedCustomer || !newTag.trim()) return;
        const tag = newTag.trim().toLowerCase();
        if (!customerTags.includes(tag)) {
            const updated = [...customerTags, tag];
            setCustomerTags(updated);
            DataSyncService.saveCustomerTags(selectedCustomer.id, updated);
            // Update local customer list state to reflect tag change immediately
            setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, tags: updated } : c));
        }
        setNewTag("");
    };

    const handleRemoveTag = (tagToRemove: string) => {
        if (!selectedCustomer) return;
        const updated = customerTags.filter(t => t !== tagToRemove);
        setCustomerTags(updated);
        DataSyncService.saveCustomerTags(selectedCustomer.id, updated);
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, tags: updated } : c));
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            
            if (filterBy === "vip") return c.status === "VIP";
            if (filterBy === "new") return c.status === "New";
            if (filterBy.startsWith("tag:")) {
                const targetTag = filterBy.replace("tag:", "");
                return c.tags?.includes(targetTag);
            }
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
                            <option value="all">All Statuses</option>
                            <option value="vip">VIP Status</option>
                            <option value="new">New Customers</option>
                        </select>

                        {/* Tag Filter */}
                        <select
                            onChange={(e) => { 
                                const tag = e.target.value;
                                if (tag === "all") setFilterBy("all");
                                else setFilterBy(`tag:${tag}`);
                                setCurrentPage(1);
                            }}
                            className="h-10 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 px-3 outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                            <option value="all">All Tags</option>
                            {DataSyncService.getAllSellerTags().map(tag => (
                                <option key={tag} value={tag}>#{tag}</option>
                            ))}
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
                            ) : paginatedCustomers.map((customer) => {
                                if (!customer) return null;
                                return (
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
                                                {customer?.name?.charAt(0) || "C"}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-gray-900">{customer?.name}</p>
                                                    {customer?.status === 'VIP' && (
                                                        <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">VIP</span>
                                                    )}
                                                    {customer?.status === 'New' && (
                                                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">New</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <MapPin className="h-3 w-3" /> {customer?.location}
                                                </p>
                                                {/* Inline Tags */}
                                                {customer?.tags && customer.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {customer.tags.map((tag: string) => (
                                                            <span key={tag} className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-black text-gray-900">{formatPrice(customer?.totalSpend || 0)}</p>
                                        <p className="text-xs text-gray-500 font-medium">{customer?.orders || 0} {(customer?.orders || 0) === 1 ? 'order' : 'orders'} total</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
                                            {customer?.source}
                                        </span>
                                        <p className="text-[11px] text-gray-400 mt-1">{customer?.lastActive?.toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setSelectedCustomer(customer)}
                                                className="rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 font-bold h-9 px-3"
                                            >
                                                View Details
                                            </Button>
                                            <Link href={`/seller/dashboard/messages?customer=${customer?.id}`}>
                                                <Button variant="outline" size="sm" className="rounded-xl border-gray-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 shadow-sm font-bold gap-1.5 h-9">
                                                    <MessageSquare className="h-3.5 w-3.5" /> Message
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )})}
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

            {/* Customer Detail Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-100">
                                    {selectedCustomer.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 leading-tight">{selectedCustomer.name}</h2>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">ID: {selectedCustomer.id}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedCustomer(null)}
                                className="h-10 w-10 rounded-full hover:bg-gray-200/50 flex items-center justify-center text-gray-400 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Spent</p>
                                    <p className="text-lg font-black text-gray-900">{formatPrice(selectedCustomer.totalSpend)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Orders</p>
                                    <p className="text-lg font-black text-gray-900">{selectedCustomer.orders}</p>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                    <span className={cn(
                                        "text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                        selectedCustomer.status === 'VIP' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                    )}>
                                        {selectedCustomer.status}
                                    </span>
                                </div>
                            </div>

                            {/* Masked Contact Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-indigo-500" />
                                    Account Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
                                        <p className="text-sm font-medium text-gray-600">
                                            {selectedCustomer.email === "Not Provided" ? "n/a" : selectedCustomer.email.replace(/(.{2})(.*)(?=@)/, (gp1: string, gp2: string, gp3: string) => gp2 + "*".repeat(gp3.length))}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Known Location</p>
                                        <p className="text-sm font-medium text-gray-600">{selectedCustomer.location}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Segmentation & Tags */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-indigo-500" />
                                    Segmentation Tags
                                </h3>
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {customerTags.length === 0 ? (
                                            <p className="text-xs text-gray-400 font-medium italic">No tags assigned. Categorize this customer to group them in marketing campaigns.</p>
                                        ) : (
                                            customerTags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-3 py-1 rounded-full text-xs font-bold gap-1.5 group">
                                                    #{tag}
                                                    <button onClick={() => handleRemoveTag(tag)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <XCircle className="h-3.5 w-3.5" />
                                                    </button>
                                                </Badge>
                                            ))
                                        )}
                                    </div>
                                    <form onSubmit={handleAddTag} className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                            <Input 
                                                value={newTag}
                                                onChange={(e) => setNewTag(e.target.value)}
                                                placeholder="Add tag (e.g. 'Whale', 'Repeat', 'Nigeria')..."
                                                className="pl-9 h-10 bg-white border-gray-200 rounded-xl text-sm"
                                            />
                                        </div>
                                        <Button type="submit" size="sm" className="h-10 px-4 rounded-xl bg-gray-900 text-white font-bold gap-2">
                                            <Plus className="h-4 w-4" /> Add
                                        </Button>
                                    </form>
                                    <div className="mt-3 flex gap-2">
                                        {['high-value', 'repeat-buyer', 'follow-up', 'promo-eligible'].filter(t => !customerTags.includes(t)).map(suggested => (
                                            <button
                                                key={suggested}
                                                onClick={() => { setNewTag(suggested); handleAddTag(); }}
                                                className="text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest bg-white border border-gray-100 px-2 py-1 rounded-md transition-colors"
                                            >
                                                + {suggested}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Internal Notes */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-amber-500" />
                                        Internal Seller Notes
                                    </h3>
                                    <Button 
                                        size="sm" 
                                        onClick={handleSaveNotes}
                                        className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest gap-1.5 shadow-sm"
                                    >
                                        <Save className="h-3 w-3" />
                                        Save Notes
                                    </Button>
                                </div>
                                <div className="relative group">
                                    <textarea
                                        value={customerNotes}
                                        onChange={(e) => setCustomerNotes(e.target.value)}
                                        placeholder="Add private notes about this customer (e.g. 'Prefers morning delivery', 'Regular whale buyer')..."
                                        className="w-full h-24 bg-amber-50/30 border border-amber-100 rounded-2xl p-4 text-sm text-gray-700 placeholder:text-amber-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-200 transition-all resize-none font-medium italic"
                                    />
                                    <div className="absolute top-3 right-3 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest bg-white px-2 py-1 rounded-md shadow-sm border border-amber-100">Private Note</span>
                                    </div>
                                </div>
                            </div>

                            {/* Order History */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                    <Package className="h-4 w-4 text-emerald-500" />
                                    Order History
                                </h3>
                                <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
                                    {DataSyncService.getOrders()
                                        .filter(o => o.customer_id === selectedCustomer.id && o.seller_id === DataSyncService.getCurrentSellerId())
                                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                        .map(order => (
                                            <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                                        <ShoppingBag className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">Order #{order.id.split('-')[1] || order.id.substring(0, 8)}</p>
                                                        <p className="text-[11px] text-gray-400 font-medium">
                                                            {new Date(order.created_at).toLocaleDateString()} • {order.status}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-gray-900">{formatPrice(order.amount)}</p>
                                                    <Link href={`/seller/orders`}>
                                                        <span className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer">Manage</span>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                            <Button 
                                variant="outline" 
                                onClick={() => setSelectedCustomer(null)}
                                className="rounded-xl border-gray-200 font-bold px-6"
                            >
                                Close
                            </Button>
                            <Link href={`/seller/dashboard/messages?customer=${selectedCustomer.id}`}>
                                <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 shadow-lg shadow-indigo-100">
                                    Message Customer
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

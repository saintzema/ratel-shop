import { motion, AnimatePresence } from "framer-motion";
import { X, Banknote, ShieldCheck, ChevronRight, Calculator, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { Product } from "@/lib/types";
import { calculateProductMonthlyPayment, getVehicleDepositPercent } from "@/lib/financing-utils";

interface FinancingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

export function FinancingDetailsModal({ isOpen, onClose, product }: FinancingDetailsModalProps) {
    if (!product) return null;

    const basePrice = product.price;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 md:p-6"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden relative border border-emerald-100 flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white flex items-start justify-between shrink-0 pt-8">
                                <div className="flex gap-4 items-center">
                                    <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                        <Banknote className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-emerald-900">Buy Now, Pay Later Plan</h2>
                                        <p className="text-sm text-gray-500 font-medium">Financing estimate for {product.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors text-gray-500 shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="px-6 pt-8 pb-10 overflow-y-auto w-full">
                                {/* Section 1: Outright Payment */}
                                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 mb-8 text-center relative overflow-hidden group hover:bg-emerald-50 transition-colors">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20" />
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Option 1</p>
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1 italic">Outright Payment</h3>
                                    <p className="text-3xl font-black text-gray-900 tracking-tight">{formatPrice(basePrice)}</p>
                                    
                                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200/50">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Full Ownership Guaranteed
                                    </div>
                                </div>

                                {/* Divider: OR */}
                                <div className="relative flex items-center justify-center my-10">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-dashed border-gray-200"></div>
                                    </div>
                                    <div className="relative bg-white px-6">
                                        <div className="h-10 w-10 rounded-full border border-gray-100 bg-white shadow-sm flex items-center justify-center">
                                            <span className="text-[11px] font-black text-gray-400">OR</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Financing Plan */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Option 2</p>
                                            <h3 className="text-lg font-black text-gray-900 leading-tight">BUY NOW, PAY LATER PLAN</h3>
                                        </div>
                                        <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 flex items-center gap-1.5">
                                            <Calculator className="h-3.5 w-3.5 text-gray-400" />
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estimate</span>
                                        </div>
                                    </div>

                                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                                <tr>
                                                    <th className="px-5 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px] w-[30%]">Tenor / Duration</th>
                                                    <th className="px-5 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px] text-center">Initial Deposit</th>
                                                    <th className="px-5 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px] text-right">Monthly Installment</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                 {(() => {
                                                     let maxYears = 3;
                                                     if (product.financing_config?.max_tenor_months) {
                                                         maxYears = Math.floor(product.financing_config.max_tenor_months / 12);
                                                     } else if (product.category?.toLowerCase().includes('car') || product.category?.toLowerCase().includes('vehicle')) {
                                                         maxYears = 5;
                                                     } else if (product.price > 300000) {
                                                         maxYears = 4;
                                                     }
                                                     return [1, 2, 3, 4, 5].slice(0, Math.max(maxYears, 1));
                                                 })().map((years, idx) => {
                                                    const analysis = calculateProductMonthlyPayment(product, years);
                                                    return (
                                                        <tr key={years} className={`group hover:bg-emerald-50/10 transition-colors ${idx === 0 ? "bg-emerald-50/5" : ""}`}>
                                                            <td className="px-5 py-5">
                                                                <span className="font-black text-gray-900 text-base whitespace-nowrap">
                                                                    {years} Year{years > 1 ? 's' : ''} <span className="text-gray-400 font-bold text-[10px] ml-1">({years * 12} MONTHS)</span>
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-5 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="font-bold text-gray-600 text-sm">{formatPrice(analysis.deposit)}</span>
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{Math.round((analysis.deposit / basePrice) * 100)}% Deposit</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-5 text-right">
                                                                <div className="flex flex-col items-end">
                                                                    <span className="font-black text-emerald-600 text-lg leading-none">{formatPrice(analysis.monthlyPayment)}</span>
                                                                    <span className="text-[10px] text-gray-400 font-medium mt-1">per month</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex gap-4 text-xs text-gray-500 bg-gray-50/80 p-5 rounded-2xl border border-gray-100 leading-relaxed shadow-inner">
                                        <Info className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
                                        <p>
                                            <strong className="text-gray-900 font-black uppercase tracking-wider text-[10px] mr-2">Financial Transparency:</strong> 
                                            The approximations above are based on current market rates. Final approval and exact rates are determined by our partner financial institutions upon a formal application. All plans include standard insurance and tracking protocols.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

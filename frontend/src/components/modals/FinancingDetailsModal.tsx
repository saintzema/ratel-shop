import { motion, AnimatePresence } from "framer-motion";
import { X, Banknote, ShieldCheck, ChevronRight, Calculator, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
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
    const depositPct = Math.round(getVehicleDepositPercent() * 100);

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
                            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white flex items-start justify-between shrink-0">
                                <div className="flex gap-4 items-center">
                                    <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                        <Banknote className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-emerald-900">Payment Plan Details</h2>
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
                                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 mb-6">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Cash Price</p>
                                            <p className="text-2xl font-black text-gray-900">₦{formatNumber(basePrice)}</p>
                                        </div>
                                        <div className="border-l border-emerald-200/50 pl-4">
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Status</p>
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                Eligible for Financing
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                                    <Calculator className="h-4 w-4 text-gray-400" /> Payment Scenarios (Estimates)
                                </h3>

                                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 font-bold text-gray-600 w-1/4">Tenor</th>
                                                <th className="px-4 py-3 font-bold text-gray-600 text-center">Initial Deposit ({depositPct}%)</th>
                                                <th className="px-4 py-3 font-bold text-gray-600 text-right">Monthly Pay</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {[1, 2, 3].map((years, idx) => {
                                                const analysis = calculateProductMonthlyPayment(product, years);
                                                return (
                                                    <tr key={years} className={idx === 0 ? "bg-emerald-50/30" : ""}>
                                                        <td className="px-4 py-3.5 font-bold text-gray-900">{years} Year{years > 1 ? 's' : ''}</td>
                                                        <td className="px-4 py-3.5 text-gray-600 text-center">₦{formatNumber(analysis.deposit)}</td>
                                                        <td className="px-4 py-3.5 text-right font-black text-emerald-600">₦{formatNumber(analysis.monthlyPayment)}<span className="text-[10px] text-gray-400 font-normal ml-1">/mo</span></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-6 flex gap-3 text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <Info className="h-5 w-5 text-gray-400 shrink-0" />
                                    <p className="leading-relaxed">
                                        <strong className="text-gray-700">Disclaimer:</strong> The financing approximations displayed are estimates provided for convenience. Actual financing is processed securely through our verified partner banks and may be subject to credit approval, administrative fees, exact tenure adjustments, and final interest rate evaluations at the time of purchase.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

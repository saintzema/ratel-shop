"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronRight, Upload, Building, User, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";

export default function KYCOnboarding() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const handleSubmit = async () => {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        router.push("/seller/dashboard");
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
            {/* Progress Bar */}
            <div className="w-full max-w-2xl mb-8">
                <div className="flex justify-between mb-2">
                    {["Business Info", "Identity", "Bank Details", "Review"].map((label, i) => (
                        <div key={i} className={`text-xs font-bold ${step > i + 1 ? "text-ratel-green-600" : step === i + 1 ? "text-black dark:text-white" : "text-gray-400"}`}>
                            {label}
                        </div>
                    ))}
                </div>
                <div className="h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-ratel-green-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / 4) * 100}%` }}
                        transition={{ type: "spring", stiffness: 100 }}
                    />
                </div>
            </div>

            <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border dark:border-zinc-800 overflow-hidden">
                <div className="bg-ratel-green-600 p-6 text-white text-center">
                    <h1 className="text-2xl font-bold">Seller Verification</h1>
                    <p className="text-green-100 text-sm">Join Nigeria's most trusted marketplace. Let's get you verified.</p>
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">

                        {/* Step 1: Business Info */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-3 mb-4 text-ratel-green-600">
                                    <Building className="h-6 w-6" />
                                    <h2 className="text-xl font-bold">Business Details</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Business Name</label>
                                        <Input placeholder="Enter your registered business name" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">CAC Registration Number</label>
                                        <Input placeholder="RC123456" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Business Address</label>
                                    <Input placeholder="Head office address" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                        <option>Electronics & Gadgets</option>
                                        <option>Fashion & Apparel</option>
                                        <option>Automotive & Parts</option>
                                        <option>Real Estate</option>
                                    </select>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Identity Verification */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-3 mb-4 text-ratel-green-600">
                                    <User className="h-6 w-6" />
                                    <h2 className="text-xl font-bold">Identity Verification</h2>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Document Type</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {["NIN Slip", "Intl. Passport", "Driver License"].map(doc => (
                                            <div key={doc} className="border rounded-lg p-3 text-center cursor-pointer hover:border-ratel-green-600 hover:bg-green-50 dark:hover:bg-zinc-800 transition">
                                                {doc}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition">
                                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload your ID document</p>
                                    <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF (Max 5MB)</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Bank Details */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-3 mb-4 text-ratel-green-600">
                                    <CreditCard className="h-6 w-6" />
                                    <h2 className="text-xl font-bold">Bank Account</h2>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Bank Name</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                        <option>Select Bank</option>
                                        <option>Zenith Bank</option>
                                        <option>GTBank</option>
                                        <option>UBA</option>
                                        <option>First Bank</option>
                                        <option>Access Bank</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Account Number</label>
                                    <Input placeholder="0123456789" maxLength={10} />
                                </div>

                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-md">
                                    Account Name: <strong>VERIFYING...</strong>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Submission */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="text-center py-8"
                            >
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-ratel-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check className="h-10 w-10" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">You're almost there!</h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                                    By clicking Submit, you agree to Ratel's Seller Code of Conduct. Your application will be reviewed by our compliance team within 24 hours.
                                </p>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 bg-gray-50 dark:bg-zinc-950/50 border-t dark:border-zinc-800 flex justify-between">
                    <Button
                        variant="ghost"
                        onClick={prevStep}
                        disabled={step === 1 || isLoading}
                        className="text-gray-500"
                    >
                        Back
                    </Button>

                    {step < 4 ? (
                        <Button onClick={nextStep} className="bg-ratel-green-600 hover:bg-ratel-green-700">
                            Next Step <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="bg-ratel-green-600 hover:bg-ratel-green-700 w-32"
                        >
                            {isLoading ? "Submitting..." : "Submit Application"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

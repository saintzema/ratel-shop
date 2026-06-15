"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    ArrowLeft, 
    Zap, 
    Home, 
    User, 
    MapPin, 
    Phone, 
    Battery, 
    Plus, 
    Trash2, 
    ChevronRight,
    Calculator,
    CheckCircle2
} from "lucide-react";

interface SolarAuditFormProps {
    onBack: () => void;
    onComplete: (data: any) => void;
}

interface Appliance {
    name: string;
    qty: number;
    wattage: number;
    hrsDay: number;
    hrsNight: number;
}

export function SolarAuditForm({ onBack, onComplete }: SolarAuditFormProps) {
    const [auditStep, setAuditStep] = useState(1);
    const [formData, setFormData] = useState({
        customerName: "",
        address: "",
        phone: "",
        propertyType: "Residential",
        avgBill: "",
        gridHours: "",
        genSize: "",
        fuelSpend: "",
    });

    const [appliances, setAppliances] = useState<Appliance[]>([
        { name: "LED Bulbs", qty: 5, wattage: 10, hrsDay: 0, hrsNight: 6 },
        { name: "Standing Fans", qty: 2, wattage: 60, hrsDay: 4, hrsNight: 8 },
        { name: "Smart TV", qty: 1, wattage: 150, hrsDay: 2, hrsNight: 4 },
    ]);

    const addAppliance = () => {
        setAppliances([...appliances, { name: "", qty: 1, wattage: 0, hrsDay: 0, hrsNight: 0 }]);
    };

    const removeAppliance = (index: number) => {
        setAppliances(appliances.filter((_, i) => i !== index));
    };

    const updateAppliance = (index: number, field: keyof Appliance, value: any) => {
        const newAppliances = [...appliances];
        newAppliances[index] = { ...newAppliances[index], [field]: value };
        setAppliances(newAppliances);
    };

    const calculateTotalWh = (app: Appliance) => {
        return app.qty * app.wattage * (Number(app.hrsDay) + Number(app.hrsNight));
    };

    const dailyTotalWh = appliances.reduce((acc, app) => acc + calculateTotalWh(app), 0);
    const dailyTotalKWh = (dailyTotalWh / 1000).toFixed(2);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onComplete({
            ...formData,
            appliances,
            dailyTotalKWh
        });
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={auditStep === 1 ? onBack : () => setAuditStep(1)}
                    className="h-10 w-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-500" />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Solar Energy Audit</h2>
                    <p className="text-gray-500 text-sm font-medium">Step {auditStep} of 2: {auditStep === 1 ? 'Customer & Energy Profile' : 'Load Requirement'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {auditStep === 1 ? (
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                            <div className="flex items-center gap-3 mb-4">
                                <User className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Customer Information</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Installation Address</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                        <Input 
                                            placeholder="Full address where solar will be installed"
                                            required
                                            className="h-12 pl-10 bg-white rounded-xl border-gray-200"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Property Type</Label>
                                        <select 
                                            className="w-full h-12 bg-white rounded-xl border border-gray-200 px-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                                            value={formData.propertyType}
                                            onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                                        >
                                            <option>Residential</option>
                                            <option>Commercial</option>
                                            <option>Industrial</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Number</Label>
                                        <Input 
                                            placeholder="080..."
                                            required
                                            className="h-12 bg-white rounded-xl border-gray-200 font-bold"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Energy Profile */}
                        <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
                            <div className="flex items-center gap-3 mb-4">
                                <Zap className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">Current Energy Profile</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Avg. Monthly Bill (₦)</Label>
                                    <Input 
                                        type="number"
                                        placeholder="₦0"
                                        required
                                        className="h-12 bg-white rounded-xl border-gray-200 font-black"
                                        value={formData.avgBill}
                                        onChange={(e) => setFormData({ ...formData, avgBill: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Grid Hours / Day</Label>
                                    <Input 
                                        type="number"
                                        placeholder="0-24"
                                        required
                                        className="h-12 bg-white rounded-xl border-gray-200 font-black"
                                        value={formData.gridHours}
                                        onChange={(e) => setFormData({ ...formData, gridHours: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Generator Size (kVA)</Label>
                                    <Input 
                                        type="number"
                                        placeholder="0"
                                        className="h-12 bg-white rounded-xl border-gray-200 font-black"
                                        value={formData.genSize}
                                        onChange={(e) => setFormData({ ...formData, genSize: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Monthly Fuel (₦)</Label>
                                    <Input 
                                        type="number"
                                        placeholder="₦0"
                                        className="h-12 bg-white rounded-xl border-gray-200 font-black"
                                        value={formData.fuelSpend}
                                        onChange={(e) => setFormData({ ...formData, fuelSpend: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button 
                            type="button"
                            onClick={() => setAuditStep(2)}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl"
                        >
                            Continue to Load Profile <ChevronRight className="h-5 w-5 ml-2" />
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-emerald-50/50 rounded-3xl p-6 border border-emerald-100">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Battery className="h-5 w-5 text-emerald-600" />
                                    <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider">Load Requirement</h3>
                                </div>
                                <Button 
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addAppliance}
                                    className="rounded-xl border-emerald-200 bg-white text-emerald-600 font-bold hover:bg-emerald-50"
                                >
                                    <Plus className="h-4 w-4 mr-1" /> Add Item
                                </Button>
                            </div>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {appliances.map((app, index) => (
                                    <div key={index} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm space-y-3 relative group">
                                        <button 
                                            type="button"
                                            onClick={() => removeAppliance(index)}
                                            className="absolute -top-2 -right-2 h-6 w-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                        
                                        <div className="grid grid-cols-12 gap-3">
                                            <div className="col-span-6">
                                                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Appliance Name</Label>
                                                <Input 
                                                    placeholder="e.g. Fridge"
                                                    className="h-9 text-xs font-bold rounded-lg"
                                                    value={app.name}
                                                    onChange={(e) => updateAppliance(index, "name", e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Qty</Label>
                                                <Input 
                                                    type="number"
                                                    className="h-9 text-xs font-black rounded-lg"
                                                    value={app.qty}
                                                    onChange={(e) => updateAppliance(index, "qty", Number(e.target.value))}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Watts</Label>
                                                <Input 
                                                    type="number"
                                                    className="h-9 text-xs font-black rounded-lg"
                                                    value={app.wattage}
                                                    onChange={(e) => updateAppliance(index, "wattage", Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1">
                                                <span className="text-[10px] font-black text-gray-500 uppercase">Day Hours</span>
                                                <Input 
                                                    type="number"
                                                    className="h-7 w-12 text-xs font-black rounded-md border-none bg-transparent"
                                                    value={app.hrsDay}
                                                    onChange={(e) => updateAppliance(index, "hrsDay", Number(e.target.value))}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1">
                                                <span className="text-[10px] font-black text-gray-500 uppercase">Night Hours</span>
                                                <Input 
                                                    type="number"
                                                    className="h-7 w-12 text-xs font-black rounded-md border-none bg-transparent"
                                                    value={app.hrsNight}
                                                    onChange={(e) => updateAppliance(index, "hrsNight", Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-emerald-100 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Daily Consumption</p>
                                    <p className="text-3xl font-black text-emerald-900">{dailyTotalKWh} <span className="text-sm font-bold opacity-50">kWh</span></p>
                                </div>
                                <div className="h-12 w-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                    <Calculator className="h-6 w-6" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase tracking-tight">
                                I confirm that this load list is accurate. Incorrect data may lead to system undersizing and voiding of the financing agreement.
                            </p>
                        </div>

                        <Button 
                            type="submit"
                            className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-lg shadow-xl"
                        >
                            Generate Solar Audit <CheckCircle2 className="h-5 w-5 ml-2" />
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
}

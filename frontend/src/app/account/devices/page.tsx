"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Laptop, Smartphone, Tablet, Monitor, Trash2 } from "lucide-react";

export default function DevicesPage() {
    const devices = [
        { id: 1, type: "laptop", name: "FairPrice Web on MacBook Pro", last_active: "Active Now", icon: Laptop },
        { id: 2, type: "phone", name: "FairPrice App on iPhone 13", last_active: "Yesterday", icon: Smartphone },
        { id: 3, type: "tablet", name: "FairPrice on iPad Air", last_active: "Feb 10, 2024", icon: Tablet },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-black">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-normal mb-2">Manage Your Content and Devices</h1>

                <div className="border-b border-gray-200 flex gap-8 mb-8">
                    <button className="py-2 border-b-2 border-brand-orange font-bold text-gray-900">Devices</button>
                    <button className="py-2 border-b-2 border-transparent hover:text-brand-orange text-gray-500">Content</button>
                    <button className="py-2 border-b-2 border-transparent hover:text-brand-orange text-gray-500">Preferences</button>
                    <button className="py-2 border-b-2 border-transparent hover:text-brand-orange text-gray-500">Privacy Settings</button>
                </div>

                <div className="space-y-6">
                    <p className="text-sm text-gray-600">
                        FairPrice apps customized for your registered devices.
                    </p>

                    <div className="grid gap-4">
                        {devices.map(device => (
                            <div key={device.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                                        <device.icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{device.name}</h3>
                                        <p className="text-xs text-gray-500">Last active: {device.last_active}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm">Deregister</Button>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

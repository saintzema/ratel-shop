"use client";

import React from "react";
import { CheckCircle2, Circle, Truck, Package, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackingStep {
    status: string;
    location: string;
    timestamp: string;
    completed: boolean;
}

interface TrackingTimelineProps {
    steps: TrackingStep[];
    currentStatus?: string;
}

export function TrackingTimeline({ steps, currentStatus }: TrackingTimelineProps) {
    if (!steps || steps.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Clock className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm font-medium">Tracking info not yet available</p>
            </div>
        );
    }

    return (
        <div className="space-y-0">
            {steps.map((step, index) => {
                const isFirst = index === 0;
                const isLast = index === steps.length - 1;

                return (
                    <div key={index} className="relative flex gap-4 pb-8 group">
                        {/* Line */}
                        {!isLast && (
                            <div
                                className={cn(
                                    "absolute left-[15px] top-[30px] w-0.5 h-full transition-colors duration-500",
                                    step.completed ? "bg-emerald-500" : "bg-gray-200"
                                )}
                            />
                        )}

                        {/* Icon */}
                        <div className="relative z-10 mt-1">
                            {step.completed ? (
                                <div className="bg-emerald-500 rounded-full p-1 shadow-lg shadow-emerald-500/20">
                                    <CheckCircle2 className="h-5 w-5 text-white" />
                                </div>
                            ) : (
                                <div className="bg-white border-2 border-gray-200 rounded-full p-1.5 shadow-sm">
                                    <Circle className="h-4 w-4 text-gray-300" />
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-0.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <h4 className={cn(
                                    "text-sm font-bold transition-colors",
                                    step.completed ? "text-gray-900" : "text-gray-400"
                                )}>
                                    {step.status}
                                </h4>
                                <span className="text-[10px] sm:text-xs font-medium text-gray-400">
                                    {new Date(step.timestamp).toLocaleString("en-NG", {
                                        day: "numeric",
                                        weekday: "long",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <p className="text-xs text-gray-500 font-medium">{step.location}</p>
                            </div>
                        </div>
                    </div>
                );
            }).reverse()} {/** Show latest first */}
        </div>
    );
}

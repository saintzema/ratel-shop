"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getDeliveryDate } from "@/lib/nigerian-states";

interface LocationContextType {
    location: string;
    setLocation: (location: string) => void;
    deliveryDate: string;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
    const [location, setLocation] = useState("Lagos");
    const [deliveryDate, setDeliveryDate] = useState("");

    useEffect(() => {
        // Load from local storage if available
        const savedLocation = localStorage.getItem("ratel-location");
        if (savedLocation) {
            setLocation(savedLocation);
        }
    }, []);

    useEffect(() => {
        // Update delivery date when location changes
        const date = getDeliveryDate(location);
        setDeliveryDate(date);
        localStorage.setItem("ratel-location", location);
    }, [location]);

    return (
        <LocationContext.Provider value={{ location, setLocation, deliveryDate }}>
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error("useLocation must be used within a LocationProvider");
    }
    return context;
}

import { create } from "zustand";
import { Platform } from "react-native";
import api from "../api/client";
import { User } from "../types";

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isInitialized: boolean;
    login: (email: string, password?: string) => Promise<void>;
    register: (name: string, email: string, password?: string) => Promise<void>;
    logout: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: false,
    isInitialized: false,

    initialize: async () => {
        try {
            set({ isLoading: true });
            const token = await api.getToken();
            if (token) {
                const result = await api.getMe();
                if (result?.user) {
                    set({ user: result.user as User });
                } else {
                    await api.clearToken();
                }
            }
        } catch {
            await api.clearToken();
        } finally {
            set({ isLoading: false, isInitialized: true });
        }
    },

    login: async (email: string, password?: string) => {
        set({ isLoading: true });
        try {
            const { user } = await api.login(email, password);
            set({ user: user as User });
        } finally {
            set({ isLoading: false });
        }
    },

    register: async (name: string, email: string, password?: string) => {
        set({ isLoading: true });
        try {
            const { user } = await api.register(name, email, password);
            set({ user: user as User });
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        await api.logout();
        set({ user: null });
    },
}));

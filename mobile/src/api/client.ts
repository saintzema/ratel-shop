import axios, { AxiosInstance, AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { AuthResponse, Product, Order, NegotiationRequest, Notification } from "../types";

// Web mode (Expo web on localhost): use localhost
// Native mode (Expo Go / dev build on phone): use LAN IP
const API_BASE_URL = __DEV__
    ? Platform.OS === "web"
        ? "http://localhost:3000"
        : "http://172.20.10.3:3000"
    : "https://fairprice-ten.vercel.app";

const TOKEN_KEY = "fp_auth_token";

class FairPriceAPI {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: `${API_BASE_URL}/api`,
            timeout: 15000,
            headers: { "Content-Type": "application/json" },
        });

        // Attach JWT to every request
        this.client.interceptors.request.use(async (config) => {
            const token = await this.getToken();
            if (token) config.headers.Authorization = `Bearer ${token}`;
            return config;
        });

        // Handle 401 globally
        this.client.interceptors.response.use(
            (res) => res,
            async (error: AxiosError) => {
                if (error.response?.status === 401) await this.clearToken();
                return Promise.reject(error);
            }
        );
    }

    // ─── Token Management ────────────────────────────────────
    async getToken(): Promise<string | null> {
        try {
            if (Platform.OS === "web") {
                // SecureStore doesn't work on web — use localStorage
                return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
            }
            return await SecureStore.getItemAsync(TOKEN_KEY);
        } catch {
            return null;
        }
    }

    async setToken(token: string): Promise<void> {
        if (Platform.OS === "web") {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        }
    }

    async clearToken(): Promise<void> {
        if (Platform.OS === "web") {
            localStorage.removeItem(TOKEN_KEY);
        } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
    }

    // ─── Auth ────────────────────────────────────────────────
    async login(email: string, password?: string): Promise<AuthResponse> {
        const { data } = await this.client.post<AuthResponse>("/auth/login", { email, password });
        await this.setToken(data.token);
        return data;
    }

    async register(name: string, email: string, password?: string): Promise<AuthResponse> {
        const { data } = await this.client.post<AuthResponse>("/auth/register", { name, email, password });
        await this.setToken(data.token);
        return data;
    }

    async getMe(): Promise<{ user: AuthResponse["user"] } | null> {
        try {
            const { data } = await this.client.get("/auth/me");
            return data;
        } catch {
            return null;
        }
    }

    async logout(): Promise<void> {
        await this.clearToken();
    }

    // ─── Products ────────────────────────────────────────────
    async getProducts(params?: { category?: string; search?: string; limit?: number; offset?: number }): Promise<Product[]> {
        const { data } = await this.client.get("/products", { params });
        // API returns flat array
        return Array.isArray(data) ? data : (data.products || []);
    }

    async getProduct(id: string): Promise<Product | null> {
        // Fetch all and find — API doesn't have single-product endpoint
        const products = await this.getProducts();
        return products.find((p: Product) => p.id === id) || null;
    }

    // ─── Orders ──────────────────────────────────────────────
    async getOrders(userId?: string): Promise<Order[]> {
        const params = userId ? { userId } : {};
        const { data } = await this.client.get("/orders", { params });
        return Array.isArray(data) ? data : (data.orders || []);
    }

    async createOrder(orderData: Record<string, unknown>): Promise<Order> {
        const { data } = await this.client.post("/orders", orderData);
        return data;
    }

    // ─── Negotiations ────────────────────────────────────────
    async getNegotiations(userId?: string): Promise<NegotiationRequest[]> {
        const params = userId ? { userId } : {};
        const { data } = await this.client.get("/negotiations", { params });
        return Array.isArray(data) ? data : (data.negotiations || []);
    }

    async createNegotiation(negotiationData: Record<string, unknown>): Promise<NegotiationRequest> {
        const { data } = await this.client.post("/negotiations", negotiationData);
        return data;
    }

    // ─── Notifications ───────────────────────────────────────
    async getNotifications(userId: string): Promise<Notification[]> {
        const { data } = await this.client.get("/notifications", { params: { userId } });
        return Array.isArray(data) ? data : (data.notifications || []);
    }

    // ─── Ziva Chat ───────────────────────────────────────────
    async sendZivaMessage(message: string, context?: Record<string, unknown>): Promise<{ reply: string; products?: Product[] }> {
        const { data } = await this.client.post("/ziva-chat", { message, ...context });
        return data;
    }
}

export const api = new FairPriceAPI();
export default api;

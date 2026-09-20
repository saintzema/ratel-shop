"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/** Landing page for the one-tap "Sign in instantly" link in the login-code email. */
function MagicInner() {
    const router = useRouter();
    const params = useSearchParams();
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const ran = useRef(false);

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;
        const email = params.get("email") || "";
        const token = params.get("token") || "";
        const rawRedirect = params.get("redirect") || "/";
        const redirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";
        if (!email || !token) { setError("This sign-in link is incomplete."); return; }
        (async () => {
            try {
                const res = await fetch("/api/auth/email-code/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, token }),
                });
                const data = await res.json();
                if (!res.ok || !data?.success) { setError(data?.error || "This link has expired or was already used."); return; }
                // Token first (login() re-checks it), then the user — both persist in localStorage,
                // so the device stays signed in across visits.
                localStorage.setItem("fp_token", data.token);
                login(data.user);
                const dest = data.user?.role === "admin" && redirect === "/" ? "/admin/dashboard"
                    : data.user?.role === "seller" && redirect === "/" ? "/seller/dashboard" : redirect;
                router.replace(dest);
            } catch {
                setError("Couldn't reach FairPrice. Check your connection and try the link again.");
            }
        })();
    }, [params, login, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
            <div className="max-w-sm text-center">
                {error ? (
                    <>
                        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                        <h1 className="text-lg font-black text-gray-900">Couldn't sign you in</h1>
                        <p className="text-sm text-gray-500 mt-1">{error}</p>
                        <button onClick={() => router.replace("/login")} className="mt-5 h-11 px-6 rounded-full bg-black text-white text-sm font-black">Back to sign in</button>
                    </>
                ) : (
                    <>
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
                        <p className="text-sm font-bold text-gray-700">Signing you in…</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function MagicPage() {
    return <Suspense fallback={null}><MagicInner /></Suspense>;
}

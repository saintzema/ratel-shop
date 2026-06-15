import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionProvider } from "@/context/SessionProvider";

/**
 * A non-blocking session wrapper that fetches the session server-side
 * but allows the parent layout to stream the initial shell immediately.
 */
export async function SessionWrapper({ children }: { children: React.ReactNode }) {
    let session = null;
    try {
        // We still fetch on the server, but because this is a nested component,
        // Next.js can stream the layout around it first if we use Suspense outside.
        session = await getServerSession(authOptions);
    } catch (error: any) {
        // Silently ignore dynamic usage errors during static generation (Next.js build phase)
        // This prevents noisy but harmless "Session fetch failed" warnings in Vercel logs.
        if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('dynamic-server-error')) {
            return (
                <SessionProvider session={null}>
                    {children}
                </SessionProvider>
            );
        }
        console.warn("Session fetch failed during resiliency check:", error);
    }

    return (
        <SessionProvider session={session}>
            {children}
        </SessionProvider>
    );
}

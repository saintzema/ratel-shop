import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
    } catch (error) {
        console.warn("Session fetch failed during resiliency check:", error);
    }

    return (
        <SessionProvider session={session}>
            {children}
        </SessionProvider>
    );
}

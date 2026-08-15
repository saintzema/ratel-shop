import { redirect } from "next/navigation";

/**
 * /admin had no index route, so typing the bare URL — the obvious thing to try —
 * returned a 404 even for a signed-in admin. Every in-app link already points at
 * /admin/dashboard; this just makes the namespace root land somewhere real.
 */
export default function AdminIndexPage() {
    redirect("/admin/dashboard");
}

// This route group does not need its own layout since /seller/layout.tsx provides the shell.
// This file just passes children through.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

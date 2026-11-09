
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

const navigation = [
  { label: "Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Providers", href: "/admin/providers" },
  { label: "Listings", href: "/admin/listings" },
  { label: "Bookings", href: "/admin/bookings" },
  { label: "Transactions", href: "/admin/transactions" },
  { label: "Payouts", href: "/admin/payouts" },
  { label: "Memberships", href: "/admin/memberships" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Reviews", href: "/admin/reviews" },
  { label: "Content", href: "/admin/content" },
  { label: "Audit Logs", href: "/admin/audit-logs" },
  { label: "Settings", href: "/admin/settings" },
];

function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F5F0]">
      <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-sm">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#7ED321] border-t-transparent" />
        <p className="text-sm font-semibold text-[#1F4D1A]">
          Securing admin workspace...
        </p>
      </div>
    </div>
  );
}

async function ProtectedAdminArea({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin || admin.status !== "active") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[url('/images/cultural-background.jpg')] bg-cover bg-center bg-fixed text-[#1F4D1A]">
      <div className="min-h-screen bg-[#F2F5F0]/75">
        <header className="border-b border-[#4C9A2A]/20 bg-white/95 px-5 py-4">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xl font-bold tracking-tight">
                NiaWorld <span className="text-[#7ED321]">Admin</span>
              </p>
              <p className="text-xs text-gray-600">
                Administration and platform operations
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold">
                {admin.role.replaceAll("_", " ").toUpperCase()}
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 p-4 md:flex-row md:p-6">
          <aside className="w-full shrink-0 rounded-2xl border border-white bg-white/95 p-4 shadow-sm md:sticky md:top-6 md:h-fit md:w-64">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              Administration
            </p>

            <nav className="flex gap-2 overflow-x-auto md:flex-col">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-[#E8F5DC] hover:text-[#1F4D1A]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-5 border-t border-gray-200 pt-4">
              <Link
                href="/dashboard"
                className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Return to NiaWorld
              </Link>
            </div>
          </aside>

          <main className="min-w-0 flex-1 rounded-2xl border border-white bg-white/95 p-5 shadow-sm md:p-7">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ProtectedAdminArea>{children}</ProtectedAdminArea>
    </Suspense>
  );
}

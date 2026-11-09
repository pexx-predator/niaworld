
import Link from "next/link";
import {
  Users,
  UserRoundCheck,
  Store,
  CalendarCheck,
  CreditCard,
  Wallet,
  Crown,
  BarChart3,
  Star,
  FileText,
  ClipboardList,
  Settings,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

const modules = [
  {
    title: "Users",
    description: "Manage customer accounts and account status.",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Providers",
    description: "Review providers and manage their accounts.",
    href: "/admin/providers",
    icon: UserRoundCheck,
  },
  {
    title: "Listings",
    description: "Manage provider listings and published services.",
    href: "/admin/listings",
    icon: Store,
  },
  {
    title: "Bookings",
    description: "Monitor bookings and service sessions.",
    href: "/admin/bookings",
    icon: CalendarCheck,
  },
  {
    title: "Transactions",
    description: "Review customer payments and transaction records.",
    href: "/admin/transactions",
    icon: CreditCard,
  },
  {
    title: "Payouts",
    description: "Monitor provider payouts and payment status.",
    href: "/admin/payouts",
    icon: Wallet,
  },
  {
    title: "Memberships",
    description: "Manage membership plans and subscriptions.",
    href: "/admin/memberships",
    icon: Crown,
  },
  {
    title: "Reports",
    description: "Review platform activity and financial reports.",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    title: "Reviews",
    description: "Moderate customer reviews and reports.",
    href: "/admin/reviews",
    icon: Star,
  },
  {
    title: "Content",
    description: "Manage platform content and announcements.",
    href: "/admin/content",
    icon: FileText,
  },
  {
    title: "Audit Logs",
    description: "Review recorded administrative activity.",
    href: "/admin/audit-logs",
    icon: ClipboardList,
  },
  {
    title: "Settings",
    description: "Manage administrative configuration.",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4C9A2A]">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1F4D1A]">
            Admin Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Manage NiaWorld operations, users, providers, bookings,
            payments, platform content and security.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-full border border-[#7ED321]/40 bg-[#E8F5DC] px-4 py-2 text-sm font-semibold text-[#1F4D1A]">
          <ShieldCheck size={17} />
          Protected Admin Area
        </div>
      </section>

      <section className="rounded-2xl border border-[#7ED321]/30 bg-gradient-to-r from-[#F2F9E9] to-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-3 text-[#4C9A2A] shadow-sm">
            <ShieldCheck size={23} />
          </div>

          <div>
            <h2 className="font-bold text-[#1F4D1A]">
              Administrative control centre
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              Your admin account is authenticated through Supabase.
              Administrative access is checked against the active
              admin account record.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#1F4D1A]">
            Platform management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Select a department to manage that area of NiaWorld.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.href}
                href={module.href}
                className="group rounded-2xl border border-gray-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-[#7ED321] hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-[#E8F5DC] p-3 text-[#4C9A2A] transition group-hover:bg-[#7ED321] group-hover:text-white">
                    <Icon size={22} />
                  </div>

                  <ArrowUpRight
                    size={18}
                    className="text-gray-400 transition group-hover:text-[#4C9A2A]"
                  />
                </div>

                <h3 className="mt-5 font-bold text-[#1F4D1A]">
                  {module.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {module.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-bold text-[#1F4D1A]">
          Security principle
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Financial operations, account changes and other sensitive
          administrative actions must be verified on the server and
          recorded in the audit log. Dashboard visibility alone does
          not grant permission to perform an operation.
        </p>
      </section>
    </div>
  );
}

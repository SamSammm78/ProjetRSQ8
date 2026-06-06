import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CalendarDays, Download, Settings, Store, WalletCards } from "lucide-react";
import { Providers } from "@/components/providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "ProjetRSQ8",
  description: "SaaS mobile-first pour suivre CA, benefice et marge multi-boutiques Etsy."
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/day", label: "Jour", icon: CalendarDays },
  { href: "/transactions", label: "Transactions", icon: WalletCards },
  { href: "/shops", label: "Boutiques", icon: Store },
  { href: "/import", label: "Import", icon: Download },
  { href: "/settings", label: "Parametres", icon: Settings }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
        <div className="min-h-screen pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-sage bg-mist/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
              <Link href="/dashboard" className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-moss text-white">
                  <BarChart3 size={21} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">ProjetRSQ8</span>
                  <span className="block text-xs text-ink/60">Dashboard Etsy</span>
                </span>
              </Link>
              <div className="rounded-lg border border-sage bg-white px-3 py-2 text-xs font-medium text-ink/70">
                SaaS prive
              </div>
            </div>
          </header>

          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 lg:grid-cols-[220px_1fr] lg:py-8">
            <aside className="hidden lg:block">
              <nav className="sticky top-24 grid gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink/75 hover:bg-white hover:text-ink"
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <main>{children}</main>
          </div>

          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-sage bg-white lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium text-ink/70"
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        </Providers>
      </body>
    </html>
  );
}

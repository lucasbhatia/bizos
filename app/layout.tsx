import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "BizOS — Customs Operating System",
  description: "Multi-tenant operating system for customs brokerage businesses",
};

function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <span className="text-lg font-semibold text-slate-900">BizOS</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <div className="rounded-md bg-slate-200 px-3 py-2 text-sm font-medium text-slate-900">
          Dashboard
        </div>
        <div className="rounded-md px-3 py-2 text-sm text-slate-600">
          Cases
        </div>
        <div className="rounded-md px-3 py-2 text-sm text-slate-600">
          Documents
        </div>
        <div className="rounded-md px-3 py-2 text-sm text-slate-600">
          Clients
        </div>
        <div className="rounded-md px-3 py-2 text-sm text-slate-600">
          Filings
        </div>
      </nav>
    </aside>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}

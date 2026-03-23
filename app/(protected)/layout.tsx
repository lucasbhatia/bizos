import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MobileNav } from "./mobile-nav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={{ full_name: user.full_name, email: user.email, role: user.role }} />
        <main className="flex-1 overflow-y-auto bg-slate-50/80 px-4 pb-20 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
      <MobileNav userRole={user.role} />
    </div>
  );
}

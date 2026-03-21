import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
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
    <div className="flex h-screen">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto bg-slate-50 p-4 pb-20 sm:p-6 sm:pb-6">
        {children}
      </main>
      <MobileNav userRole={user.role} />
    </div>
  );
}

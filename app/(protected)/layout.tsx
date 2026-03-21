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
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto bg-slate-50/80 px-4 pb-20 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
      <MobileNav userRole={user.role} />
    </div>
  );
}

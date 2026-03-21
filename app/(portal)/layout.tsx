import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/supabase/portal";
import { PortalSidebar } from "@/components/portal-sidebar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const portalUser = await getPortalUser();

  if (!portalUser) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen">
      <PortalSidebar
        contactName={portalUser.contact.name}
        companyName={portalUser.clientAccount.name}
      />
      <main className="flex-1 overflow-auto bg-slate-50 p-6">{children}</main>
    </div>
  );
}

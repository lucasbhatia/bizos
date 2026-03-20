import { getCurrentUser } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">
        Welcome back, {user?.full_name ?? "User"}
      </p>
    </div>
  );
}

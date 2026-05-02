import JoinForm from "@/components/ui/JoinForm";
import { getDashboardDataForUser } from "@/lib/postgres-repositories";
import { getSessionFromServer } from "@/lib/session";

export default async function JoinPage() {
  const sessionUser = await getSessionFromServer();
  let initialDashboard = null;

  if (sessionUser?.role === "vendor" && sessionUser.vendorSlug) {
    try {
      const dashboard = await getDashboardDataForUser(sessionUser);
      initialDashboard = dashboard.kind === "vendor" ? dashboard : null;
    } catch {
      initialDashboard = null;
    }
  }

  return (
    <main className="vendor-join-page">
      <JoinForm
        initialUser={sessionUser?.role === "vendor" ? sessionUser : null}
        initialDashboard={initialDashboard}
      />
    </main>
  );
}

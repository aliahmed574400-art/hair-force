import Link from "next/link";
import ClientDashboard from "@/components/dashboard/ClientDashboard";
import VendorDashboardManager from "@/components/dashboard/VendorDashboardManager";
import { getDashboardDataForUser } from "@/lib/repositories";
import { getSessionFromServer } from "@/lib/session";

export default async function DashboardPage() {
  const sessionUser = getSessionFromServer();

  if (!sessionUser) {
    return (
      <main className="section page-intro">
        <div className="container">
          <div className="surface" style={{ padding: 32 }}>
            <div className="section-heading" style={{ marginBottom: 18 }}>
              <span className="eyebrow">Protected dashboard</span>
              <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>Sign in to access your workspace</h1>
              <p>
                Vendor and client dashboards are session-aware. Use the demo accounts below or create a vendor account to open your own workspace.
              </p>
            </div>
            <div className="two-grid">
              <div className="dashboard-card">
                <strong>Client demo</strong>
                <p className="muted">client@hairforce.app</p>
                <p className="muted">demo12345</p>
              </div>
              <div className="dashboard-card">
                <strong>Vendor demo</strong>
                <p className="muted">vendor@hairforce.app</p>
                <p className="muted">demo12345</p>
              </div>
            </div>
            <div className="hero-actions" style={{ marginTop: 20 }}>
              <Link href="/signin" className="button button-primary">
                Sign in
              </Link>
              <Link href="/join" className="button button-secondary">
                Create vendor account
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const dashboardData = await getDashboardDataForUser(sessionUser);

  return (
    <main className="section page-intro">
      <div className="container">
        {dashboardData.kind === "vendor" ? (
          <VendorDashboardManager user={sessionUser} initialData={dashboardData} />
        ) : (
          <ClientDashboard user={sessionUser} initialData={dashboardData} />
        )}
      </div>
    </main>
  );
}

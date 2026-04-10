import Link from "next/link";
import AdminVendorManager from "@/components/admin/AdminVendorManager";
import { getAdminDataForUser } from "@/lib/postgres-repositories";
import { getSessionFromServer } from "@/lib/session";

export default async function AdminPage() {
  const sessionUser = getSessionFromServer();

  if (!sessionUser) {
    return (
      <main className="section page-intro">
        <div className="container">
          <div className="surface" style={{ padding: 32 }}>
            <div className="section-heading" style={{ marginBottom: 18 }}>
              <span className="eyebrow">Admin area</span>
              <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>Sign in as admin</h1>
              <p>Use the demo admin account to review vendor applications.</p>
            </div>
            <div className="dashboard-card">
              <strong>Admin demo</strong>
              <p className="muted">admin@hairforce.app</p>
              <p className="muted">demo12345</p>
            </div>
            <div className="hero-actions" style={{ marginTop: 18 }}>
              <Link href="/signin" className="button button-primary">
                Go to sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (sessionUser.role !== "admin") {
    return (
      <main className="section page-intro">
        <div className="container">
          <div className="surface" style={{ padding: 32 }}>
            <div className="section-heading" style={{ marginBottom: 0 }}>
              <span className="eyebrow">Admin area</span>
              <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>Access denied</h1>
              <p>This page is reserved for marketplace moderators.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const initialData = await getAdminDataForUser(sessionUser);

  return (
    <main className="section page-intro">
      <div className="container">
        <AdminVendorManager initialData={initialData} />
      </div>
    </main>
  );
}

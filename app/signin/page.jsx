import AuthPanel from "@/components/ui/AuthPanel";

export default function SigninPage() {
  return (
    <main className="section page-intro">
      <div className="container listing-grid">
        <section className="surface" style={{ padding: 28 }}>
          <div className="section-heading" style={{ marginBottom: 0 }}>
            <span className="eyebrow">Client login</span>
            <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.4rem)" }}>Sign in to manage your bookings</h1>
            <p>
              Hair Force now uses session-aware auth APIs with a PostgreSQL-ready account layer for clients, vendors, and admins. In production, this flow is designed to sit behind protected routes and role-based access controls.
            </p>
          </div>
        </section>
        <aside>
          <AuthPanel mode="signin" />
        </aside>
      </div>
    </main>
  );
}

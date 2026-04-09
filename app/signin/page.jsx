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
              The auth foundation is prepared with user APIs and a Mongoose user model. In a production phase, this should be connected to sessions, protected routes, and vendor/client role permissions.
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

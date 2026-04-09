import AuthPanel from "@/components/ui/AuthPanel";

export default function SignupPage() {
  return (
    <main className="section page-intro">
      <div className="container listing-grid">
        <section className="surface" style={{ padding: 28 }}>
          <div className="section-heading" style={{ marginBottom: 0 }}>
            <span className="eyebrow">Create account</span>
            <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.4rem)" }}>Save favorites, bookings, and rebooks</h1>
            <p>
              Users can sign up before booking, keep their appointment history, and move into a richer client account experience as the platform grows.
            </p>
          </div>
        </section>
        <aside>
          <AuthPanel mode="signup" />
        </aside>
      </div>
    </main>
  );
}

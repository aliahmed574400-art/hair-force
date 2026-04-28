import ForgotPasswordFlow from "@/components/ui/ForgotPasswordFlow";

export default function ForgotPasswordPage({ searchParams }) {
  const initialEmail =
    typeof searchParams?.email === "string" ? searchParams.email : "";

  return (
    <main className="section page-intro">
      <div className="container">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <ForgotPasswordFlow initialEmail={initialEmail} />
        </div>
      </div>
    </main>
  );
}

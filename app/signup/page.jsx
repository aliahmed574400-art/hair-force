import SignupFlow from "@/components/ui/SignupFlow";

export default function SignupPage() {
  return (
    <main className="section page-intro">
      <div className="container">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <SignupFlow />
        </div>
      </div>
    </main>
  );
}

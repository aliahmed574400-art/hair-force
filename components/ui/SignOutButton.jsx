"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton({ className = "button button-secondary" }) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" className={className} onClick={handleSignOut}>
      Sign out
    </button>
  );
}

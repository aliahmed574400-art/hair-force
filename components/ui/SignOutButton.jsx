"use client";

import { useRouter } from "next/navigation";
import SiteButton from "@/components/ui/SiteButton";

export default function SignOutButton({
  variant = "secondary",
  size = "default",
  className = "",
  fullWidth = false
}) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <SiteButton
      type="button"
      variant={variant}
      size={size}
      className={className}
      fullWidth={fullWidth}
      onClick={handleSignOut}
    >
      Sign out
    </SiteButton>
  );
}

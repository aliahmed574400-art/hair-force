import { cn } from "@/lib/utils";

export default function PhoneFrame({ children, className }) {
  return (
    <div className={cn("phone-frame", className)}>
      <div className="phone-frame-shell">
        <div className="phone-frame-notch" />
        <div className="phone-frame-screen">{children}</div>
      </div>
    </div>
  );
}

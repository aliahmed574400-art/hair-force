import Image from "next/image";
import Link from "next/link";

export default function Logo({ dark = false }) {
  return (
    <Link
      href="/"
      className={`brand ${dark ? "is-dark" : ""}`}
      aria-label="Hairforce home"
    >
      <span className="brand-mark" aria-hidden="true">
        <Image
          src="/brand-icon.png"
          alt=""
          width={72}
          height={72}
          className="brand-mark-image"
          priority
        />
      </span>
      <span className="brand-wordmark">Hairforce</span>
    </Link>
  );
}

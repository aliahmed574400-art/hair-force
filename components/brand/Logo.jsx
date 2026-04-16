import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="brand" aria-label="Hair Force home">
      <Image
        src="/logo.png"
        alt="Hair Force Logo"
        width={230}
        height={80}
        style={{ width: "auto", height: "80px", objectFit: "contain" }}
        priority
      />
    </Link>
  );
}

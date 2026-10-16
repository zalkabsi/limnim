import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RefundCurve — Hotel cancellation clarity",
  description: "See how a hotel cancellation policy changes your potential refund over time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

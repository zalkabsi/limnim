import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Limnim — Hotel policy clarity for guests and staff",
  description: "Turn hotel cancellation terms into evidence-backed refund estimates and clear guest responses.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

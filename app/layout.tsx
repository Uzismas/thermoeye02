import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thermoeye Clinical Screening Console",
  description:
    "Secure OCTA/OCT workflow prototype for Alzheimer risk screening support.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monobedtime",
  description:
    "An immersive bedtime story surface for parents soothing infants with gentle page turns, twilight ambiance, and quiet companion cues.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

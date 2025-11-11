import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quick Quote - Rail Crossing Configurator",
  description: "Configure and quote rail crossing systems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

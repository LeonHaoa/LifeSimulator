import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/client-locale";

export const metadata: Metadata = {
  title: "LifeSimulator",
  description: "A bilingual life simulation demo with yearly progression.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}

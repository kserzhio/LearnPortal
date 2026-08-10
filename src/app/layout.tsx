import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "@fontsource-variable/manrope/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Systema — навчальний портал", template: "%s · Systema" },
  description: "Інтерактивні курси з архітектури програмних систем.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <span>SYSTEMA</span>
          <p>Архітектура стає зрозумілою, коли її будуєш.</p>
        </footer>
      </body>
    </html>
  );
}

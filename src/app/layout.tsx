import type { Metadata } from "next";
import { ProductAnalytics } from "@/components/analytics/product-analytics";
import { SiteHeader } from "@/components/site-header";
import { SITE_URL } from "@/lib/seo/site";
import "@fontsource-variable/manrope/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./globals.css";
import "./roadmap.css";
import "./share.css";
import "./growth-dashboard.css";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: { default: "Systema — навчальний портал", template: "%s · Systema" },
  description: "Інтерактивні курси з програмування та технологій для дітей і дорослих: Learn, Build, Simulate, Check.",
  applicationName: "SYSTEMA",
  category: "education",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" data-scroll-behavior="smooth">
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <span>SYSTEMA</span>
          <p>Learn → Build → Simulate → Check</p>
        </footer>
        <ProductAnalytics />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import Footer from "@/components/Footer";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-BWB94MBP4C";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Scripture Explorer",
  description: "Interactive analysis dashboards for the LDS Standard Works",
  themeColor: "#0f0f12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_title: document.title,
              send_page_view: true
            });
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <PreferencesProvider>
          {children}
          <Footer />
        </PreferencesProvider>
      </body>
    </html>
  );
}

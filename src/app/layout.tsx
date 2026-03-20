import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

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
      <body className={inter.className}>
        <PreferencesProvider>
          {children}
          <Footer />
        </PreferencesProvider>
      </body>
    </html>
  );
}

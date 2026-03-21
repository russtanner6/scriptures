import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LocationDirectory from "@/components/LocationDirectory";

export const metadata = {
  title: "Scripture Locations — Scripture Explorer",
  description: "Explore every named place in the scriptures",
};

export default function LocationsPage() {
  return (
    <main className="page-shell">
      <Header />
      <div className="page-content" style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 16px 60px" }}>
        <Suspense fallback={<div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>}>
          <LocationDirectory />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}

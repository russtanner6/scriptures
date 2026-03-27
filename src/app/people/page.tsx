import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CharacterDirectory from "@/components/CharacterDirectory";
import LoadingBar from "@/components/LoadingBar";

export const metadata = {
  title: "People of the Scriptures — Scripture Explorer",
  description: "Every named person across the Old Testament, New Testament, Book of Mormon, Doctrine & Covenants, and Pearl of Great Price.",
};

export default function CharactersPage() {
  return (
    <main className="page-shell">
      <Header />
      <div className="page-content" style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 16px 60px" }}>
        <Suspense fallback={<div style={{ padding: "80px 20px" }}><LoadingBar /></div>}>
          <CharacterDirectory />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}

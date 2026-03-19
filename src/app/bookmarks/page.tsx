import type { Metadata } from "next";
import Header from "@/components/Header";
import BookmarksList from "@/components/BookmarksList";

export const metadata: Metadata = {
  title: "Bookmarks — Scripture Explorer",
  description: "Your saved scripture verses.",
};

export default function BookmarksPage() {
  return (
    <div className="page-container">
      <Header />
      <BookmarksList />
    </div>
  );
}

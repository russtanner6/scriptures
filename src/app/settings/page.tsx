import type { Metadata } from "next";
import Header from "@/components/Header";
import SettingsPanel from "@/components/SettingsPanel";

export const metadata: Metadata = {
  title: "Settings — Scripture Explorer",
  description: "Customize your Scripture Explorer experience.",
};

export default function SettingsPage() {
  return (
    <>
      <Header />
      <div className="page-container">
        <SettingsPanel />
      </div>
    </>
  );
}

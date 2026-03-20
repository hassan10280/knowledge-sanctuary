import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesBar from "@/components/FeaturesBar";
import BookGrid from "@/components/BookGrid";
import LocalEvents from "@/components/LocalEvents";
import Footer from "@/components/Footer";
import FloatingButtons from "@/components/FloatingButtons";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      document.getElementById("book-grid")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection onSearch={handleSearch} />
      <FeaturesBar />
      <BookGrid searchQuery={searchQuery} />
      <LocalEvents />
      <Footer />
      <FloatingButtons />
    </div>
  );
};

export default Index;

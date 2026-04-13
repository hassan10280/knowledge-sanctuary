import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesBar from "@/components/FeaturesBar";
import BookGrid from "@/components/BookGrid";
import LocalEvents from "@/components/LocalEvents";
import Footer from "@/components/Footer";
import FloatingButtons from "@/components/FloatingButtons";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useBooks, useCategories } from "@/hooks/useBooks";

const HomePageLoader = () => (
  <div className="min-h-screen bg-background">
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="h-10 w-36 rounded-md bg-muted animate-pulse" />
        <div className="hidden md:flex items-center gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-4 w-20 rounded bg-muted animate-pulse" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-24 rounded-lg bg-muted animate-pulse" />
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-7xl px-6 pt-32 pb-20 lg:px-8">
      <div className="rounded-[2rem] bg-muted/40 px-8 py-20 text-center">
        <div className="mx-auto mb-6 h-8 w-56 rounded-full bg-muted animate-pulse" />
        <div className="mx-auto mb-4 h-16 w-full max-w-3xl rounded bg-muted animate-pulse" />
        <div className="mx-auto mb-10 h-6 w-full max-w-2xl rounded bg-muted animate-pulse" />
        <div className="mx-auto h-14 w-full max-w-2xl rounded-2xl bg-muted animate-pulse" />
      </div>

      <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const headerQuery = useSiteSettings("header");
  const heroQuery = useSiteSettings("hero");
  const footerQuery = useSiteSettings("footer");
  const booksQuery = useBooks();
  const categoriesQuery = useCategories();

  const isInitialLoading = [headerQuery, heroQuery, footerQuery, booksQuery, categoriesQuery].some(
    (query) => query.isLoading && !query.data,
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      document.getElementById("book-grid")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (isInitialLoading) {
    return <HomePageLoader />;
  }

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

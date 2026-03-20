import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesBar from "@/components/FeaturesBar";
import BookGrid from "@/components/BookGrid";
import LocalEvents from "@/components/LocalEvents";
import Footer from "@/components/Footer";
import FloatingButtons from "@/components/FloatingButtons";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesBar />
      <BookGrid />
      <LocalEvents />
      <Footer />
      <FloatingButtons />
    </div>
  );
};

export default Index;

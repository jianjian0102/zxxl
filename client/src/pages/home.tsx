import HeroSection from "@/components/HeroSection";
import ServiceCards from "@/components/ServiceCards";
import ProcessSteps from "@/components/ProcessSteps";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <HeroSection />
        <ServiceCards />
        <ProcessSteps />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
}

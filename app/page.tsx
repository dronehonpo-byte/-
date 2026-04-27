import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FloatingCTA } from "@/components/floating-cta";
import { Hero } from "@/components/sections/hero";
import { PainPoints } from "@/components/sections/pain-points";
import { Strengths } from "@/components/sections/strengths";
import { MenusSection } from "@/components/sections/menus-section";
import { Pricing } from "@/components/sections/pricing";
import { Flow } from "@/components/sections/flow";
import { Leadership } from "@/components/sections/leadership";
import { Trust } from "@/components/sections/trust";
import { Faq } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <PainPoints />
        <Strengths />
        <MenusSection />
        <Pricing />
        <Flow />
        <Faq />
        <Leadership />
        <Trust />
        <FinalCta />
      </main>
      <Footer />
      <FloatingCTA />
    </>
  );
}

import BackgroundEffects from '@/components/BackgroundEffects';
import Hero from '@/components/Hero';
import EventDetails from '@/components/EventDetails';
import About from '@/components/About';
import Categories from '@/components/Categories';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main>
      {/* Animated Cyberpunk Background */}
      <BackgroundEffects />
      
      {/* Hero Section - Full viewport with logo */}
      <Hero />
      
      {/* Event Details Section - Date, Time, Venue */}
      <EventDetails />
      
      {/* About Section - What is CTF? */}
      <About />
      
      {/* Categories Section - Three CTF Tracks */}
      <Categories />
      
      {/* Footer - Organizer Information */}
      <Footer />
    </main>
  );
}

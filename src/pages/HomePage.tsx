import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, Waves, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-beach.jpg';

const destinations = [
  { name: 'Praia da Barra', emoji: '🏖️' },
  { name: 'Costa Nova', emoji: '🏡' },
  { name: 'Porto', emoji: '🌉' },
  { name: 'Coimbra', emoji: '🏛️' },
  { name: 'Lisboa', emoji: '🌇' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen pb-20">
      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={heroImage}
          alt="Aveiro beach aerial view"
          className="w-full h-full object-cover"
          width={1280}
          height={720}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/30 to-foreground/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <Waves className="w-6 h-6 text-primary-foreground animate-wave" />
          </div>
          <h1 className="text-3xl font-extrabold text-primary-foreground tracking-tight">
            UA Beach Rides
          </h1>
          <p className="text-sm text-primary-foreground/80 mt-1">
            Share rides to the beach & beyond 🌊
          </p>
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-6 max-w-lg mx-auto">
        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/search">
            <Button variant="outline" className="w-full h-20 flex-col gap-2 glass-card border-border/50">
              <Search className="w-6 h-6 text-primary" />
              <span className="text-sm font-semibold">Find a Ride</span>
            </Button>
          </Link>
          <Link to="/post">
            <Button variant="outline" className="w-full h-20 flex-col gap-2 glass-card border-border/50">
              <PlusCircle className="w-6 h-6 text-primary" />
              <span className="text-sm font-semibold">Offer a Ride</span>
            </Button>
          </Link>
        </div>

        {/* Popular destinations */}
        <div>
          <h2 className="text-lg font-bold mb-3">Popular Destinations</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            {destinations.map((d) => (
              <Link
                key={d.name}
                to={`/search?destination=${encodeURIComponent(d.name)}`}
                className="flex-shrink-0 glass-card rounded-xl px-4 py-3 flex items-center gap-2 hover:border-primary/30 transition-colors"
              >
                <span className="text-lg">{d.emoji}</span>
                <span className="text-sm font-medium whitespace-nowrap">{d.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick info */}
        <div className="glass-card rounded-xl p-4 space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> How it works
          </h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Sign up and set your profile</li>
            <li>Search for rides or offer your own</li>
            <li>Book a seat and share the costs</li>
            <li>Meet at the pickup point & go! 🚗</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

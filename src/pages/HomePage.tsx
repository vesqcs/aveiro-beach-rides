import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, Waves, MapPin, Globe } from 'lucide-react'; // Adicionei Globe
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-beach.jpg';
import { translations } from '@/translations'; // Importa o dicionário
import { useState } from 'react';

const destinations = [
  { name: 'Praia da Barra', emoji: '🏖️' },
  { name: 'Costa Nova', emoji: '🏡' },
  { name: 'Porto', emoji: '🌉' },
  { name: 'Coimbra', emoji: '🏛️' },
  { name: 'Lisboa', emoji: '🌇' },
];

export default function HomePage() {
  const { user } = useAuth();
  // Estado local para a língua (depois podemos mover para as definições)
  const [lang, setLang] = useState<'en' | 'pt'>('pt'); 
  const t = translations[lang];

  return (
    <div className="min-h-screen pb-20">
      {/* Botão Flutuante para trocar língua (temporário para testares) */}
      <button 
        onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}
        className="fixed top-4 right-4 z-50 bg-white/80 p-2 rounded-full shadow-lg flex items-center gap-1 text-xs font-bold"
      >
        <Globe className="w-4 h-4" /> {lang.toUpperCase()}
      </button>

      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={heroImage}
          alt="Aveiro beach"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/30 to-foreground/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <Waves className="w-6 h-6 text-primary-foreground animate-wave mb-2" />
          <h1 className="text-3xl font-extrabold text-primary-foreground tracking-tight">
            UA Beach Rides
          </h1>
          <p className="text-sm text-primary-foreground/80 mt-1">
            {t.hero_subtitle}
          </p>
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-6 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/search">
            <Button variant="outline" className="w-full h-20 flex-col gap-2 glass-card border-border/50">
              <Search className="w-6 h-6 text-primary" />
              <span className="text-sm font-semibold">{t.find_ride}</span>
            </Button>
          </Link>
          <Link to="/post">
            <Button variant="outline" className="w-full h-20 flex-col gap-2 glass-card border-border/50">
              <PlusCircle className="w-6 h-6 text-primary" />
              <span className="text-sm font-semibold">{t.offer_ride}</span>
            </Button>
          </Link>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-3">{t.popular_destinations}</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            {destinations.map((d) => (
              <Link key={d.name} to={`/search?destination=${encodeURIComponent(d.name)}`} className="flex-shrink-0 glass-card rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-lg">{d.emoji}</span>
                <span className="text-sm font-medium whitespace-nowrap">{d.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> {t.how_it_works}
          </h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            {t.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
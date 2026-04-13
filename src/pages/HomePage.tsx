import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Search, PlusCircle, Waves, MapPin } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-beach.jpg';
import { translations } from '@/translations'; 
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import RatingModal from '@/components/RatingModal';

const destinations = [
  { name: 'Praia da Barra', emoji: '🏖️' },
  { name: 'Costa Nova', emoji: '🏡' },
  { name: 'Porto', emoji: '🌉' },
  { name: 'Coimbra', emoji: '🏛️' },
  { name: 'Lisboa', emoji: '🌇' },
];

export default function HomePage() {
  const { user } = useAuth();
  const [lang] = useState<'en' | 'pt'>('pt'); 
  const t = translations[lang];
  const [rideToRate, setRideToRate] = useState<any>(null);

  useEffect(() => {
    const checkPendingReviews = async () => {
      if (!user) return;

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Verificar reservas aceites onde o utilizador é passageiro
      const { data: bookings } = await supabase
        .from('bookings')
        .select('ride_id, rides(*, profiles:driver_id(full_name))')
        .eq('passenger_id', user.id)
        .eq('status', 'accepted');

      if (bookings) {
        for (const b of bookings) {
          if (!b.rides) continue;

          // CONDIÇÃO HÍBRIDA MELHORADA
          const isCompleted = b.rides.status === 'completed';
          const isPastDate = b.rides.ride_date < todayStr;

          if (isCompleted || isPastDate) {
            // Verificar se este passageiro já avaliou ESTA viagem
            const { data: review } = await supabase
              .from('reviews')
              .select('id')
              .eq('ride_id', b.ride_id)
              .eq('reviewer_id', user.id)
              .maybeSingle();

            if (!review) {
              setRideToRate(b.rides);
              break; 
            }
          }
        }
      }
    };

    checkPendingReviews();
  }, [user]);

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {rideToRate && (
        <RatingModal 
          ride={rideToRate} 
          onComplete={() => setRideToRate(null)} 
        />
      )}

      <div className="relative h-72 overflow-hidden">
        <img src={heroImage} alt="Boleia Hero" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-slate-900/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <Waves className="w-8 h-8 text-primary animate-pulse mb-3" />
          <h1 className="text-5xl font-black text-white tracking-tighter italic">BOLEIA</h1>
          <p className="text-sm text-white/80 mt-2 font-medium uppercase tracking-widest">{t.hero_subtitle}</p>
        </div>
      </div>

      <div className="px-4 -mt-8 relative z-10 space-y-6 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-4">
          <Link to="/search">
            <Button className="w-full h-24 flex-col gap-2 bg-white hover:bg-slate-50 text-slate-900 border-none shadow-xl rounded-2xl transition-transform active:scale-95">
              <Search className="w-6 h-6 text-primary" />
              <span className="text-sm font-black uppercase tracking-tight">{t.find_ride}</span>
            </Button>
          </Link>
          <Link to="/post">
            <Button className="w-full h-24 flex-col gap-2 bg-white hover:bg-slate-50 text-slate-900 border-none shadow-xl rounded-2xl transition-transform active:scale-95">
              <PlusCircle className="w-6 h-6 text-primary" />
              <span className="text-sm font-black uppercase tracking-tight">{t.offer_ride}</span>
            </Button>
          </Link>
        </div>

        <div>
          <h2 className="text-xs font-black text-slate-400 mb-3 uppercase tracking-[0.2em] px-1">{t.popular_destinations}</h2>
          <div className="flex gap-2 overflow-x-auto pb-4 -mx-1 px-1 no-scrollbar">
            {destinations.map((d) => (
              <Link key={d.name} to={`/search?destination=${encodeURIComponent(d.name)}`} className="flex-shrink-0 bg-white border border-slate-100 shadow-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-lg">{d.emoji}</span>
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{d.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4 shadow-2xl">
          <h3 className="font-black flex items-center gap-2 text-lg uppercase italic tracking-tighter">
            <MapPin className="w-5 h-5 text-primary" /> {t.how_it_works}
          </h3>
          <ol className="text-sm text-slate-300 space-y-3">
            {t.steps.map((step, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-5 h-5 bg-primary text-slate-900 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5">{i + 1}</span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
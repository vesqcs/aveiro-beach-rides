import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Star, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function RatingModal({ ride, onComplete }: { ride: any, onComplete: () => void }) {
  const [isDriver, setIsDriver] = useState(false);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [ratings, setRatings] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const setupModal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);
      const driverStatus = ride.driver_id === user.id;
      setIsDriver(driverStatus);

      if (driverStatus) {
        // Vai buscar apenas passageiros com reserva ACEITE
        const { data: bookings } = await supabase
          .from('bookings')
          .select('passenger_id, profiles:passenger_id(full_name, user_id)')
          .eq('ride_id', ride.id)
          .eq('status', 'accepted');
        
        if (bookings) {
          // Filtra para garantir que não há perfis nulos
          const list = bookings.map(b => b.profiles).filter(p => p !== null);
          setPassengers(list);
          
          const initial: any = {};
          list.forEach((p: any) => initial[p.user_id] = 0);
          setRatings(initial);
        }
      } else {
        // Se for passageiro, inicializa o rating para o condutor
        setRatings({ 'driver': 0 });
      }
      setLoading(false);
    };
    setupModal();
  }, [ride]);

  const handleSetRating = (id: string, value: number) => {
    setRatings(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    if (!currentUserId) return;

    const reviewEntries = [];

    if (isDriver) {
      // Condutor avalia passageiros individualmente
      for (const p of passengers) {
        if (ratings[p.user_id] > 0) {
          reviewEntries.push({
            ride_id: ride.id,
            reviewer_id: currentUserId,
            reviewed_id: p.user_id,
            rating: ratings[p.user_id]
          });
        }
      }
      if (passengers.length > 0 && reviewEntries.length === 0) {
        return toast.error("Avalia pelo menos um passageiro!");
      }
    } else {
      // Passageiro avalia condutor
      const myRating = ratings['driver'] || 0;
      if (myRating === 0) return toast.error("Seleciona as estrelas para o condutor!");
      
      reviewEntries.push({
        ride_id: ride.id,
        reviewer_id: currentUserId,
        reviewed_id: ride.driver_id,
        rating: myRating
      });
    }

    // Se não houver passageiros para avaliar (lista vazia), apenas fechamos
    if (isDriver && passengers.length === 0) {
      onComplete();
      return;
    }

    const { error } = await supabase.from('reviews').insert(reviewEntries);

    if (error) {
      console.error(error);
      toast.error("Erro ao guardar avaliações");
    } else {
      toast.success("Feedback guardado com sucesso!");
      onComplete();
    }
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-300 relative">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 leading-tight">
            {isDriver ? "Avaliar Passageiros" : "Como foi a boleia?"}
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            {isDriver 
              ? "Dá o teu feedback sobre quem viajou contigo" 
              : `Avalia o condutor ${ride.profiles?.full_name || 'da viagem'}`}
          </p>
        </div>

        <div className="space-y-6 max-h-[45vh] overflow-y-auto pr-2 no-scrollbar">
          {isDriver ? (
            passengers.length > 0 ? (
              passengers.map((p) => (
                <div key={p.user_id} className="bg-slate-50 p-5 rounded-[24px] flex flex-col items-center gap-3 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                    <span className="font-bold text-slate-700 tracking-tight">{p.full_name}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        onClick={() => handleSetRating(p.user_id, s)}
                        className={`w-9 h-9 cursor-pointer transition-all active:scale-90 ${
                          ratings[p.user_id] >= s ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-slate-300" />
                <p className="text-slate-400 text-sm italic">Não foram encontrados passageiros aceites para esta viagem.</p>
              </div>
            )
          ) : (
            <div className="bg-slate-50 p-8 rounded-[24px] flex flex-col items-center gap-5 border border-primary/10 shadow-sm">
               <span className="font-black text-slate-700 text-xl tracking-tighter uppercase italic">{ride.profiles?.full_name}</span>
               <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      onClick={() => handleSetRating('driver', s)}
                      className={`w-11 h-11 cursor-pointer transition-all active:scale-90 ${
                        ratings['driver'] >= s ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
            </div>
          )}
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full h-14 mt-8 font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 transition-transform active:scale-95"
        >
          {isDriver && passengers.length === 0 ? "Fechar" : "Concluir Avaliações"}
        </Button>
      </div>
    </div>
  );
}
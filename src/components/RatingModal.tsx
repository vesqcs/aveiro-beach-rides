import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

export default function RatingModal({ ride, onComplete }: { ride: any, onComplete: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const handleSubmit = async () => {
    if (rating === 0) return toast.error("Seleciona pelo menos uma estrela!");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Usando user_id porque confirmámos que é o nome na tua tabela de profiles
    const { error } = await supabase.from('reviews').insert({
      ride_id: ride.id,
      reviewer_id: user.id, 
      reviewed_id: ride.driver_id,
      rating: rating
    });

    if (error) {
      console.error(error);
      toast.error("Erro ao guardar avaliação");
    } else {
      toast.success("Obrigado pelo teu feedback!");
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">Como foi a boleia?</h2>
          <p className="text-slate-500 text-sm mt-2">Avalia a tua viagem com o <strong>{ride.profiles?.full_name}</strong></p>
        </div>

        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              className="transition-transform active:scale-90"
            >
              <Star 
                className={`w-10 h-10 ${
                  (hover || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'
                } transition-colors`} 
              />
            </button>
          ))}
        </div>

        <Button onClick={handleSubmit} className="w-full h-12 font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20">
          Enviar Avaliação
        </Button>
      </div>
    </div>
  );
}
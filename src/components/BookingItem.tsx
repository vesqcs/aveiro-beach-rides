import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, User, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function BookingItem({ 
  booking, 
  onUpdate, 
  isRideCompleted 
}: { 
  booking: any, 
  onUpdate: () => void, 
  isRideCompleted?: boolean 
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      // 1. Fetch do Rating do passageiro
      const { data: ratData } = await supabase.rpc('get_user_rating', { user_uuid: booking.passenger_id });
      if (ratData && ratData[0]) {
        setRating(ratData[0].avg_rating);
        setTotalReviews(ratData[0].total_count);
      }

      // 2. Verificar se o condutor logado já avaliou este passageiro NESTA viagem
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isRideCompleted) {
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('ride_id', booking.ride_id)
          .eq('reviewer_id', user.id)
          .eq('reviewed_id', booking.passenger_id)
          .maybeSingle();
        
        if (existingReview) setHasRated(true);
      }
    };
    
    fetchInitialData();
  }, [booking.passenger_id, booking.ride_id, isRideCompleted]);

  const updateStatus = async (status: 'accepted' | 'rejected') => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', booking.id);
    if (!error) {
      toast.success(status === 'accepted' ? "Passageiro Confirmado" : "Pedido Recusado");
      onUpdate();
    } else {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleRate = async (stars: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Sessão expirada");
      return;
    }

    const { error } = await supabase.from('reviews').insert({
      ride_id: booking.ride_id,
      reviewer_id: user.id,   
      reviewed_id: booking.passenger_id, 
      rating: stars
    });

    if (error) {
      console.error(error);
      toast.error("Erro ao enviar avaliação ou já avaliado.");
    } else {
      toast.success("Avaliação enviada!");
      setHasRated(true);
    }
  };

  const isApproved = booking.status === 'accepted' || booking.status === 'CONFIRMED';

  return (
    <div className={`bg-white border rounded-[24px] p-4 flex flex-col gap-3 shadow-sm transition-all ${isRideCompleted ? 'border-slate-100' : 'border-slate-100 hover:border-primary/10'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center border shadow-inner overflow-hidden">
            {/* Aqui podes meter o avatar do passageiro se o tiveres no profile */}
            {booking.profiles?.avatar_url ? (
              <img src={booking.profiles.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-slate-300" />
            )}
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-800 text-sm tracking-tight uppercase italic">
                {booking.profiles?.full_name}
              </span>
              <div className="flex items-center bg-yellow-50 px-1.5 py-0.5 rounded-lg border border-yellow-100 shadow-sm">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                <span className="text-[10px] font-black text-yellow-700 ml-1">
                  {rating && rating > 0 ? rating.toFixed(1) : 'NEW'}
                </span>
              </div>
            </div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-left">
              {totalReviews} Experiências
            </span>
          </div>
        </div>

        {/* Status ou Botões de Ação Rápida */}
        {!isRideCompleted && (
          <div>
            {booking.status === 'pending' ? (
              <div className="flex gap-2">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => updateStatus('rejected')} 
                  className="w-8 h-8 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  onClick={() => updateStatus('accepted')} 
                  className="w-8 h-8 rounded-xl bg-primary shadow-lg shadow-primary/20 hover:bg-primary/90 transition-transform active:scale-90"
                >
                  <Check className="w-4 h-4 text-white" />
                </Button>
              </div>
            ) : (
              <div className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl tracking-widest italic border ${
                isApproved 
                  ? 'bg-green-50 text-green-600 border-green-100' 
                  : 'bg-red-50 text-red-600 border-red-100'
              }`}>
                {isApproved ? 'Confirmado' : 'Recusado'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ÁREA DE AVALIAÇÃO: Só aparece se a viagem estiver concluída e o passageiro aprovado */}
      {isRideCompleted && isApproved && (
        <div className="pt-3 border-t border-slate-50 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avaliar passageiro</span>
            <span className="text-[9px] font-bold text-primary uppercase italic">Viagem Terminada</span>
          </div>
          
          {hasRated ? (
            <div className="text-[9px] font-black text-green-500 uppercase italic flex items-center gap-1 bg-green-50 px-3 py-1 rounded-lg border border-green-100">
              <Check className="w-3 h-3" /> Avaliado
            </div>
          ) : (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => handleRate(star)}
                  className="p-1 hover:scale-125 transition-transform group"
                >
                  <Star className="w-5 h-5 text-slate-200 group-hover:text-yellow-400 group-hover:fill-yellow-400 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, User, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function BookingItem({ booking, onUpdate }: { booking: any, onUpdate: () => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    const fetchPassengerRating = async () => {
      const { data } = await supabase.rpc('get_user_rating', { 
        user_uuid: booking.passenger_id 
      });

      if (data && data[0]) {
        setRating(data[0].avg_rating);
        setTotalReviews(data[0].total_count);
      }
    };
    fetchPassengerRating();
  }, [booking.passenger_id]);

  const updateStatus = async (status: 'accepted' | 'rejected') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', booking.id);

    if (error) {
      toast.error("Erro na operação");
    } else {
      toast.success(status === 'accepted' ? "Passageiro Aceite" : "Pedido Recusado");
      onUpdate();
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-primary/20 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center border shadow-inner">
          <User className="w-5 h-5 text-slate-300" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-800 text-sm tracking-tight italic uppercase">
              {booking.profiles?.full_name}
            </span>
            
            <div className="flex items-center bg-yellow-50 px-1.5 py-0.5 rounded-lg border border-yellow-100 shadow-sm">
              <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
              <span className="text-[10px] font-black text-yellow-700 ml-1">
                {rating && rating > 0 ? rating : 'NEW'}
              </span>
            </div>
          </div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
             {totalReviews} Experiências
          </span>
        </div>
      </div>

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
            className="w-8 h-8 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform active:scale-90"
          >
            <Check className="w-4 h-4 text-white" />
          </Button>
        </div>
      ) : (
        <div className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl italic tracking-widest ${
          booking.status === 'accepted' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {booking.status === 'accepted' ? 'Confirmado' : 'Recusado'}
        </div>
      )}
    </div>
  );
}
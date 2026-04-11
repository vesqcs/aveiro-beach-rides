import { Tables } from '@/integrations/supabase/types';
import { MapPin, Calendar, Clock, Users, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';

interface RideCardProps {
  ride: Tables<'rides'> & { 
    profiles?: {
      full_name: string | null;
      car_model: string | null;
      car_color: string | null;
      car_plate: string | null;
      rating: number | null;
    } | null 
  };
  onBook?: () => void;
  showBookButton?: boolean;
  bookingStatus?: string;
}

export default function RideCard({ ride, showBookButton = false, bookingStatus: initialStatus }: RideCardProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  
  const rideDate = new Date(ride.ride_date + 'T00:00:00');

  const handleBookSeat = async () => {
    if (!user) {
      toast.error("Por favor, faz login para pedir um lugar");
      return;
    }
    setLoading(true);
    try {
      const { data: existingBooking, error: checkError } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('ride_id', ride.id)
        .eq('passenger_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingBooking && existingBooking.status !== 'rejected') {
        toast.error("Já enviaste um pedido para esta boleia!");
        setStatus(existingBooking.status);
        setLoading(false);
        return;
      }

      if (existingBooking?.status === 'rejected') {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ status: 'pending' })
          .eq('id', existingBooking.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('bookings')
          .insert({
            ride_id: ride.id,
            passenger_id: user.id,
            status: 'pending',
          });
        if (insertError) throw insertError;
      }
      toast.success("Pedido enviado! 🎉");
      setStatus('pending');
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error("Não foi possível processar o pedido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3 animate-fade-up border shadow-sm bg-white">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <MapPin className="w-4 h-4" />
            <span>{ride.origin}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{ride.destination}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-primary">€{Number(ride.cost_share).toFixed(2)}</span>
          <p className="text-[10px] text-muted-foreground font-medium uppercase">por lugar</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground border-y py-2">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(rideDate, 'dd MMM')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{ride.ride_time.slice(0, 5)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>{ride.seats_available} lugares</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-col gap-1">
          {ride.profiles?.full_name && (
            <p className="text-[11px] text-muted-foreground">
              Condutor: <span className="font-semibold text-slate-700">{ride.profiles.full_name}</span>
            </p>
          )}
          
          {ride.profiles?.car_model && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 italic">
                <Car className="w-3 h-3 text-primary/70" />
                <span>{ride.profiles.car_color} • {ride.profiles.car_model}</span>
              </div>
              
              {/* MATRÍCULA: Só aparece se estiver confirmado */}
              {status === 'confirmed' && ride.profiles?.car_plate && (
                <div className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded border border-slate-700 w-fit tracking-wider">
                  {ride.profiles.car_plate.toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showBookButton && !status && (
        <Button 
          onClick={handleBookSeat} 
          disabled={loading || ride.seats_available === 0}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold" 
          size="sm"
        >
          {ride.seats_available === 0 ? 'Lotação Esgotada' : (loading ? 'A processar...' : 'Pedir Lugar')}
        </Button>
      )}

      {status === 'pending' && (
        <div className="text-center text-xs font-bold text-orange-500 bg-orange-50 border border-orange-200 rounded-lg py-2 animate-pulse">
          Pedido Pendente...
        </div>
      )}

      {status === 'confirmed' && (
        <div className="text-center text-xs font-bold text-green-600 bg-green-50 border border-green-200 rounded-lg py-2 mb-1">
          ✓ Lugar Confirmado!
        </div>
      )}

      {status === 'rejected' && (
        <div className="text-center text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg py-2">
          ✕ Pedido Recusado
        </div>
      )}
    </div>
  );
}
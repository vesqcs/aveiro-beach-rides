import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation2, Calendar, Clock, Car, Star, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RideCardProps {
  ride: any;
  showBookButton?: boolean;
  bookingStatus?: string;
}

export default function RideCard({ ride, showBookButton, bookingStatus }: RideCardProps) {
  const navigate = useNavigate();

  const handleBooking = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Precisas de estar ligado para reservar');
        return;
      }
      const { error } = await supabase.from('bookings').insert({
        ride_id: ride.id,
        passenger_id: user.id,
        status: 'pending'
      });
      if (error) throw error;
      toast.success('Pedido de reserva enviado!');
    } catch (error) {
      toast.error('Erro ao fazer reserva');
    }
  };

  return (
    <Card 
      onClick={() => navigate(`/ride/${ride.id}`)}
      className="overflow-hidden border-slate-200 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group"
    >
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border">
              <Car className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800">{ride.profiles?.full_name}</p>
              <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
                <Star className="w-3 h-3 fill-current" />
                {ride.profiles?.rating || 'Novo'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-primary">{ride.cost_share}€</p>
          </div>
        </div>

        <div className="relative space-y-3 pl-6 italic">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <MapPin className="w-4 h-4 text-slate-400" /> {ride.origin}
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <Navigation2 className="w-4 h-4 text-primary" /> {ride.destination}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <div className="flex gap-4 text-[11px] text-slate-500">
            <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ride.ride_date).toLocaleDateString()}</div>
            <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ride.ride_time}</div>
          </div>
        </div>

        <div className="pt-2">
          {showBookButton ? (
            <Button onClick={handleBooking} className="w-full font-bold h-9 text-xs">Reservar Lugar</Button>
          ) : (
            <div className="w-full text-center py-2 text-[10px] text-slate-400 font-bold uppercase flex items-center justify-center gap-1">
              Ver detalhes e Chat <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Clock, ChevronLeft, Users, ShieldCheck } from 'lucide-react';
import RideChat from '@/components/RideChat';
import BookingItem from '@/components/BookingItem';
import { toast } from 'sonner';

export default function RideDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ride, setRide] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    if (!id) return;
    
    const { data: rideData, error } = await supabase
      .from('rides')
      .select('*, profiles:driver_id(full_name, car_model)')
      .eq('id', id)
      .single();

    if (error) {
      toast.error("Viagem não encontrada");
      navigate('/search');
      return;
    }
    setRide(rideData);

    // Carrega pedidos se for o condutor
    if (rideData.driver_id === user?.id) {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*, profiles:passenger_id(full_name)')
        .eq('ride_id', id);
      
      if (bookingsData) setBookings(bookingsData);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchDetails();
  }, [id, user]);

  if (loading) return <div className="p-20 text-center font-bold animate-pulse text-slate-400 uppercase tracking-widest text-xs">A sincronizar dados...</div>;

  const isDriver = ride.driver_id === user?.id;

  return (
    <div className="min-h-screen pt-4 pb-20 px-4 max-w-lg mx-auto space-y-6 bg-slate-50">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-slate-400 hover:text-slate-900 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </Button>

      {/* Card Principal da Viagem */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Destino</span>
            <h2 className="text-2xl font-black text-slate-900 leading-tight italic uppercase tracking-tighter">{ride.destination}</h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Custo</span>
            <Badge className="bg-slate-900 text-white font-black px-3 py-1 text-sm rounded-xl">
              {ride.cost_share}€
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-50 text-sm">
          <div className="flex items-center gap-3 font-bold text-slate-600">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
              <MapPin className="w-3 h-3 text-slate-400" />
            </div>
            {ride.origin}
          </div>
          <div className="flex items-center gap-6 font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-300" /> {new Date(ride.ride_date).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-300" /> {ride.ride_time}
            </div>
          </div>
        </div>
      </div>

      {/* GESTÃO DE PASSAGEIROS - APENAS CONDUTOR VÊ */}
      {isDriver && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4" /> Passageiros ({bookings.length})
            </h3>
            <div className="flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
               <ShieldCheck className="w-3 h-3" /> Verificado
            </div>
          </div>
          
          <div className="space-y-2">
            {bookings.length > 0 ? (
              bookings.map((b) => (
                <BookingItem key={b.id} booking={b} onUpdate={fetchDetails} />
              ))
            ) : (
              <div className="bg-white/50 p-8 rounded-[24px] border border-dashed border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sem pedidos pendentes</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHAT - ESPAÇO DEDICADO À COMUNICAÇÃO */}
      <div className="space-y-3">
        <div className="px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chat da Viagem</div>
        <RideChat rideId={ride.id} />
      </div>
    </div>
  );
}
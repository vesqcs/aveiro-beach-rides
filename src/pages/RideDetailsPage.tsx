import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Clock, ChevronLeft, Users, Send } from 'lucide-react';
import RideChat from '@/components/RideChat';
import BookingItem from '@/components/BookingItem';
import { toast } from 'sonner';

export default function RideDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ride, setRide] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [userBooking, setUserBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    if (!id || !user) return;
    
    // 1. Buscar detalhes da boleia
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

    // 2. Buscar a minha reserva (se eu for passageiro nesta viagem)
    const { data: myBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('ride_id', id)
      .eq('passenger_id', user.id)
      .maybeSingle();
    setUserBooking(myBooking);

    // 3. Se eu for o condutor, buscar todos os pedidos
    if (rideData.driver_id === user.id) {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*, profiles:passenger_id(full_name)')
        .eq('ride_id', id);
      
      if (bookingsData) setBookings(bookingsData);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (id) {
      // MARCAR COMO LIDO: Guarda o momento da visita
      localStorage.setItem(`last_visit_${id}`, new Date().toISOString());
    }
    fetchDetails();
  }, [id, user]);

  const handleRequestRide = async () => {
    if (!user || !ride) return;

    const { error } = await supabase
      .from('bookings')
      .insert([
        { 
          ride_id: ride.id, 
          passenger_id: user.id, 
          status: 'pending' 
        }
      ]);

    if (error) {
      toast.error("Erro ao pedir boleia");
    } else {
      toast.success("Pedido enviado! Aguarda a confirmação.");
      fetchDetails(); 
    }
  };

  if (loading) return <div className="p-20 text-center font-bold animate-pulse text-slate-400">A carregar...</div>;

  const isDriver = ride.driver_id === user?.id;

  return (
    <div className="min-h-screen pt-4 pb-20 px-4 max-w-lg mx-auto space-y-6 bg-slate-50">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-slate-400 hover:text-slate-900 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </Button>

      {/* Info da Viagem */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Destino</span>
            <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">{ride.destination}</h2>
          </div>
          {/* CORREÇÃO: Usamos 'price' em vez de 'cost_share' */}
          <Badge className="bg-slate-900 text-white font-black px-3 py-1 text-sm rounded-xl">
            {ride.price}€
          </Badge>
        </div>
        
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-50 text-sm font-bold text-slate-600">
          <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-slate-300" /> {ride.origin}</div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-300" /> {new Date(ride.ride_date).toLocaleDateString()}</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-300" /> {ride.ride_time}</div>
            {/* ADICIONADO: Lugares disponíveis para o passageiro ver */}
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-300" /> {ride.seats_available} vagas</div>
          </div>
        </div>
      </div>

      {isDriver ? (
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
            <Users className="w-4 h-4" /> Pedidos ({bookings.length})
          </h3>
          <div className="space-y-2">
            {bookings.length > 0 ? (
              bookings.map((b) => <BookingItem key={b.id} booking={b} onUpdate={fetchDetails} />)
            ) : (
              <div className="bg-white/50 p-8 rounded-[24px] border border-dashed border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nenhum pedido</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!userBooking ? (
            <Button 
              onClick={handleRequestRide}
              disabled={ride.seats_available <= 0}
              className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-[24px] font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 gap-3"
            >
              <Send className="w-5 h-5" /> {ride.seats_available > 0 ? 'Reservar Lugar' : 'Esgotado'}
            </Button>
          ) : (
            <div className={`p-4 rounded-[24px] border text-center font-black uppercase text-xs italic tracking-widest ${
              userBooking.status === 'accepted' || userBooking.status === 'confirmed'
              ? 'bg-green-50 text-green-600 border-green-100' 
              : 'bg-yellow-50 text-yellow-600 border-yellow-100'
            }`}>
              {userBooking.status === 'accepted' || userBooking.status === 'confirmed' 
                ? '✅ Estás confirmado nesta boleia!' 
                : '⏳ Pedido enviado. Aguarda o condutor.'}
            </div>
          )}
        </div>
      )}

      {(isDriver || userBooking?.status === 'accepted' || userBooking?.status === 'confirmed') && (
        <div className="space-y-3">
          <div className="px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversa</div>
          <RideChat rideId={ride.id} />
        </div>
      )}
    </div>
  );
}
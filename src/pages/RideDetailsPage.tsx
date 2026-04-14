import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Clock, ChevronLeft, Users, Send, CheckCircle2, Star, XCircle, AlertTriangle } from 'lucide-react';
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
  const [hasRated, setHasRated] = useState(false);

  const fetchDetails = async () => {
    if (!id || !user) return;
    
    const { data: rideData, error } = await supabase
      .from('rides')
      .select('*, profiles:driver_id(full_name, car_model)')
      .eq('id', id)
      .single();

    if (error || !rideData || rideData.status === 'cancelled') {
      toast.error("Viagem não encontrada ou cancelada");
      navigate('/search');
      return;
    }
    setRide(rideData);

    const { data: myBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('ride_id', id)
      .eq('passenger_id', user.id)
      .maybeSingle();

    setUserBooking(myBooking);

    if (myBooking) {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('ride_id', id)
        .eq('reviewer_id', user.id)
        .maybeSingle();
      if (existingReview) setHasRated(true);
    }

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
    if (!id || !user) return;
    localStorage.setItem(`last_visit_${id}`, new Date().toISOString());
    fetchDetails();

    const channel = supabase.channel(`ride_realtime_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `id=eq.${id}` }, (payload: any) => {
        if (payload.new && payload.new.status === 'cancelled') {
          toast.error("O condutor cancelou esta viagem.");
          navigate('/profile');
        } else {
          fetchDetails();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `ride_id=eq.${id}` }, () => {
        fetchDetails();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  const handleRequestRide = async () => {
    if (!user || !ride) return;
    const { error } = await supabase
      .from('bookings')
      .insert([{ ride_id: ride.id, passenger_id: user.id, status: 'pending' }]);
    if (error) toast.error("Erro ao pedir boleia");
    else {
      toast.success("Pedido enviado!");
      fetchDetails();
    }
  };

  // --- FUNÇÃO DE CANCELAMENTO COM RPC (RESOLVE AS VAGAS) ---
  const handleCancelMyBooking = async () => {
    if (!userBooking || !ride) return;
    const confirm = window.confirm("Queres mesmo cancelar a tua reserva?");
    if (!confirm) return;

    try {
      // 1. Verificar status de forma segura (case-insensitive)
      const status = String(userBooking.status).toLowerCase();
      const wasAccepted = status === 'accepted' || status === 'confirmed';

      // 2. Apagar a reserva (O passageiro tem permissão para isto via RLS)
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('ride_id', id)
        .eq('passenger_id', user.id);

      if (deleteError) throw deleteError;

      // 3. Devolver a vaga usando a função RPC 'restore_seat'
      if (wasAccepted) {
        const { error: rpcError } = await supabase.rpc('restore_seat', { ride_uuid: id });
        if (rpcError) console.error("Erro ao devolver vaga:", rpcError);
      }

      toast.success("Reserva cancelada!");
      setUserBooking(null);
      await fetchDetails();
      navigate('/profile');

    } catch (err: any) {
      console.error("Erro ao processar cancelamento:", err);
      toast.error("Erro ao cancelar reserva");
    }
  };

  const handleCancelWholeRide = async () => {
    const confirm = window.confirm("AVISO: Queres mesmo cancelar esta viagem?");
    if (!confirm) return;

    const { error } = await supabase
      .from('rides')
      .update({ status: 'cancelled' })
      .eq('id', ride.id);

    if (error) toast.error("Erro ao cancelar viagem");
    else {
      toast.success("Viagem cancelada");
      navigate('/profile');
    }
  };

  const handleCompleteRide = async () => {
    const { error } = await supabase
      .from('rides')
      .update({ status: 'completed' })
      .eq('id', ride.id);
    
    if (error) toast.error("Erro ao concluir viagem");
    else {
      toast.success("Viagem concluída!");
      fetchDetails();
    }
  };

  const handleRateDriver = async (stars: number) => {
    if (!user || !ride) return;
    const { error } = await supabase.from('reviews').insert({
      ride_id: ride.id,
      reviewer_id: user.id,
      reviewed_id: ride.driver_id,
      rating: stars
    });
    
    if (error) toast.error("Erro ao enviar avaliação");
    else {
      toast.success("Avaliação enviada!");
      setHasRated(true);
    }
  };

  if (loading) return <div className="p-20 text-center font-bold animate-pulse text-slate-400 text-[10px] uppercase tracking-[0.2em]">Sincronizando...</div>;

  const isDriver = ride.driver_id === user?.id;
  const isCompleted = ride.status === 'completed';
  const rideDateTime = new Date(`${ride.ride_date}T${ride.ride_time}`);
  const now = new Date();
  const isInProgress = now >= rideDateTime && !isCompleted;

  return (
    <div className="min-h-screen pt-4 pb-24 px-4 max-w-lg mx-auto space-y-6 bg-slate-50">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </Button>

      {/* CARD DA VIAGEM */}
      <div className={`p-6 rounded-[32px] border shadow-sm space-y-4 transition-all bg-white border-slate-200 ${isCompleted ? 'opacity-80' : ''}`}>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest italic">Destino</span>
            <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">{ride.destination}</h2>
          </div>
          <Badge className="bg-slate-900 text-white font-black px-3 py-1 text-sm rounded-xl">{ride.price}€</Badge>
        </div>
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-50 text-sm font-bold text-slate-600">
           <div className="flex items-center gap-3 text-slate-800 font-black italic uppercase tracking-tight text-xs"><MapPin className="w-4 h-4 text-primary" /> {ride.origin}</div>
           <div className="flex items-center gap-6">
             <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-300" /> {new Date(ride.ride_date).toLocaleDateString()}</div>
             <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-300" /> {ride.ride_time}</div>
             <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-300" /> {ride.seats_available} vagas</div>
           </div>
        </div>
      </div>

      {/* VISÃO DO CONDUTOR */}
      {isDriver && (
        <div className="space-y-4">
          {isInProgress && (
            <Button onClick={handleCompleteRide} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-lg shadow-green-100 gap-2">
              <CheckCircle2 className="w-5 h-5" /> Finalizar Viagem
            </Button>
          )}
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><Users className="w-4 h-4" /> Passageiros ({bookings.length})</h3>
          <div className="space-y-2">
            {bookings.length > 0 ? (
              bookings.map((b) => <BookingItem key={b.id} booking={b} onUpdate={fetchDetails} isRideCompleted={isCompleted} />)
            ) : (
              <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem pedidos pendentes</p></div>
            )}
          </div>
        </div>
      )}

      {/* VISÃO DO PASSAGEIRO - RESERVADO */}
      {!isDriver && userBooking && !isCompleted && !isInProgress && (
        <div className="space-y-3">
          <div className={`p-4 rounded-[24px] border text-center font-black uppercase text-xs italic tracking-widest ${userBooking.status === 'accepted' || userBooking.status === 'confirmed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'}`}>
             {userBooking.status === 'accepted' || userBooking.status === 'confirmed' ? '✅ Estás confirmado!' : '⏳ Aguarda confirmação...'}
          </div>
          <Button onClick={handleCancelMyBooking} variant="ghost" className="w-full text-slate-400 hover:text-red-500 text-[9px] font-black uppercase tracking-[0.2em]">
            <AlertTriangle className="w-3 h-3 mr-1" /> Cancelar reserva
          </Button>
        </div>
      )}

      {/* VISÃO DO PASSAGEIRO - BOTÃO RESERVAR */}
      {!isDriver && !userBooking && !isCompleted && !isInProgress && (
        <Button onClick={handleRequestRide} disabled={ride.seats_available <= 0} className="w-full h-16 bg-primary text-white rounded-[24px] font-black uppercase italic tracking-widest shadow-xl shadow-primary/20">
          <Send className="w-5 h-5 mr-2" /> {ride.seats_available > 0 ? 'Reservar Lugar' : 'Esgotado'}
        </Button>
      )}

      {/* AVALIAÇÃO PÓS-VIAGEM */}
      {isCompleted && (userBooking?.status === 'accepted' || userBooking?.status === 'confirmed') && (
        <div className="bg-white border-2 border-primary/10 p-6 rounded-[32px] text-center space-y-4">
          <p className="text-sm font-black text-slate-800 uppercase italic">Avaliar o condutor?</p>
          {hasRated ? <p className="text-green-500 font-black text-[10px] uppercase">Avaliação enviada!</p> : (
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => <button key={s} onClick={() => handleRateDriver(s)}><Star className="w-7 h-7 text-slate-200 hover:text-yellow-400 hover:fill-yellow-400" /></button>)}
            </div>
          )}
        </div>
      )}

      {/* CHAT */}
      {(isDriver || userBooking?.status === 'accepted' || userBooking?.status === 'confirmed') && !isCompleted && (
        <div className="space-y-3 pt-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Chat em Tempo Real
          </div>
          <RideChat rideId={ride.id} />
        </div>
      )}

      {/* BOTÃO CANCELAR VIAGEM (CONDUTOR) */}
      <div className="pt-8 pb-10 flex flex-col gap-2">
        {isDriver && !isCompleted && !isInProgress && (
          <Button onClick={handleCancelWholeRide} variant="ghost" className="w-full text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest">
            <XCircle className="w-4 h-4 mr-2" /> Cancelar Viagem Total
          </Button>
        )}
      </div>
    </div>
  );
}
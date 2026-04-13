import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation2, Calendar, Clock, ChevronLeft } from 'lucide-react';
import RideChat from '@/components/RideChat';
import { toast } from 'sonner';

export default function RideDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      if (!id) return;
      const { data, error } = await supabase
        .from('rides')
        .select('*, profiles:driver_id(full_name, car_model)')
        .eq('id', id)
        .single();

      if (error) {
        toast.error("Viagem não encontrada");
        navigate('/search');
      } else {
        setRide(data);
      }
      setLoading(false);
    }
    fetchDetails();
  }, [id, navigate]);

  if (loading) return <div className="p-20 text-center">A carregar detalhes...</div>;

  return (
    <div className="min-h-screen pt-4 px-4 max-w-lg mx-auto space-y-6 bg-slate-50">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-slate-500">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </Button>

      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Boleia para {ride.destination}</h2>
          <Badge className="bg-primary/10 text-primary border-none">{ride.cost_share}€</Badge>
        </div>
        <div className="space-y-3 pt-2 text-sm">
          <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-slate-400" /> <b>De:</b> {ride.origin}</div>
          <div className="flex items-center gap-3"><Navigation2 className="w-4 h-4 text-primary" /> <b>Para:</b> {ride.destination}</div>
          <div className="flex items-center gap-3 text-slate-600"><Calendar className="w-4 h-4" /> {new Date(ride.ride_date).toLocaleDateString()} <Clock className="w-4 h-4 ml-2" /> {ride.ride_time}</div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold px-1">Chat da Boleia</h3>
        <RideChat rideId={ride.id} />
      </div>
    </div>
  );
}
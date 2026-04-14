import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import RideCard from '@/components/RideCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, Filter, Navigation2, Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
import LocationInput from '@/components/LocationInput';

export default function SearchPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [rides, setRides] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [origin, setOrigin] = useState(searchParams.get('origin') || '');
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || '');

  const fetchRides = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

      let query = supabase
        .from('rides')
        .select(`
          id,
          origin,
          destination,
          ride_date,
          ride_time,
          price,
          seats_available,
          driver_id,
          status,
          profiles:driver_id (
            full_name,
            avatar_url
          )
        `)
        .eq('status', 'active')
        .gt('seats_available', 0);

      // LÓGICA DE FILTRO DE TEMPO:
      // 1. A data tem de ser maior que hoje
      // OU
      // 2. A data é hoje E a hora é maior que a atual
      query = query.or(`ride_date.gt.${today},and(ride_date.eq.${today},ride_time.gt.${currentTime})`);

      if (origin.trim()) {
        query = query.ilike('origin', `%${origin.trim()}%`);
      }

      if (destination.trim()) {
        query = query.ilike('destination', `%${destination.trim()}%`);
      }

      if (dateFilter) {
        query = query.eq('ride_date', dateFilter);
      }

      const { data, error } = await query.order('ride_date', { ascending: true }).order('ride_time', { ascending: true });
      
      if (error) throw error;
      setRides(data || []);
    } catch (error: any) {
      console.error('Erro na pesquisa:', error);
      toast.error('Erro ao carregar boleias');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('ride_id, status')
      .eq('passenger_id', user.id);
    
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((b) => (map[b.ride_id] = b.status));
      setBookings(map);
    }
  };

  useEffect(() => {
    fetchRides();
    fetchBookings();
    
    const params: Record<string, string> = {};
    if (origin) params.origin = origin;
    if (destination) params.destination = destination;
    if (dateFilter) params.date = dateFilter;
    setSearchParams(params);
  }, [user, dateFilter]); 

  const clearFilters = () => {
    setOrigin('');
    setDestination('');
    setDateFilter('');
    setSearchParams({});
    fetchRides();
  };

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 max-w-lg mx-auto space-y-6 text-slate-800">
      <h1 className="text-2xl font-black flex items-center gap-2 text-slate-900 tracking-tighter uppercase italic">
        <SearchIcon className="w-6 h-6 text-primary" /> Procurar BOLEIA
      </h1>

      <div className="p-5 bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-5">
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-black text-slate-400 ml-1 tracking-[0.2em]">Origem</Label>
            <LocationInput 
              placeholder="Sair de..." 
              value={origin} 
              onChange={setOrigin} 
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-black text-slate-400 ml-1 tracking-[0.2em]">Destino</Label>
            <LocationInput 
              placeholder="Ir para..." 
              value={destination} 
              onChange={setDestination}
              icon={<Navigation2 className="w-4 h-4 text-primary" />} 
            />
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input 
                type="date" 
                className="pl-9 h-12 bg-slate-50 border-none rounded-2xl font-bold"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            {(origin || destination || dateFilter) && (
              <Button variant="ghost" size="icon" className="h-12 w-12 shrink-0 bg-slate-100 rounded-2xl" onClick={clearFilters}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <Button onClick={fetchRides} className="w-full h-14 font-black uppercase tracking-widest shadow-xl shadow-primary/20 rounded-[20px] transition-all active:scale-95 italic">
          Filtrar Resultados
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-[32px] bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : rides.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200">
          <Filter className="w-12 h-12 mx-auto mb-4 text-slate-200" />
          <p className="font-black text-slate-800 uppercase italic">Nenhuma boleia disponível</p>
          <p className="text-xs text-slate-400 px-10 mt-2 font-medium">
            Tenta mudar os filtros ou volta mais tarde. Viagens "Em curso" já não aparecem aqui!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 italic">
            {rides.length} {rides.length === 1 ? 'Boleia aberta' : 'Boleias abertas'}
          </p>
          {rides.map((ride) => (
            <RideCard 
              key={ride.id} 
              ride={ride} 
              showBookButton={!!user && ride.driver_id !== user.id && !bookings[ride.id]} 
              bookingStatus={bookings[ride.id]} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
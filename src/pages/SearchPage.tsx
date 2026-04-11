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
      let query = supabase
        .from('rides')
        .select(`
          *,
          profiles:driver_id (
            full_name,
            car_model,
            car_color,
            car_plate,
            rating
          )
        `)
        .eq('status', 'active')
        .gt('seats_available', 0)
        .gte('ride_date', new Date().toISOString().split('T')[0])
        .order('ride_date', { ascending: true });

      if (origin.trim()) {
        query = query.ilike('origin', `%${origin.trim()}%`);
      }

      if (destination.trim()) {
        query = query.ilike('destination', `%${destination.trim()}%`);
      }

      if (dateFilter) {
        query = query.eq('ride_date', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRides(data || []);
    } catch (error: any) {
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

  // MUDANÇA AQUI: Removi origin e destination das dependências
  useEffect(() => {
    fetchRides();
    fetchBookings();
    
    const params: Record<string, string> = {};
    if (origin) params.origin = origin;
    if (destination) params.destination = destination;
    if (dateFilter) params.date = dateFilter;
    setSearchParams(params);

  }, [user, dateFilter]); // Só dispara automático se mudar o user ou a data

  const clearFilters = () => {
    setOrigin('');
    setDestination('');
    setDateFilter('');
    setSearchParams({}); // Limpa a URL também
    fetchRides();
  };

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 max-w-lg mx-auto space-y-6 text-slate-800">
      <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
        <SearchIcon className="w-6 h-6 text-primary" /> Procurar Boleia
      </h1>

      <div className="p-4 bg-white rounded-2xl border shadow-sm space-y-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Origem</Label>
            <LocationInput 
              placeholder="Sair de..." 
              value={origin} 
              onChange={setOrigin} 
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Destino</Label>
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
                className="pl-9 h-11 bg-slate-50 border-none"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            {(origin || destination || dateFilter) && (
              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={clearFilters}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Agora o botão é quem manda na pesquisa manual */}
        <Button onClick={fetchRides} className="w-full h-11 font-bold shadow-md shadow-primary/10 transition-all active:scale-95">
          Procurar Agora
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : rides.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-bold text-slate-600">Nenhuma boleia encontrada</p>
          <p className="text-sm text-slate-400 px-8 mt-1 text-balance">
            Tenta selecionar uma cidade da lista de sugestões.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            {rides.length} {rides.length === 1 ? 'viagem disponível' : 'viagens disponíveis'}
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
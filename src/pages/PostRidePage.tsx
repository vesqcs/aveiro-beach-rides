import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Car, AlertCircle, Navigation2 } from 'lucide-react';
import { toast } from 'sonner';
// Importamos o novo componente de Autocomplete
import LocationInput from '@/components/LocationInput';

export default function PostRidePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isDriver, setIsDriver] = useState<boolean | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [rideDate, setRideDate] = useState('');
  const [rideTime, setRideTime] = useState('');
  const [seats, setSeats] = useState('');
  const [costShare, setCostShare] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkDriverStatus() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_driver')
        .eq('user_id', user.id)
        .single();

      if (error || !data?.is_driver) {
        setIsDriver(false);
      } else {
        setIsDriver(true);
      }
      setLoadingProfile(false);
    }

    checkDriverStatus();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isDriver) {
      toast.error('Apenas condutores podem criar viagens');
      return;
    }

    if (!origin.trim() || !destination.trim()) {
      toast.error('Indica uma origem e um destino válidos');
      return;
    }

    const cost = parseFloat(costShare);
    if (isNaN(cost) || cost < 0 || cost > 50) { 
      toast.error('O custo deve ser entre €0 e €50');
      return;
    }

    setLoading(true);
    
    // CORREÇÃO: Mapeamento exato para as colunas da base de dados
    const { error } = await supabase.from('rides').insert({
      driver_id: user.id,
      origin: origin.trim(),
      destination: destination.trim(),
      ride_date: rideDate,
      ride_time: rideTime,
      seats_available: parseInt(seats), // Corrigido de 'seats'
      price: cost,                     // Corrigido de 'cost_share'
      status: 'active'
    });

    if (error) {
      toast.error('Erro ao publicar: ' + error.message);
    } else {
      toast.success('Viagem publicada! 🚗');
      navigate('/search');
    }
    setLoading(false);
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isDriver === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="bg-amber-100 p-4 rounded-full">
          <Car className="w-12 h-12 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Modo Condutor Inativo</h2>
        <p className="text-slate-500 max-w-xs text-sm">
          Precisas de ativar o modo condutor e registar o teu veículo no perfil para poderes publicar viagens.
        </p>
        <Button 
          onClick={() => navigate('/profile', { state: { activeTab: 'driver' } })} 
          className="font-bold"
        >
          Ir para o Perfil
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 pt-4 px-4 max-w-lg mx-auto text-slate-800">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-900">
        <PlusCircle className="w-6 h-6 text-primary" />
        Publicar Viagem
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up">
        {/* ORIGEM COM AUTOCOMPLETE */}
        <div className="space-y-2">
          <Label>Origem</Label>
          <LocationInput 
            placeholder="Cidade de partida (ex: Lisboa, Madrid...)" 
            value={origin} 
            onChange={setOrigin} 
          />
        </div>

        {/* DESTINO COM AUTOCOMPLETE */}
        <div className="space-y-2">
          <Label>Destino</Label>
          <LocationInput 
            placeholder="Para onde vais? (ex: Porto, Paris...)" 
            value={destination} 
            onChange={setDestination}
            icon={<Navigation2 className="w-4 h-4 text-primary" />} 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              className="bg-white h-11"
              value={rideDate}
              onChange={(e) => setRideDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Hora</Label>
            <Input
              type="time"
              className="bg-white h-11"
              value={rideTime}
              onChange={(e) => setRideTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Lugares Disponíveis</Label>
            <Select value={seats} onValueChange={setSeats} required>
              <SelectTrigger className="bg-white h-11">
                <SelectValue placeholder="Qtd." />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contribuição (€)</Label>
            <Input
              type="number"
              step="0.50"
              min="0"
              className="bg-white h-11"
              value={costShare}
              onChange={(e) => setCostShare(e.target.value)}
              placeholder="Ex: 5.00"
              required
            />
          </div>
        </div>

        <div className="flex gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-600 leading-tight">
            Este sistema destina-se à partilha de custos de combustível e portagens. Pede um valor justo.
          </p>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 font-bold text-lg" 
          disabled={loading || !origin || !destination}
        >
          {loading ? 'A publicar...' : 'Publicar Agora'}
        </Button>
      </form>
    </div>
  );
}
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
    
    const { error } = await supabase.from('rides').insert({
      driver_id: user.id,
      origin: origin.trim(),
      destination: destination.trim(),
      ride_date: rideDate,
      ride_time: rideTime,
      seats_available: parseInt(seats),
      price: cost,
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

  // NOVA MENSAGEM: Mais amigável e direta para quem não tem carro registado
  if (isDriver === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fade-up">
        <div className="bg-primary/10 p-6 rounded-full">
          <Car className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
            Falta o teu carro!
          </h2>
          <p className="text-slate-500 max-w-[260px] text-sm font-medium leading-relaxed">
            Para poderes publicar boleias e dividir custos, precisas de registar o teu carro no perfil.
          </p>
        </div>
        <Button 
          onClick={() => navigate('/profile')} 
          className="font-black uppercase tracking-widest px-8 h-12 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          Ir registar carro
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 pt-4 px-4 max-w-lg mx-auto text-slate-800">
      <h1 className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-900 italic uppercase tracking-tighter">
        <PlusCircle className="w-6 h-6 text-primary" />
        Publicar Viagem
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up">
        <div className="space-y-2">
          <Label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Origem</Label>
          <LocationInput 
            placeholder="Cidade de partida..." 
            value={origin} 
            onChange={setOrigin} 
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Destino</Label>
          <LocationInput 
            placeholder="Para onde vais?" 
            value={destination} 
            onChange={setDestination}
            icon={<Navigation2 className="w-4 h-4 text-primary" />} 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Data</Label>
            <Input
              type="date"
              className="bg-white h-12 rounded-xl border-slate-100 font-bold"
              value={rideDate}
              onChange={(e) => setRideDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Hora</Label>
            <Input
              type="time"
              className="bg-white h-12 rounded-xl border-slate-100 font-bold"
              value={rideTime}
              onChange={(e) => setRideTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Vagas</Label>
            <Select value={seats} onValueChange={setSeats} required>
              <SelectTrigger className="bg-white h-12 rounded-xl border-slate-100 font-bold">
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
            <Label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Preço (€)</Label>
            <Input
              type="number"
              step="0.50"
              min="0"
              className="bg-white h-12 rounded-xl border-slate-100 font-bold"
              value={costShare}
              onChange={(e) => setCostShare(e.target.value)}
              placeholder="Ex: 5.00"
              required
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            Lembra-te: este sistema serve para dividir custos de combustível e portagens. Pede um valor justo para a comunidade.
          </p>
        </div>

        <Button 
          type="submit" 
          className="w-full h-14 font-black uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl text-lg italic transition-all active:scale-95" 
          disabled={loading || !origin || !destination}
        >
          {loading ? 'A publicar...' : 'Publicar Agora'}
        </Button>
      </form>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // IMPORTADO
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RideCard from '@/components/RideCard';
import { User, Car, Armchair, LogOut, Check, X, Star, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const location = useLocation(); // INICIALIZADO
  
  // Verifica se existe uma aba definida no "state" do redirecionamento
  const defaultTab = location.state?.activeTab || 'personal';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [carColor, setCarColor] = useState('');
  const [rating, setRating] = useState(5.0);
  const [isDriver, setIsDriver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myRides, setMyRides] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [rideBookings, setRideBookings] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDashboard();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (data) {
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setBio(data.bio || '');
      setCarModel(data.car_model || '');
      setCarPlate(data.car_plate || '');
      setCarColor(data.car_color || '');
      setRating(data.rating || 5.0);
      setIsDriver(data.is_driver || false);
    }
  };

  const fetchDashboard = async () => {
    if (!user) return;

    const { data: rides } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', user.id)
      .order('ride_date', { ascending: true });

    setMyRides(rides || []);

    if (rides && rides.length > 0) {
      const rideIds = rides.map((r) => r.id);
      const { data: rb } = await supabase
        .from('bookings')
        .select('*, profiles:passenger_id(*)')
        .in('ride_id', rideIds)
        .neq('status', 'cancelled');

      const map: Record<string, any[]> = {};
      rb?.forEach((b) => {
        if (!map[b.ride_id]) map[b.ride_id] = [];
        map[b.ride_id].push(b);
      });
      setRideBookings(map);
    }

    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        *,
        rides (
          *,
          profiles:driver_id (
            full_name,
            car_model,
            car_color,
            car_plate,
            rating
          )
        )
      `)
      .eq('passenger_id', user.id);

    setMyBookings(bookings || []);
  };

  const toggleDriverMode = async (checked: boolean) => {
    setIsDriver(checked);
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_driver: checked })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Erro ao mudar modo condutor');
      setIsDriver(!checked);
    } else {
      toast.success(checked ? 'Modo Condutor Ativado!' : 'Modo Condutor Desativado');
      fetchDashboard();
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: fullName, 
        phone: phone, 
        bio: bio, 
        is_driver: isDriver,
        car_model: carModel,
        car_plate: carPlate,
        car_color: carColor
      })
      .eq('user_id', user.id);
    
    if (error) toast.error('Erro ao guardar perfil');
    else toast.success('Dados guardados com sucesso!');
    setSaving(false);
  };

  const handleBookingAction = async (bookingId: string, newStatus: 'confirmed' | 'rejected', rideId: string, currentSeats: number) => {
    try {
      const { error: bookingError } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
      if (bookingError) throw bookingError;

      if (newStatus === 'confirmed') {
        if (currentSeats > 0) {
          const { error: rideError } = await supabase.from('rides').update({ seats_available: currentSeats - 1 }).eq('id', rideId);
          if (rideError) throw rideError;
        } else {
          toast.error("Sem lugares disponíveis!");
          return;
        }
      }
      toast.success(newStatus === 'confirmed' ? 'Confirmado!' : 'Recusado');
      fetchDashboard();
    } catch (error) {
      toast.error('Erro na operação');
    }
  };

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 max-w-lg mx-auto space-y-6 text-slate-800">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
          <User className="w-6 h-6 text-primary" /> Perfil
        </h1>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-500">
          <LogOut className="w-4 h-4 mr-1" /> Sair
        </Button>
      </div>

      {/* TABS COM DEFAULT VALUE DINÂMICO */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="driver">Veículo / Condutor</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <div className="glass-card rounded-xl p-4 space-y-4 shadow-sm border bg-white">
            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-100 w-fit">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="font-bold text-yellow-700">{rating.toFixed(1)}</span>
            </div>
            <div className="space-y-2"><Label>Nome Completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Sobre mim (Bio)</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="h-24 resize-none" /></div>
            <div className="space-y-2"><Label>Telemóvel</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full font-bold">Guardar Perfil</Button>
          </div>
        </TabsContent>

        <TabsContent value="driver" className="space-y-4">
          <div className="glass-card rounded-xl p-4 space-y-4 shadow-sm border bg-white">
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /><Label className="font-bold">Modo Condutor Ativo</Label></div>
              <Switch checked={isDriver} onCheckedChange={toggleDriverMode} />
            </div>

            {!isDriver && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 items-start animate-fade-in">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                  <p className="font-bold mb-1">Queres partilhar o teu carro?</p>
                  <p>Ativa o modo condutor acima para registares o teu veículo e começares a publicar viagens.</p>
                </div>
              </div>
            )}

            {isDriver && (
              <div className="space-y-4 animate-fade-down">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Modelo do Carro</Label><Input placeholder="Ex: Renault Clio" value={carModel} onChange={(e) => setCarModel(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Cor</Label><Input placeholder="Ex: Branco" value={carColor} onChange={(e) => setCarColor(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>Matrícula</Label><Input placeholder="AA-00-BB" value={carPlate} onChange={(e) => setCarPlate(e.target.value)} className="uppercase" /></div>
                <Button onClick={handleSave} disabled={saving} className="w-full font-bold">Atualizar Dados do Carro</Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* GESTÃO CONDUTOR E LISTAS IGUAIS... */}
      {isDriver && myRides.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 mt-4"><Car className="w-5 h-5 text-primary" /> Gestão de Pedidos</h2>
          {myRides.map((ride) => (
            <div key={ride.id} className="space-y-2 border-b pb-4">
              <RideCard ride={ride} />
              <div className="ml-4 space-y-2">
                {rideBookings[ride.id]?.map((b: any) => (
                  <div key={b.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{b.profiles?.full_name}</span>
                        <span className={`text-[9px] uppercase font-black ${b.status === 'pending' ? 'text-orange-500' : 'text-green-600'}`}>{b.status}</span>
                      </div>
                      <div className="flex gap-2">
                        {b.status === 'confirmed' && b.profiles?.phone && (
                          <Button size="sm" className="bg-[#25D366] h-8 px-2 text-[10px] text-white" onClick={() => window.open(`https://wa.me/${b.profiles.phone.replace(/\s+/g, '')}`, '_blank')}>WhatsApp</Button>
                        )}
                        {b.status === 'pending' && (
                          <><Button size="sm" className="bg-green-600 h-8 w-8 p-0" onClick={() => handleBookingAction(b.id, 'confirmed', ride.id, ride.seats_available)}><Check className="w-4 h-4 text-white" /></Button>
                          <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => handleBookingAction(b.id, 'rejected', ride.id, ride.seats_available)}><X className="w-4 h-4" /></Button></>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {myBookings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 mt-4"><Armchair className="w-5 h-5 text-primary" /> Minhas Viagens</h2>
          {myBookings.map((booking: any) => (
            booking.rides && <RideCard key={booking.id} ride={booking.rides} bookingStatus={booking.status} />
          ))}
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Car, Star, ChevronRight, LogOut, Edit2, Users, Save, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AvatarUpload from '@/components/AvatarUpload';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [myRides, setMyRides] = useState<any[]>([]);
  const [rating, setRating] = useState({ avg: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCar, setEditCar] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const fetchProfileData = async () => {
    if (!user) return;
    
    // 1. Dados do Perfil
    const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (prof) {
      setProfile(prof);
      setEditName(prof.full_name || '');
      setEditCar(prof.car_model || '');
      setEditAvatar(prof.avatar_url || '');
    }

    // 2. Ratings
    const { data: rat } = await supabase.rpc('get_user_rating', { user_uuid: user.id });
    if (rat && rat[0]) setRating({ avg: rat[0].avg_rating, count: rat[0].total_count });

    // 3. Viagens como Condutor (FILTRO: Não mostrar canceladas)
    const { data: driverRides } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', user.id)
      .neq('status', 'cancelled'); // <- ESTA LINHA É A CHAVE
    
    // 4. Viagens como Passageiro (FILTRO: Apenas aceites ou confirmadas)
    const { data: passengerBookings } = await supabase
      .from('bookings')
      .select(`
        ride_id,
        status,
        rides (*)
      `)
      .eq('passenger_id', user.id)
      .in('status', ['accepted', 'confirmed', 'pending']); // Incluímos pending para ele ver que pediu

    const ridesAsDriver = (driverRides || []).map(r => ({ ...r, role: 'driver' }));
    
    // Filtrar para garantir que a viagem existe e NÃO foi cancelada pelo condutor
    const ridesAsPassenger = (passengerBookings || [])
      .filter(b => b.rides !== null && b.rides.status !== 'cancelled')
      .map(b => ({ ...b.rides, role: 'passenger' }));

    // Unificar e ordenar
    const allRides = [...ridesAsDriver, ...ridesAsPassenger].sort((a, b) => 
      new Date(b.ride_date).getTime() - new Date(a.ride_date).getTime()
    );

    // 5. Notificações de mensagens
    const ridesWithNotifs = await Promise.all(allRides.map(async (ride) => {
      const lastVisit = localStorage.getItem(`last_visit_${ride.id}`) || new Date(0).toISOString();
      const { count } = await supabase.from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('ride_id', ride.id)
        .gt('created_at', lastVisit)
        .not('sender_id', 'eq', user.id);
      return { ...ride, hasNew: (count || 0) > 0 };
    }));

    setMyRides(ridesWithNotifs);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfileData();
    
    // Real-time: Atualiza a lista se houver mudanças nas viagens ou mensagens
    const channel = supabase.channel('profile-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => fetchProfileData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchProfileData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `passenger_id=eq.${user?.id}` }, () => fetchProfileData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleUpdateProfile = async () => {
    const isNowDriver = editCar.trim().length > 0;
    const { error } = await supabase.from('profiles').update({
        full_name: editName,
        car_model: editCar,
        avatar_url: editAvatar,
        is_driver: isNowDriver 
      }).eq('user_id', user?.id);

    if (error) toast.error("Erro ao atualizar perfil");
    else {
      toast.success(isNowDriver ? "Perfil atualizado! Já podes publicar." : "Perfil guardado!");
      setIsEditing(false);
      fetchProfileData();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getRideStatus = (ride: any) => {
    if (ride.status === 'completed') {
      return { label: 'Concluída', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: <CheckCircle2 className="w-2.5 h-2.5" /> };
    }
    const rideDateTime = new Date(`${ride.ride_date}T${ride.ride_time}`);
    if (new Date() >= rideDateTime) {
      return { label: 'Em Curso', color: 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse', icon: <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div> };
    }
    return { label: 'Agendada', color: 'bg-green-50 text-green-600 border-green-100', icon: null };
  };

  // ... (o resto do return permanece igual ao teu código original)
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header Perfil */}
      <div className="bg-white border-b border-slate-100 p-8 pt-12 text-center space-y-4 shadow-sm">
        {isEditing ? (
          <div className="space-y-6 max-w-xs mx-auto animate-in fade-in zoom-in duration-200">
            <AvatarUpload url={editAvatar} onUpload={setEditAvatar} />
            <div className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nome Completo</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="font-bold h-12 rounded-xl bg-slate-50 border-none mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Veículo (Modelo/Cor)</label>
                <Input 
                  placeholder="Ex: Tesla Model 3 Preto"
                  value={editCar} 
                  onChange={(e) => setEditCar(e.target.value)} 
                  className="font-bold h-12 rounded-xl bg-slate-50 border-none mt-1" 
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(false)} variant="ghost" className="flex-1 rounded-xl uppercase font-black text-[10px] tracking-widest text-slate-400">Cancelar</Button>
              <Button onClick={handleUpdateProfile} className="flex-1 bg-slate-900 text-white rounded-xl uppercase font-black text-[10px] tracking-widest shadow-lg shadow-slate-100">Guardar</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-slate-300" />}
              </div>
              {profile?.is_driver && (
                <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1.5 rounded-lg shadow-lg border-2 border-white">
                  <Car className="w-3 h-3" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{profile?.full_name || 'Utilizador'}</h1>
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-100">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  <span className="text-xs font-black ml-1.5">{rating.avg ? Number(rating.avg).toFixed(1) : '0.0'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{rating.count} Experiências</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="mt-4 h-9 rounded-full text-[10px] font-black uppercase gap-2 border-slate-200">
                <Edit2 className="w-3 h-3" /> Editar Perfil
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto space-y-6">
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 italic">Atividade Recente</h2>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 animate-pulse text-slate-400 font-bold uppercase text-[10px]">Sincronizando viagens...</div>
            ) : myRides.length > 0 ? (
              myRides.map((ride) => {
                const statusInfo = getRideStatus(ride);
                const isDriver = ride.role === 'driver';
                return (
                  <button 
                    key={`${ride.id}-${ride.role}`} 
                    onClick={() => navigate(`/ride/${ride.id}`)} 
                    className="w-full bg-white border border-slate-100 p-4 rounded-[28px] flex items-center justify-between shadow-sm hover:shadow-md transition-all active:scale-[0.98] group relative"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isDriver ? 'bg-slate-900' : 'bg-primary/10'}`}>
                          {isDriver ? <Car className="w-5 h-5 text-white" /> : <Users className="w-5 h-5 text-primary" />}
                        </div>
                        {ride.hasNew && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-slate-800 uppercase italic tracking-tighter">{ride.destination}</p>
                          <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter ${isDriver ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'}`}>
                            {isDriver ? 'Condutor' : 'Passageiro'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border transition-all ${statusInfo.color}`}>
                            {statusInfo.icon} {statusInfo.label}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold tracking-tight">{new Date(ride.ride_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </button>
                );
              })
            ) : (
              <div className="bg-white/50 p-10 rounded-[32px] border border-dashed border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">Ainda sem viagens no radar</p>
              </div>
            )}
          </div>
        </div>
        
        <Button 
          onClick={handleLogout} 
          className="w-full h-14 bg-white hover:bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[10px] gap-2 tracking-[0.2em] transition-all border border-slate-200 hover:border-red-100 shadow-none italic"
        >
          <LogOut className="w-3 h-3" /> Terminar Sessão
        </Button>
      </div>
    </div>
  );
}
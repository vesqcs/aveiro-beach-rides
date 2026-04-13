import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Car, Star, ChevronRight, LogOut, Edit2, Users, Save, X } from 'lucide-react';
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
  
  // Estados para edição
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCar, setEditCar] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const fetchProfileData = async () => {
    if (!user) return;
    
    // 1. Dados do Perfil e Rating
    const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (prof) {
      setProfile(prof);
      setEditName(prof.full_name || '');
      setEditCar(prof.car_model || '');
      setEditAvatar(prof.avatar_url || '');
    }

    const { data: rat } = await supabase.rpc('get_user_rating', { user_uuid: user.id });
    if (rat && rat[0]) setRating({ avg: rat[0].avg_rating, count: rat[0].total_count });

    // 2. BUSCAR VIAGENS
    const { data: driverRides } = await supabase.from('rides').select('*').eq('driver_id', user.id);
    const { data: passengerBookings } = await supabase.from('bookings').select('rides(*)').eq('passenger_id', user.id).or('status.eq.accepted,status.eq.CONFIRMED');

    const ridesAsDriver = (driverRides || []).map(r => ({ ...r, role: 'driver' }));
    const ridesAsPassenger = (passengerBookings || []).filter(b => b.rides !== null).map(b => ({ ...b.rides, role: 'passenger' }));

    const allRides = [...ridesAsDriver, ...ridesAsPassenger].sort((a, b) => 
      new Date(b.ride_date).getTime() - new Date(a.ride_date).getTime()
    );

    // 3. Lógica de Notificações em Realtime
    const ridesWithNotifs = await Promise.all(allRides.map(async (ride) => {
      const lastVisit = localStorage.getItem(`last_visit_${ride.id}`) || new Date(0).toISOString();
      const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('ride_id', ride.id).gt('created_at', lastVisit).not('sender_id', 'eq', user.id);
      return { ...ride, hasNew: (count || 0) > 0 };
    }));

    setMyRides(ridesWithNotifs);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfileData();
    const channel = supabase.channel('profile-updates').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchProfileData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleUpdateProfile = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName,
        car_model: editCar,
        avatar_url: editAvatar
      })
      .eq('user_id', user?.id);

    if (error) {
      toast.error("Erro ao atualizar perfil");
    } else {
      toast.success("Perfil guardado!");
      setIsEditing(false);
      fetchProfileData();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getRideStatus = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    return date < today 
      ? { label: 'Concluída', color: 'bg-slate-100 text-slate-500' }
      : { label: 'Agendada', color: 'bg-green-50 text-green-600 border-green-100' };
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header Perfil */}
      <div className="bg-white border-b border-slate-100 p-8 pt-12 text-center space-y-4 shadow-sm">
        {isEditing ? (
          <div className="space-y-6 max-w-xs mx-auto animate-in fade-in zoom-in duration-200">
            <AvatarUpload url={editAvatar} onUpload={setEditAvatar} />
            <div className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="font-bold h-12 rounded-xl bg-slate-50 border-none mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">O meu Carro</label>
                <Input value={editCar} onChange={(e) => setEditCar(e.target.value)} className="font-bold h-12 rounded-xl bg-slate-50 border-none mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(false)} variant="ghost" className="flex-1 rounded-xl uppercase font-black text-[10px] tracking-widest text-slate-400"><X className="w-4 h-4 mr-2" /> Cancelar</Button>
              <Button onClick={handleUpdateProfile} className="flex-1 bg-slate-900 text-white rounded-xl uppercase font-black text-[10px] tracking-widest shadow-lg shadow-slate-100"><Save className="w-4 h-4 mr-2" /> Guardar</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-slate-300" />}
              </div>
              {rating.count > 5 && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black shadow-lg">PRO</div>}
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{profile?.full_name || 'Utilizador'}</h1>
              {profile?.car_model && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2 mt-1 italic"><Car className="w-3 h-3" /> {profile.car_model}</p>}
              <div className="flex items-center justify-center gap-2 pt-2">
                <div className="flex items-center text-yellow-500 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                  <Star className="w-3 h-3 fill-yellow-500" />
                  <span className="text-xs font-black ml-1">{rating.avg || '0.0'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">({rating.count} avaliações)</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="mt-4 h-9 rounded-full text-[10px] font-black uppercase gap-2 border-slate-200">
                <Edit2 className="w-3 h-3" /> Editar Perfil
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Listagem de Viagens */}
      <div className="px-4 mt-6 max-w-lg mx-auto space-y-6">
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 italic">O meu Histórico</h2>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 animate-pulse text-slate-400 font-bold uppercase text-[10px]">A sincronizar viagens...</div>
            ) : myRides.length > 0 ? (
              myRides.map((ride) => {
                const status = getRideStatus(ride.ride_date);
                const isDriver = ride.role === 'driver';
                return (
                  <button key={`${ride.id}-${ride.role}`} onClick={() => navigate(`/ride/${ride.id}`)} className="w-full bg-white border border-slate-100 p-4 rounded-[24px] flex items-center justify-between shadow-sm hover:shadow-md transition-all active:scale-[0.98] group relative">
                    <div className="flex items-center gap-4 text-left">
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isDriver ? 'bg-primary/10' : 'bg-blue-50'}`}>
                          {isDriver ? <Car className="w-6 h-6 text-primary" /> : <Users className="w-6 h-6 text-blue-500" />}
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
                          <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border ${isDriver ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-blue-600 border-blue-100'}`}>
                            {isDriver ? 'Condutor' : 'Passageiro'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                          <p className="text-[10px] text-slate-400 font-bold">{new Date(ride.ride_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </button>
                );
              })
            ) : (
              <div className="bg-white/50 p-10 rounded-[32px] border border-dashed border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Ainda sem viagens</p>
              </div>
            )}
          </div>
        </div>
        <Button onClick={handleLogout} className="w-full h-14 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl font-black uppercase text-xs gap-2 tracking-widest transition-colors border border-red-100 shadow-none"><LogOut className="w-4 h-4" /> Terminar Sessão</Button>
      </div>
    </div>
  );
}
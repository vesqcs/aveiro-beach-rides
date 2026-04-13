import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Car, Star, ChevronRight, LogOut, Edit2, Calendar, CheckCircle2, SteeringWheel, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [myRides, setMyRides] = useState<any[]>([]);
  const [rating, setRating] = useState({ avg: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfileData = async () => {
      setLoading(true);
      
      // 1. Dados do Perfil e Rating
      const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      setProfile(prof);

      const { data: rat } = await supabase.rpc('get_user_rating', { user_uuid: user.id });
      if (rat && rat[0]) setRating({ avg: rat[0].avg_rating, count: rat[0].total_count });

      // 2. BUSCAR VIAGENS (Como Condutor e como Passageiro)
      // Primeiro: Viagens que eu criei (Condutor)
      const { data: driverRides } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id);

      // Segundo: Viagens onde sou passageiro e fui ACEITE
      const { data: passengerBookings } = await supabase
        .from('bookings')
        .select('rides(*)')
        .eq('passenger_id', user.id)
        .or('status.eq.accepted,status.eq.CONFIRMED');

      // Juntar tudo com uma marcação de papel (role)
      const ridesAsDriver = (driverRides || []).map(r => ({ ...r, role: 'driver' }));
      const ridesAsPassenger = (passengerBookings || [])
        .filter(b => b.rides !== null)
        .map(b => ({ ...b.rides, role: 'passenger' }));

      const allRides = [...ridesAsDriver, ...ridesAsPassenger].sort((a, b) => 
        new Date(b.ride_date).getTime() - new Date(a.ride_date).getTime()
      );

      setMyRides(allRides);
      setLoading(false);
    };

    fetchProfileData();
  }, [user]);

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
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-slate-300" />}
          </div>
          {rating.count > 5 && (
            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black shadow-lg">PRO</div>
          )}
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{profile?.full_name || 'Utilizador'}</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center text-yellow-500 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
              <Star className="w-3 h-3 fill-yellow-500" />
              <span className="text-xs font-black ml-1">{rating.avg || '0.0'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">({rating.count} avaliações)</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.info("Em breve!")} className="mt-2 h-8 rounded-full text-[10px] font-black uppercase gap-2">
            <Edit2 className="w-3 h-3" /> Editar Perfil
          </Button>
        </div>
      </div>

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
                  <button
                    key={`${ride.id}-${ride.role}`}
                    onClick={() => navigate(`/ride/${ride.id}`)}
                    className="w-full bg-white border border-slate-100 p-4 rounded-[24px] flex items-center justify-between shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isDriver ? 'bg-primary/10' : 'bg-blue-50'}`}>
                        {isDriver ? <Car className="w-6 h-6 text-primary" /> : <Users className="w-6 h-6 text-blue-500" />}
                      </div>
                      <div className="text-left space-y-1">
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

        <Button onClick={handleLogout} className="w-full h-14 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl font-black uppercase text-xs gap-2 tracking-widest transition-colors border border-red-100 shadow-none">
          <LogOut className="w-4 h-4" /> Terminar Sessão
        </Button>
      </div>
    </div>
  );
}
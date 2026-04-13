import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Car, Star, ChevronRight, LogOut, Edit2, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [myRides, setMyRides] = useState<any[]>([]);
  const [rating, setRating] = useState({ avg: 0, count: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchProfileData = async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setProfile(prof);

      const { data: rat } = await supabase.rpc('get_user_rating', { user_uuid: user.id });
      if (rat && rat[0]) {
        setRating({ avg: rat[0].avg_rating, count: rat[0].total_count });
      }

      const { data: rides } = await supabase
        .from('rides')
        .select('*')
        .or(`driver_id.eq.${user.id}`)
        .order('ride_date', { ascending: false });
      
      setMyRides(rides || []);
    };

    fetchProfileData();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Função para determinar o status da viagem
  const getRideStatus = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (date < today) return { label: 'Concluída', color: 'bg-slate-100 text-slate-500', icon: <CheckCircle2 className="w-3 h-3" /> };
    return { label: 'Agendada', color: 'bg-green-50 text-green-600 border-green-100', icon: <Calendar className="w-3 h-3" /> };
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header Perfil */}
      <div className="bg-white border-b border-slate-100 p-8 pt-12 text-center space-y-4">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-slate-300" />
            )}
          </div>
          {rating.count > 5 && (
            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black shadow-lg">
              PRO
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
            {profile?.full_name || 'Utilizador'}
          </h1>
          
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center text-yellow-500 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
              <Star className="w-3 h-3 fill-yellow-500" />
              <span className="text-xs font-black ml-1">{rating.avg || '0.0'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
              {rating.count} avaliações
            </span>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => toast.info("Edição de perfil disponível em breve!")}
            className="mt-2 h-8 rounded-full border-slate-200 text-slate-500 font-bold text-[10px] uppercase gap-2 hover:bg-slate-50"
          >
            <Edit2 className="w-3 h-3" /> Editar Perfil
          </Button>
        </div>
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto space-y-6">
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 italic">
            Histórico de Viagens
          </h2>
          
          <div className="space-y-3">
            {myRides.length > 0 ? (
              myRides.map((ride) => {
                const status = getRideStatus(ride.ride_date);
                return (
                  <button
                    key={ride.id}
                    onClick={() => navigate(`/ride/${ride.id}`)}
                    className="w-full bg-white border border-slate-100 p-4 rounded-[24px] flex items-center justify-between shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Car className="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="text-left space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-800 uppercase italic tracking-tighter">
                            {ride.destination}
                          </p>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${status.color}`}>
                            {status.icon} {status.label}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(ride.ride_date).toLocaleDateString()} • {ride.ride_time}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </button>
                );
              })
            ) : (
              <div className="bg-white/50 p-10 rounded-[32px] border border-dashed border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Nenhuma atividade registada</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full h-14 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl font-black uppercase text-xs gap-2 tracking-widest transition-colors"
          >
            <LogOut className="w-4 h-4" /> Terminar Sessão
          </Button>
        </div>
      </div>
    </div>
  );
}
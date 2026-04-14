import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, CheckCircle2, XCircle, MessageSquare, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setNotifications(data);
    setLoading(false);

    // Marcar todas como lidas ao abrir a página
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'ride_cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'booking_request': return <Bell className="w-5 h-5 text-blue-500" />;
      case 'booking_accepted': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'new_message': return <MessageSquare className="w-5 h-5 text-primary" />;
      case 'new_review': return <Star className="w-5 h-5 text-yellow-500" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="p-6 bg-white border-b border-slate-100 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-black italic uppercase tracking-tighter">Notificações</h1>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-center py-10 text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-widest">A carregar alertas...</p>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div 
              key={n.id}
              onClick={() => n.link && navigate(n.link)}
              className={`p-4 rounded-3xl border bg-white shadow-sm flex gap-4 items-start transition-all active:scale-95 ${!n.is_read ? 'border-primary/30 bg-primary/5' : 'border-slate-100'}`}
            >
              <div className="mt-1">{getIcon(n.type)}</div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-900 uppercase italic tracking-tight">{n.title}</p>
                <p className="text-[11px] text-slate-600 font-bold leading-tight">{n.message}</p>
                <p className="text-[9px] text-slate-300 font-black uppercase">
                  {new Date(n.created_at).toLocaleDateString()} às {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center opacity-20">
            <Bell className="w-12 h-12 mx-auto mb-2" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sem notificações</p>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    if (!user) return;

    // Buscar as últimas 5 notificações
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // ⚡️ REAL-TIME: Ouvir novas notificações
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Nova notificação recebida!', payload);
          setNotifications(prev => [payload.new, ...prev].slice(0, 5));
          setUnreadCount(prev => prev + 1);
          // Opcional: Tocar um som ou mostrar um toast extra aqui
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string, link: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    fetchNotifications();
    if (link) navigate(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 text-slate-400 hover:text-slate-900 transition-colors">
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-2 rounded-2xl shadow-xl border-slate-100">
        <div className="px-3 py-2 border-b border-slate-50 mb-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notificações</p>
        </div>
        
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <DropdownMenuItem 
              key={n.id} 
              onClick={() => markAsRead(n.id, n.link)}
              className={`flex flex-col items-start p-3 rounded-xl cursor-pointer mb-1 transition-all ${!n.is_read ? 'bg-slate-50 border-l-4 border-primary' : 'opacity-70'}`}
            >
              <p className="text-xs font-black text-slate-900">{n.title}</p>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{n.message}</p>
              <span className="text-[9px] text-slate-300 mt-2">
                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="p-8 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase italic">Tudo limpo por aqui!</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
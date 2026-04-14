import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, User, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // 1. Função para contar as notificações não lidas na base de dados
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (!error) setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // 2. Ouvir a tabela de notificações em TEMPO REAL
    const channel = supabase
      .channel('nav-notifications-realtime')
      .on(
        'postgres_changes',
        { 
          event: '*', // Escuta novos alertas e também quando são marcados como lidos
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount(); // Sempre que houver mudança, atualiza o contador
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Procurar' },
    { to: '/post', icon: PlusCircle, label: 'Post' },
    { 
      to: '/notifications', 
      icon: Bell, 
      label: 'Alertas', 
      badge: unreadCount > 0,
      count: unreadCount 
    },
    { to: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `relative flex flex-col items-center gap-1 transition-colors ${
              isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <item.icon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          
          {item.badge && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-white px-1 animate-in zoom-in">
              {item.count}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
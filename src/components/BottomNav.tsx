import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [hasActivity, setHasActivity] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Ouve qualquer nova mensagem no sistema
    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // Se a mensagem não é minha e não estou na página da viagem, ativa o alerta
          if (payload.new.sender_id !== user.id && !location.pathname.includes(payload.new.ride_id)) {
            setHasActivity(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, location.pathname]);

  // Limpa o ponto vermelho quando o utilizador vai ao Perfil
  useEffect(() => {
    if (location.pathname === '/profile') {
      setHasActivity(false);
    }
  }, [location.pathname]);

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Procurar' },
    { to: '/post', icon: PlusCircle, label: 'Post' },
    { to: '/profile', icon: User, label: 'Perfil', badge: hasActivity },
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
            <span className="absolute -top-1 -right-0.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse" />
          )}
        </NavLink>
      ))}
    </nav>
  );
}
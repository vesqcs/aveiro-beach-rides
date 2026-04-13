import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

export default function RideChat({ rideId }: { rideId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Função para carregar mensagens
  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles:sender_id(full_name)')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  useEffect(() => {
    if (!rideId) return;

    fetchMessages();

    // Ligar o Realtime
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ride_id=eq.${rideId}`,
        },
        () => {
          // Quando houver uma nova mensagem, recarregamos a lista
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const content = newMessage.trim();
    setNewMessage(''); // Limpa logo o input para dar sensação de rapidez

    const { error } = await supabase.from('messages').insert({
      ride_id: rideId,
      sender_id: user.id,
      content: content
    });

    if (error) {
      console.error("Erro ao enviar:", error);
      fetchMessages(); // Se der erro, recarrega para sincronizar
    }
  };

  return (
    <div className="flex flex-col h-[450px] bg-white rounded-2xl border shadow-inner overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chat da Boleia</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-slate-400 mb-1 px-1">
              {msg.profiles?.full_name || 'Utilizador'}
            </span>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              msg.sender_id === user?.id 
                ? 'bg-primary text-white rounded-tr-none shadow-sm' 
                : 'bg-slate-100 text-slate-700 rounded-tl-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
        <Input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escreve aqui..."
          className="flex-1 bg-slate-50 border-none focus-visible:ring-1"
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim()} className="rounded-full">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
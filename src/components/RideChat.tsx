import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function RideChat({ rideId }: { rideId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Função para carregar mensagens iniciais
  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles:sender_id(full_name)')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  useEffect(() => {
    fetchMessages();

    // --- O SEGREDO DO REALTIME ---
    const channel = supabase
      .channel(`ride_chat_${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ride_id=eq.${rideId}`
        },
        (payload) => {
          // Quando chega uma nova linha no banco, adicionamos logo ao estado
          // Fazemos um fetch rápido ou adicionamos o payload diretamente
          fetchMessages(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  // Scroll automático para o fim quando há mensagens novas
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase
      .from('messages')
      .insert([
        { 
          ride_id: rideId, 
          sender_id: user.id, 
          content: newMessage.trim() 
        }
      ]);

    if (error) {
      toast.error("Erro ao enviar");
    } else {
      setNewMessage('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[24px] flex flex-col h-[400px] overflow-hidden shadow-sm">
      {/* Área de Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <span className="text-[8px] font-black text-slate-400 uppercase mb-1 px-2">
                {isMine ? 'Tu' : msg.profiles?.full_name}
              </span>
              <div className={`max-w-[80%] px-4 py-2 rounded-[18px] text-sm font-medium shadow-sm ${
                isMine 
                ? 'bg-slate-900 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input de Envio */}
      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escreve algo..."
          className="rounded-full bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
        />
        <Button size="icon" type="submit" className="rounded-full bg-primary hover:bg-primary/90 shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
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
  const [rideData, setRideData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles:sender_id(full_name)')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Erro ao carregar mensagens:", error);
    } else if (data) {
      setMessages(data);
    }
  };

  useEffect(() => {
    // Buscar detalhes da viagem para saber quem notificar
    const fetchRideDetails = async () => {
      const { data } = await supabase
        .from('rides')
        .select('driver_id, destination')
        .eq('id', rideId)
        .single();
      setRideData(data);
    };

    fetchRideDetails();
    fetchMessages();

    const channel = supabase
      .channel(`ride_chat_${rideId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `ride_id=eq.${rideId}` },
        () => { fetchMessages(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !rideData) return;

    const messageContent = newMessage.trim();

    const { error } = await supabase
      .from('messages')
      .insert([{ 
        ride_id: rideId, 
        sender_id: user.id, 
        content: messageContent 
      }]);

    if (error) {
      toast.error("Erro ao enviar mensagem");
    } else {
      setNewMessage('');
      
      // 🔔 LÓGICA DE NOTIFICAÇÕES DO CHAT
      try {
        // 1. Se quem enviou foi o PASSAGEIRO, notificar o CONDUTOR
        if (user.id !== rideData.driver_id) {
          await supabase.from('notifications').insert({
            user_id: rideData.driver_id,
            title: 'Nova mensagem no chat 💬',
            message: `Um passageiro escreveu na viagem para ${rideData.destination}: "${messageContent.substring(0, 30)}..."`,
            type: 'new_message',
            link: `/ride/${rideId}`
          });
        } 
        // 2. Se quem enviou foi o CONDUTOR, notificar TODOS os passageiros aceites
        else {
          const { data: acceptedBookings } = await supabase
            .from('bookings')
            .select('passenger_id')
            .eq('ride_id', rideId)
            .in('status', ['accepted', 'confirmed']);

          if (acceptedBookings && acceptedBookings.length > 0) {
            const notifications = acceptedBookings.map(b => ({
              user_id: b.passenger_id,
              title: 'Mensagem do Condutor 🚗',
              message: `O condutor disse: "${messageContent.substring(0, 30)}..."`,
              type: 'new_message',
              link: `/ride/${rideId}`
            }));
            await supabase.from('notifications').insert(notifications);
          }
        }
      } catch (err) {
        console.error("Erro ao disparar notificações do chat:", err);
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[24px] flex flex-col h-[400px] overflow-hidden shadow-sm">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <span className="text-[8px] font-black text-slate-400 uppercase mb-1 px-2">
                {isMine ? 'Tu' : (msg.profiles?.full_name || 'Utilizador')}
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

      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escreve algo..."
          className="rounded-full bg-slate-50 border-none"
        />
        <Button size="icon" type="submit" className="rounded-full shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
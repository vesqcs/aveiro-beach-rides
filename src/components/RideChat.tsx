import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import RatingModal from '@/components/RatingModal';

export default function RideChat({ rideId }: { rideId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDriver, setIsDriver] = useState(false);
  const [rideStatus, setRideStatus] = useState('active');
  const [rideData, setRideData] = useState<any>(null);
  const [showRating, setShowRating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const { data: ride } = await supabase
      .from('rides')
      .select('*, profiles:driver_id(full_name)')
      .eq('id', rideId)
      .single();
    
    if (ride) {
      setRideData(ride);
      setIsDriver(ride.driver_id === user?.id);
      setRideStatus(ride.status);
    }

    const { data: msgs } = await supabase
      .from('messages')
      .select('*, profiles:sender_id(full_name)')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true });
    
    if (msgs) setMessages(msgs);
  };

  useEffect(() => {
    if (!rideId) return;
    fetchData();

    const channel = supabase
      .channel(`ride-chat-${rideId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `ride_id=eq.${rideId}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => {
          setRideStatus(payload.new.status);
          // Se o status mudar para completed e não formos o condutor, 
          // a HomePage tratará de mostrar o modal na próxima navegação.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId, user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFinishRide = async () => {
    const { error } = await supabase
      .from('rides')
      .update({ status: 'completed' })
      .eq('id', rideId);

    if (error) {
      toast.error("Erro ao terminar viagem");
    } else {
      toast.success("Viagem concluída!");
      setShowRating(true); // DISPARA O POP-UP NA HORA
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const content = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      ride_id: rideId,
      sender_id: user.id,
      content: content
    });

    if (error) {
      console.error("Erro ao enviar:", error);
      fetchData();
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl border shadow-inner overflow-hidden relative">
      {/* MODAL DE AVALIAÇÃO IMEDIATO */}
      {showRating && (
        <RatingModal 
          ride={rideData} 
          onComplete={() => {
            setShowRating(false);
            window.location.href = '/'; 
          }} 
        />
      )}

      <div className="bg-slate-50 px-4 py-2 border-b flex justify-between items-center">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chat da Boleia</span>
        {rideStatus === 'completed' && (
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Concluída</span>
        )}
      </div>

      {isDriver && rideStatus === 'active' && (
        <div className="bg-primary/5 p-3 flex items-center justify-between border-b border-primary/10">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-primary uppercase">Chegaram ao destino?</span>
          </div>
          <Button 
            size="sm" 
            onClick={handleFinishRide}
            className="bg-primary text-white font-black text-[10px] h-8 px-4 rounded-xl uppercase"
          >
            Terminar 🏁
          </Button>
        </div>
      )}
      
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
          placeholder={rideStatus === 'completed' ? "Viagem terminada..." : "Escreve aqui..."}
          disabled={rideStatus === 'completed'}
          className="flex-1 bg-slate-50 border-none focus-visible:ring-1"
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim() || rideStatus === 'completed'} className="rounded-full">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
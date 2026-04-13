import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, MapPin, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function RideCard({ ride }: { ride: any }) {
  const [rating, setRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    const fetchRating = async () => {
      // Chamamos a função que criámos no SQL
      const { data, error } = await supabase.rpc('get_user_rating', { 
        user_uuid: ride.driver_id 
      });

      if (data && data[0]) {
        setRating(data[0].avg_rating);
        setTotalReviews(data[0].total_count);
      }
    };

    fetchRating();
  }, [ride.driver_id]);

  return (
    <Link to={`/ride/${ride.id}`}>
      <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Condutor</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{ride.profiles?.full_name}</span>
              
              {/* SISTEMA DE ESTRELAS NO CARD */}
              <div className="flex items-center bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-[10px] font-black text-yellow-700 ml-1">
                  {rating && rating > 0 ? rating : 'Novo'}
                </span>
                {totalReviews > 0 && (
                  <span className="text-[8px] text-yellow-600/60 ml-1">({totalReviews})</span>
                )}
              </div>
            </div>
          </div>
          <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-black italic">
            {ride.price}€
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold leading-none">Destino</span>
              <span className="text-sm font-bold text-slate-700">{ride.destination}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold">{ride.ride_time}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold">{ride.available_seats} lugares</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
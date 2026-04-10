import { Tables } from '@/integrations/supabase/types';
import { MapPin, Calendar, Clock, Users, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface RideCardProps {
  ride: Tables<'rides'> & { profiles?: Tables<'profiles'> | null };
  onBook?: () => void;
  showBookButton?: boolean;
  bookingStatus?: string;
}

export default function RideCard({ ride, onBook, showBookButton = false, bookingStatus }: RideCardProps) {
  const rideDate = new Date(ride.ride_date + 'T00:00:00');

  return (
    <div className="glass-card rounded-xl p-4 space-y-3 animate-fade-up">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <MapPin className="w-4 h-4" />
            <span>{ride.origin}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <MapPin className="w-4 h-4 text-accent-foreground" />
            <span>{ride.destination}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-primary">€{Number(ride.cost_share).toFixed(2)}</span>
          <p className="text-[10px] text-muted-foreground">per seat</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(rideDate, 'dd MMM')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{ride.ride_time.slice(0, 5)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>{ride.seats_available} seats</span>
        </div>
      </div>

      {ride.profiles?.full_name && (
        <p className="text-xs text-muted-foreground">
          Driver: <span className="font-medium text-foreground">{ride.profiles.full_name}</span>
        </p>
      )}

      {showBookButton && !bookingStatus && (
        <Button onClick={onBook} className="w-full" size="sm">
          Request a Seat
        </Button>
      )}
      {bookingStatus === 'confirmed' && (
        <div className="text-center text-sm font-medium text-primary bg-accent rounded-lg py-2">
          ✓ Seat Booked
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import RideCard from '@/components/RideCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search as SearchIcon, Filter } from 'lucide-react';
import { toast } from 'sonner';

const DESTINATIONS = ['All', 'Praia da Barra', 'Costa Nova', 'Porto', 'Coimbra', 'Lisboa'];

type RideWithProfile = Tables<'rides'> & { profiles: Tables<'profiles'> | null };

export default function SearchPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [rides, setRides] = useState<RideWithProfile[]>([]);
  const [bookings, setBookings] = useState<Record<string, string>>({});
  const [destination, setDestination] = useState(searchParams.get('destination') || 'All');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRides = async () => {
    setLoading(true);
    let query = supabase
      .from('rides')
      .select('*, profiles!inner(*)') as any
      .eq('status', 'active')
      .gte('ride_date', new Date().toISOString().split('T')[0])
      .order('ride_date', { ascending: true });

    if (destination && destination !== 'All') {
      query = query.eq('destination', destination);
    }
    if (dateFilter) {
      query = query.eq('ride_date', dateFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Failed to load rides');
    } else {
      setRides((data as RideWithProfile[]) || []);
    }
    setLoading(false);
  };

  const fetchBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('ride_id, status')
      .eq('passenger_id', user.id)
      .eq('status', 'confirmed');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((b) => (map[b.ride_id] = b.status));
      setBookings(map);
    }
  };

  useEffect(() => {
    fetchRides();
    fetchBookings();
  }, [destination, dateFilter, user]);

  const handleBook = async (rideId: string) => {
    if (!user) {
      toast.error('Please sign in to book a ride');
      return;
    }
    const { error } = await supabase.from('bookings').insert({
      ride_id: rideId,
      passenger_id: user.id,
    });
    if (error) {
      if (error.code === '23505') {
        toast.error('You already booked this ride');
      } else {
        toast.error('Booking failed: ' + error.message);
      }
    } else {
      toast.success('Seat booked! 🎉');
      fetchBookings();
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-4 px-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <SearchIcon className="w-6 h-6 text-primary" />
        Find a Ride
      </h1>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="space-y-1.5">
          <Label className="text-xs">Destination</Label>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DESTINATIONS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-xl p-4 h-32 animate-pulse bg-muted" />
          ))}
        </div>
      ) : rides.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No rides found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              onBook={() => handleBook(ride.id)}
              showBookButton={!!user && ride.driver_id !== user.id}
              bookingStatus={bookings[ride.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

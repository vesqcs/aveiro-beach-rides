import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import RideCard from '@/components/RideCard';
import { User, Car, Armchair, LogOut } from 'lucide-react';
import { toast } from 'sonner';

type RideWithProfile = Tables<'rides'> & { profiles: Tables<'profiles'> | null };

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isDriver, setIsDriver] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dashboard data
  const [myRides, setMyRides] = useState<RideWithProfile[]>([]);
  const [myBookings, setMyBookings] = useState<(Tables<'bookings'> & { rides: RideWithProfile | null })[]>([]);
  const [rideBookings, setRideBookings] = useState<Record<string, (Tables<'bookings'> & { profiles: Tables<'profiles'> | null })[]>>({});

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDashboard();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (data) {
      setProfile(data);
      setFullName(data.full_name);
      setPhone(data.phone || '');
      setIsDriver(data.is_driver);
    }
  };

  const fetchDashboard = async () => {
    if (!user) return;

    // My posted rides (driver)
    const { data: rides } = await supabase
      .from('rides')
      .select('*, profiles!rides_driver_id_fkey(*)')
      .eq('driver_id', user.id)
      .order('ride_date', { ascending: true });
    setMyRides((rides as RideWithProfile[]) || []);

    // Bookings on my rides
    if (rides && rides.length > 0) {
      const rideIds = rides.map((r) => r.id);
      const { data: rb } = await supabase
        .from('bookings')
        .select('*, profiles!bookings_passenger_id_fkey(*)')
        .in('ride_id', rideIds)
        .eq('status', 'confirmed');
      if (rb) {
        const map: Record<string, any[]> = {};
        rb.forEach((b: any) => {
          if (!map[b.ride_id]) map[b.ride_id] = [];
          map[b.ride_id].push(b);
        });
        setRideBookings(map);
      }
    }

    // My booked rides (passenger)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, rides(*, profiles!rides_driver_id_fkey(*))')
      .eq('passenger_id', user.id)
      .eq('status', 'confirmed');
    setMyBookings((bookings as any[]) || []);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, is_driver: isDriver })
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('Profile updated!');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen pb-20 pt-4 px-4 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Profile
        </h1>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4 mr-1" /> Sign out
        </Button>
      </div>

      {/* Profile form */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351 ..." />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>I'm a Driver</Label>
            <p className="text-xs text-muted-foreground">Toggle to offer rides</p>
          </div>
          <Switch checked={isDriver} onCheckedChange={setIsDriver} />
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>

      {/* Driver dashboard */}
      {isDriver && myRides.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" /> My Posted Rides
          </h2>
          {myRides.map((ride) => (
            <div key={ride.id} className="space-y-2">
              <RideCard ride={ride} />
              {rideBookings[ride.id] && rideBookings[ride.id].length > 0 && (
                <div className="ml-4 p-3 rounded-lg bg-accent/50 space-y-1">
                  <p className="text-xs font-semibold text-accent-foreground">Passengers:</p>
                  {rideBookings[ride.id].map((b: any) => (
                    <p key={b.id} className="text-sm">
                      {b.profiles?.full_name || 'Unknown'} {b.profiles?.phone && `• ${b.profiles.phone}`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Passenger dashboard */}
      {myBookings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Armchair className="w-5 h-5 text-primary" /> My Booked Rides
          </h2>
          {myBookings.map((booking: any) => (
            booking.rides && <RideCard key={booking.id} ride={booking.rides} bookingStatus={booking.status} />
          ))}
        </div>
      )}
    </div>
  );
}

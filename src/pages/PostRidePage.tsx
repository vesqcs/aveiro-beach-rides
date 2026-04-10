import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

const ORIGINS = ['UA Campus', 'Aveiro Centro', 'Estação de Aveiro', 'Glicínias'];
const DESTINATIONS = ['Praia da Barra', 'Costa Nova', 'Porto', 'Coimbra', 'Lisboa'];

export default function PostRidePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [rideDate, setRideDate] = useState('');
  const [rideTime, setRideTime] = useState('');
  const [seats, setSeats] = useState('');
  const [costShare, setCostShare] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    const cost = parseFloat(costShare);
    if (isNaN(cost) || cost < 0 || cost > 10) {
      toast.error('Cost share must be between €0 and €10');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('rides').insert({
      driver_id: user.id,
      origin,
      destination,
      ride_date: rideDate,
      ride_time: rideTime,
      seats_available: parseInt(seats),
      cost_share: cost,
    });

    if (error) {
      toast.error('Failed to post ride: ' + error.message);
    } else {
      toast.success('Ride posted! 🚗');
      navigate('/search');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-20 pt-4 px-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <PlusCircle className="w-6 h-6 text-primary" />
        Post a Ride
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Origin</Label>
          <Select value={origin} onValueChange={setOrigin} required>
            <SelectTrigger>
              <SelectValue placeholder="Where from?" />
            </SelectTrigger>
            <SelectContent>
              {ORIGINS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Destination</Label>
          <Select value={destination} onValueChange={setDestination} required>
            <SelectTrigger>
              <SelectValue placeholder="Where to?" />
            </SelectTrigger>
            <SelectContent>
              {DESTINATIONS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={rideDate}
              onChange={(e) => setRideDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={rideTime}
              onChange={(e) => setRideTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Seats Available</Label>
            <Select value={seats} onValueChange={setSeats} required>
              <SelectTrigger>
                <SelectValue placeholder="Seats" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cost Share (€)</Label>
            <Input
              type="number"
              step="0.50"
              min="0"
              max="10"
              value={costShare}
              onChange={(e) => setCostShare(e.target.value)}
              placeholder="e.g. 2.50"
              required
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Maximum €10 per seat — cost-sharing only (fuel & tolls).
        </p>

        <Button type="submit" className="w-full" disabled={loading || !origin || !destination}>
          {loading ? 'Posting...' : 'Post Ride'}
        </Button>
      </form>
    </div>
  );
}

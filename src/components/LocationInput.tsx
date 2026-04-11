import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

export default function LocationInput({ placeholder, value, onChange, icon }: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchLocation = async (text: string) => {
    onChange(text);
    
    if (text.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      // Mudámos o link para ser mais flexível (removemos o type=city que às vezes falha)
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=10`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Filtramos apenas por locais que tenham nome e país (para ignorar ruas pequenas se quisermos cidades)
      const filtered = data.features.filter((f: any) => f.properties.name && f.properties.country);
      
      setSuggestions(filtered);
      setShowSuggestions(true);
      console.log("Resultados encontrados:", filtered); // Para tu veres no F12
    } catch (error) {
      console.error("Erro na API Photon:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (feature: any) => {
    const { name, state, country } = feature.properties;
    const display = `${name}${state ? `, ${state}` : ''} (${country})`;
    onChange(display);
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute left-3 top-3 w-4 h-4 text-slate-400">
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : (icon || <MapPin className="w-4 h-4" />)}
        </div>
        <Input
          placeholder={placeholder}
          className="pl-10 bg-white h-11 border-slate-200 focus:border-primary"
          value={value}
          onChange={(e) => searchLocation(e.target.value)}
          onFocus={() => value.length >= 3 && setShowSuggestions(true)}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-[100] w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-2xl max-h-60 overflow-auto">
          {suggestions.map((s, index) => (
            <li
              key={index}
              className="p-3 hover:bg-primary/5 cursor-pointer border-b border-slate-50 last:border-none text-sm flex items-center gap-3 transition-colors"
              onClick={() => handleSelect(s)}
            >
              <MapPin className="w-4 h-4 text-primary/60 shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-700">{s.properties.name}</span>
                <span className="text-[10px] text-slate-500">
                  {s.properties.state ? `${s.properties.state}, ` : ''}{s.properties.country}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
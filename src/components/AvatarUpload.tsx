import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// O ERRO ESTAVA AQUI: Esta linha TEM de ter o "default"
export default function AvatarUpload({ url, onUpload }: { url?: string, onUpload: (url: string) => void }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = async (event: any) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

      // 1. Upload para o Storage (Bucket 'avatars' que criaste)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Obter URL pública
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      onUpload(data.publicUrl);
      toast.success("Foto carregada!");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group mx-auto w-24 h-24">
      <div className="w-24 h-24 bg-slate-100 rounded-full overflow-hidden border-4 border-white shadow-xl flex items-center justify-center">
        {url ? (
          <img src={url} className="w-full h-full object-cover" alt="Avatar" />
        ) : (
          <Camera className="w-8 h-8 text-slate-300" />
        )}
      </div>
      
      <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
        {uploading ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <div className="text-white text-[10px] font-black uppercase flex flex-col items-center">
            <Camera className="w-5 h-5 mb-1" />
            <span>Mudar</span>
          </div>
        )}
        <input 
          type="file" 
          className="hidden" 
          accept="image/*" 
          onChange={uploadAvatar} 
          disabled={uploading} 
        />
      </label>
    </div>
  );
}
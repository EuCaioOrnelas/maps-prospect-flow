import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Paperclip, Image, FileText, Video, Mic, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaUploaderProps {
  conversationId: string;
  onMediaSent: () => void;
  disabled?: boolean;
}

export const MediaUploader = ({ conversationId, onMediaSent, disabled }: MediaUploaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentType, setCurrentType] = useState<'image' | 'video' | 'document'>('image');

  const handleFileSelect = (type: 'image' | 'video' | 'document') => {
    setCurrentType(type);
    setIsOpen(false);
    if (fileInputRef.current) {
      switch (type) {
        case 'image':
          fileInputRef.current.accept = 'image/*';
          break;
        case 'video':
          fileInputRef.current.accept = 'video/*';
          break;
        case 'document':
          fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt';
          break;
      }
      fileInputRef.current.click();
    }
  };

  const uploadFile = async (file: File, messageType: string) => {
    setIsUploading(true);
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      // Send message with media
      const { data: session } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('chat-send-message', {
        body: {
          conversationId,
          content: '',
          messageType,
          mediaUrl: publicUrl,
          mediaFilename: file.name,
        },
      });

      if (response.error) throw response.error;

      toast.success('Mídia enviada com sucesso!');
      onMediaSent();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar mídia');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await uploadFile(file, currentType);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        await uploadFile(file, 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setIsOpen(false);
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 rounded-full animate-pulse">
          <div className="w-2 h-2 bg-destructive rounded-full" />
          <span className="text-sm text-destructive">Gravando...</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={stopRecording}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={stopRecording}
          className="bg-primary"
        >
          Enviar
        </Button>
      </div>
    );
  }

  if (isUploading) {
    return (
      <Button type="button" variant="ghost" size="icon" disabled>
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" disabled={disabled}>
            <Paperclip className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            <button
              onClick={() => handleFileSelect('image')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <Image className="h-5 w-5 text-blue-500" />
              <span className="text-sm">Imagem</span>
            </button>
            <button
              onClick={() => handleFileSelect('video')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <Video className="h-5 w-5 text-purple-500" />
              <span className="text-sm">Vídeo</span>
            </button>
            <button
              onClick={() => handleFileSelect('document')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <FileText className="h-5 w-5 text-orange-500" />
              <span className="text-sm">Documento</span>
            </button>
            <button
              onClick={startRecording}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <Mic className="h-5 w-5 text-green-500" />
              <span className="text-sm">Áudio</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};

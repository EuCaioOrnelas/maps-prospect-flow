import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Paperclip, Image, FileText, Video, Mic, X, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MediaUploaderProps {
  conversationId: string;
  onMediaSent: () => void;
  disabled?: boolean;
}

interface SelectedFile {
  file: File;
  type: 'image' | 'video' | 'document' | 'audio';
  preview?: string;
}

export const MediaUploader = ({ conversationId, onMediaSent, disabled }: MediaUploaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [caption, setCaption] = useState('');
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

  const uploadFile = async (file: File, messageType: string, captionText?: string) => {
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
          content: captionText || '',
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
    
    // Create preview for images and videos
    let preview: string | undefined;
    if (currentType === 'image' || currentType === 'video') {
      preview = URL.createObjectURL(file);
    }
    
    setSelectedFile({
      file,
      type: currentType,
      preview,
    });
    setCaption('');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile) return;
    
    await uploadFile(selectedFile.file, selectedFile.type, caption);
    
    // Cleanup preview URL
    if (selectedFile.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
    setCaption('');
  };

  const handleCancelFile = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
    setCaption('');
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
        
        // Show audio preview
        setSelectedFile({
          file,
          type: 'audio',
          preview: URL.createObjectURL(audioBlob),
        });
        
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

  // File Preview Modal
  if (selectedFile) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancelFile}
          >
            <X className="h-5 w-5" />
          </Button>
          <span className="font-medium text-foreground">
            {selectedFile.type === 'image' && 'Imagem'}
            {selectedFile.type === 'video' && 'Vídeo'}
            {selectedFile.type === 'document' && 'Documento'}
            {selectedFile.type === 'audio' && 'Áudio'}
          </span>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          {selectedFile.type === 'image' && selectedFile.preview && (
            <img 
              src={selectedFile.preview} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          )}
          
          {selectedFile.type === 'video' && selectedFile.preview && (
            <video 
              src={selectedFile.preview}
              controls
              className="max-w-full max-h-full rounded-lg"
            />
          )}
          
          {selectedFile.type === 'audio' && selectedFile.preview && (
            <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-xl border border-border">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                <Mic className="h-12 w-12 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{selectedFile.file.name}</p>
              <audio src={selectedFile.preview} controls className="w-64" />
            </div>
          )}
          
          {selectedFile.type === 'document' && (
            <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-xl border border-border">
              <div className="w-24 h-24 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <FileText className="h-12 w-12 text-orange-500" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">{selectedFile.file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with caption and send */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center gap-3">
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Adicionar legenda..."
              className="flex-1 bg-muted border-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isUploading) {
                  e.preventDefault();
                  handleSendFile();
                }
              }}
            />
            <Button
              onClick={handleSendFile}
              disabled={isUploading}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 h-10 w-10 p-0"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Pressione Enter ou clique para enviar
          </p>
        </div>
      </div>
    );
  }

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
          onClick={() => {
            if (mediaRecorder) {
              mediaRecorder.stop();
              setMediaRecorder(null);
              setIsRecording(false);
              // Cleanup without sending
              audioChunksRef.current = [];
            }
          }}
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
          Parar
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

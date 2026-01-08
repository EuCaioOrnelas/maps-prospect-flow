import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Paperclip, Image, FileText, Video, Mic, X, Loader2, Send, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ImageEditor } from './ImageEditor';

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

export interface MediaUploaderRef {
  handleDroppedFiles: (files: FileList | File[]) => void;
}

// Image compression settings
const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB
const MAX_IMAGE_DIMENSION = 1920;
const COMPRESSION_QUALITY = 0.8;

// Compress image if needed
const compressImage = async (file: File): Promise<File> => {
  // Only compress images
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  // If already small enough, return as is
  if (file.size <= MAX_IMAGE_SIZE) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      // Calculate new dimensions maintaining aspect ratio
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(`Compressed image from ${(file.size / 1024).toFixed(1)}KB to ${(blob.size / 1024).toFixed(1)}KB`);
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        COMPRESSION_QUALITY
      );

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
};

export const MediaUploader = forwardRef<MediaUploaderRef, MediaUploaderProps>(({ conversationId, onMediaSent, disabled }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentType, setCurrentType] = useState<'image' | 'video' | 'document'>('image');

  // Get file type from mime or extension
  const getFileType = (file: File): 'image' | 'video' | 'document' | 'audio' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  // Process dropped or selected files
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newSelectedFiles: SelectedFile[] = fileArray.map(file => {
      const type = getFileType(file);
      let preview: string | undefined;
      if (type === 'image' || type === 'video' || type === 'audio') {
        preview = URL.createObjectURL(file);
      }
      return { file, type, preview };
    });
    
    setSelectedFiles(newSelectedFiles);
    setCurrentFileIndex(0);
    setCaption('');
  };

  // Expose method to parent via ref
  useImperativeHandle(ref, () => ({
    handleDroppedFiles: (files: FileList | File[]) => {
      processFiles(files);
    }
  }));

  const handleFileSelect = (type: 'image' | 'video' | 'document') => {
    setCurrentType(type);
    setIsOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.multiple = true; // Enable multiple selection
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

  const uploadFile = async (file: File, messageType: string, captionText?: string): Promise<boolean> => {
    try {
      // Compress image if needed
      const fileToUpload = await compressImage(file);
      
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Upload to Supabase Storage
      const fileExt = fileToUpload.name.split('.').pop() || (messageType === 'image' ? 'jpg' : 'bin');
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      // Send message with media
      const response = await supabase.functions.invoke('chat-send-message', {
        body: {
          conversationId,
          content: captionText || '',
          messageType,
          mediaUrl: publicUrl,
          mediaFilename: fileToUpload.name,
        },
      });

      if (response.error) throw response.error;
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Erro ao enviar: ${file.name}`);
      return false;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    processFiles(files);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendCurrentFile = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    const currentFile = selectedFiles[currentFileIndex];
    const success = await uploadFile(currentFile.file, currentFile.type, caption);
    
    // Remove sent file from list
    const newFiles = selectedFiles.filter((_, index) => index !== currentFileIndex);
    
    // Cleanup preview URL
    if (currentFile.preview) {
      URL.revokeObjectURL(currentFile.preview);
    }
    
    if (newFiles.length > 0) {
      setSelectedFiles(newFiles);
      setCurrentFileIndex(Math.min(currentFileIndex, newFiles.length - 1));
      setCaption('');
    } else {
      setSelectedFiles([]);
      setCurrentFileIndex(0);
      setCaption('');
    }
    
    if (success) {
      toast.success('Mídia enviada!');
      onMediaSent();
    }
    setIsUploading(false);
  };

  const handleSendAllFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    
    // Prepare all files for parallel upload
    const uploadPromises = selectedFiles.map((file, i) => {
      const captionToUse = i === currentFileIndex ? caption : '';
      return uploadFile(file.file, file.type, captionToUse);
    });
    
    // Execute all uploads in parallel
    const results = await Promise.all(uploadPromises);
    
    // Cleanup preview URLs
    selectedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    const successCount = results.filter(Boolean).length;
    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) enviado(s)!`);
      onMediaSent();
    }
    
    setSelectedFiles([]);
    setCurrentFileIndex(0);
    setCaption('');
    setIsUploading(false);
  };

  const handleCancelFile = () => {
    selectedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setSelectedFiles([]);
    setCurrentFileIndex(0);
    setCaption('');
  };

  const handleRemoveFile = (index: number) => {
    const file = selectedFiles[index];
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
    
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    if (newFiles.length === 0) {
      handleCancelFile();
    } else {
      setSelectedFiles(newFiles);
      setCurrentFileIndex(Math.min(currentFileIndex, newFiles.length - 1));
    }
  };

  // Handle edited image save
  const handleEditedImageSave = (blob: Blob) => {
    const editedFile = new File([blob], `edited_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const preview = URL.createObjectURL(blob);
    
    // Replace the current file with edited version
    if (editingImageIndex !== null) {
      const oldFile = selectedFiles[editingImageIndex];
      if (oldFile.preview) {
        URL.revokeObjectURL(oldFile.preview);
      }
      
      const newFiles = [...selectedFiles];
      newFiles[editingImageIndex] = {
        file: editedFile,
        type: 'image',
        preview,
      };
      setSelectedFiles(newFiles);
    }
    
    setEditingImageIndex(null);
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
        setSelectedFiles([{
          file,
          type: 'audio',
          preview: URL.createObjectURL(audioBlob),
        }]);
        setCurrentFileIndex(0);
        
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

  const currentFile = selectedFiles[currentFileIndex];

  // Show image editor if editing
  if (editingImageIndex !== null && selectedFiles[editingImageIndex]?.preview) {
    return (
      <ImageEditor
        imageSrc={selectedFiles[editingImageIndex].preview!}
        onSave={handleEditedImageSave}
        onCancel={() => setEditingImageIndex(null)}
      />
    );
  }

  // File Preview Modal
  if (selectedFiles.length > 0 && currentFile) {
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
          <div className="text-center">
            <span className="font-medium text-foreground">
              {currentFile.type === 'image' && 'Imagem'}
              {currentFile.type === 'video' && 'Vídeo'}
              {currentFile.type === 'document' && 'Documento'}
              {currentFile.type === 'audio' && 'Áudio'}
            </span>
            {selectedFiles.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {currentFileIndex + 1} de {selectedFiles.length}
              </p>
            )}
          </div>
          {/* Edit button for images */}
          {currentFile.type === 'image' ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditingImageIndex(currentFileIndex)}
            >
              <Pencil className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-10" />
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
          {/* Navigation arrows for multiple files */}
          {selectedFiles.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 hover:bg-background z-10"
                onClick={() => setCurrentFileIndex(prev => Math.max(0, prev - 1))}
                disabled={currentFileIndex === 0}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 hover:bg-background z-10"
                onClick={() => setCurrentFileIndex(prev => Math.min(selectedFiles.length - 1, prev + 1))}
                disabled={currentFileIndex === selectedFiles.length - 1}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {currentFile.type === 'image' && currentFile.preview && (
            <img 
              src={currentFile.preview} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          )}
          
          {currentFile.type === 'video' && currentFile.preview && (
            <video 
              src={currentFile.preview}
              controls
              className="max-w-full max-h-full rounded-lg"
            />
          )}
          
          {currentFile.type === 'audio' && currentFile.preview && (
            <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-xl border border-border">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                <Mic className="h-12 w-12 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{currentFile.file.name}</p>
              <audio src={currentFile.preview} controls className="w-64" />
            </div>
          )}
          
          {currentFile.type === 'document' && (
            <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-xl border border-border">
              <div className="w-24 h-24 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <FileText className="h-12 w-12 text-orange-500" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">{currentFile.file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(currentFile.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Thumbnails bar for multiple files */}
        {selectedFiles.length > 1 && (
          <div className="px-4 py-2 border-t border-border bg-muted/30">
            <div className="flex gap-2 overflow-x-auto justify-center">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className={cn(
                    "relative shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                    index === currentFileIndex 
                      ? "border-primary ring-2 ring-primary/20" 
                      : "border-transparent hover:border-muted-foreground/50"
                  )}
                  onClick={() => setCurrentFileIndex(index)}
                >
                  {file.type === 'image' && file.preview ? (
                    <img src={file.preview} alt="" className="w-full h-full object-cover" />
                  ) : file.type === 'video' && file.preview ? (
                    <div className="w-full h-full bg-purple-500/20 flex items-center justify-center">
                      <Video className="h-6 w-6 text-purple-500" />
                    </div>
                  ) : file.type === 'audio' ? (
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                      <Mic className="h-6 w-6 text-primary" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-orange-500/20 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-orange-500" />
                    </div>
                  )}
                  
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  if (selectedFiles.length === 1) {
                    handleSendCurrentFile();
                  }
                }
              }}
            />
            {selectedFiles.length === 1 ? (
              <Button
                onClick={handleSendCurrentFile}
                disabled={isUploading}
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 h-10 w-10 p-0"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSendAllFiles}
                disabled={isUploading}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar todos ({selectedFiles.length})
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {selectedFiles.length === 1 
              ? 'Pressione Enter ou clique para enviar'
              : 'Clique para enviar todos os arquivos de uma vez'
            }
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
});

MediaUploader.displayName = 'MediaUploader';

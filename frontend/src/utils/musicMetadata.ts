// Music metadata extraction utilities

export interface MusicMetadata {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  duration?: number;
  year?: number;
  track?: number;
}

/**
 * Extract metadata from audio file using HTML5 Audio API
 */
export async function extractAudioMetadata(file: File): Promise<MusicMetadata> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      const metadata: MusicMetadata = {
        duration: audio.duration,
      };
      
      // Try to extract title from filename if no metadata available
      if (!metadata.title) {
        metadata.title = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      }
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    });
    
    audio.src = url;
  });
}

/**
 * Format duration from seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate audio file type
 */
export function isValidAudioFile(file: File): boolean {
  const validTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/aac',
    'audio/flac',
    'audio/webm',
  ];
  
  return validTypes.includes(file.type);
}

/**
 * Get audio file type display name
 */
export function getAudioFileTypeName(file: File): string {
  const typeMap: Record<string, string> = {
    'audio/mpeg': 'MP3',
    'audio/mp3': 'MP3',
    'audio/wav': 'WAV',
    'audio/ogg': 'OGG',
    'audio/mp4': 'MP4',
    'audio/aac': 'AAC',
    'audio/flac': 'FLAC',
    'audio/webm': 'WebM',
  };
  
  return typeMap[file.type] || 'Unknown';
}

/**
 * Extract cover art from audio file (if supported by browser)
 * Note: This is limited by browser capabilities and file format support
 */
export async function extractCoverArt(file: File): Promise<string | null> {
  try {
    // This is a placeholder for cover art extraction
    // In a real implementation, you might use libraries like music-metadata-browser
    // or jsmediatags for more comprehensive metadata extraction
    
    // For now, we'll return null as cover art extraction requires additional libraries
    return null;
  } catch (error) {
    console.warn('Failed to extract cover art:', error);
    return null;
  }
}

/**
 * Comprehensive audio file analysis
 */
export async function analyzeAudioFile(file: File): Promise<{
  metadata: MusicMetadata;
  isValid: boolean;
  fileType: string;
  formattedSize: string;
  formattedDuration: string;
  coverArt?: string | null;
}> {
  const isValid = isValidAudioFile(file);
  const fileType = getAudioFileTypeName(file);
  const formattedSize = formatFileSize(file.size);
  
  let metadata: MusicMetadata = {};
  let formattedDuration = '0:00';
  let coverArt: string | null = null;
  
  if (isValid) {
    try {
      metadata = await extractAudioMetadata(file);
      if (metadata.duration) {
        formattedDuration = formatDuration(metadata.duration);
      }
      coverArt = await extractCoverArt(file);
    } catch (error) {
      console.warn('Failed to analyze audio file:', error);
    }
  }
  
  return {
    metadata,
    isValid,
    fileType,
    formattedSize,
    formattedDuration,
    coverArt,
  };
}

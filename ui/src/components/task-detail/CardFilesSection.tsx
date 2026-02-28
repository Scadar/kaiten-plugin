import { useState } from 'react';

import { FileText, Paperclip } from 'lucide-react';

import type { CardFile } from '@/api/types';
import { ImageLightbox } from '@/components/task-detail/ImageLightbox';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

function isImage(file: CardFile): boolean {
  if (file.mimeType?.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.includes(ext);
}

interface FileThumbProps {
  file: CardFile;
  onImageClick: (file: CardFile) => void;
}

function FileThumb({ file, onImageClick }: FileThumbProps) {
  const image = isImage(file);
  const thumbSrc = file.thumbnailUrl ?? (image ? file.url : null);

  if (image && thumbSrc) {
    return (
      <button
        className="group border-border bg-muted hover:border-primary/50 relative h-16 w-16 shrink-0 overflow-hidden rounded border transition-colors"
        title={file.name}
        onClick={() => onImageClick(file)}
      >
        <img
          src={thumbSrc}
          alt={file.name}
          className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
        />
      </button>
    );
  }

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border bg-muted hover:border-primary/50 hover:bg-muted/80 flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded border transition-colors"
      title={file.name}
    >
      <FileText size={20} className="text-muted-foreground" />
      <span className="text-muted-foreground max-w-[56px] truncate px-0.5 text-[10px] leading-tight">
        {file.name}
      </span>
    </a>
  );
}

interface CardFilesSectionProps {
  files: CardFile[];
  /** If true, show the "Files" section heading */
  showHeading?: boolean;
}

export function CardFilesSection({ files, showHeading = true }: CardFilesSectionProps) {
  const [lightbox, setLightbox] = useState<CardFile | null>(null);

  if (files.length === 0) return null;

  return (
    <>
      <Stack spacing="1.5">
        {showHeading && (
          <Stack direction="row" align="center" spacing="1.5">
            <Paperclip size={12} className="text-muted-foreground" />
            <Text variant="overline">Files ({files.length})</Text>
          </Stack>
        )}
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <FileThumb key={file.id} file={file} onImageClick={setLightbox} />
          ))}
        </div>
      </Stack>

      {lightbox && (
        <ImageLightbox src={lightbox.url} alt={lightbox.name} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

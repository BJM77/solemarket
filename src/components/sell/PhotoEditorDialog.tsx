'use client';

import { useEffect, useState } from 'react';
import { Crop, RotateCw, Star, Trash2, Undo2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageCropPanel } from '@/components/ui/image-crop-dialog';
import { FocalPinEditor } from '@/components/sell/FocalPinEditor';
import { isLocalPhoto, type ListingPhoto } from '@/lib/images/listing-photos';
import type { ImageFocalPoint } from '@/lib/images/focal-point';
import type { CaptureFrameKind } from '@/lib/photo-capture/frame';

type Props = {
  /** The photo being edited; the dialog is open while this is set. */
  photo: ListingPhoto | null;
  /** Its position (0 is the main photo) and the number of photos. */
  index: number;
  count: number;
  cropKind: CaptureFrameKind;
  onClose: () => void;
  /** null clears the pin (back to automatic centring). */
  onFocalChange: (point: ImageFocalPoint | null) => void;
  onRotate?: () => void;
  onCrop?: (file: File) => void | Promise<void>;
  onMakeMain?: () => void;
  onRemove?: () => void;
};

/**
 * One place to adjust a listing photo: drag the centre pin on a big preview
 * (with live grid-tile previews), crop, rotate, make it the main photo or remove it.
 */
export function PhotoEditorDialog({ photo, index, count, cropKind, onClose, onFocalChange, onRotate, onCrop, onMakeMain, onRemove }: Props) {
  const [mode, setMode] = useState<'pin' | 'crop'>('pin');
  const photoId = photo?.id;
  useEffect(() => { setMode('pin'); }, [photoId]);
  const canCrop = Boolean(onCrop && photo && isLocalPhoto(photo));

  return (
    <Dialog open={Boolean(photo)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl w-[calc(100%-1.5rem)] max-h-[92svh] overflow-y-auto p-4 gap-3" data-testid="photo-editor">
        <DialogHeader>
          <DialogTitle>{mode === 'crop' ? 'Crop photo' : `Photo ${index + 1} of ${count}${index === 0 ? ' (main photo)' : ''}`}</DialogTitle>
          <DialogDescription>
            {mode === 'crop'
              ? 'Crop tight to the item so it shows large on the listing.'
              : 'Drag the pin onto the middle of the item. Listing tiles are cropped around it.'}
          </DialogDescription>
        </DialogHeader>

        {photo && mode === 'crop' && photo.file ? (
          <ImageCropPanel
            file={photo.file}
            kind={cropKind}
            areaClassName="h-[50svh]"
            onCancel={() => setMode('pin')}
            onCropped={async (file) => {
              setMode('pin');
              await onCrop?.(file);
            }}
          />
        ) : photo ? (
          <>
            <FocalPinEditor
              key={photo.preview}
              src={photo.preview}
              value={photo.focal}
              onChange={onFocalChange}
              label={`Centre of photo ${index + 1}`}
            />
            <div className="flex flex-wrap gap-2">
              {canCrop && (
                <Button type="button" variant="outline" size="sm" onClick={() => setMode('crop')}>
                  <Crop className="mr-1.5 h-4 w-4" /> Crop
                </Button>
              )}
              {onRotate && (
                <Button type="button" variant="outline" size="sm" onClick={onRotate}>
                  <RotateCw className="mr-1.5 h-4 w-4" /> Rotate
                </Button>
              )}
              {onMakeMain && index > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={onMakeMain}>
                  <Star className="mr-1.5 h-4 w-4" /> Make main photo
                </Button>
              )}
              {photo.focal && (
                <Button type="button" variant="outline" size="sm" onClick={() => onFocalChange(null)}>
                  <Undo2 className="mr-1.5 h-4 w-4" /> Reset centre
                </Button>
              )}
              {onRemove && (
                <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={onRemove}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button type="button" onClick={onClose} data-testid="photo-editor-done">Done</Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

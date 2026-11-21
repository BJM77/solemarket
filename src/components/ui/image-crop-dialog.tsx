'use client';

import React, { useEffect, useRef, useState } from 'react';
import Cropper, { type ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { Crop, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/ui';
import {
  CAPTURE_JPEG_QUALITY,
  CAPTURE_MAX_LONG_EDGE,
  getCaptureFrameSpec,
  type CaptureFrameKind,
} from '@/lib/photo-capture/frame';

interface ImageCropPanelProps {
  file: File | Blob;
  kind: CaptureFrameKind;
  onCancel: () => void;
  onCropped: (file: File) => void;
  /** Height of the crop area. */
  areaClassName?: string;
}

/** The cropper and its buttons, for use inside a dialog (crop dialog or photo editor). */
export function ImageCropPanel({ file, kind, onCancel, onCropped, areaClassName = 'h-[55svh]' }: ImageCropPanelProps) {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [lockShape, setLockShape] = useState(true);
  const [busy, setBusy] = useState(false);
  const spec = getCaptureFrameSpec(kind);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setLockShape(true);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    cropperRef.current?.cropper?.setAspectRatio(lockShape ? spec.aspect : NaN);
  }, [lockShape, spec.aspect]);

  const apply = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    setBusy(true);
    const canvas = cropper.getCroppedCanvas({
      maxWidth: CAPTURE_MAX_LONG_EDGE,
      maxHeight: CAPTURE_MAX_LONG_EDGE,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      fillColor: '#ffffff',
    });
    canvas.toBlob((blob) => {
      setBusy(false);
      if (!blob) return;
      const name = (file instanceof File && file.name ? file.name.replace(/\.[^.]+$/, '') : `photo_${Date.now()}`) + '.jpg';
      onCropped(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
    }, 'image/jpeg', CAPTURE_JPEG_QUALITY);
  };

  return (
    <>
      <div className={cn('relative w-full bg-black/90 rounded-lg overflow-hidden', areaClassName)} data-testid="image-crop-area">
        {src && (
          <Cropper
            ref={cropperRef}
            src={src}
            style={{ height: '100%', width: '100%' }}
            aspectRatio={spec.aspect}
            viewMode={1}
            autoCropArea={0.9}
            background={false}
            responsive
            checkOrientation
            guides
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-border p-0.5 text-xs font-semibold">
          <button type="button" onClick={() => setLockShape(true)} className={cn('rounded-full px-3 py-1', lockShape && 'bg-primary text-primary-foreground')}>
            {spec.label} shape
          </button>
          <button type="button" onClick={() => setLockShape(false)} className={cn('rounded-full px-3 py-1', !lockShape && 'bg-primary text-primary-foreground')}>
            Free
          </button>
        </div>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="button" onClick={apply} disabled={busy || !src} data-testid="image-crop-apply">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Use crop'}
          </Button>
        </div>
      </div>
    </>
  );
}

interface ImageCropDialogProps {
  /** The photo to crop; the dialog is open while this is set. */
  file: File | Blob | null;
  kind: CaptureFrameKind;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

/** Crop an uploaded photo to the listing frame (or freeform) before it is added. */
export function ImageCropDialog({ file, kind, onCancel, onCropped }: ImageCropDialogProps) {
  const spec = getCaptureFrameSpec(kind);
  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-2xl w-[calc(100%-1.5rem)] p-4 gap-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crop className="h-4 w-4" /> Crop photo</DialogTitle>
          <DialogDescription>Crop tight to the {spec.label.toLowerCase()} so it shows large on the listing.</DialogDescription>
        </DialogHeader>
        {file && <ImageCropPanel file={file} kind={kind} onCancel={onCancel} onCropped={onCropped} />}
      </DialogContent>
    </Dialog>
  );
}

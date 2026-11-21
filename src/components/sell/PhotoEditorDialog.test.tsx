import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhotoEditorDialog } from './PhotoEditorDialog';
import type { ListingPhoto } from '@/lib/images/listing-photos';

vi.mock('@/components/ui/image-crop-dialog', () => ({
  ImageCropPanel: ({ onCropped }: { onCropped: (f: File) => void }) => (
    <button type="button" onClick={() => onCropped(new File(['x'], 'c.jpg'))}>Use crop</button>
  ),
}));

const local: ListingPhoto = { id: 'a', file: new File(['a'], 'a.jpg'), preview: 'blob:a', focal: { x: 0.3, y: 0.6 } };
const uploaded: ListingPhoto = { id: 'b', url: 'https://cdn/b.jpg', preview: 'https://cdn/b.jpg', focal: null };

function open(photo: ListingPhoto, index = 1) {
  const handlers = { onClose: vi.fn(), onFocalChange: vi.fn(), onRotate: vi.fn(), onCrop: vi.fn(), onMakeMain: vi.fn(), onRemove: vi.fn() };
  render(<PhotoEditorDialog photo={photo} index={index} count={3} cropKind="general" {...handlers} />);
  return handlers;
}

describe('PhotoEditorDialog', () => {
  it('shows the big pin editor with crop, rotate, make main, reset and remove', () => {
    const h = open(local);
    expect(screen.getByRole('slider', { name: 'Centre of photo 2' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Rotate/ }));
    fireEvent.click(screen.getByRole('button', { name: /Make main photo/ }));
    fireEvent.click(screen.getByRole('button', { name: /Reset centre/ }));
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(h.onRotate).toHaveBeenCalled();
    expect(h.onMakeMain).toHaveBeenCalled();
    expect(h.onFocalChange).toHaveBeenCalledWith(null);
    expect(h.onRemove).toHaveBeenCalled();
  });

  it('crop opens the cropper in the same dialog and returns to the pin after', async () => {
    const h = open(local);
    fireEvent.click(screen.getByRole('button', { name: /^Crop$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Use crop' }));
    expect(h.onCrop).toHaveBeenCalledWith(expect.any(File));
    expect(await screen.findByRole('slider')).toBeTruthy();
  });

  it('uploaded photos cannot be cropped, the main photo has no Make main, untouched has no Reset', () => {
    open(uploaded, 0);
    expect(screen.queryByRole('button', { name: /^Crop$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Make main photo/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Reset centre/ })).toBeNull();
    expect(screen.getByText(/main photo/)).toBeTruthy();
  });
});

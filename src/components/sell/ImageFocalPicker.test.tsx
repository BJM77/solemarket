import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageFocalPicker } from './ImageFocalPicker';

function setup() {
  const onChange = vi.fn();
  render(<ImageFocalPicker src="/x.jpg" value={null} onChange={onChange} label="Centre of photo 1" />);
  const box = screen.getByTestId('image-focal-picker');
  vi.spyOn(box, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
  return { onChange, box };
}

const pointer = (type: string, el: Element, init: Record<string, unknown>) =>
  fireEvent(el, Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: init.clientX as number, clientY: init.clientY as number }), { pointerId: 1, pointerType: init.pointerType }));

describe('ImageFocalPicker', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('commits a mouse drag once, on release (not on every move)', () => {
    const { onChange, box } = setup();
    pointer('pointerdown', box, { clientX: 10, clientY: 10, pointerType: 'mouse' });
    pointer('pointermove', box, { clientX: 30, clientY: 40, pointerType: 'mouse' });
    pointer('pointermove', box, { clientX: 50, clientY: 60, pointerType: 'mouse' });
    expect(onChange).not.toHaveBeenCalled();
    pointer('pointerup', box, { clientX: 50, clientY: 60, pointerType: 'mouse' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ x: 0.5, y: 0.6 });
  });

  it('places the pin on a touch tap', () => {
    const { onChange, box } = setup();
    pointer('pointerdown', box, { clientX: 20, clientY: 80, pointerType: 'touch' });
    pointer('pointerup', box, { clientX: 22, clientY: 81, pointerType: 'touch' });
    expect(onChange).toHaveBeenCalledWith({ x: 0.22, y: 0.81 });
  });

  it('leaves the pin alone when a touch turns into a scroll', () => {
    const { onChange, box } = setup();
    pointer('pointerdown', box, { clientX: 20, clientY: 80, pointerType: 'touch' });
    pointer('pointermove', box, { clientX: 20, clientY: 20, pointerType: 'touch' });
    pointer('pointerup', box, { clientX: 20, clientY: 20, pointerType: 'touch' });
    pointer('pointerdown', box, { clientX: 20, clientY: 80, pointerType: 'touch' });
    pointer('pointercancel', box, { clientX: 20, clientY: 80, pointerType: 'touch' });
    expect(onChange).not.toHaveBeenCalled();
    expect(box.className).not.toContain('touch-none');
  });

  it('exposes labelled sliders for keyboard and screen readers', () => {
    const { onChange } = setup();
    expect(screen.getByRole('group', { name: 'Centre of photo 1' })).toBeTruthy();
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(2);
    fireEvent.change(sliders[0], { target: { value: '25' } });
    expect(onChange).toHaveBeenCalledWith({ x: 0.25, y: 0.5 });
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FocalPinEditor } from './FocalPinEditor';

function setup(value: { x: number; y: number } | null = null) {
  const onChange = vi.fn();
  render(<FocalPinEditor src="/x.jpg" value={value} onChange={onChange} label="Centre of photo 1" />);
  const box = screen.getByTestId('focal-pin-editor');
  vi.spyOn(box, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
  return { onChange, box };
}

const pointer = (type: string, el: Element, x: number, y: number, pointerType = 'touch') =>
  fireEvent(el, Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }), { pointerId: 1, pointerType }));

describe('FocalPinEditor', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('a finger drag moves the pin and saves once, when the finger lifts', () => {
    const { onChange, box } = setup();
    pointer('pointerdown', box, 10, 10);
    pointer('pointermove', box, 30, 40);
    pointer('pointermove', box, 40, 25);
    expect(onChange).not.toHaveBeenCalled();
    // The live tile previews follow the finger before it lifts.
    expect((screen.getByTestId('tile-preview-phone') as HTMLImageElement).style.objectPosition).toBe('40% 25%');
    pointer('pointerup', box, 40, 25);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ x: 0.4, y: 0.25 });
  });

  it('a cancelled gesture leaves the pin where it was', () => {
    const { onChange, box } = setup({ x: 0.2, y: 0.3 });
    pointer('pointerdown', box, 80, 80);
    pointer('pointercancel', box, 80, 80);
    expect(onChange).not.toHaveBeenCalled();
    expect((screen.getByTestId('tile-preview-desktop') as HTMLImageElement).style.objectPosition).toBe('20% 30%');
  });

  it('is a labelled slider that arrow keys move (Shift for bigger steps)', () => {
    const { onChange } = setup({ x: 0.2, y: 0.3 });
    const pin = screen.getByRole('slider', { name: 'Centre of photo 1' });
    expect(pin.getAttribute('aria-valuetext')).toBe('20% across, 30% down');
    expect(pin.tabIndex).toBe(0);
    fireEvent.keyDown(pin, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ x: 0.21, y: 0.3 });
    fireEvent.keyDown(pin, { key: 'ArrowDown', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ x: 0.2, y: 0.4 });
    fireEvent.keyDown(pin, { key: 'a' });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('an untouched photo shows the pin and tiles at the centre', () => {
    setup(null);
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('50% across, 50% down');
    expect((screen.getByTestId('tile-preview-phone') as HTMLImageElement).style.objectPosition).toBe('50% 50%');
  });
});

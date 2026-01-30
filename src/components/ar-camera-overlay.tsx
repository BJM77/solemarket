
'use client';

interface ARCameraOverlayProps {
  guideType: 'card' | 'coin' | 'general';
}

export function ARCameraOverlay({ guideType }: ARCameraOverlayProps) {
  const guideStyles = {
    card: {
      aspectRatio: '5 / 7', // Standard trading card aspect ratio
      width: '80%',
      border: '2px dashed white',
      borderRadius: '4%',
    },
    coin: {
      aspectRatio: '1 / 1',
      width: '70%',
      border: '2px dashed white',
      borderRadius: '50%',
    },
    general: {
      aspectRatio: '16 / 9',
      width: '85%',
      border: '2px dashed white',
      borderRadius: '2%',
    },
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div
        style={guideStyles[guideType]}
        className="shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}

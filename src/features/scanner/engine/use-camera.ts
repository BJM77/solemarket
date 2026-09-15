import { useState, useRef, useEffect } from 'react';
import { DeviceProfile, detectDevice, getProfileForPreset } from '@/samcam/lib/device-detector';
import { audioSynth } from '@/samcam/lib/audio-effects';
import { useToast } from '@/samcam/hooks/use-toast';

const getCameraConstraints = (device: DeviceProfile) => {
  const constraints: MediaTrackConstraints = {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    aspectRatio: { ideal: 16/9 },
  };

  if (device.manufacturer === 'apple') {
    return {
      ...constraints,
      // @ts-ignore
      advanced: [
        { focusMode: 'continuous' },
        { exposureMode: 'auto' },
        { whiteBalanceMode: 'auto' },
        { 'com.apple.capture.session.preset': 'photo' },
        { 'com.apple.capture.quality': 1.0 },
      ],
    };
  }

  return {
    ...constraints,
    // @ts-ignore
    advanced: [
      { focusMode: 'continuous' },
      { exposureMode: 'auto' },
      { whiteBalanceMode: 'auto' },
    ],
  };
};

export function useCamera() {
  const { toast } = useToast();
  
  const [selectedDevice, setSelectedDevice] = useState<string>('auto');
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile>(detectDevice());
  const [torchActive, setTorchActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    if (selectedDevice === 'auto') {
      setDeviceProfile(detectDevice());
    } else {
      setDeviceProfile(getProfileForPreset(selectedDevice));
    }
  }, [selectedDevice]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        const constraints = getCameraConstraints(deviceProfile);
        stream = await navigator.mediaDevices.getUserMedia({ video: constraints as any });
        if (videoRef.current) videoRef.current.srcObject = stream;
        if (stream) videoTrackRef.current = stream.getVideoTracks()[0];
      } catch (err: any) {
        toast({ variant: "destructive", title: "Camera Error", description: err.message });
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      videoTrackRef.current = null;
    };
  }, [deviceProfile, toast]);

  const toggleTorch = async () => {
    try {
      const track = videoTrackRef.current;
      if (!track) return;
      const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
      if (capabilities && (capabilities as any).torch) {
        const nextState = !torchActive;
        await track.applyConstraints({ advanced: [{ torch: nextState }] } as any);
        setTorchActive(nextState);
        audioSynth.playChime();
      }
    } catch (e) {
      console.error("Failed to toggle torch", e);
    }
  };

  const captureFrame = (onCapture: (blob: Blob) => void, onStatus: (s: string) => void) => {
    if (!videoRef.current) return false;
    
    onStatus("LOCKING...");
    try {
      const v = videoRef.current;
      const c = document.createElement('canvas');
      c.width = 1080; c.height = 1080;
      const ctx = c.getContext('2d', { alpha: false });
      if (!ctx) return false;
      
      const minDim = Math.min(v.videoWidth, v.videoHeight);
      const sx = (v.videoWidth - minDim) / 2;
      const sy = (v.videoHeight - minDim) / 2;
      ctx.drawImage(v, sx, sy, minDim, minDim, 0, 0, 1080, 1080);

      c.toBlob((blob) => {
        if (!blob) {
            onStatus("READY");
            return;
        }
        audioSynth.playShutter();
        onCapture(blob);
      }, 'image/jpeg', 0.85);
      return true;
    } catch (e) {
      console.error("Capture Error", e);
      onStatus("ERROR");
      setTimeout(() => onStatus("READY"), 2000);
      return false;
    }
  };

  return {
    videoRef,
    deviceProfile,
    selectedDevice,
    setSelectedDevice,
    torchActive,
    toggleTorch,
    captureFrame
  };
}

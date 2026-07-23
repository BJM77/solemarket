"use client";

import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Scan, AlertCircle, Check } from 'lucide-react';

export default function SimpleScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<'mock' | 'ai'>('mock');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check AI status on mount
  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const response = await fetch('/api/debug/google-ai');
      if (response.ok) {
        setMode('ai');
      }
    } catch (error) {
      console.log('AI not available, using mock mode');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg');
    await processImage(imageData);
  };

  const processImage = async (imageData: string) => {
    setScanning(true);
    setError('');
    setResult(null);
    
    try {
      if (mode === 'ai') {
        // Try real AI
        const response = await fetch('/api/scan-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Scan failed');
        }
        
        setResult(data);
      } else {
        // Use mock data
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
        
        setResult({
          playerName: "Michael Jordan",
          cardBrand: "Topps",
          sport: "Basketball",
          cardYear: 1986,
          isMock: true
        });
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError(err instanceof Error ? err.message : 'Scan failed');
      
      // Fallback to mock
      setResult({
        playerName: "Mock Player",
        cardBrand: "Mock Brand",
        sport: "Basketball",
        isMock: true
      });
    } finally {
      setScanning(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    startCamera();
    
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="scanner-container">
      <div className="mb-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${mode === 'ai' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
          {mode === 'ai' ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              AI Mode (Gemini)
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Mock Mode
            </>
          )}
        </div>
      </div>

      <div className="camera-preview">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="scan-overlay">
          <div className="scan-frame" />
          <p className="scan-instruction">Align card within frame</p>
        </div>
      </div>

      <div className="controls">
        <button 
          onClick={captureImage} 
          disabled={scanning}
          className="capture-btn"
        >
          <Camera size={24} />
          {scanning ? 'Scanning...' : 'Capture Card'}
        </button>

        <label className="upload-btn">
          <Upload size={20} />
          Upload Image
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {scanning && (
        <div className="scanning-overlay">
          <Scan className="animate-spin" size={48} />
          <p>{mode === 'ai' ? 'Analyzing with AI...' : 'Processing...'}</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <AlertCircle />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="result-card">
          <div className="result-header">
            <Check className="text-green-500" />
            <h3>Card Identified!</h3>
            {result.isMock && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Mock Data
              </span>
            )}
          </div>
          <div className="result-details">
            <p><strong>Player:</strong> {result.playerName}</p>
            {result.sport && <p><strong>Sport:</strong> {result.sport}</p>}
            {result.cardBrand && <p><strong>Brand:</strong> {result.cardBrand}</p>}
            {result.cardYear && <p><strong>Year:</strong> {result.cardYear}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

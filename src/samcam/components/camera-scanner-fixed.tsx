
"use client";

import { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, AlertCircle, Upload, Scan } from 'lucide-react';
import { quickScan } from '@/samcam/lib/mock-ai'; // Use mocks instead

interface ScanResult {
  playerName: string;
  confidence?: number;
  cardBrand?: string;
  sport?: string;
}

export default function CameraScannerFixed() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image as data URL
    const imageData = canvas.toDataURL('image/jpeg');
    setImagePreview(imageData);
    
    // Process the image
    processImage(imageData);
  };

  const processImage = async (imageData: string) => {
    setScanning(true);
    setError('');
    setResult(null);
    
    try {
      // Use the mock quickScan function
      const scanResult = await quickScan(imageData);
      
      setResult({
        playerName: scanResult.playerName,
        confidence: 0.95,
        sport: 'Basketball' // Mock data
      });
      
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(`Failed to scan card. ${err.message}`);
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
      setImagePreview(imageData);
      processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    startCamera();
    
    // Cleanup
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="scanner-container">
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

      {imagePreview && (
        <div className="image-preview">
          <img src={imagePreview} alt="Captured" />
        </div>
      )}

      {scanning && (
        <div className="scanning-overlay">
          <Scan className="animate-spin" size={48} />
          <p>Analyzing card...</p>
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
          </div>
          <div className="result-details">
            <p><strong>Player:</strong> {result.playerName}</p>
            {result.sport && <p><strong>Sport:</strong> {result.sport}</p>}
            {result.cardBrand && <p><strong>Brand:</strong> {result.cardBrand}</p>}
            {result.confidence && (
              <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

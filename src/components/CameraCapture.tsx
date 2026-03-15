import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraCaptureProps {
  label: string;
  onCapture: (image: string) => void;
  currentImage?: string;
}

export function CameraCapture({ label, onCapture, currentImage }: CameraCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCapturing(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      
      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
        {currentImage && !isCapturing ? (
          <>
            <img src={currentImage} alt={label} className="w-full h-full object-cover" />
            <button 
              onClick={startCamera}
              className="absolute bottom-2 right-2 p-2 bg-white/90 rounded-full shadow-lg text-blue-600 hover:bg-white transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </>
        ) : isCapturing ? (
          <div className="relative w-full h-full">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button 
                onClick={capturePhoto}
                className="p-4 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 transition-transform active:scale-95"
              >
                <Camera className="w-6 h-6" />
              </button>
              <button 
                onClick={stopCamera}
                className="p-4 bg-white text-slate-700 rounded-full shadow-xl hover:bg-slate-50 transition-transform active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={startCamera}
            className="flex flex-col items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Camera className="w-10 h-10" />
            <span className="text-xs font-medium uppercase tracking-wider">Capturar Foto</span>
          </button>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

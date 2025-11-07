'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';

// QR Code detection using browser's built-in BarcodeDetector API with jsQR fallback
const detectQRCode = async (
  imageData: HTMLImageElement | HTMLCanvasElement | ImageData
): Promise<string | null> => {
  // Try modern BarcodeDetector API first
  if ('BarcodeDetector' in window && (imageData instanceof HTMLImageElement || imageData instanceof HTMLCanvasElement)) {
    try {
      // @ts-expect-error - BarcodeDetector is not in TypeScript types yet
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(imageData);
      return barcodes.length > 0 ? barcodes[0].rawValue : null;
    } catch (error) {
      console.error('BarcodeDetector error:', error);
    }
  }

  // Fallback to jsQR for broader browser support
  if (imageData instanceof ImageData) {
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code ? code.data : null;
  }

  // Convert canvas to ImageData for jsQR
  if (imageData instanceof HTMLCanvasElement) {
    const ctx = imageData.getContext('2d');
    if (!ctx) return null;
    const imageDataObj = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const code = jsQR(imageDataObj.data, imageDataObj.width, imageDataObj.height);
    return code ? code.data : null;
  }

  return null;
};

interface ItemData {
  itemId: number;
  itemCode: string;
  itemCodeFormat: string;
  receivedQuantity: number;
  location: string;
  period: string;
  uom: string;
  placement: string;
}

export default function Home() {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | null>(null);
  const [decodedData, setDecodedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ItemData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const resetState = useCallback(() => {
    setError(null);
    setDecodedData(null);
    setPreviewImage(null);
    setParsedData(null);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = async () => {
    resetState();
    setActiveMode('camera');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setError('Could not access camera. Please check permissions.');
      setActiveMode(null);
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    try {
      const result = await detectQRCode(canvas);

      if (result) {
        onResultCapture(result);
        stopCamera();
        setActiveMode(null);
      } else {
        setError('No QR code detected. Try adjusting the position.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onResultCapture = useCallback((value: string) => {
    setDecodedData(value);
    
    try {
      const decodedString = decodeURIComponent(value);
      const jsonData = JSON.parse(decodedString);
      setParsedData(jsonData);
    } catch {
      console.log('Data is not URL-encoded JSON, displaying as plain text');
      setParsedData(null);
    }
  }, []);

  const closeMode = () => {
    stopCamera();
    setActiveMode(null);
    resetState();
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    resetState();
    setActiveMode('upload');
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        if (!e.target) return;
        setPreviewImage(e.target.result as string);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        try {
          const result = await detectQRCode(canvas);
          if (result) {
            onResultCapture(result);
          } else {
            setError('No QR code detected in the uploaded image.');
          }
        } catch (err) {
          console.error(err);
          setError('Failed to process uploaded image.');
        } finally {
          setIsProcessing(false);
        }
      };

      if (e.target) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          QR Code Scanner
        </h1>

        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={startCamera}
              disabled={isProcessing}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                activeMode === 'camera' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Start Camera
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                activeMode === 'upload' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Image
            </button>
          </div>

          {/* Main Content Area */}
          <div className="bg-white rounded-lg shadow-md border-2 border-dashed border-gray-300 min-h-80">
            <div className="p-6">
              {activeMode && (
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                    {activeMode} Mode
                  </span>
                  <button
                    onClick={closeMode}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {activeMode === 'camera' && (
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-lg bg-black">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-64 object-cover" 
                    />
                    <div className="absolute inset-0 m-6 rounded-lg border-4 border-white border-opacity-50 pointer-events-none">
                      <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-blue-400"></div>
                      <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-blue-400"></div>
                      <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-blue-400"></div>
                      <div className="absolute right-0 bottom-0 h-4 w-4 border-r-2 border-b-2 border-blue-400"></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <button
                      onClick={captureFrame}
                      disabled={isProcessing}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center mx-auto"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {isProcessing ? 'Scanning...' : 'Scan QR Code'}
                    </button>
                  </div>
                </div>
              )}

              {activeMode === 'upload' && previewImage && (
                <div className="space-y-4 text-center">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="mx-auto max-h-64 max-w-full rounded-lg shadow-lg"
                  />
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 text-blue-600">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                      Processing image...
                    </div>
                  )}
                </div>
              )}

              {!activeMode && !decodedData && (
                <div className="space-y-4 py-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Choose a method above to scan your QR code</p>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          {decodedData && (
            <div className="rounded-lg shadow-md border border-green-200 bg-green-50">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                  <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  QR Code Decoded Successfully!
                </h2>
                
                <div className="rounded-lg border bg-white p-3 text-sm break-all">
                  {parsedData ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-medium">Item ID</p>
                        <p className="text-sm break-all">{parsedData.itemId}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-medium">Item Code</p>
                        <p className="text-sm break-all font-mono bg-gray-50 p-2 rounded">{parsedData.itemCode}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-medium">Received Quantity</p>
                        <p className="text-sm break-all">{parsedData.receivedQuantity} {parsedData.uom}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm break-all">{parsedData.location}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-medium">Period</p>
                        <p className="text-sm break-all">{parsedData.period}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-medium">Placement</p>
                        <p className="text-sm break-all">{parsedData.placement}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-medium">Item Description</p>
                        <p className="text-sm break-all bg-gray-50 p-3 rounded">{parsedData.itemCodeFormat}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium mb-2">Raw Data:</p>
                      <p className="text-sm break-all font-mono bg-gray-50 p-2 rounded">{decodedData}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(decodedData)}
                        className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Copy to clipboard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden Elements */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
            }
          }}
        />

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

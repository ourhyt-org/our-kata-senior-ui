"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { uploadDocument, dataURLtoFile, AuthApiError, DocumentResponse } from "@/lib/api";

// ============================================================================
// Type Definitions
// ============================================================================

interface DocumentStepFormProps {
  token: string;
  onSubmitSuccess: (response: DocumentResponse) => void;
  onRetake: (reason: string) => void;
  onRejected: (reason: string) => void;
}

interface FormErrors {
  camera?: string;
  capture?: string;
  api?: string;
}

type CameraState = "idle" | "requesting" | "active" | "error";
type CaptureStep = 
  | "front_capture" 
  | "front_preview" 
  | "back_capture" 
  | "back_preview" 
  | "review";

// ============================================================================
// Icons
// ============================================================================

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
      />
    </svg>
  );
}

function IdCardFrontIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
      />
    </svg>
  );
}

function IdCardBackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.75 4.5h16.5M3.75 9h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </svg>
  );
}

function CaptureIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// Constants
// ============================================================================

const CAPTURE_CONFIG = {
  front_capture: {
    title: "Foto frontal de la cédula",
    instruction: "Captura la parte frontal donde aparece tu foto",
    badge: "FRONTAL",
    icon: IdCardFrontIcon,
  },
  back_capture: {
    title: "Foto del reverso de la cédula",
    instruction: "Captura la parte trasera con el código de barras",
    badge: "REVERSO",
    icon: IdCardBackIcon,
  },
};

// ============================================================================
// Component
// ============================================================================

export function DocumentStepForm({ 
  token, 
  onSubmitSuccess, 
  onRetake, 
  onRejected 
}: DocumentStepFormProps) {
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [captureStep, setCaptureStep] = useState<CaptureStep>("front_capture");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraState("requesting");
    setFormErrors({});

    try {
      stopCamera();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraState("active");
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraState("error");
      
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          setFormErrors({
            camera: "Permiso de cámara denegado. Por favor, permite el acceso a la cámara en tu navegador.",
          });
        } else if (error.name === "NotFoundError") {
          setFormErrors({
            camera: "No se encontró ninguna cámara en tu dispositivo.",
          });
        } else {
          setFormErrors({
            camera: "Error al acceder a la cámara. Verifica los permisos del navegador.",
          });
        }
      } else {
        setFormErrors({
          camera: "Error inesperado al acceder a la cámara.",
        });
      }
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setTempImage(imageData);
    stopCamera();

    if (captureStep === "front_capture") {
      setCaptureStep("front_preview");
    } else if (captureStep === "back_capture") {
      setCaptureStep("back_preview");
    }
  }, [captureStep, stopCamera]);

  const confirmFrontPhoto = useCallback(() => {
    if (tempImage) {
      setFrontImage(tempImage);
      setTempImage(null);
      setCaptureStep("back_capture");
      setCameraState("idle");
    }
  }, [tempImage]);

  const confirmBackPhoto = useCallback(() => {
    if (tempImage) {
      setBackImage(tempImage);
      setTempImage(null);
      setCaptureStep("review");
    }
  }, [tempImage]);

  const retakeCurrentPhoto = useCallback(() => {
    setTempImage(null);
    if (captureStep === "front_preview") {
      setCaptureStep("front_capture");
    } else if (captureStep === "back_preview") {
      setCaptureStep("back_capture");
    }
    setCameraState("idle");
  }, [captureStep]);

  const retakeFront = useCallback(() => {
    setFrontImage(null);
    setBackImage(null);
    setTempImage(null);
    setCaptureStep("front_capture");
    setCameraState("idle");
    setFormErrors({});
  }, []);

  const retakeBack = useCallback(() => {
    setBackImage(null);
    setTempImage(null);
    setCaptureStep("back_capture");
    setCameraState("idle");
    setFormErrors({});
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (cameraState === "active" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play()?.catch(console.error);
    }
  }, [cameraState]);

  /**
   * Submit document for OCR verification
   * Only the FRONT image is sent to the backend for Textract processing
   * The back image is kept for UX purposes but not sent to the API
   */
  const handleSubmit = async () => {
    if (!frontImage) {
      setFormErrors({ capture: "Debes capturar la foto frontal del documento" });
      return;
    }

    setIsLoading(true);
    setFormErrors({});

    try {
      // Convert base64 data URL to File for multipart upload
      const frontFile = dataURLtoFile(frontImage, "document-front.jpg");

      // Call the document verification API - only sends front image
      // Backend uses Textract OCR to extract and validate document number
      const response = await uploadDocument(token, frontFile);

      // Handle response based on document status
      if (response.documentStatus === "OK" && response.docMatch && !response.fraudSuspected) {
        // Success - document validated, move to liveness
        onSubmitSuccess(response);
      } else if (response.documentStatus === "RETAKE" || response.nextStep === "RETAKE_DOCUMENT") {
        // Need to recapture - quality issues or bad framing
        const reason = response.reason || "La calidad de la imagen no es suficiente. Por favor, vuelve a capturar el documento.";
        setFormErrors({ api: reason });
        onRetake(reason);
        // Reset to front capture
        setFrontImage(null);
        setBackImage(null);
        setCaptureStep("front_capture");
        setCameraState("idle");
      } else if (response.documentStatus === "MISMATCH" || response.fraudSuspected || response.nextStep === "REJECTED") {
        // Fraud or mismatch detected
        const reason = response.reason || "El número de documento no coincide con el ingresado. Posible suplantación detectada.";
        onRejected(reason);
      }
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFormErrors({
          api: error.detail || "Error al verificar el documento. Intenta nuevamente.",
        });
      } else {
        setFormErrors({
          api: "Error inesperado. Por favor, intenta nuevamente.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isCapturing = captureStep === "front_capture" || captureStep === "back_capture";
  const isPreviewing = captureStep === "front_preview" || captureStep === "back_preview";
  const currentConfig = isCapturing ? CAPTURE_CONFIG[captureStep as keyof typeof CAPTURE_CONFIG] : null;
  const CurrentIcon = currentConfig?.icon || IdCardFrontIcon;

  const getStepNumber = () => {
    if (captureStep === "front_capture" || captureStep === "front_preview") return 1;
    if (captureStep === "back_capture" || captureStep === "back_preview") return 2;
    return 3;
  };

  return (
    <div className="space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* API Error Banner */}
      {formErrors.api && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-full bg-red-500/20 text-red-400">
              <ErrorIcon />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">
                Error de verificación
              </p>
              <p className="text-sm text-red-300/80 mt-1">{formErrors.api}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step indicators */}
      {captureStep !== "review" && (
        <div className="flex justify-center gap-3 mb-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            getStepNumber() === 1
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
              : frontImage 
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
          }`}>
            {frontImage ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 flex items-center justify-center">1</span>}
            Frontal
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            getStepNumber() === 2
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
              : backImage 
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
          }`}>
            {backImage ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 flex items-center justify-center">2</span>}
            Reverso
          </div>
        </div>
      )}

      {/* Camera idle state */}
      {cameraState === "idle" && isCapturing && (
        <div
          onClick={startCamera}
          className="
            relative cursor-pointer rounded-xl border-2 border-dashed p-8
            transition-all duration-200 group
            border-slate-600/50 bg-slate-800/30 hover:border-cyan-500/50 hover:bg-slate-800/50
          "
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              startCamera();
            }
          }}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-slate-700/50 group-hover:bg-cyan-500/10 transition-colors duration-200">
              <CurrentIcon className="w-10 h-10 text-slate-400 group-hover:text-cyan-400 transition-colors" />
            </div>

            <div className="space-y-2">
              <p className="text-base font-medium text-white">
                {currentConfig?.title}
              </p>
              <p className="text-sm text-slate-400">
                {currentConfig?.instruction}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startCamera();
              }}
              className="
                inline-flex items-center gap-2 px-4 py-2 rounded-lg
                bg-cyan-600 text-sm font-medium text-white
                transition-all duration-200
                hover:bg-cyan-500
              "
            >
              <CameraIcon className="w-4 h-4" />
              Activar cámara
            </button>
          </div>
        </div>
      )}

      {/* Camera requesting permission */}
      {cameraState === "requesting" && (
        <div className="rounded-xl border border-slate-600/50 bg-slate-800/30 p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-cyan-500/20 animate-pulse">
              <CameraIcon className="w-10 h-10 text-cyan-400" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-white">Solicitando acceso a la cámara...</p>
              <p className="text-sm text-slate-400">
                Por favor, acepta el permiso en tu navegador
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Camera error state */}
      {cameraState === "error" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 rounded-full bg-red-500/20">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            {formErrors.camera && (
              <p className="text-sm text-red-400">{formErrors.camera}</p>
            )}
            <button
              type="button"
              onClick={startCamera}
              className="
                inline-flex items-center gap-2 px-4 py-2 rounded-lg
                bg-slate-700 text-sm font-medium text-white
                transition-all duration-200 hover:bg-slate-600
              "
            >
              <RefreshIcon className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Camera active - live viewfinder */}
      {cameraState === "active" && isCapturing && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-slate-600/50 bg-black">
            <div className="aspect-[4/3] relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Frame overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-6 sm:inset-8 border-2 border-white/30 rounded-lg">
                  <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
                  <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br" />
                </div>
              </div>

              {/* Top bar with live indicator and badge */}
              <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-white font-medium">EN VIVO</span>
                </div>

                <div className="px-3 py-1.5 rounded-full bg-cyan-500/80 backdrop-blur-sm">
                  <span className="text-xs text-white font-semibold">
                    {currentConfig?.badge}
                  </span>
                </div>
              </div>

              {/* Instruction overlay */}
              <div className="absolute bottom-16 left-0 right-0 flex justify-center">
                <div className="px-4 py-2 rounded-lg bg-black/60 backdrop-blur-sm">
                  <p className="text-sm text-white text-center">
                    {currentConfig?.instruction}
                  </p>
                </div>
              </div>
            </div>

            {/* Capture button */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="
                  p-2 rounded-full bg-white text-slate-900
                  shadow-lg shadow-black/50 transition-all duration-200
                  hover:scale-110 hover:bg-cyan-400
                  focus:outline-none focus:ring-4 focus:ring-cyan-500/50
                  active:scale-95
                "
                aria-label="Capturar foto"
              >
                <CaptureIcon className="w-12 h-12" />
              </button>
            </div>
          </div>

          {/* Tips panel */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="p-1.5 rounded-full bg-cyan-500/20">
              <svg
                className="w-4 h-4 text-cyan-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-300">
                {captureStep === "front_capture" ? "Foto frontal" : "Foto del reverso"}
              </p>
              <ul className="mt-1 text-slate-400 space-y-0.5">
                <li>• Centra la cédula dentro del marco</li>
                <li>• Evita sombras y reflejos</li>
                <li>• Asegúrate de que el texto sea legible</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Photo preview - confirm or retake */}
      {isPreviewing && tempImage && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-slate-600/50 bg-slate-800/30">
            <div className="aspect-[4/3] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tempImage}
                alt={captureStep === "front_preview" ? "Foto frontal capturada" : "Foto del reverso capturada"}
                className="w-full h-full object-cover"
              />

              <div className="absolute top-3 left-3">
                <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                  <span className="text-xs text-white font-medium">
                    {captureStep === "front_preview" ? "FRONTAL" : "REVERSO"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="p-1.5 rounded-full bg-amber-500/20">
              <svg
                className="w-4 h-4 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-300">¿La foto se ve bien?</p>
              <ul className="mt-1 text-slate-400 space-y-0.5">
                <li>• ¿El documento está completo y centrado?</li>
                <li>• ¿El texto es legible y nítido?</li>
                <li>• ¿No hay brillos ni sombras que oculten información?</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={retakeCurrentPhoto}
              className="
                flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                bg-slate-700/50 text-white font-medium
                border border-slate-600/50
                transition-all duration-200
                hover:bg-slate-700 hover:border-slate-500
              "
            >
              <RefreshIcon className="w-4 h-4" />
              Repetir foto
            </button>

            <button
              type="button"
              onClick={captureStep === "front_preview" ? confirmFrontPhoto : confirmBackPhoto}
              className="
                flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium
                shadow-lg shadow-cyan-500/25
                transition-all duration-200
                hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/40
              "
            >
              {captureStep === "front_preview" ? (
                <>
                  Continuar
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  Confirmar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Review state - both photos captured */}
      {captureStep === "review" && frontImage && backImage && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative rounded-xl overflow-hidden border border-green-500/30 bg-slate-800/30">
              <div className="aspect-[4/3] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frontImage}
                  alt="Foto frontal de la cédula"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-1 rounded bg-green-500/80 backdrop-blur-sm">
                  <span className="text-xs text-white font-medium">✓ Frontal</span>
                </div>
                <button
                  type="button"
                  onClick={retakeFront}
                  disabled={isLoading}
                  className="
                    absolute bottom-2 right-2 p-1.5 rounded-lg
                    bg-black/60 backdrop-blur-sm text-white
                    hover:bg-black/80 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  aria-label="Retomar foto frontal"
                >
                  <RefreshIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-green-500/30 bg-slate-800/30">
              <div className="aspect-[4/3] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={backImage}
                  alt="Foto del reverso de la cédula"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-1 rounded bg-green-500/80 backdrop-blur-sm">
                  <span className="text-xs text-white font-medium">✓ Reverso</span>
                </div>
                <button
                  type="button"
                  onClick={retakeBack}
                  disabled={isLoading}
                  className="
                    absolute bottom-2 right-2 p-1.5 rounded-lg
                    bg-black/60 backdrop-blur-sm text-white
                    hover:bg-black/80 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  aria-label="Retomar foto del reverso"
                >
                  <RefreshIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">¡Fotos capturadas correctamente!</p>
              <p className="text-xs text-slate-400">
                Solo la foto frontal será procesada para verificación OCR
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Capture error */}
      {formErrors.capture && (
        <p
          className="text-sm text-red-400 flex items-center gap-1"
          role="alert"
        >
          <ErrorIcon />
          {formErrors.capture}
        </p>
      )}

      {/* Submit button */}
      {captureStep === "review" && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className={`
            w-full rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 
            px-6 py-3.5 text-base font-semibold text-white
            shadow-lg shadow-cyan-500/25 transition-all duration-200
            hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/40
            focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-cyan-500/25
            ${isLoading ? "cursor-wait" : ""}
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon />
              Verificando documento...
            </span>
          ) : (
            "Continuar con verificación OCR"
          )}
        </button>
      )}
    </div>
  );
}

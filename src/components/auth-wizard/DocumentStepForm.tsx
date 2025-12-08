"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface DocumentStepFormProps {
  onSubmitSuccess: (imageData: string) => void;
}

interface FormErrors {
  camera?: string;
  capture?: string;
}

type CameraState = "idle" | "requesting" | "active" | "captured" | "error";

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

function VideoCameraIcon({ className }: { className?: string }) {
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
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
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

export function DocumentStepForm({ onSubmitSuccess }: DocumentStepFormProps) {
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraState("requesting");
    setFormErrors({});

    try {
      stopCamera();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState("active");
      }
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
  }, [facingMode, stopCamera]);

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
    setCapturedImage(imageData);
    setCameraState("captured");
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  useEffect(() => {
    if (cameraState === "active" && facingMode) {
      startCamera();
    }
  }, [facingMode]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleSubmit = async () => {
    if (!capturedImage) {
      setFormErrors({ capture: "Debes capturar una foto del documento" });
      return;
    }

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    console.log("Documento enviado", capturedImage.substring(0, 50) + "...");
    onSubmitSuccess(capturedImage);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      {cameraState === "idle" && (
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
              <VideoCameraIcon className="w-10 h-10 text-slate-400 group-hover:text-cyan-400 transition-colors" />
            </div>

            <div className="space-y-2">
              <p className="text-base font-medium text-white">
                Activa la cámara para fotografiar tu documento
              </p>
              <p className="text-sm text-slate-400">
                Asegúrate de tener buena iluminación y el documento completo en el encuadre
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

      {cameraState === "requesting" && (
        <div className="rounded-xl border border-slate-600/50 bg-slate-800/30 p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-cyan-500/20 animate-pulse">
              <VideoCameraIcon className="w-10 h-10 text-cyan-400" />
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

      {cameraState === "active" && (
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

              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-white/30 rounded-lg">
                  <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
                  <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br" />
                </div>
              </div>

              <div className="absolute top-3 left-3 right-3 flex justify-between">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-white font-medium">EN VIVO</span>
                </div>

                <button
                  type="button"
                  onClick={switchCamera}
                  className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
                  aria-label="Cambiar cámara"
                >
                  <RefreshIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="
                  p-2 rounded-full bg-white text-slate-900
                  shadow-lg shadow-black/50 transition-all duration-200
                  hover:scale-110 hover:bg-cyan-400
                  focus:outline-none focus:ring-4 focus:ring-cyan-500/50
                "
                aria-label="Capturar foto"
              >
                <CaptureIcon className="w-12 h-12" />
              </button>
            </div>
          </div>

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
              <p className="font-medium text-slate-300">Consejos para una buena captura</p>
              <ul className="mt-1 text-slate-400 space-y-0.5">
                <li>• Centra el documento dentro del marco</li>
                <li>• Evita sombras y reflejos</li>
                <li>• Asegúrate de que el texto sea legible</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {cameraState === "captured" && capturedImage && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-slate-600/50 bg-slate-800/30">
            <div className="aspect-[4/3] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedImage}
                alt="Foto capturada del documento"
                className="w-full h-full object-contain bg-slate-900"
              />

              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  onClick={retakePhoto}
                  disabled={isLoading}
                  className="
                    inline-flex items-center gap-2 px-3 py-2 rounded-lg
                    bg-black/70 backdrop-blur-sm text-white text-sm font-medium
                    transition-all duration-200 hover:bg-black/90
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  <RefreshIcon className="w-4 h-4" />
                  Volver a tomar
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Foto capturada</p>
                    <p className="text-xs text-slate-400">
                      Verifica que el documento sea legible
                    </p>
                  </div>
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
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-300">Revisa antes de continuar</p>
              <ul className="mt-1 text-slate-400 space-y-0.5">
                <li>• El documento debe estar completamente visible</li>
                <li>• La información debe ser legible</li>
                <li>• No debe haber brillos que oculten datos</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {formErrors.capture && (
        <p
          className="text-sm text-red-400 flex items-center gap-1"
          role="alert"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {formErrors.capture}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading || cameraState !== "captured"}
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
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
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
            Procesando documento...
          </span>
        ) : (
          "Continuar con verificación OCR"
        )}
      </button>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  checkLiveness, 
  AuthApiError, 
  LivenessResponse 
} from "@/lib/api";

type ChallengeType = "BLINK" | "APPROACH";

interface LivenessStepFormProps {
  token: string;
  challengeType: ChallengeType;
  onSubmitSuccess: (response: LivenessResponse) => void;
  onRetry: (reason: string) => void;
  onRejected: (reason: string) => void;
  /** Called when user exhausts all retry attempts (default: 3) */
  onMaxAttemptsReached: () => void;
}

interface FormErrors {
  camera?: string;
  capture?: string;
  api?: string;
}

type LivenessState = 
  | "idle"
  | "requesting"
  | "ready"
  | "countdown"
  | "capturing"
  | "submitting"
  | "error"
  | "max_attempts";

const MAX_ATTEMPTS = 3;

const BURST_CONFIG = {
  framesCount: 8,
  durationMs: 2000,
} as const;
const CHALLENGE_CONFIG = {
  BLINK: {
    title: "Prueba de parpadeo",
    instruction: "Parpadea naturalmente mientras miras a la cámara",
    duringCapture: "Parpadea ahora...",
    icon: "👁️",
    tip: "Mantén la mirada al centro y parpadea de forma natural durante la captura.",
  },
  APPROACH: {
    title: "Prueba de acercamiento",
    instruction: "Acércate lentamente hacia la cámara",
    duringCapture: "Acércate lentamente...",
    icon: "📷",
    tip: "Empieza con el rostro alejado y ve acercándote gradualmente durante la captura.",
  },
};

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

function FaceIcon({ className }: { className?: string }) {
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
        d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
      />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
        clipRule="evenodd"
      />
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

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className || "h-5 w-5"}`}
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

function CaptureProgressRing({ 
  progress, 
  framesCount 
}: { 
  progress: number; 
  framesCount: number;
}) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-28 h-28">
      <svg className="w-28 h-28 transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          className="text-slate-700"
        />
        {/* Progress circle */}
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          className="text-cyan-400 transition-all duration-300"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">
          {Math.round((progress / 100) * framesCount)}/{framesCount}
        </span>
      </div>
    </div>
  );
}

export function LivenessStepForm({
  token,
  challengeType,
  onSubmitSuccess,
  onRetry,
  onRejected,
  onMaxAttemptsReached,
}: LivenessStepFormProps) {
  const [state, setState] = useState<LivenessState>("idle");
  const [countdown, setCountdown] = useState<number>(0);
  const [captureProgress, setCaptureProgress] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [capturedFrames, setCapturedFrames] = useState<Blob[]>([]);
  const [attempts, setAttempts] = useState<number>(0);
  const attemptsRef = useRef<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const config = CHALLENGE_CONFIG[challengeType];

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setState("requesting");
    setFormErrors({});

    try {
      stopCamera();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setState("ready");
    } catch (error) {
      setState("error");

      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          setFormErrors({
            camera: "Permiso de cámara denegado. Por favor, permite el acceso a la cámara en tu navegador.",
          });
        } else if (error.name === "NotFoundError") {
          setFormErrors({
            camera: "No se encontró ninguna cámara frontal en tu dispositivo.",
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

  useEffect(() => {
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [state]);

  const startCountdown = useCallback(() => {
    setCountdown(3);
    setState("countdown");
  }, []);

  useEffect(() => {
    if (state !== "countdown") return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      startBurstCapture();
    }
  }, [state, countdown]);

  const startBurstCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      setFormErrors({ capture: "Error: no se pudo acceder a la cámara" });
      setState("error");
      return;
    }

    setState("capturing");
    setCaptureProgress(0);

    try {
      const { framesCount, durationMs } = BURST_CONFIG;
      const intervalMs = durationMs / (framesCount - 1);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      if (!context) {
        throw new Error("No se pudo inicializar el canvas");
      }

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const frames: Blob[] = [];

      for (let i = 0; i < framesCount; i++) {
        context.save();
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.restore();

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error(`Error al capturar frame ${i + 1}`));
              }
            },
            "image/jpeg",
            0.85
          );
        });

        frames.push(blob);
        setCaptureProgress(((i + 1) / framesCount) * 100);

        if (i < framesCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }

      setCapturedFrames(frames);
      stopCamera();
      await submitFrames(frames);
    } catch {
      setFormErrors({
        capture: "Error durante la captura. Por favor, intenta nuevamente.",
      });
      setState("error");
    }
  }, [stopCamera]);

  const resetCapture = useCallback(() => {
    setCapturedFrames([]);
    setCaptureProgress(0);
    setCountdown(0);
    setFormErrors({});
    setState("idle");
  }, []);

  const submitFrames = useCallback(async (frames: Blob[]) => {
    setState("submitting");
    setFormErrors({});

    try {
      const response = await checkLiveness(token, frames);

      if (response.passed && response.nextStep === "COMPLETED") {
        onSubmitSuccess(response);
      } else {
        const reason = response.reason || "No se detectó el movimiento esperado. Por favor, intenta nuevamente.";
        
        if (response.nextStep === "REJECTED") {
          onRejected(reason);
          return;
        }
        
        attemptsRef.current += 1;
        const newAttempts = attemptsRef.current;
        setAttempts(newAttempts);
        
        if (newAttempts >= MAX_ATTEMPTS) {
          setFormErrors({ 
            api: `Has agotado los ${MAX_ATTEMPTS} intentos permitidos. Debes reiniciar el proceso de autenticación.` 
          });
          setState("max_attempts");
          return;
        }
        setFormErrors({ 
          api: `${reason} (Intento ${newAttempts} de ${MAX_ATTEMPTS})` 
        });
        onRetry(reason);
        resetCapture();
      }
    } catch (error) {
      attemptsRef.current += 1;
      const newAttempts = attemptsRef.current;
      setAttempts(newAttempts);
      
      let errorMessage = "Error inesperado. Por favor, intenta nuevamente.";
      if (error instanceof AuthApiError) {
        errorMessage = error.detail || "Error en la verificación de vida. Intenta nuevamente.";
      }
      
      if (newAttempts >= MAX_ATTEMPTS) {
        setFormErrors({ 
          api: `${errorMessage} Has agotado los ${MAX_ATTEMPTS} intentos permitidos.` 
        });
        setState("max_attempts");
        return;
      }
      
      setFormErrors({
        api: `${errorMessage} (Intento ${newAttempts} de ${MAX_ATTEMPTS})`,
      });
      setState("error");
    }
  }, [token, onSubmitSuccess, onRetry, onRejected, resetCapture]);

  const retryCapture = useCallback(() => {
    resetCapture();
    startCamera();
  }, [resetCapture, startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-6">
      <canvas ref={canvasRef} className="hidden" />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* API Error Banner */}
      {formErrors.api && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-full bg-red-500/20 text-red-400">
              <ErrorIcon />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">
                Verificación fallida
              </p>
              <p className="text-sm text-red-300/80 mt-1">{formErrors.api}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Screen */}
      {state === "idle" && (
        <div className="space-y-6">
          {/* Show attempts remaining if user has failed before */}
          {attempts > 0 && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-amber-400">
                Intento {attempts + 1} de {MAX_ATTEMPTS}
              </span>
              <div className="flex gap-1 ml-2">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index < attempts 
                        ? "bg-red-400" 
                        : index === attempts 
                          ? "bg-amber-400" 
                          : "bg-slate-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="text-center p-6 rounded-xl border border-slate-600/50 bg-slate-800/30">
            <div className="text-5xl mb-4">{config.icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {config.title}
            </h3>
            <p className="text-slate-400 text-sm">
              {config.instruction}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <div className="p-1.5 rounded-full bg-cyan-500/20">
                <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Cómo funciona</p>
                <p className="text-xs text-slate-400 mt-1">
                  Capturaremos automáticamente {BURST_CONFIG.framesCount} fotos en {BURST_CONFIG.durationMs / 1000} segundos. 
                  {config.tip}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={startCamera}
            className="
              w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg
              bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold
              shadow-lg shadow-cyan-500/25
              transition-all duration-200
              hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/40
            "
          >
            <FaceIcon className="w-5 h-5" />
            {attempts > 0 ? "Reintentar prueba de vida" : "Iniciar prueba de vida"}
          </button>
        </div>
      )}

      {/* Requesting Permission */}
      {state === "requesting" && (
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

      {/* Camera Error */}
      {state === "error" && formErrors.camera && (
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
            <p className="text-sm text-red-400">{formErrors.camera}</p>
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

      {/* Capture Error - Allow Retry */}
      {state === "error" && (formErrors.capture || formErrors.api) && !formErrors.camera && (
        <div className="space-y-4">
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
              <p className="text-sm text-red-400">
                {formErrors.capture || formErrors.api}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={retryCapture}
            className="
              w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold
              shadow-lg shadow-cyan-500/25
              transition-all duration-200
              hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/40
            "
          >
            <RefreshIcon className="w-4 h-4" />
            Intentar nuevamente
          </button>
        </div>
      )}

      {/* Camera Ready - Waiting to Start */}
      {state === "ready" && (
        <div className="space-y-4">
          {/* Enlarged camera container - expanded with negative margins */}
          <div className="relative rounded-xl overflow-hidden border border-slate-600/50 bg-black -mx-8 sm:-mx-12">
            <div className="aspect-square sm:aspect-[4/3] relative">
              {/* Visible video feed */}
              <video
                autoPlay
                playsInline
                muted
                ref={(el) => {
                  if (el && streamRef.current) {
                    el.srcObject = streamRef.current;
                  }
                }}
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />

              {/* Face oval overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-64 sm:w-56 sm:h-72 border-2 border-white/40 rounded-[50%]">
                  <div className="absolute inset-0 border-4 border-cyan-400/50 rounded-[50%]" />
                </div>
              </div>

              {/* Top bar */}
              <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-white font-medium">CÁMARA LISTA</span>
                </div>
              </div>

              {/* Instruction overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="px-4 py-3 rounded-lg bg-black/70 backdrop-blur-sm">
                  <p className="text-sm text-white text-center">
                    Centra tu rostro en el óvalo y presiona el botón cuando estés listo
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={startCountdown}
            className="
              w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg
              bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-lg
              shadow-lg shadow-cyan-500/25
              transition-all duration-200
              hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/40
              active:scale-[0.98]
            "
          >
            <PlayIcon className="w-6 h-6" />
            ¡Iniciar captura!
          </button>
        </div>
      )}

      {/* Countdown */}
      {state === "countdown" && (
        <div className="space-y-4">
          {/* Enlarged camera container */}
          <div className="relative rounded-xl overflow-hidden border border-slate-600/50 bg-black -mx-8 sm:-mx-12">
            <div className="aspect-square sm:aspect-[4/3] relative">
              {/* Visible video feed */}
              <video
                autoPlay
                playsInline
                muted
                ref={(el) => {
                  if (el && streamRef.current) {
                    el.srcObject = streamRef.current;
                  }
                }}
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />

              {/* Countdown overlay */}
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-9xl font-bold text-cyan-400 animate-pulse">
                    {countdown}
                  </div>
                  <p className="text-xl text-white mt-4">Prepárate...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Capturing Burst */}
      {state === "capturing" && (
        <div className="space-y-4">
          {/* Enlarged camera container */}
          <div className="relative rounded-xl overflow-hidden border border-cyan-500/50 bg-black -mx-8 sm:-mx-12">
            <div className="aspect-square sm:aspect-[4/3] relative">
              {/* Visible video feed */}
              <video
                autoPlay
                playsInline
                muted
                ref={(el) => {
                  if (el && streamRef.current) {
                    el.srcObject = streamRef.current;
                  }
                }}
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />

              {/* Face oval overlay with pulsing effect */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-64 sm:w-56 sm:h-72 border-4 border-cyan-400 rounded-[50%] animate-pulse" />
              </div>

              {/* Recording indicator */}
              <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/80 backdrop-blur-sm animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-white" />
                  <span className="text-xs text-white font-medium">CAPTURANDO</span>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                  <span className="text-xs text-white font-semibold">
                    {Math.round(captureProgress)}%
                  </span>
                </div>
              </div>

              {/* Progress ring overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute inset-0 bg-black/30" />
                <CaptureProgressRing 
                  progress={captureProgress} 
                  framesCount={BURST_CONFIG.framesCount} 
                />
              </div>

              {/* Instruction */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="px-4 py-3 rounded-lg bg-cyan-500/80 backdrop-blur-sm">
                  <p className="text-sm text-white text-center font-medium">
                    {config.duringCapture}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submitting */}
      {state === "submitting" && (
        <div className="rounded-xl border border-slate-600/50 bg-slate-800/30 p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-cyan-500/20">
              <SpinnerIcon className="w-10 h-10 text-cyan-400" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-white">Verificando prueba de vida...</p>
              <p className="text-sm text-slate-400">
                Analizando {capturedFrames.length} frames capturados
              </p>
            </div>

            {/* Frame thumbnails */}
            <div className="flex gap-2 mt-4">
              {capturedFrames.map((_, index) => (
                <div
                  key={index}
                  className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center"
                >
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Max Attempts Reached - Must restart from step 1 */}
      {state === "max_attempts" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-red-500/20">
                <svg
                  className="w-12 h-12 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-red-400">
                  Intentos agotados
                </h3>
                <p className="text-sm text-slate-300">
                  Has utilizado los {MAX_ATTEMPTS} intentos disponibles para la prueba de vida.
                </p>
                <p className="text-sm text-slate-400">
                  {formErrors.api || "Por tu seguridad, debes reiniciar el proceso de autenticación desde el inicio."}
                </p>
              </div>

              {/* Attempts indicator */}
              <div className="flex gap-2 mt-2">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, index) => (
                  <div
                    key={index}
                    className="w-3 h-3 rounded-full bg-red-400"
                    title={`Intento ${index + 1} fallido`}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onMaxAttemptsReached}
            className="
              w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg
              bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold
              shadow-lg
              transition-all duration-200
              hover:from-slate-500 hover:to-slate-600
            "
          >
            <RefreshIcon className="w-5 h-5" />
            Reiniciar desde el paso 1
          </button>
        </div>
      )}
    </div>
  );
}

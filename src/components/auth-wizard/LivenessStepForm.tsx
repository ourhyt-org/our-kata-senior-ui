"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { checkLiveness, dataURLtoFile, AuthApiError, LivenessResponse } from "@/lib/api";

// ============================================================================
// Type Definitions
// ============================================================================

type ChallengeType = "BLINK" | "APPROACH";

interface LivenessStepFormProps {
  token: string;
  challengeType: ChallengeType;
  onSubmitSuccess: (response: LivenessResponse) => void;
  onRetry: (reason: string) => void;
  onRejected: (reason: string) => void;
}

interface FormErrors {
  camera?: string;
  capture?: string;
  api?: string;
}

type CameraState = "idle" | "requesting" | "active" | "error";
type CaptureStep = "instructions" | "frame1" | "frame2_countdown" | "frame2" | "review";

// ============================================================================
// Constants
// ============================================================================

/**
 * Challenge instructions based on the type from the JWT
 * - BLINK: User must blink twice while looking at the camera
 * - APPROACH: User must slowly approach the camera
 */
const CHALLENGE_CONFIG = {
  BLINK: {
    title: "Prueba de parpadeo",
    instruction: "Parpadea dos veces mientras miras a la cámara",
    frame1Hint: "Mira a la cámara con los ojos abiertos",
    frame2Hint: "Ahora parpadea naturalmente",
    icon: "👁️",
  },
  APPROACH: {
    title: "Prueba de acercamiento",
    instruction: "Acércate lentamente a la cámara",
    frame1Hint: "Mantén tu rostro alejado de la cámara",
    frame2Hint: "Ahora acércate hasta que tu rostro llene el marco",
    icon: "📷",
  },
};

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
// Component
// ============================================================================

export function LivenessStepForm({
  token,
  challengeType,
  onSubmitSuccess,
  onRetry,
  onRejected,
}: LivenessStepFormProps) {
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [captureStep, setCaptureStep] = useState<CaptureStep>("instructions");
  const [frame1, setFrame1] = useState<string | null>(null);
  const [frame2, setFrame2] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const config = CHALLENGE_CONFIG[challengeType];

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraState("requesting");
    setFormErrors({});

    try {
      stopCamera();

      // Use front-facing camera for selfie/liveness
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

      setCameraState("active");
      setCaptureStep("frame1");
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

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror the image for a more natural selfie experience
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.setTransform(1, 0, 0, 1, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.9);
  }, []);

  const captureFrame1 = useCallback(() => {
    const imageData = captureFrame();
    if (imageData) {
      setFrame1(imageData);
      setCaptureStep("frame2_countdown");
      // Start countdown for frame 2
      setCountdown(3);
    }
  }, [captureFrame]);

  useEffect(() => {
    if (captureStep === "frame2_countdown" && countdown > 0) {
      countdownIntervalRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (captureStep === "frame2_countdown" && countdown === 0) {
      setCaptureStep("frame2");
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearTimeout(countdownIntervalRef.current);
      }
    };
  }, [captureStep, countdown]);

  const captureFrame2 = useCallback(() => {
    const imageData = captureFrame();
    if (imageData) {
      setFrame2(imageData);
      stopCamera();
      setCaptureStep("review");
    }
  }, [captureFrame, stopCamera]);

  const retakeFrames = useCallback(() => {
    setFrame1(null);
    setFrame2(null);
    setCountdown(0);
    setCaptureStep("instructions");
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
   * Submit both frames for liveness verification
   * The backend determines the challenge type from the JWT token
   */
  const handleSubmit = async () => {
    if (!frame1 || !frame2) {
      setFormErrors({ capture: "Debes capturar ambos frames para la verificación" });
      return;
    }

    setIsLoading(true);
    setFormErrors({});

    try {
      const frame1File = dataURLtoFile(frame1, "frame1.jpg");
      const frame2File = dataURLtoFile(frame2, "frame2.jpg");

      const response = await checkLiveness(token, frame1File, frame2File);

      if (response.passed && response.nextStep === "COMPLETED") {
        onSubmitSuccess(response);
      } else {
        const reason = response.reason || "No se detectó el movimiento esperado. Por favor, intenta nuevamente.";
        if (response.nextStep === "REJECTED") {
          onRejected(reason);
        } else {
          setFormErrors({ api: reason });
          onRetry(reason);
          // Allow retry
          retakeFrames();
        }
      }
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFormErrors({
          api: error.detail || "Error en la verificación de vida. Intenta nuevamente.",
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

  const currentHint = captureStep === "frame1" || captureStep === "frame2_countdown" 
    ? config.frame1Hint 
    : config.frame2Hint;

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
                Verificación fallida
              </p>
              <p className="text-sm text-red-300/80 mt-1">{formErrors.api}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions screen */}
      {captureStep === "instructions" && cameraState === "idle" && (
        <div className="space-y-6">
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
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-semibold text-sm">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">Primera captura</p>
                <p className="text-xs text-slate-400">{config.frame1Hint}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-semibold text-sm">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">Segunda captura</p>
                <p className="text-xs text-slate-400">{config.frame2Hint}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={startCamera}
            className="
              w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold
              shadow-lg shadow-cyan-500/25
              transition-all duration-200
              hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/40
            "
          >
            <FaceIcon className="w-5 h-5" />
            Iniciar verificación biométrica
          </button>
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

      {/* Camera error */}
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
      {cameraState === "active" && (captureStep === "frame1" || captureStep === "frame2_countdown" || captureStep === "frame2") && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-slate-600/50 bg-black">
            <div className="aspect-square sm:aspect-[4/3] relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }} // Mirror for selfie
              />

              {/* Face oval overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-64 sm:w-56 sm:h-72 border-2 border-white/40 rounded-[50%]">
                  <div className="absolute inset-0 border-4 border-cyan-400/50 rounded-[50%] animate-pulse" />
                </div>
              </div>

              {/* Top bar */}
              <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-white font-medium">EN VIVO</span>
                </div>

                <div className="px-3 py-1.5 rounded-full bg-cyan-500/80 backdrop-blur-sm">
                  <span className="text-xs text-white font-semibold">
                    {captureStep === "frame1" ? "FRAME 1" : captureStep === "frame2_countdown" ? `${countdown}...` : "FRAME 2"}
                  </span>
                </div>
              </div>

              {/* Countdown overlay */}
              {captureStep === "frame2_countdown" && countdown > 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-8xl font-bold text-cyan-400 animate-pulse">
                    {countdown}
                  </div>
                </div>
              )}

              {/* Instruction overlay */}
              <div className="absolute bottom-16 left-0 right-0 flex justify-center">
                <div className="px-4 py-2 rounded-lg bg-black/60 backdrop-blur-sm max-w-xs">
                  <p className="text-sm text-white text-center">
                    {currentHint}
                  </p>
                </div>
              </div>
            </div>

            {/* Capture button */}
            {(captureStep === "frame1" || captureStep === "frame2") && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button
                  type="button"
                  onClick={captureStep === "frame1" ? captureFrame1 : captureFrame2}
                  className="
                    p-2 rounded-full bg-white text-slate-900
                    shadow-lg shadow-black/50 transition-all duration-200
                    hover:scale-110 hover:bg-cyan-400
                    focus:outline-none focus:ring-4 focus:ring-cyan-500/50
                    active:scale-95
                  "
                  aria-label={`Capturar frame ${captureStep === "frame1" ? "1" : "2"}`}
                >
                  <CaptureIcon className="w-12 h-12" />
                </button>
              </div>
            )}
          </div>

          {/* Progress indicators */}
          <div className="flex justify-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              frame1
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : captureStep === "frame1"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
            }`}>
              {frame1 ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 flex items-center justify-center">1</span>}
              Frame 1
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              frame2
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : captureStep === "frame2" || captureStep === "frame2_countdown"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
            }`}>
              {frame2 ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 flex items-center justify-center">2</span>}
              Frame 2
            </div>
          </div>
        </div>
      )}

      {/* Review state - both frames captured */}
      {captureStep === "review" && frame1 && frame2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative rounded-xl overflow-hidden border border-green-500/30 bg-slate-800/30">
              <div className="aspect-[3/4] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frame1}
                  alt="Frame 1 - rostro capturado"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-1 rounded bg-green-500/80 backdrop-blur-sm">
                  <span className="text-xs text-white font-medium">✓ Frame 1</span>
                </div>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-green-500/30 bg-slate-800/30">
              <div className="aspect-[3/4] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frame2}
                  alt="Frame 2 - rostro capturado"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-1 rounded bg-green-500/80 backdrop-blur-sm">
                  <span className="text-xs text-white font-medium">✓ Frame 2</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">¡Capturas completadas!</p>
              <p className="text-xs text-slate-400">
                Listo para verificar tu identidad
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={retakeFrames}
              disabled={isLoading}
              className="
                flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                bg-slate-700/50 text-white font-medium
                border border-slate-600/50
                transition-all duration-200
                hover:bg-slate-700 hover:border-slate-500
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <RefreshIcon className="w-4 h-4" />
              Repetir
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className={`
                flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold
                shadow-lg shadow-cyan-500/25
                transition-all duration-200
                hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/40
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isLoading ? "cursor-wait" : ""}
              `}
            >
              {isLoading ? (
                <>
                  <SpinnerIcon />
                  Verificando...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  Verificar
                </>
              )}
            </button>
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
    </div>
  );
}


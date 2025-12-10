"use client";

import { useState, useCallback } from "react";
import { IdentityStepForm, IdentityFormData } from "@/components/auth-wizard/IdentityStepForm";
import { DocumentStepForm } from "@/components/auth-wizard/DocumentStepForm";
import { LivenessStepForm } from "@/components/auth-wizard/LivenessStepForm";
import {
  StartAuthResponse,
  DocumentResponse,
  LivenessResponse,
} from "@/lib/api";

type AuthFlowStep = "FORM" | "DOCUMENT" | "LIVENESS" | "DONE" | "ERROR";
type ChallengeType = "BLINK" | "APPROACH";

interface AuthState {
  token: string | null;
  authId: string | null;
  challengeType: ChallengeType | null;
  customerName: string | null;
  riskScore: number | null;
  livenessScore: number | null;
}

function ShieldIcon() {
  return (
    <svg
      className="w-8 h-8 text-cyan-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      className="w-8 h-8 text-cyan-400"
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

function FaceIcon() {
  return (
    <svg
      className="w-8 h-8 text-cyan-400"
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

function CheckIcon() {
  return (
    <svg
      className="w-8 h-8 text-green-400"
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

function ErrorAlertIcon() {
  return (
    <svg
      className="w-8 h-8 text-red-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="w-4 h-4 text-slate-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function StepBadge({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1">
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
              i < currentStep ? "bg-cyan-400" : "bg-slate-600"
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-cyan-400">
        Paso {currentStep} de {totalSteps}
      </span>
    </div>
  );
}

interface StepConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

function getStepConfig(step: AuthFlowStep, customerName: string | null): StepConfig {
  const configs: Record<AuthFlowStep, StepConfig> = {
    FORM: {
      title: "Verificación de identidad",
      subtitle: "Ingresa tu identificación y teléfono para iniciar el proceso de autenticación segura.",
      icon: <ShieldIcon />,
    },
    DOCUMENT: {
      title: "Captura de tu cédula",
      subtitle: "Fotografía el frente y reverso de tu documento de identidad.",
      icon: <DocumentIcon />,
    },
    LIVENESS: {
      title: "Verificación biométrica",
      subtitle: "Realizaremos una prueba de vida para confirmar tu identidad.",
      icon: <FaceIcon />,
    },
    DONE: {
      title: "¡Autenticación completada!",
      subtitle: customerName 
        ? `Bienvenido/a, ${customerName}. Tu identidad ha sido verificada exitosamente.`
        : "Tu identidad ha sido verificada exitosamente.",
      icon: <CheckIcon />,
    },
    ERROR: {
      title: "Error de autenticación",
      subtitle: "No fue posible completar la verificación de tu identidad.",
      icon: <ErrorAlertIcon />,
    },
  };
  return configs[step];
}

function getStepNumber(step: AuthFlowStep): number {
  const stepOrder: AuthFlowStep[] = ["FORM", "DOCUMENT", "LIVENESS", "DONE"];
  const index = stepOrder.indexOf(step);
  return index >= 0 ? index + 1 : 3;
}

interface SuccessScreenProps {
  customerName: string | null;
  livenessScore: number | null;
  onReset: () => void;
}

function SuccessScreen({ customerName, livenessScore, onReset }: SuccessScreenProps) {
  return (
    <div className="text-center py-8 space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30">
        <svg
          className="w-10 h-10 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <p className="text-xl font-semibold text-white">
          {customerName ? `¡Bienvenido/a, ${customerName}!` : "¡Verificación exitosa!"}
        </p>
        <p className="text-sm text-slate-400">
          Tu identidad ha sido verificada correctamente
        </p>
      </div>

      {livenessScore !== null && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <span className="text-sm text-slate-400">Puntuación de vida:</span>
          <span className="text-sm font-semibold text-cyan-400">
            {(livenessScore * 100).toFixed(0)}%
          </span>
        </div>
      )}

      <div className="pt-4">
        <button
          type="button"
          onClick={onReset}
          className="
            px-6 py-2.5 rounded-lg text-sm font-medium
            bg-slate-700/50 text-white border border-slate-600/50
            transition-all duration-200
            hover:bg-slate-700 hover:border-slate-500
          "
        >
          Iniciar nuevo proceso
        </button>
      </div>
    </div>
  );
}

interface ErrorScreenProps {
  errorMessage: string;
  onReset: () => void;
}

function ErrorScreen({ errorMessage, onReset }: ErrorScreenProps) {
  return (
    <div className="text-center py-8 space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30">
        <svg
          className="w-10 h-10 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <p className="text-xl font-semibold text-white">
          Verificación no completada
        </p>
        <p className="text-sm text-red-400/80 max-w-sm mx-auto">
          {errorMessage}
        </p>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={onReset}
          className="
            px-6 py-2.5 rounded-lg text-sm font-medium
            bg-gradient-to-r from-cyan-600 to-blue-600 text-white
            shadow-lg shadow-cyan-500/25
            transition-all duration-200
            hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/40
          "
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<AuthFlowStep>("FORM");
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    authId: null,
    challengeType: null,
    customerName: null,
    riskScore: null,
    livenessScore: null,
  });
  const [lastError, setLastError] = useState<string | null>(null);

  const handleIdentitySubmit = useCallback(
    (_data: IdentityFormData, response: StartAuthResponse) => {
      setAuthState({
        token: response.token,
        authId: response.authId,
        challengeType: response.challengeType,
        customerName: response.name,
        riskScore: response.riskScore,
        livenessScore: null,
      });
      setStep("DOCUMENT");
    },
    []
  );

  const handleDocumentSuccess = useCallback((_response: DocumentResponse) => {
    setStep("LIVENESS");
  }, []);

  const handleDocumentRetake = useCallback((_reason: string) => {
  }, []);

  const handleDocumentRejected = useCallback((reason: string) => {
    setLastError(reason);
    setStep("ERROR");
  }, []);

  const handleLivenessSuccess = useCallback((response: LivenessResponse) => {
    setAuthState((prev) => ({
      ...prev,
      livenessScore: response.livenessScore,
    }));
    setStep("DONE");
  }, []);

  const handleLivenessRetry = useCallback((_reason: string) => {
  }, []);

  const handleLivenessRejected = useCallback((reason: string) => {
    setLastError(reason);
    setStep("ERROR");
  }, []);

  const handleLivenessMaxAttempts = useCallback(() => {
    setAuthState({
      token: null,
      authId: null,
      challengeType: null,
      customerName: null,
      riskScore: null,
      livenessScore: null,
    });
    setLastError(null);
    setStep("FORM");
  }, []);

  const handleReset = useCallback(() => {
    setStep("FORM");
    setAuthState({
      token: null,
      authId: null,
      challengeType: null,
      customerName: null,
      riskScore: null,
      livenessScore: null,
    });
    setLastError(null);
  }, []);

  const currentConfig = getStepConfig(step, authState.customerName);
  const stepNumber = getStepNumber(step);
  const showStepBadge = step !== "DONE" && step !== "ERROR";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-cyan-500/3 to-transparent rounded-full" />
      </div>

      <div className="relative w-full max-w-xl">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur opacity-50" />

        <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl shadow-black/50 overflow-hidden">
          <div className="px-6 pt-8 pb-6 border-b border-slate-700/50">
            <div className="flex flex-col items-center text-center space-y-4">
              {showStepBadge && (
                <StepBadge currentStep={stepNumber} totalSteps={3} />
              )}

              <div
                className={`p-3 rounded-full border ${
                  step === "ERROR"
                    ? "bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/20"
                    : step === "DONE"
                    ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/20"
                    : "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/20"
                }`}
              >
                {currentConfig.icon}
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {currentConfig.title}
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                  {currentConfig.subtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            {step === "FORM" && (
              <IdentityStepForm onSubmitSuccess={handleIdentitySubmit} />
            )}

            {step === "DOCUMENT" && authState.token && (
              <DocumentStepForm
                token={authState.token}
                onSubmitSuccess={handleDocumentSuccess}
                onRetake={handleDocumentRetake}
                onRejected={handleDocumentRejected}
              />
            )}

            {step === "LIVENESS" && authState.token && authState.challengeType && (
              <LivenessStepForm
                token={authState.token}
                challengeType={authState.challengeType}
                onSubmitSuccess={handleLivenessSuccess}
                onRetry={handleLivenessRetry}
                onRejected={handleLivenessRejected}
                onMaxAttemptsReached={handleLivenessMaxAttempts}
              />
            )}

            {step === "DONE" && (
              <SuccessScreen
                customerName={authState.customerName}
                livenessScore={authState.livenessScore}
                onReset={handleReset}
              />
            )}

            {step === "ERROR" && (
              <ErrorScreen
                errorMessage={lastError || "Error desconocido"}
                onReset={handleReset}
              />
            )}
          </div>

          {step !== "DONE" && step !== "ERROR" && (
            <div className="px-6 pb-6">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 border-t border-slate-700/50 pt-6">
                <LockIcon />
                <p>
                  La información que nos suministres será tratada de forma segura y cifrada.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600">
            Banco de Bogotá © {new Date().getFullYear()} · Autenticación Segura
          </p>
        </div>
      </div>
    </div>
  );
}

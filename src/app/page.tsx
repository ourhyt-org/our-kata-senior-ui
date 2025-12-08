"use client";

import { useState } from "react";
import { IdentityStepForm } from "@/components/auth-wizard/IdentityStepForm";
import { DocumentStepForm } from "@/components/auth-wizard/DocumentStepForm";

type AuthStep = "IDENTITY" | "DOCUMENT" | "LIVENESS";

interface IdentityData {
  documentType: "CC";
  documentNumber: string;
  phoneNumber: string;
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

function LivenessStep() {
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold text-white mb-4">Verificación Biométrica</h2>
      <p className="text-slate-400">Próximamente: prueba de vida facial</p>
    </div>
  );
}

interface StepConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const STEP_CONFIG: Record<AuthStep, StepConfig> = {
  IDENTITY: {
    title: "Verificación de identidad",
    subtitle: "Ingresa tu identificación y teléfono para iniciar el proceso de autenticación segura.",
    icon: <ShieldIcon />,
  },
  DOCUMENT: {
    title: "Sube una foto de tu documento",
    subtitle: "Asegúrate de que esté enfocado, sin brillos y completamente visible.",
    icon: <DocumentIcon />,
  },
  LIVENESS: {
    title: "Verificación biométrica",
    subtitle: "Realizaremos una prueba de vida para confirmar tu identidad.",
    icon: <ShieldIcon />,
  },
};

export default function Home() {
  const [step, setStep] = useState<AuthStep>("IDENTITY");
  const [, setIdentityData] = useState<IdentityData | null>(null);
  const [, setDocumentImage] = useState<string | null>(null);

  const handleIdentitySubmit = (data: IdentityData) => {
    setIdentityData(data);
    setStep("DOCUMENT");
  };

  const handleDocumentSubmit = (imageData: string) => {
    setDocumentImage(imageData);
    setStep("LIVENESS");
  };

  const getCurrentStepNumber = (): number => {
    const steps: AuthStep[] = ["IDENTITY", "DOCUMENT", "LIVENESS"];
    return steps.indexOf(step) + 1;
  };

  const currentConfig = STEP_CONFIG[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-cyan-500/3 to-transparent rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur opacity-50" />
        
        <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl shadow-black/50 overflow-hidden">
          <div className="px-6 pt-8 pb-6 border-b border-slate-700/50">
            <div className="flex flex-col items-center text-center space-y-4">
              <StepBadge currentStep={getCurrentStepNumber()} totalSteps={3} />
              
              <div className="p-3 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
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
            {step === "IDENTITY" && (
              <IdentityStepForm onSubmitSuccess={handleIdentitySubmit} />
            )}
            {step === "DOCUMENT" && (
              <DocumentStepForm onSubmitSuccess={handleDocumentSubmit} />
            )}
            {step === "LIVENESS" && <LivenessStep />}
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 border-t border-slate-700/50 pt-6">
              <LockIcon />
              <p>
                La información que nos suministres será tratada de forma segura y cifrada.
              </p>
            </div>
          </div>
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

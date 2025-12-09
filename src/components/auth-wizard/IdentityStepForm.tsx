"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { startAuth, AuthApiError, StartAuthResponse } from "@/lib/api";

// ============================================================================
// Type Definitions
// ============================================================================

export interface IdentityFormData {
  documentType: "CC";
  documentNumber: string;
  phoneNumber: string;
}

interface FormErrors {
  documentNumber?: string;
  phoneNumber?: string;
  api?: string;
}

interface IdentityStepFormProps {
  onSubmitSuccess: (data: IdentityFormData, response: StartAuthResponse) => void;
}

// ============================================================================
// Validation
// ============================================================================

// Colombian CC validation: 8, 10, or 11 digits, or format 123456-12345
const CEDULA_REGEX = /^((\d{8})|(\d{10})|(\d{11})|(\d{6}-\d{5}))$/;
// Colombian phone: optional +57 prefix, then 10 digits grouped as 3-3-4
const PHONE_REGEX = /^(\+?57)?\s?\(?(\d{3})\)?\s?(\d{3})\s?(\d{4})$/;

const validateDocumentNumber = (value: string): string | undefined => {
  if (!value.trim()) {
    return "El número de cédula es obligatorio";
  }
  if (!CEDULA_REGEX.test(value.trim())) {
    return "Ingresa un número de cédula válido (8, 10, 11 dígitos o formato 123456-12345)";
  }
  return undefined;
};

const validatePhoneNumber = (value: string): string | undefined => {
  if (!value.trim()) {
    return "El número de teléfono es obligatorio";
  }
  if (!PHONE_REGEX.test(value.trim())) {
    return "Ingresa un número de teléfono colombiano válido";
  }
  return undefined;
};

// ============================================================================
// Icons
// ============================================================================

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

export function IdentityStepForm({ onSubmitSuccess }: IdentityStepFormProps) {
  const [formData, setFormData] = useState<IdentityFormData>({
    documentType: "CC",
    documentNumber: "",
    phoneNumber: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    const documentNumberError = validateDocumentNumber(formData.documentNumber);
    if (documentNumberError) errors.documentNumber = documentNumberError;

    const phoneNumberError = validatePhoneNumber(formData.phoneNumber);
    if (phoneNumberError) errors.phoneNumber = phoneNumberError;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error when user types
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    // Clear API error when user makes any change
    if (formErrors.api) {
      setFormErrors((prev) => ({ ...prev, api: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setFormErrors((prev) => ({ ...prev, api: undefined }));

    try {
      // Call the backend API to start authentication
      const response = await startAuth(
        formData.documentType,
        formData.documentNumber,
        formData.phoneNumber
      );

      // Check if authentication was rejected by the backend
      if (response.nextStep === "REJECTED" || !response.token) {
        setFormErrors({
          api: response.reason || "No fue posible iniciar la autenticación. Por favor, verifica tus datos.",
        });
        return;
      }

      // Success - move to next step
      onSubmitSuccess(formData, response);
    } catch (error) {
      // Handle API errors
      if (error instanceof AuthApiError) {
        setFormErrors({
          api: error.detail || "Error al conectar con el servidor. Intenta nuevamente.",
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* API Error Banner */}
      {formErrors.api && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-full bg-red-500/20">
              <ErrorIcon />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">
                Error de autenticación
              </p>
              <p className="text-sm text-red-300/80 mt-1">{formErrors.api}</p>
            </div>
          </div>
        </div>
      )}

      {/* Document Type (fixed to CC) */}
      <div className="space-y-2">
        <label
          htmlFor="documentType"
          className="block text-sm font-medium text-slate-300"
        >
          Tipo de documento
        </label>
        <div className="w-full rounded-lg border border-slate-600/50 bg-slate-800/30 px-4 py-3 text-slate-400">
          Cédula de Ciudadanía
        </div>
      </div>

      {/* Document Number */}
      <div className="space-y-2">
        <label
          htmlFor="documentNumber"
          className="block text-sm font-medium text-slate-300"
        >
          Número de cédula
        </label>
        <input
          type="text"
          id="documentNumber"
          name="documentNumber"
          value={formData.documentNumber}
          onChange={handleInputChange}
          placeholder="Ej: 1234567890"
          disabled={isLoading}
          className={`
            w-full rounded-lg border bg-slate-800/50 px-4 py-3 text-white
            placeholder-slate-500 transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              formErrors.documentNumber
                ? "border-red-500/50 focus:ring-red-500/50 focus:border-red-500"
                : "border-slate-600/50 hover:border-slate-500"
            }
          `}
          aria-invalid={!!formErrors.documentNumber}
          aria-describedby={
            formErrors.documentNumber ? "documentNumber-error" : undefined
          }
        />
        {formErrors.documentNumber && (
          <p
            id="documentNumber-error"
            className="text-sm text-red-400 flex items-center gap-1"
            role="alert"
          >
            <ErrorIcon />
            {formErrors.documentNumber}
          </p>
        )}
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <label
          htmlFor="phoneNumber"
          className="block text-sm font-medium text-slate-300"
        >
          Teléfono celular
        </label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          placeholder="Ej: 3001234567 o +57 300 123 4567"
          disabled={isLoading}
          className={`
            w-full rounded-lg border bg-slate-800/50 px-4 py-3 text-white
            placeholder-slate-500 transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              formErrors.phoneNumber
                ? "border-red-500/50 focus:ring-red-500/50 focus:border-red-500"
                : "border-slate-600/50 hover:border-slate-500"
            }
          `}
          aria-invalid={!!formErrors.phoneNumber}
          aria-describedby={
            formErrors.phoneNumber ? "phoneNumber-error" : undefined
          }
        />
        {formErrors.phoneNumber && (
          <p
            id="phoneNumber-error"
            className="text-sm text-red-400 flex items-center gap-1"
            role="alert"
          >
            <ErrorIcon />
            {formErrors.phoneNumber}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
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
            Verificando...
          </span>
        ) : (
          "Iniciar verificación"
        )}
      </button>
    </form>
  );
}

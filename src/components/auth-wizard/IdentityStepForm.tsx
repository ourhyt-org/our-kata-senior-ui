"use client";

import { useState, FormEvent, ChangeEvent } from "react";

interface IdentityFormData {
  documentType: "CC" | "CE" | "PAS" | "";
  documentNumber: string;
  phoneNumber: string;
}

interface FormErrors {
  documentType?: string;
  documentNumber?: string;
  phoneNumber?: string;
}

interface IdentityStepFormProps {
  onSubmitSuccess: (data: IdentityFormData) => void;
}

const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "PAS", label: "Pasaporte" },
] as const;

const validateDocumentNumber = (value: string): string | undefined => {
  if (!value.trim()) {
    return "El número de identificación es obligatorio";
  }
  if (value.trim().length < 6) {
    return "El número de identificación debe tener al menos 6 caracteres";
  }
  return undefined;
};

const validatePhoneNumber = (value: string): string | undefined => {
  if (!value.trim()) {
    return "El número de teléfono es obligatorio";
  }
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length !== 10) {
    return "El teléfono debe tener exactamente 10 dígitos";
  }
  if (!/^\d+$/.test(value)) {
    return "El teléfono solo debe contener números";
  }
  return undefined;
};

const validateDocumentType = (value: string): string | undefined => {
  if (!value) {
    return "Selecciona un tipo de documento";
  }
  return undefined;
};

export function IdentityStepForm({ onSubmitSuccess }: IdentityStepFormProps) {
  const [formData, setFormData] = useState<IdentityFormData>({
    documentType: "",
    documentNumber: "",
    phoneNumber: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    const documentTypeError = validateDocumentType(formData.documentType);
    if (documentTypeError) errors.documentType = documentTypeError;

    const documentNumberError = validateDocumentNumber(formData.documentNumber);
    if (documentNumberError) errors.documentNumber = documentNumberError;

    const phoneNumberError = validatePhoneNumber(formData.phoneNumber);
    if (phoneNumberError) errors.phoneNumber = phoneNumberError;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "phoneNumber") {
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    console.log("Pasando a DOCUMENT", formData);
    onSubmitSuccess(formData as IdentityFormData);
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="documentType"
          className="block text-sm font-medium text-slate-300"
        >
          Tipo de documento
        </label>
        <select
          id="documentType"
          name="documentType"
          value={formData.documentType}
          onChange={handleInputChange}
          disabled={isLoading}
          className={`
            w-full rounded-lg border bg-slate-800/50 px-4 py-3 text-white
            placeholder-slate-500 transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              formErrors.documentType
                ? "border-red-500/50 focus:ring-red-500/50 focus:border-red-500"
                : "border-slate-600/50 hover:border-slate-500"
            }
          `}
          aria-invalid={!!formErrors.documentType}
          aria-describedby={
            formErrors.documentType ? "documentType-error" : undefined
          }
        >
          <option value="" disabled>
            Selecciona tu tipo de documento
          </option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {formErrors.documentType && (
          <p
            id="documentType-error"
            className="text-sm text-red-400 flex items-center gap-1"
            role="alert"
          >
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
            {formErrors.documentType}
          </p>
        )}
      </div>

      {/* Número de identificación */}
      <div className="space-y-2">
        <label
          htmlFor="documentNumber"
          className="block text-sm font-medium text-slate-300"
        >
          Número de identificación
        </label>
        <input
          type="text"
          id="documentNumber"
          name="documentNumber"
          value={formData.documentNumber}
          onChange={handleInputChange}
          placeholder="Ingresa tu número de documento"
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
            {formErrors.documentNumber}
          </p>
        )}
      </div>

      {/* Teléfono celular */}
      <div className="space-y-2">
        <label
          htmlFor="phoneNumber"
          className="block text-sm font-medium text-slate-300"
        >
          Teléfono celular
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            +57
          </span>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="3001234567"
            maxLength={10}
            disabled={isLoading}
            className={`
              w-full rounded-lg border bg-slate-800/50 pl-12 pr-4 py-3 text-white
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
        </div>
        {formErrors.phoneNumber && (
          <p
            id="phoneNumber-error"
            className="text-sm text-red-400 flex items-center gap-1"
            role="alert"
          >
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
            {formErrors.phoneNumber}
          </p>
        )}
      </div>

      {/* Botón de submit */}
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
            Iniciando...
          </span>
        ) : (
          "Iniciar verificación"
        )}
      </button>
    </form>
  );
}


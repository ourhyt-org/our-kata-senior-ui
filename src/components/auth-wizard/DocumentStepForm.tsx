"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";

interface DocumentStepFormProps {
  onSubmitSuccess: (file: File) => void;
}

interface FormErrors {
  file?: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MIN_SIZE_KB = 200;
const MAX_SIZE_MB = 8;
const MIN_SIZE_BYTES = MIN_SIZE_KB * 1024;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const validateFile = (file: File | null): string | undefined => {
  if (!file) {
    return "Debes seleccionar una imagen de tu documento";
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return "El archivo debe ser una imagen (JPEG, PNG o WebP)";
  }

  if (file.size < MIN_SIZE_BYTES) {
    return `La imagen debe pesar al menos ${MIN_SIZE_KB}KB`;
  }

  if (file.size > MAX_SIZE_BYTES) {
    return `La imagen no debe superar los ${MAX_SIZE_MB}MB`;
  }

  return undefined;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function UploadIcon({ className }: { className?: string }) {
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
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
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

function TrashIcon({ className }: { className?: string }) {
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
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export function DocumentStepForm({ onSubmitSuccess }: DocumentStepFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (file) {
      const error = validateFile(file);
      if (error) {
        setFormErrors({ file: error });
        setSelectedFile(null);
        setPreviewUrl(null);
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFormErrors({});
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isLoading) return;

    const file = e.dataTransfer.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    const error = validateFile(selectedFile);
    if (error) {
      setFormErrors({ file: error });
      return;
    }

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    console.log("Documento enviado", selectedFile);
    onSubmitSuccess(selectedFile!);
    setIsLoading(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
        disabled={isLoading}
        aria-label="Seleccionar imagen del documento"
      />

      {!selectedFile ? (
        <div
          onClick={triggerFileInput}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative cursor-pointer rounded-xl border-2 border-dashed p-8
            transition-all duration-200 group
            ${
              isDragging
                ? "border-cyan-400 bg-cyan-500/10"
                : formErrors.file
                ? "border-red-500/50 bg-red-500/5"
                : "border-slate-600/50 bg-slate-800/30 hover:border-cyan-500/50 hover:bg-slate-800/50"
            }
            ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
          `}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerFileInput();
            }
          }}
          aria-describedby={formErrors.file ? "file-error" : undefined}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div
              className={`
                p-4 rounded-full transition-colors duration-200
                ${
                  isDragging
                    ? "bg-cyan-500/20"
                    : "bg-slate-700/50 group-hover:bg-cyan-500/10"
                }
              `}
            >
              {isDragging ? (
                <UploadIcon className="w-10 h-10 text-cyan-400" />
              ) : (
                <CameraIcon className="w-10 h-10 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-base font-medium text-white">
                {isDragging
                  ? "Suelta la imagen aquí"
                  : "Arrastra tu imagen o haz clic para seleccionar"}
              </p>
              <p className="text-sm text-slate-400">
                JPEG, PNG o WebP · Entre {MIN_SIZE_KB}KB y {MAX_SIZE_MB}MB
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
              disabled={isLoading}
              className="
                inline-flex items-center gap-2 px-4 py-2 rounded-lg
                bg-slate-700/50 text-sm font-medium text-slate-300
                border border-slate-600/50 transition-all duration-200
                hover:bg-slate-700 hover:text-white hover:border-slate-500
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <DocumentIcon className="w-4 h-4" />
              Seleccionar archivo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-slate-600/50 bg-slate-800/30">
            <div className="aspect-[4/3] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl || ""}
                alt="Vista previa del documento"
                className="w-full h-full object-contain bg-slate-900"
              />

              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isLoading}
                  className="
                    p-2 rounded-lg bg-red-500/90 text-white
                    backdrop-blur-sm transition-all duration-200
                    hover:bg-red-500 hover:scale-105
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  "
                  aria-label="Eliminar imagen"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                      <CheckIcon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[180px] sm:max-w-[250px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={isLoading}
                    className="
                      text-sm font-medium text-cyan-400 
                      hover:text-cyan-300 transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="p-1.5 rounded-full bg-amber-500/20">
              <svg
                className="w-4 h-4 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-300">Recomendaciones</p>
              <ul className="mt-1 text-slate-400 space-y-0.5">
                <li>• Asegúrate de que el documento esté completamente visible</li>
                <li>• Evita brillos, sombras o reflejos</li>
                <li>• La imagen debe estar nítida y enfocada</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {formErrors.file && (
        <p
          id="file-error"
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
          {formErrors.file}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading || !selectedFile}
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
            Procesando documento...
          </span>
        ) : (
          "Continuar con verificación OCR"
        )}
      </button>
    </div>
  );
}


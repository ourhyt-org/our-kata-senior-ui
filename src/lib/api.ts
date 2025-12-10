
const API_BASE_URL = "https://dev-api.ourhyt.art";


export interface StartAuthResponse {
  authId: string;
  token: string;
  nextStep: "DOCUMENT" | "REJECTED";
  customerStatus: "ACTIVE" | "BLOCKED" | "PENDING";
  riskScore: number;
  reason: string | null;
  name: string;
  allowedProducts: string[];
  challengeType: "BLINK" | "APPROACH";
}


export interface DocumentResponse {
  authId: string;
  qualityScore: number;
  documentStatus: "OK" | "RETAKE" | "MISMATCH";
  reason: string | null;
  nextStep: "LIVENESS" | "RETAKE_DOCUMENT" | "REJECTED";
  ocrDocNumber: string;
  docMatch: boolean;
  fraudSuspected: boolean;
}


export interface LivenessResponse {
  authId: string;
    challengeType: "BLINK" | "APPROACH";
  livenessScore: number;
  passed: boolean;
  reason: string | null;
  nextStep: "COMPLETED" | "REJECTED";
}

export interface ApiError {
  detail?: string;
  message?: string;
  reason?: string;
}

export class AuthApiError extends Error {
  public statusCode: number;
  public detail: string;

  constructor(message: string, statusCode: number, detail: string) {
    super(message);
    this.name = "AuthApiError";
    this.statusCode = statusCode;
    this.detail = detail;
  }
}


export async function startAuth(
  docType: string,
  docNumber: string,
  phone: string
): Promise<StartAuthResponse> {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  const response = await fetch(`${API_BASE_URL}/kata/auth/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      docType,
      docNumber: docNumber.replace(/\D/g, ""),
      phone: cleanPhone,
    }),
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({}));
    throw new AuthApiError(
      errorData.detail || errorData.message || "Error al iniciar autenticación",
      response.status,
      errorData.reason || errorData.detail || "Error desconocido"
    );
  }

  return response.json();
}

export async function uploadDocument(
  token: string,
  file: File | Blob
): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append("file", file, "document-front.jpg");

  const response = await fetch(`${API_BASE_URL}/kata/auth/document`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({}));
    throw new AuthApiError(
      errorData.detail || errorData.message || "Error al procesar documento",
      response.status,
      errorData.reason || errorData.detail || "Error desconocido"
    );
  }

  return response.json();
}

export async function checkLiveness(
  token: string,
  frames: Array<File | Blob>
): Promise<LivenessResponse> {
  if (frames.length < 2) {
    throw new AuthApiError(
      "Se requieren al menos 2 frames",
      400,
      "Mínimo 2 frames requeridos para la verificación de vida"
    );
  }

  const formData = new FormData();
  
  frames.forEach((frame, index) => {
    formData.append("frames", frame, `frame_${index + 1}.jpg`);
  });

  const response = await fetch(`${API_BASE_URL}/kata/auth/liveness`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({}));
    throw new AuthApiError(
      errorData.detail || errorData.message || "Error en verificación de vida",
      response.status,
      errorData.reason || errorData.detail || "Error desconocido"
    );
  }

  return response.json();
}

export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export function dataURLtoFile(dataURL: string, filename: string): File {
  const blob = dataURLtoBlob(dataURL);
  return new File([blob], filename, { type: blob.type });
}

/**
 * API Client for the Intelligent Authentication KATA
 * Base URL: https://dev-api.ourhyt.art
 * 
 * This module contains all API calls to the backend authentication service.
 * All endpoints require specific request formats and return typed responses.
 */

const API_BASE_URL = "https://dev-api.ourhyt.art";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Response from POST /kata/auth/start
 * Initiates the authentication flow and returns customer info + JWT token
 */
export interface StartAuthResponse {
  authId: string;
  token: string;
  nextStep: "DOCUMENT" | "REJECTED";
  customerStatus: "ACTIVE" | "BLOCKED" | "PENDING";
  riskScore: number;
  reason: string | null;
  name: string;
  allowedProducts: string[];
  /** Challenge type for liveness step - determines what movement the user must perform */
  challengeType: "BLINK" | "APPROACH";
}

/**
 * Response from POST /kata/auth/document
 * Returns OCR validation results for the uploaded document image
 */
export interface DocumentResponse {
  authId: string;
  qualityScore: number;
  /** OK = valid, RETAKE = need better image, MISMATCH = document number doesn't match */
  documentStatus: "OK" | "RETAKE" | "MISMATCH";
  reason: string | null;
  nextStep: "LIVENESS" | "RETAKE_DOCUMENT" | "REJECTED";
  /** Document number extracted via OCR from the image */
  ocrDocNumber: string;
  /** Whether OCR number matches the one provided in /start */
  docMatch: boolean;
  /** If true, possible identity fraud detected */
  fraudSuspected: boolean;
}

/**
 * Response from POST /kata/auth/liveness
 * Returns liveness verification results
 * 
 * Note: challengeType is extracted from the JWT token by the backend,
 * NOT sent in the request body.
 */
export interface LivenessResponse {
  authId: string;
  /** Challenge type used for verification (from JWT claim) */
  challengeType: "BLINK" | "APPROACH";
  /** Liveness confidence score from 0.0 to 1.0 */
  livenessScore: number;
  /** Whether the liveness check passed */
  passed: boolean;
  reason: string | null;
  nextStep: "COMPLETED" | "REJECTED";
}

/**
 * Generic API error response
 */
export interface ApiError {
  detail?: string;
  message?: string;
  reason?: string;
}

// ============================================================================
// Custom Error Class
// ============================================================================

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

// ============================================================================
// API Functions
// ============================================================================

/**
 * POST /kata/auth/start
 * 
 * Initiates the authentication flow by validating customer identity.
 * Backend checks customer status, risk score, and returns a JWT token
 * that must be used for subsequent requests.
 * 
 * @param docType - Document type (currently only "CC" for Cédula de Ciudadanía)
 * @param docNumber - Colombian ID number
 * @param phone - Colombian mobile phone number (without country code prefix for the API)
 */
export async function startAuth(
  docType: string,
  docNumber: string,
  phone: string
): Promise<StartAuthResponse> {
  // Clean phone number - API expects plain 10-digit format
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  const response = await fetch(`${API_BASE_URL}/kata/auth/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      docType,
      docNumber: docNumber.replace(/\D/g, ""), // Remove any formatting like hyphens
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

/**
 * POST /kata/auth/document
 * 
 * Uploads the front document image for OCR validation.
 * Backend uses AWS Textract to extract the document number and validates
 * it against the number provided in /start (stored in JWT).
 * 
 * @param token - JWT token from /start response (used as Bearer token)
 * @param file - Front document image as File or Blob
 */
export async function uploadDocument(
  token: string,
  file: File | Blob
): Promise<DocumentResponse> {
  const formData = new FormData();
  // "file" is the expected field name by the backend
  formData.append("file", file, "document-front.jpg");

  const response = await fetch(`${API_BASE_URL}/kata/auth/document`, {
    method: "POST",
    headers: {
      // JWT token is sent as Bearer token for authentication
      // Backend extracts user identity from the token claims
      Authorization: `Bearer ${token}`,
      // Note: Don't set Content-Type header - browser sets it automatically
      // with the correct multipart boundary for FormData
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

/**
 * POST /kata/auth/liveness
 * 
 * Submits multiple face frames for liveness verification.
 * 
 * IMPORTANT:
 * - The backend expects the field name "frames" repeated for each image
 * - challengeType is NOT sent in the form - it's extracted from the JWT token claim
 * - Minimum 2 frames required, ideally 5 frames for better accuracy
 * - Frames should capture the user performing the requested movement (BLINK or APPROACH)
 * 
 * Frontend uses challengeType (from /start response) only to show appropriate instructions:
 * - BLINK: "Parpadea dos veces mientras miras a la cámara"
 * - APPROACH: "Acércate lentamente a la cámara"
 * 
 * @param token - JWT token from /start response
 * @param frames - Array of captured face images (minimum 2, ideally 5)
 */
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
  
  // Append each frame with the same field name "frames"
  // Backend expects: frames: List[UploadFile]
  frames.forEach((frame, index) => {
    formData.append("frames", frame, `frame_${index + 1}.jpg`);
  });

  const response = await fetch(`${API_BASE_URL}/kata/auth/liveness`, {
    method: "POST",
    headers: {
      // JWT token contains the challenge_type claim
      // Backend reads challengeType from the token, not from the form
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts a base64 data URL to a Blob object for API upload
 */
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

/**
 * Converts a base64 data URL to a File object for API upload
 */
export function dataURLtoFile(dataURL: string, filename: string): File {
  const blob = dataURLtoBlob(dataURL);
  return new File([blob], filename, { type: blob.type });
}

// ============================================================================
// Frame Burst Capture Helper
// ============================================================================

export interface BurstCaptureOptions {
  /** Number of frames to capture (default: 5) */
  framesCount?: number;
  /** Total duration in milliseconds (default: 2000) */
  durationMs?: number;
}

/**
 * Captures a burst of frames from a video element
 * 
 * @param videoElement - HTMLVideoElement with active stream
 * @param options - Capture configuration
 * @returns Array of Blob images
 */
export async function captureBurstFrames(
  videoElement: HTMLVideoElement,
  options: BurstCaptureOptions = {}
): Promise<Blob[]> {
  const { framesCount = 5, durationMs = 2000 } = options;
  const intervalMs = durationMs / (framesCount - 1);
  
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  
  if (!context) {
    throw new Error("No se pudo crear el contexto del canvas");
  }

  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const frames: Blob[] = [];

  for (let i = 0; i < framesCount; i++) {
    // Mirror the image for selfie experience
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    context.restore();

    // Convert canvas to Blob
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

    // Wait before next capture (except for the last frame)
    if (i < framesCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return frames;
}

"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  StartAuthResponse,
  DocumentResponse,
  LivenessResponse,
} from "@/lib/api";

// ============================================================================
// Type Definitions
// ============================================================================

export type AuthFlowStep = "FORM" | "DOCUMENT" | "LIVENESS" | "DONE" | "ERROR";

export type ChallengeType = "BLINK" | "APPROACH";

interface CustomerInfo {
  name: string;
  riskScore: number;
  allowedProducts: string[];
  customerStatus: string;
}

interface AuthState {
  currentStep: AuthFlowStep;
  authId: string | null;
  token: string | null;
  challengeType: ChallengeType | null;
  customerInfo: CustomerInfo | null;
  lastDocumentResult: DocumentResponse | null;
  lastLivenessResult: LivenessResponse | null;
  lastError: string | null;
}

interface AuthContextValue extends AuthState {
  // Actions
  handleStartSuccess: (response: StartAuthResponse) => void;
  handleStartRejected: (reason: string) => void;
  handleDocumentSuccess: (response: DocumentResponse) => void;
  handleDocumentRetake: (reason: string) => void;
  handleDocumentRejected: (reason: string) => void;
  handleLivenessSuccess: (response: LivenessResponse) => void;
  handleLivenessRetry: (reason: string) => void;
  handleLivenessRejected: (reason: string) => void;
  setError: (error: string) => void;
  clearError: () => void;
  resetFlow: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuthState = {
  currentStep: "FORM",
  authId: null,
  token: null,
  challengeType: null,
  customerInfo: null,
  lastDocumentResult: null,
  lastLivenessResult: null,
  lastError: null,
};

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialState);

  /**
   * Called when /auth/start returns successfully with nextStep === "DOCUMENT"
   * Stores the JWT token and customer info for subsequent requests
   */
  const handleStartSuccess = useCallback((response: StartAuthResponse) => {
    setState((prev) => ({
      ...prev,
      currentStep: "DOCUMENT",
      authId: response.authId,
      token: response.token,
      challengeType: response.challengeType,
      customerInfo: {
        name: response.name,
        riskScore: response.riskScore,
        allowedProducts: response.allowedProducts,
        customerStatus: response.customerStatus,
      },
      lastError: null,
    }));
  }, []);

  /**
   * Called when /auth/start returns nextStep === "REJECTED" or error
   */
  const handleStartRejected = useCallback((reason: string) => {
    setState((prev) => ({
      ...prev,
      lastError: reason,
    }));
  }, []);

  /**
   * Called when /auth/document returns successfully with docMatch and nextStep === "LIVENESS"
   */
  const handleDocumentSuccess = useCallback((response: DocumentResponse) => {
    setState((prev) => ({
      ...prev,
      currentStep: "LIVENESS",
      lastDocumentResult: response,
      lastError: null,
    }));
  }, []);

  /**
   * Called when document needs to be recaptured (low quality or bad framing)
   */
  const handleDocumentRetake = useCallback((reason: string) => {
    setState((prev) => ({
      ...prev,
      lastError: reason,
      // Stay in DOCUMENT step - user needs to recapture
    }));
  }, []);

  /**
   * Called when document validation fails (fraud suspected or mismatch)
   */
  const handleDocumentRejected = useCallback((reason: string) => {
    setState((prev) => ({
      ...prev,
      currentStep: "ERROR",
      lastError: reason,
    }));
  }, []);

  /**
   * Called when liveness check passes
   */
  const handleLivenessSuccess = useCallback((response: LivenessResponse) => {
    setState((prev) => ({
      ...prev,
      currentStep: "DONE",
      lastLivenessResult: response,
      lastError: null,
    }));
  }, []);

  /**
   * Called when liveness check fails but user can retry
   */
  const handleLivenessRetry = useCallback((reason: string) => {
    setState((prev) => ({
      ...prev,
      lastError: reason,
      // Stay in LIVENESS step - user can retry
    }));
  }, []);

  /**
   * Called when liveness check definitively fails
   */
  const handleLivenessRejected = useCallback((reason: string) => {
    setState((prev) => ({
      ...prev,
      currentStep: "ERROR",
      lastError: reason,
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, lastError: error }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, lastError: null }));
  }, []);

  /**
   * Resets the entire flow to start over
   */
  const resetFlow = useCallback(() => {
    setState(initialState);
  }, []);

  const value: AuthContextValue = {
    ...state,
    handleStartSuccess,
    handleStartRejected,
    handleDocumentSuccess,
    handleDocumentRetake,
    handleDocumentRejected,
    handleLivenessSuccess,
    handleLivenessRetry,
    handleLivenessRejected,
    setError,
    clearError,
    resetFlow,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}


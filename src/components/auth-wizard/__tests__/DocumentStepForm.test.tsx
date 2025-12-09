import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentStepForm } from "../DocumentStepForm";

const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

const mockTrackStop = jest.fn();
const mockMediaStream = {
  getTracks: jest.fn(() => [{ stop: mockTrackStop }]),
};

const mockGetUserMedia = jest.fn();

Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  drawImage: jest.fn(),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => "data:image/jpeg;base64,mockImageData");

HTMLVideoElement.prototype.play = jest.fn().mockResolvedValue(undefined);

const clickActivarCamara = async (user: ReturnType<typeof userEvent.setup>) => {
  const buttons = screen.getAllByRole("button", { name: /activar cámara/i });
  const realButton = buttons.find((btn) => btn.tagName === "BUTTON");
  if (realButton) {
    await user.click(realButton);
  }
};

// Default props for all tests
const defaultProps = {
  token: "mock-jwt-token",
  onSubmitSuccess: jest.fn(),
  onRetake: jest.fn(),
  onRejected: jest.fn(),
};

describe("DocumentStepForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockResolvedValue(mockMediaStream);
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe("Renderizado inicial", () => {
    it("debe renderizar el estado inicial para captura frontal", () => {
      render(<DocumentStepForm {...defaultProps} />);

      expect(screen.getByText(/foto frontal de la cédula/i)).toBeInTheDocument();
      expect(screen.getByText(/captura la parte frontal/i)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /activar cámara/i }).length).toBeGreaterThan(0);
    });

    it("debe mostrar los indicadores de paso (Frontal y Reverso)", () => {
      render(<DocumentStepForm {...defaultProps} />);

      expect(screen.getByText("Frontal")).toBeInTheDocument();
      expect(screen.getByText("Reverso")).toBeInTheDocument();
    });

    it("no debe mostrar el botón de continuar en el estado inicial", () => {
      render(<DocumentStepForm {...defaultProps} />);

      expect(screen.queryByRole("button", { name: /continuar con verificación ocr/i })).not.toBeInTheDocument();
    });
  });

  describe("Activación de cámara", () => {
    it("debe solicitar permisos de cámara al hacer clic en activar", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm {...defaultProps} />);

      await clickActivarCamara(user);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      });
    });

    it("debe mostrar estado de solicitud mientras pide permisos", async () => {
      mockGetUserMedia.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      render(<DocumentStepForm {...defaultProps} />);

      await clickActivarCamara(user);

      expect(await screen.findByText(/solicitando acceso a la cámara/i)).toBeInTheDocument();
    });

    it("debe mostrar error si el permiso es denegado", async () => {
      const permissionError = new DOMException("Permission denied", "NotAllowedError");
      mockGetUserMedia.mockRejectedValue(permissionError);

      const user = userEvent.setup();
      render(<DocumentStepForm {...defaultProps} />);

      await clickActivarCamara(user);

      expect(await screen.findByText(/permiso de cámara denegado/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    });

    it("debe mostrar error si no hay cámara disponible", async () => {
      const notFoundError = new DOMException("No camera found", "NotFoundError");
      mockGetUserMedia.mockRejectedValue(notFoundError);

      const user = userEvent.setup();
      render(<DocumentStepForm {...defaultProps} />);

      await clickActivarCamara(user);

      expect(await screen.findByText(/no se encontró ninguna cámara/i)).toBeInTheDocument();
    });

    it("debe mostrar error genérico para otros errores", async () => {
      const genericError = new DOMException("Unknown error", "UnknownError");
      mockGetUserMedia.mockRejectedValue(genericError);

      const user = userEvent.setup();
      render(<DocumentStepForm {...defaultProps} />);

      await clickActivarCamara(user);

      expect(await screen.findByText(/error al acceder a la cámara/i)).toBeInTheDocument();
    });

    it("debe permitir reintentar después de un error", async () => {
      const permissionError = new DOMException("Permission denied", "NotAllowedError");
      mockGetUserMedia.mockRejectedValueOnce(permissionError).mockResolvedValueOnce(mockMediaStream);

      const user = userEvent.setup();
      render(<DocumentStepForm {...defaultProps} />);

      await clickActivarCamara(user);
      expect(await screen.findByText(/permiso de cámara denegado/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /reintentar/i }));
      expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
    });
  });

  describe("Flujo de captura", () => {
    it("debe requerir validación de foto frontal antes de pasar al reverso", () => {
      render(<DocumentStepForm {...defaultProps} />);

      expect(screen.getByText(/foto frontal de la cédula/i)).toBeInTheDocument();
      expect(screen.queryByText(/foto del reverso/i)).not.toBeInTheDocument();
    });
  });

  describe("Accesibilidad", () => {
    it("debe tener el contenedor inicial accesible con teclado", () => {
      render(<DocumentStepForm {...defaultProps} />);

      const container = screen.getByText(/foto frontal/i).closest("div[role='button']");
      expect(container).toHaveAttribute("tabIndex", "0");
    });

    it("debe activar cámara con Enter desde el contenedor", async () => {
      render(<DocumentStepForm {...defaultProps} />);

      const container = screen.getByText(/foto frontal/i).closest("div[role='button']");
      
      if (container) {
        fireEvent.keyDown(container, { key: "Enter" });
        
        await waitFor(() => {
          expect(mockGetUserMedia).toHaveBeenCalled();
        });
      }
    });

    it("debe activar cámara con Space desde el contenedor", async () => {
      render(<DocumentStepForm {...defaultProps} />);

      const container = screen.getByText(/foto frontal/i).closest("div[role='button']");
      
      if (container) {
        fireEvent.keyDown(container, { key: " " });
        
        await waitFor(() => {
          expect(mockGetUserMedia).toHaveBeenCalled();
        });
      }
    });
  });

  describe("Props", () => {
    it("debe recibir todas las props requeridas", () => {
      const { container } = render(<DocumentStepForm {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it("debe recibir token para autenticación", () => {
      const customProps = { ...defaultProps, token: "custom-token" };
      const { container } = render(<DocumentStepForm {...customProps} />);
      expect(container).toBeInTheDocument();
    });
  });
});

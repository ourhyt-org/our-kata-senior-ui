import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdentityStepForm } from "../IdentityStepForm";
import { startAuth, StartAuthResponse } from "@/lib/api";

// Mock the API module
jest.mock("@/lib/api", () => ({
  startAuth: jest.fn(),
  AuthApiError: class AuthApiError extends Error {
    statusCode: number;
    detail: string;
    constructor(message: string, statusCode: number, detail: string) {
      super(message);
      this.name = "AuthApiError";
      this.statusCode = statusCode;
      this.detail = detail;
    }
  },
}));

const mockStartAuth = startAuth as jest.MockedFunction<typeof startAuth>;

// Default successful API response
const mockSuccessResponse: StartAuthResponse = {
  authId: "test-auth-id-123",
  token: "mock-jwt-token",
  nextStep: "DOCUMENT",
  customerStatus: "ACTIVE",
  riskScore: 0.15,
  reason: null,
  name: "Test User",
  allowedProducts: ["TC_CLASSIC"],
  challengeType: "BLINK",
};

describe("IdentityStepForm", () => {
  const mockOnSubmitSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockStartAuth.mockResolvedValue(mockSuccessResponse);
  });

  describe("Renderizado inicial", () => {
    it("debe renderizar todos los campos del formulario", () => {
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      expect(screen.getByText(/cédula de ciudadanía/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/número de cédula/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/teléfono celular/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /iniciar verificación/i })).toBeInTheDocument();
    });

    it("debe mostrar el tipo de documento como Cédula de Ciudadanía por defecto", () => {
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      expect(screen.getByText("Cédula de Ciudadanía")).toBeInTheDocument();
    });
  });

  describe("Validaciones de cédula", () => {
    it("debe mostrar error si el número de cédula está vacío", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/el número de cédula es obligatorio/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe aceptar cédula de 8 dígitos", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "12345678");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("debe aceptar cédula de 10 dígitos", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("debe aceptar cédula de 11 dígitos", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "12345678901");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("debe aceptar cédula en formato 123456-12345", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "123456-12345");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("debe rechazar cédula con formato inválido (7 dígitos)", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/ingresa un número de cédula válido/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe rechazar cédula con formato inválido (9 dígitos)", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "123456789");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/ingresa un número de cédula válido/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe rechazar cédula con letras", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "123ABC4567");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/ingresa un número de cédula válido/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Validaciones de teléfono", () => {
    it("debe mostrar error si el teléfono está vacío", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/el número de teléfono es obligatorio/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe aceptar teléfono de 10 dígitos sin prefijo", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("debe aceptar teléfono con prefijo +57", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "+573001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("debe aceptar teléfono con prefijo 57 sin +", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "573001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("debe aceptar teléfono con espacios", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "+57 300 123 4567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("debe aceptar teléfono con paréntesis", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "+57 (300) 123 4567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("debe rechazar teléfono con formato inválido", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "123456");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/ingresa un número de teléfono colombiano válido/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Limpieza de errores", () => {
    it("debe limpiar el error cuando el usuario empieza a escribir", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/el número de cédula es obligatorio/i)).toBeInTheDocument();

      await user.type(screen.getByLabelText(/número de cédula/i), "1");

      expect(screen.queryByText(/el número de cédula es obligatorio/i)).not.toBeInTheDocument();
    });
  });

  describe("Envío exitoso", () => {
    it("debe llamar a la API con los datos correctos", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockStartAuth).toHaveBeenCalledWith("CC", "1234567890", "3001234567");
      }, { timeout: 2000 });
    });

    it("debe llamar onSubmitSuccess con formData y response después de éxito de API", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalledWith(
          {
            documentType: "CC",
            documentNumber: "1234567890",
            phoneNumber: "3001234567",
          },
          mockSuccessResponse
        );
      }, { timeout: 2000 });
    });

    it("debe mostrar estado de loading mientras procesa", async () => {
      // Make the API call slower to catch the loading state
      mockStartAuth.mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve(mockSuccessResponse), 100))
      );

      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3109876543");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      // "Verificando..." is the loading text
      expect(await screen.findByText(/verificando/i)).toBeInTheDocument();

      expect(screen.getByRole("button")).toBeDisabled();

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("debe deshabilitar los inputs mientras carga", async () => {
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      fireEvent.change(screen.getByLabelText(/número de cédula/i), { target: { value: "1234567890" } });
      fireEvent.change(screen.getByLabelText(/teléfono celular/i), { target: { value: "3201234567" } });
      
      fireEvent.submit(screen.getByRole("button", { name: /iniciar verificación/i }).closest("form")!);

      await waitFor(() => {
        expect(screen.getByLabelText(/número de cédula/i)).toBeDisabled();
        expect(screen.getByLabelText(/teléfono celular/i)).toBeDisabled();
      });
    });
  });

  describe("Manejo de errores de API", () => {
    it("debe mostrar error si la API retorna REJECTED", async () => {
      mockStartAuth.mockResolvedValueOnce({
        ...mockSuccessResponse,
        nextStep: "REJECTED",
        token: "",
        reason: "Cliente bloqueado por política de seguridad",
      });

      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/cliente bloqueado por política de seguridad/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe mostrar error genérico si no hay razón", async () => {
      mockStartAuth.mockResolvedValueOnce({
        ...mockSuccessResponse,
        nextStep: "REJECTED",
        token: "",
        reason: null,
      });

      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/no fue posible iniciar la autenticación/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Accesibilidad", () => {
    it("debe tener atributos aria-invalid correctos cuando hay errores", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/número de cédula/i)).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByLabelText(/teléfono celular/i)).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("debe tener mensajes de error con role=alert", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        expect(alerts.length).toBe(2);
      });
    });
  });
});

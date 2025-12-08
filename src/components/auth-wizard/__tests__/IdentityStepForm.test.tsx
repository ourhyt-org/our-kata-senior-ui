import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdentityStepForm } from "../IdentityStepForm";

const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

describe("IdentityStepForm", () => {
  const mockOnSubmitSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
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
      }, { timeout: 1500 });
    });

    it("debe aceptar cédula de 10 dígitos", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 1500 });
    });

    it("debe aceptar cédula de 11 dígitos", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "12345678901");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 1500 });
    });

    it("debe aceptar cédula en formato 123456-12345", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "123456-12345");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 1500 });
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
      }, { timeout: 1500 });
    });

    it("debe aceptar teléfono con prefijo +57", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "+573001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 1500 });
    });

    it("debe aceptar teléfono con prefijo 57 sin +", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "573001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 1500 });
    });

    it("debe aceptar teléfono con espacios", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "+57 300 123 4567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 1500 });
    });

    it("debe aceptar teléfono con paréntesis", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "+57 (300) 123 4567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 1500 });
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
    it("debe llamar onSubmitSuccess con los datos correctos después de validar", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalledWith({
          documentType: "CC",
          documentNumber: "1234567890",
          phoneNumber: "3001234567",
        });
      }, { timeout: 1500 });
    });

    it("debe mostrar estado de loading mientras procesa", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "1234567890");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3109876543");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/iniciando/i)).toBeInTheDocument();

      expect(screen.getByRole("button")).toBeDisabled();

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 1500 });
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

    it("debe hacer console.log con los datos antes de llamar onSubmitSuccess", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de cédula/i), "98765432101");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3151234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith("Pasando a DOCUMENT", {
          documentType: "CC",
          documentNumber: "98765432101",
          phoneNumber: "3151234567",
        });
      }, { timeout: 1500 });
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

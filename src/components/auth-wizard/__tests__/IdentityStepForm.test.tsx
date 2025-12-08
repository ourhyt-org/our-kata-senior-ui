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

      expect(screen.getByLabelText(/tipo de documento/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/número de identificación/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/teléfono celular/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /iniciar verificación/i })).toBeInTheDocument();
    });

    it("debe mostrar las opciones de tipo de documento correctamente", () => {
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const select = screen.getByLabelText(/tipo de documento/i);
      expect(select).toHaveDisplayValue(/selecciona tu tipo de documento/i);

      expect(screen.getByRole("option", { name: /cédula de ciudadanía/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /cédula de extranjería/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /pasaporte/i })).toBeInTheDocument();
    });

    it("debe mostrar el prefijo +57 en el campo de teléfono", () => {
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      expect(screen.getByText("+57")).toBeInTheDocument();
    });
  });

  describe("Validaciones", () => {
    it("debe mostrar error si se envía sin tipo de documento", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.type(screen.getByLabelText(/número de identificación/i), "12345678");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/selecciona un tipo de documento/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe mostrar error si el número de identificación está vacío", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.selectOptions(screen.getByLabelText(/tipo de documento/i), "CC");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/el número de identificación es obligatorio/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe mostrar error si el número de identificación tiene menos de 6 caracteres", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.selectOptions(screen.getByLabelText(/tipo de documento/i), "CC");
      await user.type(screen.getByLabelText(/número de identificación/i), "12345");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/al menos 6 caracteres/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe mostrar error si el teléfono está vacío", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.selectOptions(screen.getByLabelText(/tipo de documento/i), "CC");
      await user.type(screen.getByLabelText(/número de identificación/i), "12345678");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/el número de teléfono es obligatorio/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe mostrar error si el teléfono no tiene 10 dígitos", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.selectOptions(screen.getByLabelText(/tipo de documento/i), "CC");
      await user.type(screen.getByLabelText(/número de identificación/i), "12345678");
      await user.type(screen.getByLabelText(/teléfono celular/i), "300123456"); // 9 dígitos
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/exactamente 10 dígitos/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe permitir solo números en el campo de teléfono", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const phoneInput = screen.getByLabelText(/teléfono celular/i);
      await user.type(phoneInput, "300abc1234567");

      expect(phoneInput).toHaveValue("3001234567");
    });

    it("debe limpiar el error cuando el usuario empieza a escribir", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/el número de identificación es obligatorio/i)).toBeInTheDocument();

      await user.type(screen.getByLabelText(/número de identificación/i), "1");

      expect(screen.queryByText(/el número de identificación es obligatorio/i)).not.toBeInTheDocument();
    });
  });

  describe("Envío exitoso", () => {
    it("debe llamar onSubmitSuccess con los datos correctos después de validar", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.selectOptions(screen.getByLabelText(/tipo de documento/i), "CC");
      await user.type(screen.getByLabelText(/número de identificación/i), "12345678");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3001234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalledWith({
          documentType: "CC",
          documentNumber: "12345678",
          phoneNumber: "3001234567",
        });
      }, { timeout: 1500 });
    });

    it("debe mostrar estado de loading mientras procesa", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.selectOptions(screen.getByLabelText(/tipo de documento/i), "CE");
      await user.type(screen.getByLabelText(/número de identificación/i), "ABC123456");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3109876543");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      expect(await screen.findByText(/iniciando/i)).toBeInTheDocument();

      expect(screen.getByRole("button")).toBeDisabled();

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 1500 });
    });

    it("debe deshabilitar los inputs mientras carga", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.selectOptions(screen.getByLabelText(/tipo de documento/i), "PAS");
      await user.type(screen.getByLabelText(/número de identificación/i), "AB123456");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3201234567");
      
      fireEvent.submit(screen.getByRole("button", { name: /iniciar verificación/i }).closest("form")!);

      await waitFor(() => {
        expect(screen.getByLabelText(/tipo de documento/i)).toBeDisabled();
        expect(screen.getByLabelText(/número de identificación/i)).toBeDisabled();
        expect(screen.getByLabelText(/teléfono celular/i)).toBeDisabled();
      });
    });

    it("debe hacer console.log con los datos antes de llamar onSubmitSuccess", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.selectOptions(screen.getByLabelText(/tipo de documento/i), "CC");
      await user.type(screen.getByLabelText(/número de identificación/i), "987654321");
      await user.type(screen.getByLabelText(/teléfono celular/i), "3151234567");
      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith("Pasando a DOCUMENT", {
          documentType: "CC",
          documentNumber: "987654321",
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
        expect(screen.getByLabelText(/tipo de documento/i)).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByLabelText(/número de identificación/i)).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByLabelText(/teléfono celular/i)).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("debe tener mensajes de error con role=alert", async () => {
      const user = userEvent.setup();
      render(<IdentityStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      await user.click(screen.getByRole("button", { name: /iniciar verificación/i }));

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        expect(alerts.length).toBe(3);
      });
    });
  });
});


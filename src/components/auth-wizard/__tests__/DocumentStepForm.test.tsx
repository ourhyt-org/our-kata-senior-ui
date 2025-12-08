import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentStepForm } from "../DocumentStepForm";

const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

const createMockFile = (
  name: string,
  size: number,
  type: string
): File => {
  const buffer = new ArrayBuffer(size);
  const blob = new Blob([buffer], { type });
  return new File([blob], name, { type });
};

const validFile = createMockFile("documento.jpg", 500 * 1024, "image/jpeg");
const tooSmallFile = createMockFile("small.jpg", 100 * 1024, "image/jpeg");
const tooLargeFile = createMockFile("large.jpg", 10 * 1024 * 1024, "image/jpeg");
const invalidTypeFile = createMockFile("document.pdf", 500 * 1024, "application/pdf");
const pngFile = createMockFile("documento.png", 500 * 1024, "image/png");
const webpFile = createMockFile("documento.webp", 500 * 1024, "image/webp");

global.URL.createObjectURL = jest.fn(() => "mock-url");
global.URL.revokeObjectURL = jest.fn();

describe("DocumentStepForm", () => {
  const mockOnSubmitSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe("Renderizado inicial", () => {
    it("debe renderizar la zona de drop y el botón de seleccionar archivo", () => {
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      expect(screen.getByText(/arrastra tu imagen/i)).toBeInTheDocument();
      expect(screen.getByText(/seleccionar archivo/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continuar con verificación ocr/i })).toBeInTheDocument();
    });

    it("debe mostrar los formatos aceptados", () => {
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      expect(screen.getByText(/jpeg, png o webp/i)).toBeInTheDocument();
      expect(screen.getByText(/entre 200kb y 8mb/i)).toBeInTheDocument();
    });

    it("debe tener el botón de submit deshabilitado sin archivo", () => {
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      expect(screen.getByRole("button", { name: /continuar con verificación ocr/i })).toBeDisabled();
    });
  });

  describe("Selección de archivo", () => {
    it("debe aceptar archivo JPEG válido", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, validFile);

      expect(screen.getByText("documento.jpg")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continuar con verificación ocr/i })).not.toBeDisabled();
    });

    it("debe aceptar archivo PNG válido", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, pngFile);

      expect(screen.getByText("documento.png")).toBeInTheDocument();
    });

    it("debe aceptar archivo WebP válido", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, webpFile);

      expect(screen.getByText("documento.webp")).toBeInTheDocument();
    });

    it("debe mostrar la vista previa del archivo", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, validFile);

      expect(screen.getByAltText(/vista previa del documento/i)).toBeInTheDocument();
    });

    it("debe mostrar las recomendaciones después de seleccionar un archivo", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, validFile);

      expect(screen.getByText(/recomendaciones/i)).toBeInTheDocument();
      expect(screen.getByText(/completamente visible/i)).toBeInTheDocument();
    });
  });

  describe("Validaciones", () => {
    it("debe mostrar error si el archivo es muy pequeño", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, tooSmallFile);

      expect(await screen.findByText(/al menos 200kb/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe mostrar error si el archivo es muy grande", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, tooLargeFile);

      expect(await screen.findByText(/no debe superar los 8mb/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe mostrar error si el tipo de archivo no es válido", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, invalidTypeFile);

      expect(await screen.findByText(/jpeg, png o webp/i)).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it("debe mostrar error si se intenta enviar sin archivo", async () => {
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const submitButton = screen.getByRole("button", { name: /continuar con verificación ocr/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Eliminar archivo", () => {
    it("debe permitir eliminar el archivo seleccionado", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, validFile);

      expect(screen.getByText("documento.jpg")).toBeInTheDocument();

      const deleteButton = screen.getByLabelText(/eliminar imagen/i);
      await user.click(deleteButton);

      expect(screen.queryByText("documento.jpg")).not.toBeInTheDocument();
      expect(screen.getByText(/arrastra tu imagen/i)).toBeInTheDocument();
    });

    it("debe revocar la URL del objeto al eliminar", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, validFile);

      const deleteButton = screen.getByLabelText(/eliminar imagen/i);
      await user.click(deleteButton);

      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe("Cambiar archivo", () => {
    it("debe permitir cambiar el archivo seleccionado", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, validFile);

      expect(screen.getByText("documento.jpg")).toBeInTheDocument();

      const changeButton = screen.getByText(/cambiar/i);
      expect(changeButton).toBeInTheDocument();
    });
  });

  describe("Envío exitoso", () => {
    it("debe llamar onSubmitSuccess con el archivo después de validar", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, validFile);

      const submitButton = screen.getByRole("button", { name: /continuar con verificación ocr/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalledWith(validFile);
      }, { timeout: 1500 });
    });

    it("debe mostrar estado de loading mientras procesa", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, validFile);

      const submitButton = screen.getByRole("button", { name: /continuar con verificación ocr/i });
      await user.click(submitButton);

      expect(await screen.findByText(/procesando documento/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 1500 });
    });

    it("debe deshabilitar el botón mientras carga", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, validFile);

      const submitButton = screen.getByRole("button", { name: /continuar con verificación ocr/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 1500 });
    });

    it("debe hacer console.log con el archivo antes de llamar onSubmitSuccess", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, validFile);

      const submitButton = screen.getByRole("button", { name: /continuar con verificación ocr/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith("Documento enviado", validFile);
      }, { timeout: 1500 });
    });
  });

  describe("Drag and Drop", () => {
    it("debe cambiar el estilo cuando se arrastra un archivo", () => {
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const dropZone = screen.getByText(/arrastra tu imagen/i).closest("div[role='button']");
      
      if (dropZone) {
        fireEvent.dragOver(dropZone);
        expect(screen.getByText(/suelta la imagen aquí/i)).toBeInTheDocument();
      }
    });

    it("debe restaurar el estilo cuando se deja de arrastrar", () => {
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const dropZone = screen.getByText(/arrastra tu imagen/i).closest("div[role='button']");
      
      if (dropZone) {
        fireEvent.dragOver(dropZone);
        fireEvent.dragLeave(dropZone);
        expect(screen.getByText(/arrastra tu imagen/i)).toBeInTheDocument();
      }
    });

    it("debe aceptar archivos mediante drop", async () => {
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const dropZone = screen.getByText(/arrastra tu imagen/i).closest("div[role='button']");
      
      if (dropZone) {
        const dataTransfer = {
          files: [validFile],
        };

        fireEvent.drop(dropZone, { dataTransfer });

        await waitFor(() => {
          expect(screen.getByText("documento.jpg")).toBeInTheDocument();
        });
      }
    });
  });

  describe("Accesibilidad", () => {
    it("debe tener input de archivo accesible", () => {
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toHaveAttribute("aria-label", "Seleccionar imagen del documento");
    });

    it("debe tener mensajes de error con role=alert", async () => {
      const user = userEvent.setup();
      render(<DocumentStepForm onSubmitSuccess={mockOnSubmitSuccess} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, tooSmallFile);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });
  });
});


# KATA Autenticación Inteligente - Frontend

Frontend de Next.js para el flujo de autenticación inteligente del Banco de Bogotá.

**Producción:** https://kata-dev.ourhyt.art/

## Stack Tecnológico

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** TailwindCSS
- **Testing:** Jest + React Testing Library

## Inicio Rápido

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm run dev

# Build estático
pnpm run build

# Tests
pnpm run test
```

Abre [http://localhost:3000](http://localhost:3000) para ver la aplicación.

---

## API Backend

**Base URL:** `https://dev-api.ourhyt.art`

El backend está desplegado en AWS (API Gateway + Lambda) y expone 3 endpoints para el flujo de autenticación.

---

### Paso 1: Iniciar Autenticación

**Endpoint:** `POST /kata/auth/start`

Inicia el flujo de autenticación validando la identidad del cliente.

#### Request

```bash
curl --location 'https://dev-api.ourhyt.art/kata/auth/start' \
  -H "Content-Type: application/json" \
  -d '{
    "docType": "CC",
    "docNumber": "1000000102",
    "phone": "3001234567"
  }'
```

#### Response (Éxito)

```json
{
  "authId": "9ebb2b63-65a9-4045-ac28-1981464feb12",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "nextStep": "DOCUMENT",
  "customerStatus": "ACTIVE",
  "riskScore": 0.18,
  "reason": null,
  "name": "Maria Gómez",
  "allowedProducts": ["TC_CLASSIC"],
  "challengeType": "BLINK"
}
```

#### Response (Rechazo)

```json
{
  "authId": "...",
  "token": "",
  "nextStep": "REJECTED",
  "reason": "Cliente bloqueado por política de seguridad"
}
```

#### Campos de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `authId` | string | ID único de la sesión de autenticación |
| `token` | string | JWT para usar en requests subsiguientes |
| `nextStep` | "DOCUMENT" \| "REJECTED" | Siguiente paso del flujo |
| `customerStatus` | "ACTIVE" \| "BLOCKED" \| "PENDING" | Estado del cliente |
| `riskScore` | number | Score de riesgo (0.0 - 1.0) |
| `challengeType` | "BLINK" \| "APPROACH" | Tipo de prueba de vida a realizar |
| `name` | string | Nombre del cliente |

---

### Paso 2: Verificación de Documento

**Endpoint:** `POST /kata/auth/document`

Sube la imagen frontal del documento para validación OCR con AWS Textract.

#### Request

```bash
curl --location 'https://dev-api.ourhyt.art/kata/auth/document' \
  -H "Authorization: Bearer <TOKEN_DEL_START>" \
  -H "accept: application/json" \
  -F "file=@/ruta/a/documento_frontal.jpg"
```

> **Nota:** Solo se envía la foto frontal. El reverso se captura en el UI pero no se procesa en este endpoint.

#### Response (Éxito)

```json
{
  "authId": "9ebb2b63-65a9-4045-ac28-1981464feb12",
  "qualityScore": 0.92,
  "documentStatus": "OK",
  "reason": null,
  "nextStep": "LIVENESS",
  "ocrDocNumber": "1000000102",
  "docMatch": true,
  "fraudSuspected": false
}
```

#### Response (Retomar foto)

```json
{
  "documentStatus": "RETAKE",
  "nextStep": "RETAKE_DOCUMENT",
  "reason": "La imagen está borrosa o mal encuadrada"
}
```

#### Response (Fraude detectado)

```json
{
  "documentStatus": "MISMATCH",
  "nextStep": "REJECTED",
  "docMatch": false,
  "fraudSuspected": true,
  "reason": "El número de documento no coincide"
}
```

---

### Paso 3: Prueba de Vida (Liveness)

**Endpoint:** `POST /kata/auth/liveness`

Envía múltiples frames capturados para verificación de vida.

#### ⚠️ Cambio Importante en el Contrato

El endpoint ahora acepta un array de frames bajo el campo `frames` (repetido), en lugar de `frame1` y `frame2` separados. El `challengeType` **ya no se envía en el form** - se extrae del JWT token.

#### Request

```bash
curl --location 'https://dev-api.ourhyt.art/kata/auth/liveness' \
  -H "Authorization: Bearer <TOKEN_DEL_START>" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "frames=@/ruta/a/frame_1.jpg" \
  -F "frames=@/ruta/a/frame_2.jpg" \
  -F "frames=@/ruta/a/frame_3.jpg" \
  -F "frames=@/ruta/a/frame_4.jpg" \
  -F "frames=@/ruta/a/frame_5.jpg"
```

#### Notas Importantes

| Aspecto | Detalle |
|---------|---------|
| **Campo del form** | `frames` (repetido por cada imagen) |
| **Mínimo de frames** | 2 |
| **Recomendado** | 8 frames |
| **challengeType** | Se lee del JWT, NO se envía en el form |
| **Formato de imagen** | JPEG recomendado |

#### Response (Éxito)

```json
{
  "authId": "9ebb2b63-65a9-4045-ac28-1981464feb12",
  "challengeType": "BLINK",
  "livenessScore": 0.87,
  "passed": true,
  "reason": null,
  "nextStep": "COMPLETED"
}
```

#### Response (Fallo)

```json
{
  "authId": "9ebb2b63-65a9-4045-ac28-1981464feb12",
  "challengeType": "APPROACH",
  "livenessScore": 0.21,
  "passed": false,
  "reason": "No se detectó movimiento de acercamiento",
  "nextStep": "REJECTED"
}
```

#### Campos de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `authId` | string | ID de la sesión |
| `challengeType` | "BLINK" \| "APPROACH" | Tipo de prueba realizada |
| `livenessScore` | number | Puntuación de vida (0.0 - 1.0) |
| `passed` | boolean | Si pasó la verificación |
| `reason` | string \| null | Razón del fallo (si aplica) |
| `nextStep` | "COMPLETED" \| "REJECTED" | Estado final |

---

## Flujo del Frontend

### Paso 1: Formulario de Identidad
- Tipo de documento (CC fijo)
- Número de cédula (regex colombiana)
- Teléfono celular (10 dígitos)
- Llama a `/kata/auth/start`
- Guarda `token` y `challengeType` para pasos siguientes

### Paso 2: Captura de Documento
- Captura foto frontal y reverso (UX)
- Solo envía foto frontal a `/kata/auth/document`
- Maneja estados: OK → Liveness, RETAKE → repetir, MISMATCH → error

### Paso 3: Prueba de Vida (Nuevo Flujo)
1. Usuario presiona "Iniciar prueba de vida"
2. Se abre la cámara frontal
3. Countdown 3...2...1...
4. **Ráfaga automática de 8 frames en ~2 segundos**
5. Los frames se envían automáticamente a `/kata/auth/liveness`
6. Se muestra resultado: éxito o error con opción de reintentar

### Pantalla Final
- **Éxito:** "✅ Autenticación completada" con score de liveness
- **Error:** Mensaje de error con opción de reiniciar flujo

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx          # Orquestador principal del wizard
│   ├── layout.tsx        # Layout con metadata
│   └── globals.css       # Estilos globales TailwindCSS
├── components/
│   └── auth-wizard/
│       ├── IdentityStepForm.tsx    # Paso 1
│       ├── DocumentStepForm.tsx    # Paso 2
│       ├── LivenessStepForm.tsx    # Paso 3 (ráfaga automática)
│       └── index.ts
├── lib/
│   └── api.ts            # Cliente API con tipos y helpers
└── context/
    └── AuthContext.tsx   # Contexto de estado (opcional)
```

---

## Testing

```bash
# Ejecutar todos los tests
pnpm run test

# Watch mode
pnpm run test -- --watch

# Coverage
pnpm run test -- --coverage
```

---

## Variables de Entorno

No se requieren variables de entorno para desarrollo. La URL de la API está hardcodeada en `src/lib/api.ts`:

```typescript
const API_BASE_URL = "https://dev-api.ourhyt.art";
```

---

## Deploy

El proyecto se despliega como sitio estático en S3/CloudFront:

```bash
pnpm run build
# Los archivos estáticos quedan en /out
```

---

## Licencia

Proyecto privado - Banco de Bogotá KATA


---

## Versión 2: sitio web, acceso de empleados y agente para clientes

> Esta versión es posterior a la entrega de la Fase 2 (6 de noviembre de 2026) y se desarrolla en la rama `v2-sitio-web`. La entrega oficial se conserva sin cambios en la rama `main` y en la release `v1.0-fase2-entregada`.

**Aplicación publicada:** https://rinotec-web-rlr2026-h0gqataufzdqghac.norwayeast-01.azurewebsites.net

### Qué se agregó

| Mejora | Descripción |
|---|---|
| Sitio web de la empresa | Página de presentación de RinoTec con secciones de servicios, mayoreo, taller, atención a empresas, cómo funciona el servicio, garantía y privacidad, las 5 sucursales (Guadalajara, Zacatecas, León, San Luis Potosí y Aguascalientes) y preguntas frecuentes. Las ilustraciones del taller y de las sucursales son originales (SVG). |
| Asistente con acceso libre para clientes | Cualquier persona puede usar a Rino desde `/asistente` sin iniciar sesión. En este modo responde con un agente distinto, que solo tiene acceso a información pública. |
| Acceso restringido para empleados | El personal entra con un código de acceso desde la opción **Acceso empleados**. Con el acceso activo, la aplicación usa el agente interno de la versión 1. |
| Sugerencias que se ocultan | Las preguntas sugeridas desaparecen en cuanto el usuario empieza a escribir o envía su primer mensaje. |

### Arquitectura

```
Navegador
   │
   ▼
Azure App Service (Linux, Node 24 LTS, plan F1, Norway East)
rinotec-web-rlr2026  ── identidad administrada con rol "Foundry User"
   │
   │  El servidor decide el perfil (cliente o empleado); el navegador no puede elegirlo
   ▼
Microsoft Foundry · proyecto asistente-rinotec (France Central) · gpt-4.1-mini
   ├── Perfil cliente  → agente asistente-rinotec-clientes → índice conocimiento-clientes
   └── Perfil empleado → agente asistente-rinotec (v2)     → índice conocimiento-rinotec
```

Separar los agentes y los índices es la medida principal de privacidad. El agente de clientes **no tiene acceso** a facturas, proveedores, costos, nombres de clientes ni bitácoras internas, porque esa información no está en su índice. Así no depende solamente de que las instrucciones le indiquen no revelarla.

### Agente para clientes

- **Nombre:** `asistente-rinotec-clientes`, con el modelo `gpt-4.1-mini`.
- **Instrucciones:** `instrucciones_agente_clientes.md`.
- **Conocimiento** (carpeta `conocimiento_clientes/`, índice `conocimiento-clientes`):
  - `01_catalogo_clientes.md`: productos, precios al público y disponibilidad por sucursal.
  - `02_estado_ordenes_clientes.md`: estado de las órdenes por folio, sin nombres de clientes ni de técnicos.
  - `03_politicas_clientes.md`: una sola versión vigente de las políticas de garantía.
- **Herramienta:** búsqueda de archivos, configurada desde el portal de Foundry mediante un toolbox.

**Pruebas realizadas en el área de juegos de Foundry:**

| Pregunta | Resultado |
|---|---|
| Fundas para iPhone 15 en León | Responde con la disponibilidad y el precio, y cita `01_catalogo_clientes.md` |
| Estado de una orden por folio | Responde con el estado y cita `02_estado_ordenes_clientes.md` |
| Pagos a un proveedor | Se niega a responder: es información interna |
| Garantía de un cambio de pantalla | Responde con la política vigente y cita `03_politicas_clientes.md` |
| Texto sin sentido | Pide aclaración |

Durante las pruebas se detectó que el agente aceptaba folios incompletos. Se corrigió la regla 3 de las instrucciones para que solo responda con el folio completo y exacto.

### Acceso de empleados

- El código de acceso se valida en el servidor, que limita a 5 los intentos cada 15 minutos.
- Al validarse, el servidor crea una cookie de sesión firmada (`HttpOnly`, `Secure`, con duración de 8 horas).
- El código **no** se guarda en el repositorio. Se configura como variable de entorno en Azure y se comparte por separado con quien deba revisar el sistema.
- El código del servidor ya admite inicio de sesión con Microsoft Entra ID (autenticación integrada de App Service), pero en esta versión **no está habilitado** (`AUTH_ENTRA=false`).

### Variables de entorno

Sus nombres están en `rinotec-web/.env.example`. Los valores reales no se publican.

| Variable | Uso |
|---|---|
| `FOUNDRY_PROJECT_ENDPOINT` | Endpoint del proyecto de Foundry |
| `FOUNDRY_AGENT_CLIENTES` / `FOUNDRY_AGENT_CLIENTES_VERSION` | Agente y versión para el perfil cliente |
| `FOUNDRY_AGENT_EMPLEADOS` / `FOUNDRY_AGENT_EMPLEADOS_VERSION` | Agente y versión para el perfil empleado |
| `EMPLOYEE_ACCESS_CODE` | Código de acceso de empleados |
| `SESSION_SECRET` | Clave para firmar la cookie de sesión |
| `DEV_EMPLEADO` | Solo para pruebas locales; en Azure vale `false` |
| `AUTH_ENTRA` | Activa el inicio de sesión con Entra ID; en Azure vale `false` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | Hace que Azure instale las dependencias al desplegar |

### Despliegue

1. Se creó la aplicación web `rinotec-web-rlr2026` en el mismo plan F1 de la versión 1 (Norway East). La aplicación de la versión 1 no se modificó.
2. Se activó la identidad administrada asignada por el sistema y se le asignó el rol **Foundry User** sobre el recurso `asistente-rinotec-resource`.
3. Se configuraron las variables de entorno desde el portal.
4. Se desplegó el paquete zip con `az webapp deploy ... --type zip`. Resultado: `RuntimeSuccessful`.

### Estructura agregada en esta rama

```
rinotec-web/                       Aplicación de la versión 2 (sitio web + asistente)
├── server.js
├── package.json
├── .env.example
└── public/
    ├── index.html, site.css       Sitio web de la empresa
    ├── asistente.html, asistente.js, chat.css
    └── img/ilustraciones/         Ilustraciones del taller y de las sucursales
conocimiento_clientes/             Conocimiento del agente para clientes
instrucciones_agente_clientes.md   Instrucciones del agente para clientes
capturas/v2/                       Evidencias de la versión 2
```

### Evidencias

| Captura | Contenido |
|---|---|
| `capturas/v2/v2_01_pagina_principal.png` | Página principal del sitio |
| `capturas/v2/v2_02_servicios_y_taller.png` | Secciones de servicios y taller |
| `capturas/v2/v2_03_asistente_modo_cliente.png` | Asistente en modo cliente, con sugerencias |
| `capturas/v2/v2_04_acceso_empleados.png` | Ventana de acceso para empleados |
| `capturas/v2/v2_05_codigo_incorrecto.png` | Rechazo de un código incorrecto |
| `capturas/v2/v2_06_modo_empleado.png` | Asistente en modo empleado, con sus propias sugerencias |

### Limitaciones conocidas

- **Folios numéricos:** algunos folios del conjunto de datos son solo un número (por ejemplo `600`), por lo que podrían adivinarse. En un sistema real se pediría un segundo dato de verificación, como los últimos dígitos del teléfono registrado.
- **Botón "Iniciar sesión con Microsoft":** aparece en la ventana de acceso, pero Entra ID no está habilitado en esta versión. Por ahora, el acceso de empleados es solo por código.
- **Plan F1:** después de un periodo sin uso, el primer acceso puede tardar uno o dos minutos mientras la aplicación arranca.
- **Toolbox:** la búsqueda de archivos del agente de clientes funciona mediante un toolbox, que el portal de Foundry presenta como función en vista previa.
- **Datos:** todos los datos son ficticios y se crearon solo con fines académicos.

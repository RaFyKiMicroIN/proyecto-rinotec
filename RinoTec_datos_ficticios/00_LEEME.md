# RinoTec: datos ficticios, conjunto mínimo

Datos **100 % ficticios** generados para el proyecto *De datos dispersos a IA útil (caso RinoTec)*. Ninguna persona, empresa, RFC, IMEI ni número telefónico corresponde a datos reales. Las facturas **no son CFDI** y no tienen validez fiscal.

Periodo simulado: 1 de agosto al 5 de noviembre de 2026. Sucursales: Guadalajara (GDL), Zacatecas (ZAC), León (LEO), San Luis Potosí (SLP) y Aguascalientes (AGS).

## Estructura

| Carpeta | Contenido | Volumen | Desorden intencional |
|---|---|---|---|
| `01_facturas_proveedores/` | Facturas en PDF repartidas en 3 "correos personales" de compradores, fotos de WhatsApp y el Excel de captura manual de Laura | 40 facturas, 44 archivos, 39 filas capturadas | Nombres como `factura_final 2.pdf`; 4 facturas están en PDF **y** como foto; 2 fotos ilegibles; 1 factura capturada y pagada dos veces; 2 errores de captura (dígitos invertidos y fecha) |
| `02_ordenes_servicio/<sucursal>/` | Órdenes de servicio en formato de papel escaneado o fotografiado (JPG y algunas en PDF) | 90 órdenes | Cada sucursal usa un formato de folio distinto; 5 de baja calidad; 8 con campos en blanco; contraseñas y PIN de clientes anotados en la hoja |
| `03_catalogo_inventario/` | Un archivo de inventario por sucursal y el Excel de pedidos de mayoreo | 5 inventarios (CSV o XLSX), 14 pedidos | Columnas distintas en cada archivo; el mismo producto con 3 nombres (p. ej., "FUNDA IPH15 TPU", "Case transparente 15"); precios distintos; un producto duplicado dentro de cada archivo |
| `04_quejas_dudas_clientes/` | Mensajes de WhatsApp (CSV), correos (JSON) y notas de llamadas (XLSX) | 157 registros (91 WhatsApp, 19 correos, 47 llamadas) | Ningún canal se conecta con los otros; el mismo caso aparece repetido en distintos canales |
| `05_politicas_internas/` | Políticas en Word | 4 documentos | 3 versiones contradictorias de la garantía (30, 60 y 90 días) más una de devoluciones que choca con ellas |
| `99_clave_respuestas_NO_INDEXAR/` | Valores correctos de cada documento (lo que la IA *debería* extraer o concluir) | 12 archivos | Sirve solo para validar; **no subir al índice ni al agente** |

## Escenarios del caso incluidos en los datos

| Escenario | Dónde aparece | Personaje relacionado |
|---|---|---|
| Factura pagada dos veces (PDF `factura_final 2.pdf` + foto de WhatsApp) | `01_…` y `captura_facturas_Laura.xlsx` (factura F007 de la clave) | Laura |
| Facturas ilegibles que deben ir a revisión humana | `whatsapp_fotos` (F024 y F031) | Laura |
| Mayorista que reclama 4 veces por el mismo faltante (pedido de MóvilMax Potosí) | WhatsApp, correo y llamada; `pedidos_mayoreo_2026.xlsx` | Mariana, Don Ernesto |
| Escuela con contrato de mantenimiento y 4 laptops detenidas por falta de SSD | Órdenes de SLP, correos y llamadas, inventario de SLP ("agotado") | Rosa, Don Ernesto |
| Equipo enviado a otra sucursal (microsoldadura en GDL) y cliente sin respuesta | Órdenes de LEO y AGS, notas de llamadas | Mariana |
| Cliente que reclama garantía sin nota; la orden original está en papel | 2 órdenes de ZAC (iPhone 12) y WhatsApp | Iván |
| Misma laptop con la misma falla reparada en LEO (agosto) y AGS (octubre) | Órdenes con el mismo número de serie | Iván, Rosa |
| Pregunta de bodega: "¿cuántas fundas de iPhone 15 nos quedan?" | Producto presente en los 5 inventarios con nombres distintos | Toño |
| Datos sensibles mezclados (contraseñas de equipos, teléfonos de clientes) | Órdenes de servicio | Carlos |
| Políticas contradictorias | `05_politicas_internas/` | Todos |

## Cómo usar la clave de respuestas

- `facturas_clave.csv` y `facturas_conceptos_clave.csv`: proveedor, folio, fecha, totales y conceptos correctos, además de duplicados, ilegibles y errores de captura.
- `ordenes_servicio_clave.csv`: todos los campos de cada orden, su estado real al 5 de noviembre y el caso al que pertenece.
- `catalogo_maestro.csv`, `catalogo_mapeo_sucursal_a_sku.csv` y `existencias_reales.csv`: la "fuente única de verdad" que el sistema debería reconstruir.
- `quejas_clave.csv`: tema y sentimiento esperados, y el caso al que pertenece cada mensaje.
- `pedidos_mayoreo_clave.csv`, `clientes.csv`, `personal.csv`, `proveedores.csv` y `politicas_clave.md`.

Con estos archivos puedes medir el desempeño del prototipo, por ejemplo: porcentaje de facturas extraídas correctamente, duplicados detectados, existencias correctas por SKU y casos conectados.

## Limitaciones conocidas

- La escritura "a mano" de las órdenes está **simulada** con fuentes tipográficas cursivas y una variación aleatoria por letra; no es letra manuscrita real. El rendimiento de un OCR sobre escritura real puede ser menor.
- Las órdenes de baja calidad siguen siendo parcialmente legibles: simulan un escaneo deficiente, no un documento destruido.
- Las facturas imitan el aspecto de una factura mexicana, pero no incluyen el XML, el sello digital ni el UUID de un CFDI.
- Las cifras (precios, costos, cantidades) son verosímiles pero no provienen de ninguna fuente de mercado.

# Auditoría Frontend para Backend Demo

Fecha de auditoría: 2026-10-15  
Proyecto: `Front Blanco bride`  
Alcance: inspección técnica del frontend Angular/PrimeNG/Sakai. No se modificó código de aplicación.

## 1. Resumen ejecutivo

El frontend es una demo Angular 21 standalone con tres áreas de negocio principales:

- `Formulario`: captura un pedido mediante wizard reactivo.
- `Pedidos`: lista, detalle, cambio de estatus, adicionales y preview visual de documentos.
- `Batas de encaje`: vista especializada derivada de productos `bata_encaje` existentes en pedidos y adicionales.

La fuente conceptual de verdad debe ser `Pedido` y sus productos. El módulo Batas de encaje actualmente ya usa `PedidosService` como origen, pero conserva un modelo/ViewModel propio para la presentación. No se encontró una segunda colección mock activa de batas de encaje: el archivo independiente que existía fue eliminado durante la implementación anterior y actualmente la carpeta `data` del módulo está vacía.

Los principales riesgos antes de diseñar PostgreSQL/NestJS son:

1. La representación de productos no está normalizada: existen personalizaciones, complementos, productos adicionales originales y productos de adicionales con estructuras distintas.
2. `precio` es unitario en productos con `cantidad`, pero hay campos de subtotal/total que se recalculan en varios lugares y no siempre parten de la misma colección.
3. El catálogo de tallas no contiene `G`, aunque algunos datos/mock o ejemplos usan esa talla.
4. El formulario guarda estado en memoria y crea un pedido mock al finalizar; no existe todavía una persistencia durable ni edición real de pedido.
5. Cliente capturado y cliente recurrente están correctamente diferenciados en la intención del código, pero el pedido conserva principalmente un snapshot textual (`clienteNombre`) y no una relación navegable completa.
6. La aplicación no tiene repositorio Git en la ruta auditada, por lo que no fue posible obtener un `git diff` o historial.

## 2. Stack

### Hecho en código

- Angular `^21`.
- PrimeNG `^21.0.2`.
- PrimeIcons `^7.0.0`.
- RxJS `~7.8.0`.
- TypeScript `~5.9.3`.
- Tema PrimeNG Aura mediante `providePrimeNG`.
- Tailwind PrimeUI/PostCSS configurado en dependencias.
- Jasmine/Karma están instalados, pero no se encontraron specs de negocio en `src`.

### Arquitectura

- Standalone components; no se usan NgModules de funcionalidad.
- Lazy loading por archivos `*.routes.ts`.
- Formularios reactivos en Formulario y Adicionales.
- `signal` para el estado interno de `PedidosService` y `FormularioStateService`.
- `Observable`/`of()` como fachada de lecturas y mutaciones mock.
- `ngModel` para filtros, selects inline y algunos diálogos.
- `provideZonelessChangeDetection()`.
- `provideHttpClient(withFetch())` está registrado, pero no hay llamadas HTTP de negocio.

### No encontrado

- Guards.
- Interceptors.
- Uso de `localStorage` o `sessionStorage`.
- `BehaviorSubject`.
- Autenticación/autorización.
- Pipes de negocio propios.
- Upload real o almacenamiento remoto.

## 3. Arquitectura frontend

El layout Sakai envuelve las rutas de negocio en `AppLayout`. El menú se define en `src/app/layout/component/app.menu.ts` y usa `routerLink`.

Rutas actuales:

| Ruta | Carga | Componente |
|---|---|---|
| `/` | directa | `HomeComponent` |
| `/formulario` | lazy | `FormularioComponent` |
| `/pedidos` | lazy | `PedidosComponent` |
| `/pedidos/:id` | hija de Pedidos | `PedidoDetalleComponent` |
| `/batas-encaje` | lazy | `BatasEncajeComponent` |

Archivos de configuración revisados:

- `src/app.routes.ts`
- `src/app.config.ts`
- `src/main.ts`
- `src/app/layout/component/app.layout.ts`
- `src/app/layout/component/app.menu.ts`
- `src/app/layout/service/layout.service.ts`

## 4. Módulos

### Formulario

- Ruta: `/formulario`.
- Página: `formulario.component.*`.
- Modelos: `formulario.model.ts`.
- Catálogos y mocks: `formulario.mock.ts`.
- Servicios: `FormularioCatalogosService`, `FormularioStateService`.
- Operaciones UI: capturar datos, agregar batas, agregar productos, cargar referencias, validar, guardar borrador simulado y finalizar pedido mock.
- Dependencias: catálogos compartidos, proveedores y posteriormente `PedidosService` al finalizar el pedido mock.

### Pedidos

- Rutas: `/pedidos` y `/pedidos/:id`.
- Páginas: `pedidos.component.*`, `pedido-detalle.component.*`.
- Componentes: formulario de adicional y preview de documentos.
- Modelo: `pedido.model.ts`.
- Mock: `pedidos.mock.ts`.
- Servicio principal: `PedidosService`.
- Utilidades: `evento-urgencia.ts`, `pedido-documento.ts`.
- Operaciones UI: listar, filtrar, navegar a detalle, cambiar estatus, cancelar mock, crear/editar/listar adicionales y abrir documentos visuales.

### Batas de encaje

- Ruta: `/batas-encaje`.
- Página: `batas-encaje.component.*`.
- Modelo de presentación: `bata-encaje.model.ts`.
- Servicio fachada: `batas-encaje.service.ts`.
- Fuente: `PedidosService`, recorriendo productos originales y productos de adicionales cuyo `tipo` es `bata_encaje`.
- Operaciones UI: filtros, KPIs, edición inline del tipo/estatus, enlace al pedido padre y detalle del producto.
- No tiene operación de crear una bata desconectada.

### Home/template

`HomeComponent` y el layout Sakai son infraestructura/presentación del template. No representan una entidad de negocio del futuro backend.

## 5. Modelo funcional del pedido

### Paso 1 — Datos generales

El wizard captura:

| Campo visual | Propiedad de formulario | Tipo | Obligatorio | Validación/default | Naturaleza |
|---|---|---|---|---|---|
| Cliente | `cliente` | `Cliente \| string \| null` | Sí | `required`; vacío | Capturado; permite texto libre y sugerencia |
| Fecha del evento | `fechaEvento` | `Date \| null` | Sí | `required`; `null` | Capturado |
| Ubicación | `ubicacion` | `string` | Sí | `required`; `''` | Capturado |
| Terminación de contacto | `terminacionContacto` | `string` | Sí | `required`; `''` | Capturado |
| Tipo de cliente | `tipoCliente` | `TipoCliente \| null` | Sí | `required`; `null` | Capturado desde opciones |
| Tipo de cliente adicional | `tipoClienteOtro` | `string` | Condicional | `required` si tipo=`Otro` | Capturado |
| Anticipo | `anticipo` | `number \| null` en el control; `number` en modelo | Sí | `required`, `min(0)`; `0` | Capturado |

Tipos de cliente reales: `Novia`, `Quinceañera`, `Negocio`, `Otro`.

### Paso 2 — Batas

Se crea al menos una bata adulta automáticamente. El usuario puede agregar bata adulta o infantil. El selector visible actual ofrece `Normal` e `Infantil`; el valor legacy `encaje` continúa en el tipo TypeScript, pero ya no se ofrece en ese selector porque la bata de encaje se mueve al flujo de productos.

Campos de cada `BataGroup`:

| Campo | Tipo | Obligatorio | Validación/default |
|---|---|---|---|
| `tipo` | `TipoBata` | Sí por estructura | `adulto` o `infantil` |
| `tipoBataId` | `string \| null` | No explícito | `normal` o `infantil` |
| `proveedorId` | `string \| null` | Sí | `required`; proveedor sugerido |
| `estatusProveedor` | `'pendiente'` en el formulario | No editable | `pendiente` |
| `colorId` | `string \| null` | Sí | `required` |
| `tallaId` | `string \| null` | Sí | `required` |
| `bordadoFrontal` | `string` | No | `''` |
| `bordadoPosterior` | `string` | No | `''` |
| `colorBordadoId` | `string \| null` | Sí | `required` |
| `precio` | `number` | Sí | `required`, `min(0)`; `0` |
| `observaciones` | `string` | No | `''` |

### Paso 3 — Productos adicionales

El usuario pulsa “Agregar producto”, selecciona un tipo de catálogo y se crea un `FormGroup`. El wizard actual muestra estos tipos:

- Bata de encaje.
- Toallas.
- Pañuelos.
- Pañuelos para mascota.
- Pantuflas.
- Playeras para hombre.
- Pantalón.

Campos comunes del grupo:

`tipo`, `idTemporal`, `cantidad`, `precio`, `proveedorId`, `estatusProveedor`, `texto`, `observaciones`, `colorProductoId`, `colorTextoId`, `tallaId`, `tallaMascota`, `opcionPantufla`, `tipoEncajeId`, `estatusBataEncaje`.

`cantidad` tiene `required` y `min(1)`. `precio` tiene `required` y `min(0)`. `proveedorId` tiene `required`. Los campos específicos agregan `required` según el tipo.

### Paso 4 — Diseño y referencias

- `tipografiaId`: obligatorio, catálogo de tipografías.
- `dualTexto`: obligatorio, opciones visuales `Dual Centrado`, `Dual de Lado`, `Ningún Dual`.
- Referencias: archivos locales, máximo dos, imágenes o PDF, máximo 10 MB cada uno.

### Paso 5 — Resumen

Muestra datos, personalizaciones, productos, distribución por proveedor, diseño y totales. No es un modelo adicional; es una proyección del estado del formulario.

## 6. Clientes

### Cliente recurrente

`Cliente` en `formulario.model.ts`:

- `id: string`
- `nombre: string`
- `telefono: string`
- `correo?: string`

Está mockeado en `CLIENTES_MOCK` y se entrega mediante `FormularioCatalogosService.getClientes()`.

### Datos del pedido

El formulario usa `cliente: Cliente | string | null`, permite texto libre y deriva:

- `clienteId: string | null`: solo se asigna si el valor seleccionado es un objeto recurrente.
- `clienteNombre: string`: texto seleccionado o capturado.
- `terminacionContacto: string`.
- `ubicacion: string`.
- `tipoCliente: TipoCliente | null`.
- `fechaEvento: Date | null`.
- `anticipo: number`.

### Conclusión

La intención de cliente libre + catálogo sugerido sí está implementada. `clienteId` es opcional conceptualmente; `clienteNombre` es el snapshot necesario del pedido. El catálogo de clientes no debe confundirse con la identidad histórica del cliente en un pedido.

## 7. Productos

### Matriz funcional actual

| Producto | Cantidad | Color | Talla | Texto | Color texto | Precio | Observaciones | Proveedor | Campos específicos |
|---|---:|---|---|---|---|---:|---|---|---|
| Bata normal | Implícita 1 por card | Sí | Sí | Bordado frontal/posterior | Color bordado | Sí | Sí | Sí | tipo bata, estatus proveedor |
| Bata infantil | Implícita 1 por card | Sí | Sí | Bordado frontal/posterior | Color bordado | Sí | Sí | Sí | tipo infantil |
| Bata de encaje | Grupo producto | Sí | Sí | No requerido | No | Sí | Sí | Sí | `tipoEncajeId`, `estatusBataEncaje` |
| Pantalón | Sí | Sí | Sí | No | No | Sí | Sí | Sí | Ninguno adicional |
| Toalla | Sí | No | No | Campo genérico | No | Sí | Sí | Sí | Ninguno |
| Pañuelo | Sí | Sí | No | Campo genérico | Sí | Sí | Sí | Sí | color producto, color texto |
| Pañuelo mascota | Sí | Sí | talla mascota | Campo genérico | Sí | Sí | Sí | Sí | talla mascota: chica/mediana/grande |
| Pantuflas | Sí | No | No | Campo genérico | No | Sí | Sí | Sí | opción de pantufla |
| Playera hombre | Sí | Sí | Sí | Campo genérico | No | Sí | Sí | Sí | color y talla requeridos |

Nota: además existe `COMPLEMENTOS_MOCK` con productos como `Pantuflas`, `Playeras Personalizadas`, `Toallas Corporales`, `Pañuelos`, `Pañuelos para Mascotas` y `Pañaleros`. Ese catálogo alimenta un arreglo separado de complementos de cantidades, mientras que `PRODUCTOS_ADICIONALES_MOCK` alimenta las cards configurables. Esta coexistencia es una inconsistencia relevante.

## 8. Batas

Las batas normales e infantiles usan `PersonalizacionBata` en Formulario y `PedidoPersonalizacion` en Pedidos. La transformación entre ambos modelos cambia IDs de color/talla por strings sin resolver el catálogo.

Campos de `PersonalizacionBata`:

`idTemporal`, `tipo`, `colorId`, `tallaId`, `bordadoFrontal`, `bordadoPosterior`, `colorBordadoId`, `precio`, `observaciones`, `tipoBataId`, `proveedorId`, `estatusProveedor`.

Campos de `PedidoPersonalizacion`:

`tipo`, `color`, `talla`, `bordadoFrontal`, `bordadoPosterior`, `colorBordado`, `precio`, `observaciones`, `proveedorId`, `estatusProveedor`.

No son el mismo contrato: el formulario usa IDs y el pedido usa textos.

La Bata de encaje ya no se captura como bata normal desde el selector visible; se captura como `ProductoAdicionalPedido` con `tipo: 'bata_encaje'`. Este cambio evita la captura duplicada, aunque el tipo legacy `encaje` todavía existe en `TipoBata`.

## 9. Batas de encaje

### Producto dentro del pedido

El producto usa `ProductoAdicionalPedido` con:

- `tipo: 'bata_encaje'`.
- `cantidad`.
- `precio`.
- `colorProductoId`.
- `tallaId`.
- `observaciones`/`texto`.
- `proveedorId`.
- `estatusProveedor`.
- `tipoEncajeId`.
- `estatusBataEncaje`, default `solicitada`.

Catálogo real de tipos:

- `manga_encaje` — Manga de encaje.
- `manga_holanes` — Manga de holanes.
- `manga_encaje_largo` — Manga de encaje largo.
- `manga_encaje_2` — Manga de encaje 2.

Estados reales: `solicitada`, `ya_llego`, `lista`.

### Seguimiento

`BatasEncajeService.getBatasEncaje()` obtiene los pedidos de `PedidosService`, recorre:

1. `pedido.productosAdicionales` filtrando `tipo === 'bata_encaje'`.
2. `pedido.adicionales[].productos` filtrando el mismo tipo.

Después genera un `BataEncaje` para la tabla. El ViewModel incluye `productoId`, `pedidoId`, `pedidoFolio`, `adicionalId`, `adicionalFolio`, teléfono, tipo, estado, evento, talla, color, observaciones, proveedor y precio.

El módulo no crea batas. Las mutaciones inline llaman a `PedidosService` sobre el producto original o sobre el producto del adicional.

### Riesgos actuales

- El ViewModel usa `talla` y `color` como strings, pero los productos originales guardan IDs y los productos de adicionales guardan textos. El adaptador debe soportar ambos formatos.
- `BataEncajeCambios` aún expone `terminacionTelefono` y `fechaEvento`, aunque esos datos pertenecen al pedido y no al producto; la UI de edición quedó como código residual y no está en el menú de acciones actual.
- La interfaz propia `BataEncaje` y los tipos `TipoEncaje`/`EstatusEncaje` duplican conceptualmente parte del dominio de Formulario.

## 10. Adicionales

`PedidoAdicional` contiene:

- `id`.
- `folio`.
- `pedidoId`.
- `creadoEn`.
- `productos: PedidoAdicionalProducto[]`.
- `observaciones?`.
- `total`.

Cada `PedidoAdicionalProducto` contiene `idTemporal?`, `tipo`, `nombre`, `cantidad`, `color?`, `talla?`, `texto?`, `observaciones?`, `precio`, `proveedorId`, `estatusProveedor`, `tipoEncajeId?` y `estatusBataEncaje?`.

Operaciones actuales:

- Crear desde `PedidoAdicionalFormComponent` y `PedidosService.crearAdicionalMock()`.
- Editar desde detalle/listado y `actualizarAdicionalMock()`.
- Listar por pedido con `getAdicionales()`.
- Obtener uno con `getAdicionalById()`.
- Eliminar con `eliminarAdicionalMock()`; existe en servicio, sin una acción equivalente visible principal.
- Mostrar en tabla de Pedidos como indicador.
- Mostrar en detalle y seguimiento por proveedor.
- Incluir en documentos mediante selector de alcance.

El folio se genera como `PED-XXXX-AD01`, `AD02`, etc. El pedido original conserva su arreglo `adicionales`; el código no recalcula consistentemente todos los campos agregados del padre al añadir un adicional.

## 11. Proveedores

Catálogo: `PROVEEDORES_MOCK`:

- `prov-1` — Proveedor de Batas.
- `prov-2` — Proveedor de Pañuelos.
- `prov-3` — Proveedor de Playeras.
- `prov-4` — Proveedor General.

`proveedorId` aparece en batas, complementos, productos originales y productos de adicionales.

Sugerencias en `PROVEEDOR_SUGERIDO_MOCK`:

- adulto/infantil/encaje → `prov-1`.
- toalla/pantuflas/pantalón → `prov-4`.
- pañuelos → `prov-2`.
- playera hombre → `prov-3`.

Estados reales de proveedor:

`pendiente`, `por_solicitar`, `solicitado`, `en_produccion`, `listo_proveedor`, `recibido`, `cancelado`.

El detalle agrupa seguimiento por proveedor. Permite modificar estados de personalizaciones y complementos originales; los productos adicionales de seguimiento se muestran con estado, pero algunos índices usan `-1` y quedan deshabilitados para actualización directa.

## 12. Catálogos

| Catálogo | Definición | Servicio | Identificador/label | Observaciones |
|---|---|---|---|---|
| Clientes | `CLIENTES_MOCK` | `getClientes()` | `id` / `nombre` | Sugerencias; no obligatorio como relación |
| Colores | `COLORES_MOCK` | `getColores()` | `color-*` / nombre | Reutilizado |
| Colores bordado | `COLORES_BORDADO_MOCK` | `getColoresBordado()` | `bordado-*` / nombre | Catálogo distinto, con solapamientos |
| Tallas | `TALLAS_MOCK` | `getTallas()` | `talla-*` / nombre | No incluye `G` |
| Tipografías | `TIPOGRAFIAS_MOCK` | `getTipografias()` | `tipo-*` / nombre | Incluye `muestra` |
| Tipos de encaje | `TIPOS_ENCAJE_MOCK` | `getTiposEncaje()` | valor/id / nombre | Catálogo reutilizado por Formulario y Batas |
| Proveedores | `PROVEEDORES_MOCK` | `getProveedores()` | `id` / `nombre` | Reutilizado |
| Complementos simples | `COMPLEMENTOS_MOCK` | `getComplementos()` | `id` / `nombre` | Estructura paralela a productos |
| Productos configurables | `PRODUCTOS_ADICIONALES_MOCK` | `getProductosAdicionales()` | `tipo` / `nombre` | Incluye Bata de encaje y Pantalón |
| Pantuflas | array literal en template | No | claves internas / label | No está fuera del componente |
| Talla mascota | array literal en template | No | `chica`, `mediana`, `grande` | Debe catalogarse si se persiste |
| Tipo de cliente | array en componente | No | label usado como valor | `TipoCliente` también está en modelo |
| Estados | literales/types | No | clave / label en métodos | No existe un único catálogo transversal |

Duplicaciones relevantes: `COMPLEMENTOS_MOCK` vs `PRODUCTOS_ADICIONALES_MOCK`, opciones de pantufla dentro del HTML, talla mascota dentro del HTML, estados de pedido y estados de encaje definidos por mapas separados.

## 13. Estados

### Pedido

| Clave | Label | Severity | Uso |
|---|---|---|---|
| `borrador` | Borrador | `secondary` | tabla/detalle |
| `confirmado` | Confirmado | `info` | tabla/detalle |
| `en_proceso` | En proceso | `warn` | tabla/detalle |
| `listo` | Listo | `success` | tabla/detalle |
| `entregado` | Entregado | `success` | tabla/detalle; contador neutral |
| `cancelado` | Cancelado | `danger` | tabla/detalle; contador neutral |

El frontend permite cambio de estado desde un diálogo mock y cancelación desde confirmación. No hay máquina de transiciones ni permisos.

### Bata de encaje

`solicitada`/Solicitada/`info`, `ya_llego`/Ya llegó/`warn`, `lista`/Lista/`success`.

### Pedido visto desde Batas de encaje

El ViewModel traduce `PedidoEstatus` a:

- `entregado` → `entregado`.
- `en_proceso` → `en_produccion`.
- `listo` → `batas_normales_listas`.
- otros estados → `transito`.

Esto es una traducción visual, no un estado persistido independiente. El cambio desde la tabla Batas de encaje modifica el pedido padre mediante el servicio mock.

## 14. Contador de días

Archivo: `src/app/pages/pedidos/utils/evento-urgencia.ts`.

Reglas implementadas:

- Entregado → `Finalizado`, `secondary`.
- Cancelado → `Cancelado`, `secondary`.
- Hoy → `Hoy`, `danger`.
- Pasado → `Vencido X días`, `danger`.
- `< 10` → `danger`.
- `10..15` → `warn`.
- `> 15` → `success`.

La función normaliza fechas `YYYY-MM-DD` a fecha local, calcula claves UTC de día calendario y no utiliza diferencia de horas. Se usa en Pedidos y Batas de encaje. El valor `dias` no se almacena en modelos ni mocks; es derivado.

## 15. Archivos / referencias

El formulario acepta hasta dos archivos por pedido, cada uno de máximo 10 MB. Se aceptan imágenes y PDF.

Modelo: `ArchivoReferencia` con `id`, `file: File`, `nombre`, `tamano`.

El estado conserva objetos `File` en memoria. Al crear el pedido mock, Pedidos guarda solamente `nombre` y `tipo` en `PedidoReferencia`; no conserva binario, URL, base64 ni contenido.

No existe upload, object URL, persistencia local ni storage remoto. Para backend demo será necesario decidir si las referencias se guardan como archivos, URLs o metadatos con almacenamiento externo.

## 16. Documentos / PDF visual

No existe generación real de PDF. Existe preview visual reutilizable en `PedidoDocumentoPreviewComponent`.

Transformador: `src/app/pages/pedidos/utils/pedido-documento.ts`.

Tipos de documento:

- `cliente`: muestra precios.
- `produccion`: no muestra precios.

Alcances:

- `original`.
- `completo`.
- `adicionales`.

La vista separa `PEDIDO ORIGINAL` y cada `ADICIONAL PED-XXXX-ADNN`. La orden de producción usa clase visual con mayúsculas, cuadrícula/bordes fuertes y fecha de pedido; el documento cliente usa fecha de evento y resumen financiero.

Líneas documentales actuales incluyen batas, productos `bata_encaje`, complementos y productos de adicionales. El tipo de encaje se agrega en la observación de la línea. Las referencias son bloques visuales; no se incrustan imágenes reales.

Información requerida por backend/documentos: pedido, tipo de documento, alcance, IDs de adicionales seleccionados, cliente, fecha, ubicación, líneas, cantidades, color, talla, observaciones, referencias y valores financieros.

## 17. Cálculos financieros

### Formulario

- `subtotalBatas`: suma `precio` de cada bata.
- `subtotalProductos`: suma `cantidad * precio` de cada producto configurable.
- `subtotalComplementos`: suma `cantidad * precio` de complementos simples.
- `total`: `subtotalBatas + subtotalProductos`.
- `restante`: `total - anticipo`.

El `subtotalComplementos` del formulario se calcula, pero `total()` no lo suma. Esto es una inconsistencia funcional importante.

### Adicional

`PedidoAdicionalFormComponent.total()` suma `cantidad * precio` por producto. El valor se guarda en `PedidoAdicional.total`.

### Pedido mock

`Pedido.total`, `subtotalPersonalizaciones`, `subtotalComplementos` y `restante` vienen precalculados en el mock. Al crear desde Formulario, el servicio suma personalizaciones, complementos y productos configurables.

### Documento

- `totalOriginal`: suma líneas adaptadas del pedido.
- `totalAdicionales`: suma `PedidoAdicional.total` seleccionado.
- `totalDocumento`: depende del alcance.

Riesgo: el total persistido del pedido puede diferir de la suma documental porque diferentes proyecciones incluyen colecciones distintas y porque el pedido mock histórico tiene totales manuales.

## 18. Cantidad y precio

### Semántica observada

- Productos configurables y productos de adicionales: `precio` funciona como precio unitario; el subtotal de línea es `cantidad * precio`.
- Bata/personalización: no tiene cantidad explícita; cada card representa una unidad y `precio` es precio de esa unidad.
- Complemento simple: `cantidad * precio`.
- `PedidoAdicional.total`: subtotal total del adicional, no unitario.
- `Pedido.total`: total del pedido, no precio unitario.

### Hallazgo

La semántica es mayormente inferible, pero no está expresada con nombres como `precioUnitario`/`subtotal`. Además, los totales mock no siempre son reconstruibles de forma confiable con las colecciones actuales. Este punto debe resolverse antes del diseño de BD.

## 19. Servicios mock

### `FormularioCatalogosService`

Archivo: `src/app/pages/formulario/services/formulario-catalogos.service.ts`.

Métodos: `getClientes`, `getColores`, `getTallas`, `getTiposEncaje`, `getColoresBordado`, `getTipografias`, `getComplementos`, `getProductosAdicionales`, `getProveedores`, `getProveedorSugerido`, `agregarCliente`.

Retorna `Observable` basados en `of()`; no hay HTTP. Futuro backend: endpoints de lectura de catálogos y, eventualmente, alta/gestión de clientes.

### `FormularioStateService`

Mantiene un `signal<FormularioPedido>` en memoria. Expone `pedido`, `actualizar` y `reiniciar`. No persiste refresh ni sesión.

### `PedidosService`

Mantiene `signal<Pedido[]>` inicializado desde `PEDIDOS_MOCK`.

Métodos relevantes:

- `getPedidos()` — Observable de colección.
- `getPedidoById(id)` — Observable de detalle.
- `crearPedidoDesdeFormularioMock(formulario)` — crea y agrega pedido en memoria.
- `actualizarEstatusMock(id, estatus)` — mutación de estado del pedido.
- `actualizarEstatusProductoMock(id, tipo, index, estatus)` — estado de proveedor de productos originales.
- `getAdicionales(pedidoId)`.
- `getAdicionalById(pedidoId, adicionalId)`.
- `crearAdicionalMock(pedidoId, adicional)`.
- `actualizarAdicionalMock(pedidoId, adicional)`.
- `eliminarAdicionalMock(pedidoId, adicionalId)`.
- `actualizarProductoAdicionalMock(pedidoId, productoId, cambios)`.
- `actualizarProductoAdicionalEnAdicionalMock(pedidoId, adicionalId, productoId, cambios)`.

Futuro backend: CRUD de pedidos, cambios de estatus, productos, adicionales y seguimiento de proveedor.

### `BatasEncajeService`

Es una fachada sobre `PedidosService`. Deriva ViewModels y actualiza el producto fuente original o el producto de adicional. No usa HttpClient.

## 20. Relaciones detectadas

```text
Cliente recurrente (opcional)
        ↓ snapshot/selección
Formulario de pedido
        ↓ crear mock
Pedido 1 ─── N productos originales
Pedido 1 ─── N PedidoAdicional
PedidoAdicional 1 ─── N productos
Pedido 1 ─── N referencias
Producto N ─── 1 Proveedor
Pedido/producto bata_encaje
        ↓ adaptador
Batas de encaje (seguimiento)
Pedido ─── documentos cliente/producción
```

Cardinalidades conceptuales exigidas por el frontend:

- Un cliente puede sugerirse para muchos pedidos.
- Un pedido tiene cero o muchos adicionales.
- Un adicional pertenece a un solo pedido.
- Un pedido tiene productos originales.
- Un adicional tiene productos propios.
- Un producto puede tener un proveedor asignado.
- Una bata de encaje de seguimiento pertenece a un producto y a un pedido; opcionalmente a un adicional.

## 21. Datos persistentes vs derivados

### Derivados; no deberían persistirse como fuente primaria

- Días restantes.
- Severidad/color del contador.
- Mes visual del evento.
- KPIs de Batas de encaje.
- Cantidades agregadas de batas/productos.
- Subtotales y restante, si se calculan consistentemente desde líneas.
- Estado visual del pedido en Batas de encaje (`transito`, `en_produccion`, etc.).
- Folio visible derivable de un pedido y secuencia, aunque el folio final debe tener una estrategia de unicidad.
- Progreso recibido/total por proveedor.
- Etiquetas legibles de catálogos.

### Persistencia esencial para demo

- Pedido y folio.
- Datos capturados del cliente/pedido.
- Productos originales y sus configuraciones.
- Productos de adicionales.
- Relación pedido-adicional.
- Estados de pedido, proveedor y bata de encaje.
- `proveedorId`.
- Precios unitarios, cantidades y observaciones.
- Referencias/metadatos de archivo.

### Puede esperar para una primera demo

- Historial/auditoría de cambios.
- Notificaciones.
- Generación real de PDF.
- Autenticación y permisos.
- Eliminación física de archivos.
- Catálogo administrativo editable.

## 22. Operaciones requeridas por backend

### Pedidos

- Crear pedido.
- Listar pedidos con filtros básicos.
- Obtener detalle.
- Editar datos del pedido.
- Cambiar estatus.
- Consultar líneas y referencias.

### Productos

- Crear/editar/eliminar producto original.
- Actualizar estatus de proveedor.
- Consultar productos por pedido.

### Adicionales

- Listar por pedido.
- Crear adicional.
- Obtener adicional.
- Editar productos/observaciones.
- Eliminar o cancelar adicional, según regla de negocio futura.

### Batas de encaje

- Listar batas derivadas con filtros.
- Actualizar tipo de encaje del producto fuente.
- Actualizar estatus de bata del producto fuente.
- Consultar detalle con pedido/adicional de origen.
- Cambiar estado del pedido padre solo si negocio lo autoriza.

### Catálogos

- Listar clientes recurrentes.
- Listar colores, colores de bordado, tallas, tipos de encaje, tipografías y proveedores.
- Listar tipos de producto, estados y opciones específicas.

### Archivos/documentos

- Subir/consultar/eliminar referencias, si se decide persistirlas.
- Obtener datos necesarios para generar documento cliente/producción.

## 23. Requerimientos mínimos de BD demo

### Esencial

- `clientes` o equivalente para recurrentes.
- `pedidos`.
- Una representación de productos de pedido que soporte campos comunes y específicos.
- `pedido_adicionales`.
- Productos de adicional.
- `proveedores`.
- Catálogos mínimos: colores, tallas, tipos de encaje, tipos de producto y estados.
- Referencias de pedido/metadatos.

### Opcional

- Historial de estados.
- Catálogo editable de pantuflas y tallas mascota.
- Auditoría.
- Entidad de documentos generados.
- Tabla de archivos con integración de storage.

Esto es inventario preliminar, no un esquema final ni SQL.

## 24. Requerimientos mínimos backend demo

### `PedidosModule`

Responsable de pedidos, detalle, productos y estado padre.

### `CatalogosModule`

Responsable de opciones usadas por el formulario y seguimiento.

### `ClientesModule`

Responsable del catálogo recurrente y, si se decide, clientes capturados.

### `ProveedoresModule`

Responsable de proveedores y estados de abastecimiento.

### `AdicionalesModule`

Responsable de la relación 1:N con pedidos y sus productos.

### `BatasEncajeModule`

Puede ser una consulta/fachada sobre productos de pedidos, no una tabla duplicada de batas. Debe exponer seguimiento y mutaciones del producto fuente.

### `UploadsModule` — opcional demo

Solo si se decide reemplazar los `File` locales por almacenamiento real.

## 25. Contratos conceptuales

### Crear pedido

```ts
{
  clienteId?: string | null;
  clienteNombre: string;
  fechaEvento: string;
  ubicacion: string;
  terminacionContacto: string;
  tipoCliente: 'Novia' | 'Quinceañera' | 'Negocio' | 'Otro';
  tipoClienteOtro?: string;
  anticipo: number;
  personalizaciones: PersonalizacionPedidoRequest[];
  productos: ProductoPedidoRequest[];
  referencias?: ReferenciaRequest[];
  tipografiaId: string;
  dualTexto: string;
}
```

### Producto de pedido

```ts
{
  tipo: 'bata_encaje' | 'toalla' | 'panuelo' | 'panuelo_mascota' | 'pantuflas' | 'playera_hombre' | 'pantalon';
  cantidad: number;
  precioUnitario: number;
  colorId?: string | null;
  tallaId?: string | null;
  tipoEncajeId?: string | null;
  texto?: string;
  observaciones?: string;
  proveedorId?: string | null;
  estatusBataEncaje?: 'solicitada' | 'ya_llego' | 'lista';
}
```

### Crear adicional

```ts
{
  pedidoId: string;
  observaciones?: string;
  productos: ProductoAdicionalRequest[];
}
```

### Seguimiento de bata

```ts
{
  productoId: string;
  pedidoId: string;
  adicionalId?: string | null;
  tipoEncajeId: string;
  estatusBataEncaje: 'solicitada' | 'ya_llego' | 'lista';
}
```

Campos inciertos que deben confirmarse antes de DTOs finales: si el pedido guarda snapshot o relación al cliente, si precio será siempre unitario, si las referencias serán URL o archivos, y si los estados de seguimiento deben tener historial.

## 26. Dependencias entre módulos

```text
Catálogos ───────────────┐
Clientes recurrentes ────┼──> Formulario
Proveedores ─────────────┘       │
                                 ▼
                              Pedido
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
             Adicionales   Documentos     Proveedores
                 │
                 ▼
       Productos bata_encaje
                 │
                 ▼
          Batas de encaje
```

## 27. Fuentes de verdad y duplicaciones

### Fuente conceptual recomendada

- Pedido: fuente del estado y datos del pedido.
- Producto de pedido: fuente de precio, cantidad, color, talla, proveedor y tipo de encaje.
- Producto de adicional: fuente equivalente dentro del agregado adicional.
- Batas de encaje: únicamente ViewModel derivado.
- Catálogos: servicio/catálogos, no valores copiados en módulos.

### Duplicaciones actuales

- `PedidoPersonalizacion` y `PersonalizacionBata` representan batas con nombres/tipos distintos.
- `PedidoComplemento`, `ComplementoPedido`, `ProductoAdicionalPedido` y `PedidoAdicionalProducto` son estructuras cercanas pero no equivalentes.
- `COMPLEMENTOS_MOCK` y `PRODUCTOS_ADICIONALES_MOCK` tienen productos superpuestos.
- Estados visuales de pedido/seguimiento se traducen mediante mapas distintos.
- Batas de encaje tiene modelo ViewModel propio, aunque la fuente ya es `PedidosService`; esto no es duplicación de persistencia, pero sí duplicación de contrato.
- El transformador documental convierte IDs a labels de forma parcial mediante `etiquetaId`, no mediante el catálogo oficial.

## 28. Inconsistencias

1. `FormularioPedido.complementos` y `productosAdicionales` coexisten; el total principal no incluye siempre ambos.
2. `Pedido` tiene `cantidadBatas`/`cantidadComplementos` persistidos aunque se pueden derivar.
3. `Pedido.total`, `subtotalPersonalizaciones`, `subtotalComplementos` y `restante` son valores persistidos en mocks y también recalculados en otros puntos.
4. `precio` no tiene semántica explícita en el nombre.
5. `TALLAS_MOCK` no contiene `G`, pero existen ejemplos/datos que usan `G`.
6. Formulario usa IDs de catálogo; Pedido mock usa strings visibles; Batas de encaje recibe ambos formatos.
7. `TipoBata` conserva `encaje` legacy mientras el flujo actual usa `bata_encaje` como producto.
8. El catálogo de tipos de encaje aparece en `formulario.mock.ts` y también existe `TIPOS_ENCAJE`/labels en `bata-encaje.model.ts`.
9. Pantuflas y talla de mascota están definidos en HTML, no en catálogos/servicios.
10. El estado `estatusPedido` de Batas de encaje es un ViewModel traducido y no un campo propio de la bata.
11. En adicionales se almacenan color/talla como texto; en productos originales como IDs.
12. La edición de terminación/fecha/precio de Batas de encaje quedó parcialmente preparada, pero terminación y fecha pertenecen al pedido; la recomendación actual es no editarlas desde ese módulo.
13. `actualizarEstatusProductoMock` opera por índice y tipo, una interfaz frágil para un backend que necesitará IDs estables.
14. No existe historial de cambios de estados.
15. La aplicación configura HttpClient, pero ningún servicio funcional lo consume.

## 29. Hallazgos críticos antes de crear BD/backend

### CRÍTICO

- Resolver el agregado de productos: elegir si todos los productos vivirán en una colección común o mantener explícitamente personalizaciones/complementos separados.
- Definir semántica de `precio` como precio unitario y calcular subtotal por línea, salvo una decisión de negocio distinta.
- Corregir la fórmula funcional del total del formulario, que actualmente calcula `subtotalComplementos` pero no lo suma en `total()`.
- Definir el contrato estable de producto fuente para que Batas de encaje y Documentos no dependan de índices, strings o IDs inconsistentes.

### ALTO

- Unificar catálogos duplicados y resolver la talla `G` ausente.
- Decidir si `clienteId` es nullable con snapshot `clienteNombre` o si todos los pedidos deben referenciar un cliente.
- Definir persistencia de referencias y archivos.
- Definir si los estados de proveedor y bata necesitan historial.
- Aclarar si los adicionales afectan el total/restante del pedido padre o se mantienen financieramente separados.

### MEDIO

- Unificar estados y labels en catálogos o contratos compartidos.
- Reemplazar índices de producto por identificadores estables.
- Resolver transformación oficial de IDs de catálogo a labels.
- Separar DTO de captura, DTO persistido y ViewModel documental.

### BAJO

- Mover opciones de pantufla y talla de mascota fuera de templates.
- Eliminar tipos legacy como `TipoBata='encaje'` cuando ya no sean necesarios.
- Añadir pruebas unitarias de cálculo de fechas, totales y adaptadores.

## 30. Prioridad para hacer el demo funcional

1. Congelar contrato de pedido/producto y semántica financiera.
2. Exponer catálogos mínimos desde backend.
3. Persistir pedidos y productos originales.
4. Persistir adicionales y sus productos.
5. Persistir proveedores y estados actuales.
6. Implementar consulta derivada de Batas de encaje y mutaciones sobre el producto fuente.
7. Persistir metadatos de referencias y decidir storage.
8. Conectar preview/documentos; la generación PDF real puede esperar.
9. Añadir pruebas de contratos, filtros, estados, cálculos y relaciones.

## 31. Qué no hace falta para el demo inicial

Según el frontend actual, puede permanecer simulado sin bloquear el flujo:

- Descarga PDF real.
- Impresión real.
- Storage definitivo de imágenes/PDF.
- Autenticación.
- Historial de auditoría.
- Notificaciones.
- Administración completa de catálogos.

Sí bloquean una demo persistente: pedidos, productos, adicionales, estados, proveedores y al menos metadatos de referencias.

## 32. Archivos revisados

### Routing/configuración/layout

- `src/app.routes.ts`
- `src/app.config.ts`
- `src/main.ts`
- `src/app/layout/component/app.layout.ts`
- `src/app/layout/component/app.menu.ts`
- `src/app/layout/component/app.menuitem.ts`
- `src/app/layout/component/app.sidebar.ts`
- `src/app/layout/component/app.topbar.ts`
- `src/app/layout/service/layout.service.ts`

### Formulario

- `src/app/pages/formulario/formulario.component.ts`
- `src/app/pages/formulario/formulario.component.html`
- `src/app/pages/formulario/formulario.component.scss`
- `src/app/pages/formulario/formulario.routes.ts`
- `src/app/pages/formulario/models/formulario.model.ts`
- `src/app/pages/formulario/data/formulario.mock.ts`
- `src/app/pages/formulario/services/formulario-catalogos.service.ts`
- `src/app/pages/formulario/services/formulario-state.service.ts`

### Pedidos/adicionales

- `src/app/pages/pedidos/pedidos.component.ts/html/scss`
- `src/app/pages/pedidos/pedido-detalle.component.ts/html/scss`
- `src/app/pages/pedidos/pedidos.routes.ts`
- `src/app/pages/pedidos/models/pedido.model.ts`
- `src/app/pages/pedidos/data/pedidos.mock.ts`
- `src/app/pages/pedidos/services/pedidos.service.ts`
- `src/app/pages/pedidos/components/pedido-adicional-form.component.ts/html/scss`

### Batas de encaje

- `src/app/pages/batas-encaje/batas-encaje.component.ts/html/scss`
- `src/app/pages/batas-encaje/batas-encaje.routes.ts`
- `src/app/pages/batas-encaje/models/bata-encaje.model.ts`
- `src/app/pages/batas-encaje/services/batas-encaje.service.ts`

### Documentos/utils

- `src/app/pages/pedidos/components/pedido-documento-preview.component.ts/html/scss`
- `src/app/pages/pedidos/utils/pedido-documento.ts`
- `src/app/pages/pedidos/utils/evento-urgencia.ts`

### Proyecto

- `package.json`
- `src/app/pages/home/home.component.ts`
- `src/assets/styles.scss`
- archivos de layout SCSS bajo `src/assets/layout/`

## 33. Estado de la auditoría

- No se modificaron archivos de código.
- No se instalaron paquetes.
- No se crearon endpoints ni backend.
- No se eliminaron mocks funcionales; únicamente se constató que el módulo Batas de encaje ya no tiene un mock independiente activo y deriva de Pedidos.
- `git status` no pudo ejecutarse porque `/Users/hecvas/Desktop/Front Blanco bride` no es un repositorio Git: `fatal: not a git repository`.

Documento generado en:

`/Users/hecvas/Desktop/Front Blanco bride/AUDITORIA_FRONTEND_PARA_BACKEND_DEMO.md`

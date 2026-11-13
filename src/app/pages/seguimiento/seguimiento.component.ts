import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CdkDragDrop, CdkDragSortEvent, CdkDragStart, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { FormularioCatalogosService } from '../formulario/services/formulario-catalogos.service';
import { CatalogoOpcion } from '../formulario/models/formulario.model';
import { BatasEncajeService } from '../batas-encaje/services/batas-encaje.service';
import { BataEncaje, EstatusEncaje, EstatusPedidoEncaje } from '../batas-encaje/models/bata-encaje.model';
import { Pedido, PedidoEstatus } from '../pedidos/models/pedido.model';
import { PedidosService } from '../pedidos/services/pedidos.service';
import { getApiErrorMessage } from '../../core/api/api-error';
import { getUrgenciaEvento } from '../pedidos/utils/evento-urgencia';

type VistaActiva = 'pedidos' | 'batas';
type TablaId = VistaActiva;
type Densidad = 'comoda' | 'normal' | 'compacta';

interface TableColumnConfig {
    id: string;
    field: string;
    header: string;
    visible: boolean;
    order: number;
    required?: boolean;
    width?: string;
}

interface ColumnDragState {
    tabla: TablaId;
    id: string;
    startIndex: number;
    currentIndex: number;
    width: number;
}

const PEDIDOS_DEFAULT: TableColumnConfig[] = [
    { id: 'folio', field: 'folio', header: 'Folio', visible: true, order: 0, required: true },
    { id: 'urgente', field: 'esUrgente', header: 'Urgencia', visible: true, order: 1 },
    { id: 'cliente', field: 'clienteNombre', header: 'Cliente', visible: true, order: 2, required: true },
    { id: 'terminacion', field: 'terminacionContacto', header: 'Terminación', visible: true, order: 3 },
    { id: 'fecha', field: 'fechaEvento', header: 'Fecha del evento', visible: true, order: 4 },
    { id: 'faltan', field: 'fechaEvento', header: 'Faltan', visible: true, order: 5 },
    { id: 'batas', field: 'cantidadBatas', header: 'Batas', visible: true, order: 6 },
    { id: 'complementos', field: 'cantidadComplementos', header: 'Complementos', visible: true, order: 7 },
    { id: 'total', field: 'total', header: 'Total', visible: true, order: 8 },
    { id: 'anticipo', field: 'anticipo', header: 'Anticipo', visible: false, order: 9 },
    { id: 'restante', field: 'restante', header: 'Restante', visible: false, order: 10 },
    { id: 'estatus', field: 'estatus', header: 'Estatus', visible: true, order: 11, required: true },
    { id: 'acciones', field: 'acciones', header: 'Acciones', visible: true, order: 12, required: true }
];

const BATAS_DEFAULT: TableColumnConfig[] = [
    { id: 'pedido', field: 'pedidoFolio', header: 'Pedido', visible: true, order: 0, required: true },
    { id: 'cliente', field: 'clienteNombre', header: 'Cliente', visible: true, order: 1 },
    { id: 'terminacion', field: 'terminacionTelefono', header: 'Terminación', visible: true, order: 2 },
    { id: 'tipo', field: 'tipoEncajeId', header: 'Tipo de encaje', visible: true, order: 3 },
    { id: 'talla', field: 'talla', header: 'Talla', visible: true, order: 4 },
    { id: 'estatusBata', field: 'estatusEncaje', header: 'Estatus bata', visible: true, order: 5, required: true },
    { id: 'seguimiento', field: 'estatusPedido', header: 'Seguimiento encaje', visible: true, order: 6 },
    { id: 'estatusPedido', field: 'estatusPedidoPrincipal', header: 'Estatus pedido', visible: true, order: 7 },
    { id: 'fecha', field: 'fechaEvento', header: 'Fecha evento', visible: true, order: 8 },
    { id: 'faltan', field: 'fechaEvento', header: 'Faltan', visible: false, order: 9 },
    { id: 'precio', field: 'precio', header: 'Precio', visible: false, order: 10 },
    { id: 'acciones', field: 'acciones', header: 'Acciones', visible: true, order: 11, required: true }
];

const VISTA_OPTIONS = [{ label: 'Pedidos', value: 'pedidos' as const }, { label: 'Batas de encaje', value: 'batas' as const }];
const DENSIDAD_OPTIONS = [{ label: 'Cómoda', value: 'comoda' as const }, { label: 'Normal', value: 'normal' as const }, { label: 'Compacta', value: 'compacta' as const }];

@Component({
    selector: 'app-seguimiento',
    standalone: true,
    imports: [CommonModule, DatePickerModule, DragDropModule, FormsModule, RouterModule, ButtonModule, InputTextModule, SelectModule, SelectButtonModule, TableModule, TagModule, ToastModule],
    providers: [MessageService],
    templateUrl: './seguimiento.component.html',
    styleUrl: './seguimiento.component.scss'
})
export class SeguimientoComponent {
    private readonly pedidosService = inject(PedidosService);
    private readonly batasService = inject(BatasEncajeService);
    private readonly catalogos = inject(FormularioCatalogosService);
    private readonly messages = inject(MessageService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly storagePrefix = 'blancoBride.seguimiento';

    readonly vistaActiva = signal<VistaActiva>(this.leerVista());
    readonly pedidos = signal<Pedido[]>([]);
    readonly batas = signal<BataEncaje[]>([]);
    readonly pedidosFiltrados = signal<Pedido[]>([]);
    readonly batasFiltradas = signal<BataEncaje[]>([]);
    readonly pedidosColumnas = signal<TableColumnConfig[]>(this.leerColumnas('pedidos', PEDIDOS_DEFAULT));
    readonly batasColumnas = signal<TableColumnConfig[]>(this.leerColumnas('batas', BATAS_DEFAULT));
    readonly pedidosDensidad = signal<Densidad>(this.leerDensidad('pedidos'));
    readonly batasDensidad = signal<Densidad>(this.leerDensidad('batas'));
    readonly columnasAbiertas = signal<TablaId | null>(null);
    readonly vistaOptions = VISTA_OPTIONS;
    readonly densidadOptions = DENSIDAD_OPTIONS;
    readonly cargando = signal(true);
    readonly dragState = signal<ColumnDragState | null>(null);
    readonly resumenPedidos = computed(() => {
        const pedidos = this.pedidosFiltrados();
        return {
            total: pedidos.length,
            enProduccion: pedidos.filter((pedido) => pedido.estatus === 'EN_PRODUCCION').length,
            salieronDeProduccion: pedidos.filter((pedido) => pedido.estatus === 'SALIO_DE_PRODUCCION').length,
            entregados: pedidos.filter((pedido) => pedido.estatus === 'ENTREGADO').length
        };
    });
    readonly resumenBatas = computed(() => {
        const batas = this.batasFiltradas();
        return {
            total: batas.length,
            solicitadas: batas.filter((bata) => bata.estatusEncaje === 'SOLICITADA').length,
            yaLlegaron: batas.filter((bata) => bata.estatusEncaje === 'YA_LLEGO').length,
            listas: batas.filter((bata) => bata.estatusEncaje === 'LISTA').length
        };
    });
    pedidosPrimero = 0;

    busquedaPedidos = '';
    estatusPedidos: PedidoEstatus | '' = '';
    urgenciaPedidos: 'todos' | 'urgentes' | 'normales' = 'todos';
    rangoFechaPedidos: Date[] | null = null;
    busquedaBatas = '';
    tipoBata: string | '' = '';
    estatusBata: EstatusEncaje | '' = '';
    tallaBata = '';
    tiposEncaje: Array<{ label: string; value: string }> = [];
    estatusEncaje: Array<{ label: string; value: string }> = [];
    tallas: CatalogoOpcion[] = [];
    estatusPedidoEncaje: Array<{ label: string; value: string }> = [];
    estatusPedido: Array<{ label: string; value: string }> = [];
    private estatusLabels: Record<string, string> = {};
    private estatusSeverities: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {};
    private draggedColumn: { table: TablaId; id: string } | null = null;
    readonly anchoPreview = signal<number | null>(null);

    constructor() {
        this.catalogos.getEstatusPedido().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
            this.estatusPedido = items.map((item) => ({ label: item.nombre, value: item.clave }));
            this.estatusLabels = Object.fromEntries(items.map((item) => [item.clave, item.nombre]));
            this.estatusSeverities = Object.fromEntries(items.map((item) => [item.clave, item.severity ?? 'secondary']));
        });
        this.catalogos.getTiposEncaje().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => (this.tiposEncaje = items.map((item) => ({ label: item.nombre, value: item.id }))));
        this.catalogos.getEstatusBataEncaje().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
            this.estatusEncaje = items.map((item) => ({ label: item.nombre, value: item.clave }));
        });
        this.catalogos.getTallas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => (this.tallas = items));
        this.estatusPedidoEncaje = [
            { label: 'En producción', value: 'EN_PRODUCCION' },
            { label: 'Batas normales listas', value: 'BATAS_NORMALES_LISTAS' }
        ];
        this.cargarDatos();
    }

    cargarDatos(): void {
        this.cargando.set(true);
        this.pedidosService.getPedidos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (items) => { this.pedidos.set(items); this.aplicarFiltrosPedidos(); this.cargando.set(false); },
            error: (error: unknown) => { this.messages.add({ severity: 'error', summary: 'No se pudieron cargar los pedidos', detail: getApiErrorMessage(error) }); this.cargando.set(false); }
        });
        this.batasService.getBatasEncaje().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (items) => { this.batas.set(items); this.aplicarFiltrosBatas(); },
            error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'No se pudieron cargar las batas', detail: getApiErrorMessage(error) })
        });
    }

    cambiarVista(vista: VistaActiva): void {
        this.vistaActiva.set(vista);
        localStorage.setItem(`${this.storagePrefix}.vistaActiva`, vista);
    }
    columnas(tabla: TablaId): TableColumnConfig[] {
        return (tabla === 'pedidos' ? this.pedidosColumnas() : this.batasColumnas()).slice().sort((a, b) => a.order - b.order);
    }
    columnasVisibles(tabla: TablaId): TableColumnConfig[] {
        return this.columnas(tabla).filter((columna) => columna.visible);
    }
    togglePanel(tabla: TablaId): void { this.columnasAbiertas.update((actual) => (actual === tabla ? null : tabla)); }
    toggleColumna(tabla: TablaId, id: string, visible: boolean): void {
        this.actualizarColumnas(tabla, (columnas) => columnas.map((columna) => columna.id === id && !columna.required ? { ...columna, visible } : columna));
    }
    iniciarDrag(tabla: TablaId, id: string): void { this.draggedColumn = { table: tabla, id }; }
    permitirDrop(event: DragEvent): void { event.preventDefault(); }
    soltarColumna(tabla: TablaId, destinoId: string): void {
        if (!this.draggedColumn || this.draggedColumn.table !== tabla || this.draggedColumn.id === destinoId) return;
        const ordenadas = this.columnas(tabla);
        const origen = ordenadas.findIndex((columna) => columna.id === this.draggedColumn?.id);
        const destino = ordenadas.findIndex((columna) => columna.id === destinoId);
        if (origen < 0 || destino < 0) return;
        const [movida] = ordenadas.splice(origen, 1);
        ordenadas.splice(destino, 0, movida);
        this.actualizarColumnas(tabla, () => ordenadas.map((columna, order) => ({ ...columna, order })));
        this.draggedColumn = null;
    }
    soltarHeader(tabla: TablaId, event: CdkDragDrop<TableColumnConfig[]>): void {
        if (event.previousIndex === event.currentIndex) return;
        const visibles = this.columnasVisibles(tabla);
        moveItemInArray(visibles, event.previousIndex, event.currentIndex);
        let indiceVisible = 0;
        const completa = this.columnas(tabla).map((columna) => columna.visible ? visibles[indiceVisible++] : columna);
        this.actualizarColumnas(tabla, () => completa.map((columna, order) => ({ ...columna, order })));
        this.dragState.set(null);
    }
    iniciarDragHeader(event: CdkDragStart<TableColumnConfig>, tabla: TablaId): void {
        const elemento = event.source.element.nativeElement as HTMLElement;
        const visibles = this.columnasVisibles(tabla);
        const id = event.source.data.id;
        const startIndex = visibles.findIndex((columna) => columna.id === id);
        const width = elemento.getBoundingClientRect().width;
        this.anchoPreview.set(width);
        this.dragState.set({ tabla, id, startIndex, currentIndex: startIndex, width });
    }
    actualizarIndiceDrag(tabla: TablaId, event: CdkDragSortEvent<TableColumnConfig[]>): void {
        const actual = this.dragState();
        if (!actual || actual.tabla !== tabla || actual.currentIndex === event.currentIndex) return;
        this.dragState.set({ ...actual, currentIndex: event.currentIndex });
    }
    finalizarDragHeader(): void {
        this.anchoPreview.set(null);
        this.dragState.set(null);
    }
    getColumnDragTransform(tabla: TablaId, id: string): string | null {
        const drag = this.dragState();
        if (!drag || drag.tabla !== tabla || drag.startIndex < 0 || drag.currentIndex < 0) return null;
        const index = this.columnasVisibles(tabla).findIndex((columna) => columna.id === id);
        if (index < 0 || id === drag.id || drag.startIndex === drag.currentIndex) return null;
        if (drag.startIndex < drag.currentIndex && index > drag.startIndex && index <= drag.currentIndex) return `translateX(-${drag.width}px)`;
        if (drag.startIndex > drag.currentIndex && index >= drag.currentIndex && index < drag.startIndex) return `translateX(${drag.width}px)`;
        return null;
    }
    previewItems(tabla: TablaId): Array<Pedido | BataEncaje> {
        const limite = tabla === 'pedidos' ? 8 : 10;
        return (tabla === 'pedidos' ? this.pedidosFiltrados() : this.batasFiltradas()).slice(0, limite);
    }
    previewText(tabla: TablaId, columna: TableColumnConfig, item: Pedido | BataEncaje): string {
        if (tabla === 'pedidos') {
            const pedido = item as Pedido;
            switch (columna.id) {
                case 'folio': return pedido.folio;
                case 'urgente': return pedido.esUrgente ? 'URGENTE' : '—';
                case 'cliente': return pedido.clienteNombre || '—';
                case 'terminacion': return pedido.terminacionContacto || '—';
                case 'fecha': return this.fecha(pedido.fechaEvento);
                case 'faltan': return this.urgencia(pedido).texto;
                case 'batas': return String(pedido.cantidadBatas);
                case 'complementos': return String(pedido.cantidadComplementos);
                case 'total': return this.precio(pedido.total);
                case 'anticipo': return this.precio(pedido.anticipo);
                case 'restante': return this.precio(pedido.restante);
                case 'estatus': return this.formatoEstatus(pedido.estatus);
                case 'acciones': return 'Ver / editar';
            }
        } else {
            const bata = item as BataEncaje;
            switch (columna.id) {
                case 'pedido': return bata.pedidoFolio;
                case 'cliente': return bata.clienteNombre || '—';
                case 'terminacion': return bata.terminacionTelefono || '—';
                case 'tipo': return this.etiquetaTipo(bata.tipoEncajeId);
                case 'talla': return bata.talla || '—';
                case 'estatusBata': return this.etiquetaEstatusBata(bata.estatusEncaje);
                case 'seguimiento': return this.etiquetaSeguimiento(bata.estatusPedido);
                case 'estatusPedido': return this.etiquetaPedido(bata.estatusPedidoPrincipal);
                case 'fecha': return this.fechaBata(bata.fechaEvento);
                case 'faltan': return bata.fechaEvento ? 'Pendiente' : '—';
                case 'precio': return this.precio(bata.precio);
                case 'acciones': return 'Ver';
            }
        }
        return '—';
    }
    previewEsBadge(tabla: TablaId, columna: TableColumnConfig): boolean {
        return tabla === 'pedidos'
            ? ['urgente', 'faltan', 'estatus'].includes(columna.id)
            : ['estatusBata', 'seguimiento', 'estatusPedido', 'faltan'].includes(columna.id);
    }
    previewSeverity(tabla: TablaId, columna: TableColumnConfig, item: Pedido | BataEncaje): string {
        if (tabla === 'pedidos') {
            const pedido = item as Pedido;
            if (columna.id === 'urgente') return pedido.esUrgente ? 'danger' : 'secondary';
            if (columna.id === 'faltan') return this.urgencia(pedido).severity;
            if (columna.id === 'estatus') return this.severidad(pedido.estatus);
        } else {
            const bata = item as BataEncaje;
            if (columna.id === 'estatusBata') return this.severidadBata(bata.estatusEncaje);
            if (columna.id === 'seguimiento') return this.severidadSeguimiento(bata.estatusPedido);
            if (columna.id === 'estatusPedido') return this.severidadPedido(bata.estatusPedidoPrincipal);
        }
        return 'secondary';
    }
    restablecer(tabla: TablaId): void {
        if (tabla === 'pedidos') {
            this.busquedaPedidos = '';
            this.estatusPedidos = '';
            this.urgenciaPedidos = 'todos';
            this.rangoFechaPedidos = null;
            this.aplicarFiltrosPedidos();
        }
        this.actualizarColumnas(tabla, () => this.clonarDefaults(tabla === 'pedidos' ? PEDIDOS_DEFAULT : BATAS_DEFAULT));
        this.actualizarDensidad(tabla, 'normal');
    }
    actualizarDensidad(tabla: TablaId, densidad: Densidad): void {
        if (tabla === 'pedidos') this.pedidosDensidad.set(densidad); else this.batasDensidad.set(densidad);
        localStorage.setItem(`${this.storagePrefix}.${tabla}.densidad`, densidad);
    }
    densidad(tabla: TablaId): Densidad { return tabla === 'pedidos' ? this.pedidosDensidad() : this.batasDensidad(); }
    aplicarFiltrosPedidos(): void {
        const query = this.busquedaPedidos.trim().toLowerCase();
        const [inicio, fin] = this.rangoFechaPedidos ?? [];
        this.pedidosPrimero = 0;
        this.pedidosFiltrados.set(this.pedidos().filter((pedido) => {
            const texto = !query || pedido.folio.toLowerCase().includes(query) || pedido.clienteNombre.toLowerCase().includes(query);
            const estatus = !this.estatusPedidos || pedido.estatus === this.estatusPedidos;
            const urgente = this.urgenciaPedidos === 'todos' || (this.urgenciaPedidos === 'urgentes' ? pedido.esUrgente : !pedido.esUrgente);
            const fecha = this.calendario(pedido.fechaEvento);
            const coincideFecha = !inicio || (fecha >= this.calendario(inicio) && (!fin || fecha <= this.calendario(fin)));
            return texto && estatus && urgente && coincideFecha;
        }));
    }
    aplicarFiltrosBatas(): void {
        const query = this.busquedaBatas.trim().toLowerCase();
        this.batasFiltradas.set(this.batas().filter((bata) => (!query || bata.pedidoFolio.toLowerCase().includes(query) || bata.terminacionTelefono.includes(query)) && (!this.tipoBata || bata.tipoEncajeId === this.tipoBata) && (!this.estatusBata || bata.estatusEncaje === this.estatusBata) && (!this.tallaBata || bata.talla === this.tallaBata)));
    }
    formatoEstatus(estatus: PedidoEstatus): string { return this.estatusLabels[estatus] ?? estatus; }
    severidad(estatus: PedidoEstatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' { return this.estatusSeverities[estatus] ?? 'secondary'; }
    urgencia(pedido: Pedido) { return getUrgenciaEvento(pedido.fechaEvento, pedido.estatus); }
    etiquetaTipo(id: string): string { return this.tiposEncaje.find((item) => item.value === id)?.label ?? id; }
    etiquetaEstatusBata(value: EstatusEncaje): string { return this.estatusEncaje.find((item) => item.value === value)?.label ?? value; }
    severidadBata(value: EstatusEncaje): 'info' | 'warn' | 'success' | 'secondary' { return value === 'SIN_SOLICITAR' ? 'secondary' : value === 'SOLICITADA' ? 'info' : value === 'YA_LLEGO' ? 'warn' : value === 'EN_PRODUCCION' ? 'info' : 'success'; }
    etiquetaSeguimiento(value: EstatusPedidoEncaje): string { return this.estatusPedidoEncaje.find((item) => item.value === value)?.label ?? value; }
    severidadSeguimiento(value: EstatusPedidoEncaje): 'success' | 'warn' | 'info' | 'secondary' { return value === 'BATAS_NORMALES_LISTAS' ? 'secondary' : 'info'; }
    etiquetaPedido(value: string | null | undefined): string { return this.estatusPedido.find((item) => item.value === value)?.label ?? value ?? '—'; }
    severidadPedido(value: string | null | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' { return value === 'ENTREGADO' ? 'success' : value === 'SITUACION' ? 'danger' : value === 'POR_LIQUIDAR' ? 'warn' : 'info'; }
    fecha(value: Date | string | null): string { return value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX') : '—'; }
    precio(value: number): string { return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }); }
    fechaBata(value: Date | string | null): string { return value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX') : '—'; }
    private calendario(value: Date | string): number {
        if (value instanceof Date) return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
        const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
        return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) ? Date.UTC(year, month - 1, day) : Number.NaN;
    }

    private actualizarColumnas(tabla: TablaId, actualizar: (columnas: TableColumnConfig[]) => TableColumnConfig[]): void {
        const siguiente = actualizar(this.columnas(tabla));
        if (tabla === 'pedidos') this.pedidosColumnas.set(siguiente); else this.batasColumnas.set(siguiente);
        localStorage.setItem(`${this.storagePrefix}.${tabla}.columnas`, JSON.stringify(siguiente));
    }
    private clonarDefaults(columnas: TableColumnConfig[]): TableColumnConfig[] { return columnas.map((columna) => ({ ...columna })); }
    private leerVista(): VistaActiva { const valor = localStorage.getItem(`${this.storagePrefix}.vistaActiva`); return valor === 'batas' ? 'batas' : 'pedidos'; }
    private leerDensidad(tabla: TablaId): Densidad { const valor = localStorage.getItem(`${this.storagePrefix}.${tabla}.densidad`); return valor === 'comoda' || valor === 'compacta' ? valor : 'normal'; }
    private leerColumnas(tabla: TablaId, defaults: TableColumnConfig[]): TableColumnConfig[] {
        try {
            const parsed = JSON.parse(localStorage.getItem(`${this.storagePrefix}.${tabla}.columnas`) ?? 'null') as TableColumnConfig[] | null;
            if (!Array.isArray(parsed) || parsed.length !== defaults.length || parsed.some((columna) => !defaults.some((base) => base.id === columna.id))) return this.clonarDefaults(defaults);
            const baseById = new Map(defaults.map((columna) => [columna.id, columna]));
            return parsed.map((columna, index) => ({ ...baseById.get(columna.id)!, ...columna, required: baseById.get(columna.id)!.required, order: index, visible: baseById.get(columna.id)!.required ? true : Boolean(columna.visible) }));
        } catch { return this.clonarDefaults(defaults); }
    }
}

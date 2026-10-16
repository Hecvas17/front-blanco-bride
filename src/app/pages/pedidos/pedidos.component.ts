import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { PedidoAdicionalFormComponent } from './components/pedido-adicional-form.component';
import { PedidoDocumentoPreviewComponent } from './components/pedido-documento-preview.component';
import { Pedido, PedidoAdicional, PedidoEstatus } from './models/pedido.model';
import { FormularioCatalogosService } from '../formulario/services/formulario-catalogos.service';
import { PedidosService } from './services/pedidos.service';
import { getUrgenciaEvento, UrgenciaEvento } from './utils/evento-urgencia';
import { PedidoDocumentoTipo } from './utils/pedido-documento';
import { getApiErrorMessage } from '../../core/api/api-error';

@Component({
    selector: 'app-pedidos',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        DatePickerModule,
        DialogModule,
        ConfirmDialogModule,
        InputTextModule,
        MenuModule,
        TableModule,
        TagModule,
        ToastModule,
        PedidoDocumentoPreviewComponent,
        PedidoAdicionalFormComponent
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './pedidos.component.html',
    styleUrl: './pedidos.component.scss'
})
export class PedidosComponent {
    private readonly service = inject(PedidosService);
    readonly router = inject(Router);
    private readonly messages = inject(MessageService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly catalogos = inject(FormularioCatalogosService);

    readonly pedidos = signal<Pedido[]>([]);
    readonly filtrados = signal<Pedido[]>([]);
    busqueda = '';
    estatusFiltro: PedidoEstatus | '' = '';
    tipoClienteFiltro = '';
    rangoFechas: Date[] | null = null;
    pedidoSeleccionado: Pedido | null = null;
    readonly mostrarDocumento = signal(false);
    tipoDocumento: PedidoDocumentoTipo = 'cliente';
    readonly mostrarAlcanceDocumento = signal(false);
    alcanceDocumento: 'original' | 'completo' | 'adicionales' = 'original';
    adicionalesSeleccionados: string[] = [];
    mostrarAdicionalForm = false;
    adicionalEditando?: PedidoAdicional;
    readonly mostrarAdicionales = signal(false);
    mostrarEstatus = false;
    nuevoEstatus: PedidoEstatus = 'confirmado';
    estatuses: PedidoEstatus[] = [];
    tiposCliente: string[] = [];
    private estatusLabels: Record<string, string> = {};
    private estatusSeverities: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {};
    readonly acciones: MenuItem[] = [
            { label: 'Ver detalle', icon: 'pi pi-eye', command: () => this.verDetalle() },
            { label: 'Editar pedido', icon: 'pi pi-pencil', command: () => this.editarPedido() },
            { label: 'Duplicar', icon: 'pi pi-copy', command: () => this.avisoMock('Duplicar pedido') },
            { separator: true },
            { label: 'Crear adicional', icon: 'pi pi-plus-circle', command: () => this.abrirAdicional() },
            { label: 'Ver adicionales', icon: 'pi pi-list', visible: false, command: () => this.abrirAdicionales() },
            { separator: true },
            { label: 'PDF para cliente', icon: 'pi pi-file-pdf', command: () => this.abrirDocumento('cliente') },
            { label: 'Orden de producción', icon: 'pi pi-file-edit', command: () => this.abrirDocumento('produccion') },
            { label: 'Cambiar estatus', icon: 'pi pi-sync', command: () => this.abrirCambioEstatus() },
            { separator: true },
            { label: 'Cancelar pedido', icon: 'pi pi-ban', command: () => this.confirmarCancelacion() }
        ];

    constructor() {
        this.catalogos
            .getEstatusPedido()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                this.estatuses = items.map((item) => item.clave as PedidoEstatus);
                this.estatusLabels = Object.fromEntries(items.map((item) => [item.clave, item.nombre]));
                this.estatusSeverities = Object.fromEntries(items.map((item) => [item.clave, item.severity ?? 'secondary']));
            });
        this.catalogos
            .getTiposCliente()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.tiposCliente = items.map((item) => item.nombre)));
        this.cargarPedidos();
    }

    cargarPedidos(): void {
        this.service
            .getPedidos()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (items) => {
                    this.pedidos.set(items);
                    this.aplicarFiltros();
                },
                error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'No se pudieron cargar los pedidos', detail: getApiErrorMessage(error) })
            });
    }

    aplicarFiltros(): void {
        const query = this.busqueda.trim().toLowerCase();
        const [inicio, fin] = this.rangoFechas ?? [];
        const resultado = this.pedidos().filter((pedido) => {
            const coincideTexto = !query || pedido.folio.toLowerCase().includes(query) || pedido.clienteNombre.toLowerCase().includes(query);
            const coincideEstatus = !this.estatusFiltro || pedido.estatus === this.estatusFiltro;
            const coincideTipo = !this.tipoClienteFiltro || pedido.tipoCliente === this.tipoClienteFiltro;
            const fecha = this.fecha(pedido.fechaEvento);
            const coincideFecha = !inicio || (fecha >= this.inicioDia(inicio) && (!fin || fecha <= this.finDia(fin)));
            return coincideTexto && coincideEstatus && coincideTipo && coincideFecha;
        });
        this.filtrados.set(resultado);
    }

    limpiarFiltros(): void {
        this.busqueda = '';
        this.estatusFiltro = '';
        this.tipoClienteFiltro = '';
        this.rangoFechas = null;
        this.aplicarFiltros();
    }
    totalPedidos(): number {
        return this.pedidos().length;
    }
    contarEstatus(estatus: PedidoEstatus): number {
        return this.pedidos().filter((pedido) => pedido.estatus === estatus).length;
    }
    formatoEstatus(estatus: PedidoEstatus): string {
        return this.estatusLabels[estatus] ?? estatus;
    }
    severidad(estatus: PedidoEstatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        return this.estatusSeverities[estatus] ?? 'secondary';
    }
    fecha(value: Date | string): Date {
        return value instanceof Date ? value : new Date(`${value}T12:00:00`);
    }
    urgenciaEvento(pedido: Pedido): UrgenciaEvento {
        return getUrgenciaEvento(pedido.fechaEvento, pedido.estatus);
    }
    inicioDia(value: Date): Date {
        const date = new Date(value);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    finDia(value: Date): Date {
        const date = new Date(value);
        date.setHours(23, 59, 59, 999);
        return date;
    }

    abrirAcciones(event: PointerEvent, pedido: Pedido, menu: Menu): void {
        event.preventDefault();
        event.stopPropagation();
        this.pedidoSeleccionado = pedido;
        this.acciones[5].visible = pedido.cantidadAdicionales > 0;
        menu.show(event);
    }
    verDetalle(): void {
        if (this.pedidoSeleccionado) this.router.navigate(['/pedidos', this.pedidoSeleccionado.id]);
    }
    editarPedido(): void {
        if (this.pedidoSeleccionado) this.router.navigate(['/formulario'], { queryParams: { pedidoId: this.pedidoSeleccionado.id } });
    }
    avisoMock(accion: string): void {
        this.messages.add({ severity: 'info', summary: accion, detail: 'Funcionalidad preparada para futura implementación.' });
    }
    abrirDocumento(tipo: PedidoDocumentoTipo): void {
        if (!this.pedidoSeleccionado) return;
        const pedidoId = this.pedidoSeleccionado.id;
        this.service.getPedidoById(pedidoId).subscribe({
            next: (pedido) => {
                if (!pedido) return;
                this.pedidoSeleccionado = pedido;
                this.tipoDocumento = tipo;
                if (!pedido.cantidadAdicionales) {
                    this.alcanceDocumento = 'original';
                    this.mostrarDocumento.set(true);
                    return;
                }
                this.alcanceDocumento = 'completo';
                this.adicionalesSeleccionados = pedido.adicionales.map((adicional) => adicional.id);
                this.mostrarAlcanceDocumento.set(true);
            },
            error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'No se pudo cargar el pedido', detail: getApiErrorMessage(error) })
        });
    }
    abrirAdicionales(): void {
        if (!this.pedidoSeleccionado) return;
        this.service.getPedidoById(this.pedidoSeleccionado.id).subscribe({
            next: (pedido) => {
                if (pedido) {
                    this.pedidoSeleccionado = pedido;
                    this.mostrarAdicionales.set(true);
                }
            },
            error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'No se pudieron cargar los adicionales', detail: getApiErrorMessage(error) })
        });
    }
    continuarDocumento(): void {
        if (this.alcanceDocumento === 'adicionales' && !this.adicionalesSeleccionados.length) {
            this.messages.add({ severity: 'warn', summary: 'Selecciona un adicional', detail: 'Elige al menos un adicional para continuar.' });
            return;
        }
        this.mostrarAlcanceDocumento.set(false);
        this.mostrarDocumento.set(true);
    }

    alternarAdicionalSeleccionado(id: string, seleccionado: boolean): void {
        this.adicionalesSeleccionados = seleccionado ? [...new Set([...this.adicionalesSeleccionados, id])] : this.adicionalesSeleccionados.filter((actual) => actual !== id);
    }
    abrirAdicional(adicional?: PedidoAdicional): void {
        if (!this.pedidoSeleccionado) return;
        this.adicionalEditando = adicional;
        this.mostrarAdicionalForm = true;
    }
    adicionalGuardado(): void {
        this.mostrarAdicionalForm = false;
        this.adicionalEditando = undefined;
        this.cargarPedidos();
    }
    nombreAdicionales(pedido: Pedido): string {
        return `${pedido.cantidadAdicionales} adicional${pedido.cantidadAdicionales === 1 ? '' : 'es'}`;
    }
    avisoDocumento(accion: 'pdf' | 'imprimir'): void {
        this.messages.add({ severity: 'info', summary: accion === 'pdf' ? 'PDF pendiente' : 'Impresión pendiente', detail: accion === 'pdf' ? 'Generación de PDF disponible cuando se conecte el backend.' : 'Función de impresión pendiente.' });
    }
    abrirCambioEstatus(): void {
        if (this.pedidoSeleccionado) {
            this.nuevoEstatus = this.pedidoSeleccionado.estatus;
            this.mostrarEstatus = true;
        }
    }
    guardarEstatus(): void {
        if (!this.pedidoSeleccionado) return;
        this.service.actualizarEstatus(this.pedidoSeleccionado.id, this.nuevoEstatus).subscribe({
            next: () => {
                this.mostrarEstatus = false;
                this.cargarPedidos();
                this.messages.add({ severity: 'success', summary: 'Estatus actualizado', detail: `${this.pedidoSeleccionado?.folio} ahora está ${this.formatoEstatus(this.nuevoEstatus)}.` });
            },
            error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'No se pudo actualizar', detail: getApiErrorMessage(error) })
        });
    }
    confirmarCancelacion(): void {
        if (!this.pedidoSeleccionado) return;
        this.confirmation.confirm({
            message: `¿Cancelar el pedido ${this.pedidoSeleccionado.folio}?`,
            header: 'Confirmar cancelación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Cancelar pedido',
            rejectLabel: 'Volver',
            accept: () => {
                this.service.actualizarEstatus(this.pedidoSeleccionado!.id, 'cancelado').subscribe({
                    next: () => {
                        this.cargarPedidos();
                        this.messages.add({ severity: 'success', summary: 'Pedido cancelado', detail: 'El cambio se guardó en el backend.' });
                    },
                    error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'No se pudo cancelar', detail: getApiErrorMessage(error) })
                });
            }
        });
    }
}

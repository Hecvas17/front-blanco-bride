import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { FormularioCatalogosService } from '../formulario/services/formulario-catalogos.service';
import { CatalogoOpcion } from '../formulario/models/formulario.model';
import { getUrgenciaEvento, UrgenciaEvento } from '../pedidos/utils/evento-urgencia';
import { BatasEncajeService } from './services/batas-encaje.service';
import { BataEncaje, BataEncajeCambios, EstatusEncaje, EstatusPedidoEncaje, TipoEncaje } from './models/bata-encaje.model';
import { getApiErrorMessage } from '../../core/api/api-error';

@Component({
    selector: 'app-batas-encaje',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, DialogModule, InputNumberModule, InputTextModule, MenuModule, SelectModule, TableModule, TagModule, ToastModule],
    providers: [MessageService],
    templateUrl: './batas-encaje.component.html',
    styleUrl: './batas-encaje.component.scss'
})
export class BatasEncajeComponent {
    private readonly service = inject(BatasEncajeService);
    private readonly catalogos = inject(FormularioCatalogosService);
    private readonly messages = inject(MessageService);
    private readonly destroyRef = inject(DestroyRef);
    readonly router = inject(Router);

    readonly registros = signal<BataEncaje[]>([]);
    readonly filtrados = signal<BataEncaje[]>([]);
    readonly tallas = signal<CatalogoOpcion[]>([]);
    readonly colores = signal<CatalogoOpcion[]>([]);
    busqueda = '';
    tipoFiltro: TipoEncaje | '' = '';
    estatusEncajeFiltro: EstatusEncaje | '' = '';
    estatusPedidoFiltro: EstatusPedidoEncaje | '' = '';
    tallaFiltro = '';
    fechaFiltro: Date | null = null;
    registroSeleccionado?: BataEncaje;
    readonly mostrarEdicion = signal(false);
    readonly mostrarDetalle = signal(false);
    mostrarAcciones = false;
    menuItems: MenuItem[] = [];
    edicion: BataEncajeCambios = {};
    detalleSeleccionado?: BataEncaje;
    readonly tiposEncaje = signal<Array<{ label: string; value: string }>>([]);
    readonly estatusEncaje = signal<Array<{ label: string; value: string }>>([]);
    readonly estatusPedido = signal<Array<{ label: string; value: string }>>([]);
    readonly estatusPedidoPrincipal = signal<Array<{ label: string; value: string }>>([]);

    constructor() {
        this.catalogos
            .getTallas()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((tallas) => this.tallas.set(tallas));
        this.catalogos
            .getColores()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((colores) => this.colores.set(colores));
        this.catalogos
            .getTiposEncaje()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => this.tiposEncaje.set(items.map((item) => ({ label: item.nombre, value: item.id }))));
        this.catalogos
            .getEstatusBataEncaje()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => this.estatusEncaje.set(items.map((item) => ({ label: item.nombre, value: item.clave }))));
        this.estatusPedido.set([
            { label: 'En producción', value: 'EN_PRODUCCION' },
            { label: 'Batas normales listas', value: 'BATAS_NORMALES_LISTAS' }
        ]);
        this.catalogos
            .getEstatusPedido()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => this.estatusPedidoPrincipal.set(items.map((item) => ({ label: item.nombre, value: item.clave }))));
        this.cargar();
    }

    cargar(): void {
        this.service
            .getBatasEncaje()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (registros) => {
                    this.registros.set(registros);
                    this.aplicarFiltros();
                },
                error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'No se pudieron cargar las batas', detail: getApiErrorMessage(error) })
            });
    }

    aplicarFiltros(): void {
        const query = this.busqueda.trim().toLowerCase();
        const filtroFecha = this.fechaFiltro ? this.fechaCalendario(this.fechaFiltro) : null;
        this.filtrados.set(this.registros().filter((registro) => {
            const coincideTexto = !query || registro.pedidoFolio.toLowerCase().includes(query) || registro.terminacionTelefono.includes(query);
            const coincideFecha = !filtroFecha || (!!registro.fechaEvento && this.fechaCalendario(registro.fechaEvento).getTime() === filtroFecha.getTime());
            return (
                coincideTexto &&
                (!this.tipoFiltro || registro.tipoEncajeId === this.tipoFiltro) &&
                (!this.estatusEncajeFiltro || registro.estatusEncaje === this.estatusEncajeFiltro) &&
                (!this.estatusPedidoFiltro || registro.estatusPedido === this.estatusPedidoFiltro) &&
                (!this.tallaFiltro || registro.talla === this.tallaFiltro) &&
                coincideFecha
            );
        }));
    }

    limpiarFiltros(): void {
        this.busqueda = '';
        this.tipoFiltro = '';
        this.estatusEncajeFiltro = '';
        this.estatusPedidoFiltro = '';
        this.tallaFiltro = '';
        this.fechaFiltro = null;
        this.aplicarFiltros();
    }

    urgencia(registro: BataEncaje): UrgenciaEvento {
        if (!registro.fechaEvento) return { dias: 0, texto: '—', severity: 'secondary', vencido: false };
        return getUrgenciaEvento(registro.fechaEvento, registro.estatusPedidoPrincipal === 'ENTREGADO' ? 'ENTREGADO' : undefined);
    }

    contarEstatus(estatus: EstatusEncaje): number {
        return this.registros().filter((registro) => registro.estatusEncaje === estatus).length;
    }
    urgentes(): number {
        return this.registros().filter((registro) => this.urgencia(registro).severity === 'danger').length;
    }
    etiquetaTipo(value: TipoEncaje): string {
        return this.tiposEncaje().find((item) => item.value === value)?.label ?? value;
    }
    etiquetaCatalogo(catalogo: CatalogoOpcion[], id: string | null): string {
        return catalogo.find((item) => item.id === id)?.nombre ?? id ?? '—';
    }
    etiquetaEstatus(value: EstatusEncaje | EstatusPedidoEncaje): string {
        return [...this.estatusEncaje(), ...this.estatusPedido()].find((item) => item.value === value)?.label ?? value;
    }
    etiquetaEstatusPrincipal(value: string | null | undefined): string {
        return this.estatusPedidoPrincipal().find((item) => item.value === value)?.label ?? value ?? '—';
    }
    severidadPrincipal(value: string | null | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        return value === 'ENTREGADO' ? 'success' : value === 'SITUACION' ? 'danger' : value === 'POR_LIQUIDAR' ? 'warn' : 'info';
    }
    severidadEncaje(value: EstatusEncaje): 'info' | 'warn' | 'success' | 'secondary' {
        return value === 'SIN_SOLICITAR' ? 'secondary' : value === 'SOLICITADA' ? 'info' : value === 'YA_LLEGO' ? 'warn' : value === 'EN_PRODUCCION' ? 'info' : 'success';
    }
    severidadPedido(value: EstatusPedidoEncaje): 'success' | 'warn' | 'info' | 'secondary' {
        return value === 'BATAS_NORMALES_LISTAS' ? 'secondary' : 'info';
    }
    mes(registro: BataEncaje): string {
        return registro.fechaEvento ? this.fechaCalendario(registro.fechaEvento).toLocaleDateString('es-MX', { month: 'long' }) : '—';
    }
    fechaTexto(value: Date | string | null): string {
        return value ? this.fechaCalendario(value).toLocaleDateString('es-MX') : '—';
    }

    confirmarActualizacion(): void {
        this.cargar();
        this.messages.add({ severity: 'success', summary: 'Actualizado', detail: 'El cambio se guardó en el backend.' });
    }

    abrirAcciones(event: Event, registro: BataEncaje, menu: Menu): void {
        this.registroSeleccionado = registro;
        this.menuItems = [
            { label: 'Ver pedido', icon: 'pi pi-eye', command: () => this.verPedido() },
            { label: 'Ver detalle del producto', icon: 'pi pi-info-circle', command: () => this.abrirDetalle() }
        ];
        menu.toggle(event);
    }
    verPedido(): void {
        if (this.registroSeleccionado) this.router.navigate(['/pedidos', this.registroSeleccionado.pedidoId]);
    }
    abrirDetalle(): void {
        this.detalleSeleccionado = this.registroSeleccionado;
        this.mostrarDetalle.set(true);
    }
    abrirEdicion(): void {
        if (!this.registroSeleccionado) return;
        this.edicion = { terminacionTelefono: this.registroSeleccionado.terminacionTelefono, fechaEvento: this.registroSeleccionado.fechaEvento, talla: this.registroSeleccionado.talla, precio: this.registroSeleccionado.precio };
        this.mostrarEdicion.set(true);
    }
    guardarEdicion(): void {
        if (!this.registroSeleccionado) return;
        this.service.actualizarDatos(this.registroSeleccionado.id, this.edicion).subscribe(() => {
            this.mostrarEdicion.set(false);
            this.confirmarActualizacion();
        });
    }
    fechaCalendario(value: Date | string): Date {
        if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
    }
    fechaInput(value: Date | string | null): string {
        return value ? this.fechaCalendario(value).toISOString().slice(0, 10) : '';
    }
}

import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { Pedido, PedidoAdicional, PedidoEstatus } from './models/pedido.model';
import { PedidosService } from './services/pedidos.service';
import { EstatusProveedorProducto } from '../formulario/models/formulario.model';
import { FormularioCatalogosService } from '../formulario/services/formulario-catalogos.service';
import { PedidoAdicionalFormComponent } from './components/pedido-adicional-form.component';
import { getApiErrorMessage } from '../../core/api/api-error';

@Component({
    selector: 'app-pedido-detalle',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, DialogModule, TagModule, ToastModule, PedidoAdicionalFormComponent],
    providers: [MessageService],
    templateUrl: './pedido-detalle.component.html',
    styleUrl: './pedido-detalle.component.scss'
})
export class PedidoDetalleComponent {
    private readonly route = inject(ActivatedRoute);
    readonly router = inject(Router);
    private readonly service = inject(PedidosService);
    private readonly messages = inject(MessageService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly catalogos = inject(FormularioCatalogosService);
    readonly pedido = signal<Pedido | undefined>(undefined);
    readonly loading = signal(true);
    readonly notFound = signal(false);
    readonly loadError = signal<string | null>(null);
    mostrarAdicionalForm = false;
    adicionalEditando?: PedidoAdicional;
    estadosProveedor: EstatusProveedorProducto[] = [];
    private estadosProveedorLabels: Record<string, string> = {};
    private estatusLabels: Record<string, string> = {};
    private proveedoresLabels: Record<string, string> = {};
    constructor() {
        this.catalogos
            .getEstatusPedido()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.estatusLabels = Object.fromEntries(items.map((item) => [item.clave, item.nombre]))));
        this.catalogos
            .getEstatusProveedor()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                this.estadosProveedor = items.map((item) => item.clave as EstatusProveedorProducto);
                this.estadosProveedorLabels = Object.fromEntries(items.map((item) => [item.clave, item.nombre]));
            });
        this.catalogos
            .getProveedores()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.proveedoresLabels = Object.fromEntries(items.map((item) => [item.id, item.nombre]))));
        this.route.paramMap
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                switchMap((params) => {
                    const id = params.get('id');
                    this.loading.set(true);
                    this.notFound.set(false);
                    this.loadError.set(null);
                    this.pedido.set(undefined);
                    if (!id) {
                        this.notFound.set(true);
                        this.loading.set(false);
                        return of(undefined);
                    }
                    return this.service.getPedidoById(id).pipe(
                        catchError((error) => {
                            if (error?.status === 404) {
                                this.notFound.set(true);
                            } else {
                                const detail = getApiErrorMessage(error);
                                this.loadError.set(detail);
                                this.messages.add({ severity: 'error', summary: 'No se pudo cargar el pedido', detail });
                            }
                            return of(undefined);
                        }),
                        finalize(() => this.loading.set(false))
                    );
                })
            )
            .subscribe((pedido) => {
                if (pedido) {
                    this.pedido.set(pedido);
                    this.notFound.set(false);
                    this.loadError.set(null);
                }
            });
    }
    formatoEstatus(estatus: PedidoEstatus): string {
        return this.estatusLabels[estatus] ?? estatus;
    }
    severidad(estatus: PedidoEstatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        const mapa: Record<PedidoEstatus, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = { borrador: 'secondary', confirmado: 'info', en_proceso: 'warn', listo: 'success', entregado: 'success', cancelado: 'danger' };
        return mapa[estatus];
    }
    editar(): void {
        if (this.pedido()) this.router.navigate(['/formulario'], { queryParams: { pedidoId: this.pedido()!.id } });
    }
    cambiarEstatus(): void {
        this.messages.add({ severity: 'info', summary: 'Cambio de estatus', detail: 'La acción queda preparada para conectarse al flujo de edición.' });
    }
    imprimir(): void {
        this.messages.add({ severity: 'info', summary: 'Imprimir', detail: 'La impresión se habilitará en una siguiente iteración.' });
    }
    nuevoAdicional(): void {
        this.adicionalEditando = undefined;
        this.mostrarAdicionalForm = true;
    }
    editarAdicional(adicional: PedidoAdicional): void {
        this.adicionalEditando = adicional;
        this.mostrarAdicionalForm = true;
    }
    adicionalGuardado(): void {
        this.mostrarAdicionalForm = false;
        if (this.pedido()) this.service.getPedidoById(this.pedido()!.id).subscribe((pedido) => this.pedido.set(pedido));
    }
    nombreProveedor(id: string): string {
        return this.proveedoresLabels[id] ?? 'Sin proveedor asignado';
    }
    formatoEstadoProveedor(estatus: EstatusProveedorProducto): string {
        return this.estadosProveedorLabels[estatus] ?? estatus;
    }
    seguimientoPorProveedor(): Array<{ proveedor: string; items: Array<{ nombre: string; cantidad: number; estatus: EstatusProveedorProducto; tipo: 'bata' | 'complemento'; index: number; origen: string }> }> {
        if (!this.pedido()) return [];
        const grupos = new Map<string, Array<{ nombre: string; cantidad: number; estatus: EstatusProveedorProducto; tipo: 'bata' | 'complemento'; index: number; origen: string }>>();
        this.pedido()!.personalizaciones.forEach((bata, index) => {
            const key = bata.proveedorId ?? 'sin-proveedor';
            const items = grupos.get(key) ?? [];
            items.push({ nombre: `Bata ${index + 1}`, cantidad: 1, estatus: bata.estatusProveedor ?? (index % 2 === 0 ? 'en_produccion' : 'solicitado'), tipo: 'bata', index, origen: 'Pedido original' });
            grupos.set(key, items);
        });
        this.pedido()!.complementos.forEach((producto, index) => {
            const key = producto.proveedorId ?? 'sin-proveedor';
            const items = grupos.get(key) ?? [];
            items.push({ nombre: producto.nombre, cantidad: producto.cantidad, estatus: producto.estatusProveedor ?? (index % 2 === 0 ? 'recibido' : 'pendiente'), tipo: 'complemento', index, origen: 'Pedido original' });
            grupos.set(key, items);
        });
        this.pedido()!.productosAdicionales.forEach((producto) => {
            const key = producto.proveedorId ?? 'sin-proveedor';
            const items = grupos.get(key) ?? [];
            items.push({ nombre: 'Bata de encaje', cantidad: producto.cantidad, estatus: producto.estatusProveedor, tipo: 'complemento', index: -1, origen: 'Pedido original' });
            grupos.set(key, items);
        });
        this.pedido()!.adicionales.forEach((adicional) =>
            adicional.productos.forEach((producto) => {
                const key = producto.proveedorId ?? 'sin-proveedor';
                const items = grupos.get(key) ?? [];
                items.push({ nombre: producto.nombre, cantidad: producto.cantidad, estatus: producto.estatusProveedor, tipo: 'complemento', index: -1, origen: adicional.folio });
                grupos.set(key, items);
            })
        );
        return Array.from(grupos.entries()).map(([proveedorId, items]) => ({ proveedor: proveedorId === 'sin-proveedor' ? 'Sin proveedor asignado' : this.nombreProveedor(proveedorId), items }));
    }
    actualizarSeguimiento(tipo: 'bata' | 'complemento', index: number, estatus: EstatusProveedorProducto): void {
        if (!this.pedido()) return;
        this.service.actualizarEstatusProducto(this.pedido()!.id, tipo, index, estatus).subscribe((pedido) => {
            this.pedido.set(pedido);
            this.messages.add({ severity: 'success', summary: 'Estado actualizado', detail: 'El cambio se guardó únicamente en memoria.' });
        });
    }
    avanceRecibido(): number {
        return this.seguimientoPorProveedor().reduce((total, grupo) => total + grupo.items.filter((item) => item.estatus === 'recibido').length, 0);
    }
    totalProductosSeguimiento(): number {
        return this.pedido() ? this.pedido()!.personalizaciones.length + this.pedido()!.complementos.length + this.pedido()!.productosAdicionales.length + this.pedido()!.adicionales.reduce((total, adicional) => total + adicional.productos.length, 0) : 0;
    }
}

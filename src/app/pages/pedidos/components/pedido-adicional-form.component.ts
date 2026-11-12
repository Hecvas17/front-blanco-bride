import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { FormularioCatalogosService } from '../../formulario/services/formulario-catalogos.service';
import { Pedido, PedidoAdicional, PedidoAdicionalProducto } from '../models/pedido.model';
import { EstatusBataEncaje } from '../../formulario/models/formulario.model';
import { PedidosService } from '../services/pedidos.service';

@Component({
    selector: 'app-pedido-adicional-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputNumberModule, InputTextModule],
    templateUrl: './pedido-adicional-form.component.html',
    styleUrl: './pedido-adicional-form.component.scss'
})
export class PedidoAdicionalFormComponent implements OnInit {
    @Input({ required: true }) pedido!: Pedido;
    @Input() adicional?: PedidoAdicional;
    @Output() cancelar = new EventEmitter<void>();
    @Output() guardado = new EventEmitter<PedidoAdicional>();

    private readonly fb = inject(FormBuilder);
    private readonly catalogos = inject(FormularioCatalogosService);
    private readonly service = inject(PedidosService);
    private readonly messages = inject(MessageService);
    colores = this.catalogos.getColores();
    tallas = this.catalogos.getTallas();
    proveedores = this.catalogos.getProveedores();
    tiposEncaje = this.catalogos.getTiposEncaje();
    readonly tipos = [
        { tipo: 'bata', nombre: 'Bata normal', precio: 1136 },
        { tipo: 'bata_infantil', nombre: 'Bata infantil', precio: 1136 },
        { tipo: 'bata_encaje', nombre: 'Bata de encaje', precio: 1250 },
        { tipo: 'pantalon', nombre: 'Pantalón', precio: 370 },
        { tipo: 'toalla', nombre: 'Toalla', precio: 279 },
        { tipo: 'panuelo', nombre: 'Pañuelo', precio: 185 },
        { tipo: 'panuelo_mascota', nombre: 'Pañuelo mascota', precio: 180 },
        { tipo: 'pantuflas', nombre: 'Pantuflas', precio: 145 },
        { tipo: 'playera_hombre', nombre: 'Playera para hombre', precio: 299 }
    ];
    form = this.fb.group({ observaciones: [''], productos: this.fb.array<FormGroup>([]) });

    ngOnInit(): void {
        if (this.adicional) {
            this.form.controls.observaciones.setValue(this.adicional.observaciones ?? '');
            this.adicional.productos.forEach((producto) => this.agregarProducto(producto));
        } else {
            this.agregarProducto();
        }
    }

    get productos(): FormArray<FormGroup> {
        return this.form.controls.productos;
    }

    agregarProducto(producto?: PedidoAdicionalProducto): void {
        const tipo = producto?.tipo ?? 'pantalon';
        const catalogo = this.tipos.find((item) => item.tipo === tipo);
        this.productos.push(
            this.fb.group({
                idTemporal: [producto?.idTemporal ?? `adicional-producto-${Date.now()}`],
                tipo: [tipo, Validators.required],
                cantidad: [producto?.cantidad ?? 1, [Validators.required, Validators.min(1), Validators.max(100)]],
                colorProductoId: [producto?.colorProductoId ?? null],
                tallaId: [producto?.tallaId ?? null],
                precio: [producto?.precio ?? catalogo?.precio ?? 0, [Validators.required, Validators.min(0)]],
                observaciones: [producto?.observaciones ?? producto?.texto ?? ''],
                proveedorId: [producto?.proveedorId ?? null, Validators.required],
                tipoEncajeId: [producto?.tipoEncajeId ?? null],
                estatusBataEncaje: [producto?.estatusBataEncaje ?? 'SOLICITADA']
            })
        );
    }

    eliminarProducto(index: number): void {
        if (this.productos.length > 1) this.productos.removeAt(index);
    }

    nombreTipo(tipo: string): string {
        return this.tipos.find((item) => item.tipo === tipo)?.nombre ?? tipo;
    }

    total(): number {
        return this.productos.controls.reduce((total, producto) => total + Number(producto.get('cantidad')?.value ?? 0) * Number(producto.get('precio')?.value ?? 0), 0);
    }

    guardar(): void {
        this.form.markAllAsTouched();
        if (this.form.invalid || !this.productos.length) return;
        const value = this.form.getRawValue();
        const productos = value.productos.map((item) => ({
            idTemporal: String(item['idTemporal'] ?? `adicional-producto-${Date.now()}`),
            tipo: String(item['tipo']),
            nombre: this.nombreTipo(String(item['tipo'])),
            cantidad: Number(item['cantidad'] ?? 0),
            colorProductoId: String(item['colorProductoId'] ?? '') || undefined,
            tallaId: String(item['tallaId'] ?? '') || undefined,
            observaciones: String(item['observaciones'] ?? '') || undefined,
            precio: Number(item['precio'] ?? 0),
            proveedorId: String(item['proveedorId'] ?? ''),
            estatusProveedor: 'pendiente' as const,
            tipoEncajeId: String(item['tipoEncajeId'] ?? '') || undefined,
            estatusBataEncaje: String(item['estatusBataEncaje'] ?? 'SOLICITADA') as EstatusBataEncaje
        }));
        const payload = { pedidoId: this.pedido.id, creadoEn: this.adicional?.creadoEn ?? new Date(), productos, observaciones: value.observaciones ?? '', total: this.total() };
        const request = this.adicional ? this.service.actualizarAdicional(this.pedido.id, { ...this.adicional, ...payload }) : this.service.crearAdicional(this.pedido.id, payload);
        request.subscribe((adicional) => {
            if (!adicional) return;
            this.messages.add({ severity: 'success', summary: 'Adicional creado', detail: `${adicional.folio} se actualizó en esta sesión.` });
            this.guardado.emit(adicional);
        });
    }
}

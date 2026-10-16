import { Injectable, signal } from '@angular/core';
import { FormularioPedido, pedidoInicial } from '../models/formulario.model';

@Injectable({ providedIn: 'root' })
export class FormularioStateService {
    readonly pedido = signal<FormularioPedido>(pedidoInicial());

    actualizar(patch: Partial<FormularioPedido>): void {
        this.pedido.update((actual) => ({ ...actual, ...patch }));
    }

    reiniciar(): void {
        this.pedido.set(pedidoInicial());
    }
}

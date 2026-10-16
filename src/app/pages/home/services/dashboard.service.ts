import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { BataEncaje } from '../../batas-encaje/models/bata-encaje.model';
import { BatasEncajeService } from '../../batas-encaje/services/batas-encaje.service';
import { Pedido } from '../../pedidos/models/pedido.model';
import { PedidosService } from '../../pedidos/services/pedidos.service';

export interface DashboardData {
    pedidos: Pedido[];
    batasEncaje: BataEncaje[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private readonly pedidos = inject(PedidosService);
    private readonly batasEncaje = inject(BatasEncajeService);

    getDashboardData(): Observable<DashboardData> {
        return forkJoin({ pedidos: this.pedidos.getPedidos(), batasEncaje: this.batasEncaje.getBatasEncaje() });
    }
}

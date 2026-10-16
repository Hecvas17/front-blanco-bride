import { Routes } from '@angular/router';
import { PedidoDetalleComponent } from './pedido-detalle.component';
import { PedidosComponent } from './pedidos.component';

export const pedidosRoutes: Routes = [
    { path: '', component: PedidosComponent },
    { path: ':id', component: PedidoDetalleComponent }
];

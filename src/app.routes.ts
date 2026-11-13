import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { HomeComponent } from './app/pages/home/home.component';
import { authGuard } from './app/core/auth/auth.guard';
import { LoginComponent } from './app/pages/login/login.component';

export const appRoutes: Routes = [
    { path: 'login', component: LoginComponent },
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        canActivateChild: [authGuard],
        children: [
            { path: '', component: HomeComponent },
            {
                path: 'formulario',
                loadChildren: () => import('./app/pages/formulario/formulario.routes').then((m) => m.formularioRoutes)
            },
            {
                path: 'pedidos',
                loadChildren: () => import('./app/pages/pedidos/pedidos.routes').then((m) => m.pedidosRoutes)
            },
            {
                path: 'batas-encaje',
                loadChildren: () => import('./app/pages/batas-encaje/batas-encaje.routes').then((m) => m.batasEncajeRoutes)
            },
            {
                path: 'seguimiento',
                loadChildren: () => import('./app/pages/seguimiento/seguimiento.routes').then((m) => m.seguimientoRoutes)
            },
            {
                path: 'catalogos',
                loadChildren: () => import('./app/pages/catalogos/catalogos.routes').then((m) => m.catalogosRoutes)
            },
            {
                path: 'usuarios',
                loadChildren: () => import('./app/pages/usuarios/usuarios.routes').then((m) => m.usuariosRoutes)
            }
        ]
    }
];

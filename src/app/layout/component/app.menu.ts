import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'MENÚ',
                items: [
                    { label: 'Inicio', icon: 'pi pi-fw pi-home', routerLink: ['/'] },
                    { label: 'Formulario', icon: 'pi pi-fw pi-file-edit', routerLink: ['/formulario'] },
                    { label: 'Pedidos', icon: 'pi pi-fw pi-shopping-bag', routerLink: ['/pedidos'] },
                    { label: 'Batas de encaje', icon: 'pi pi-fw pi-star', routerLink: ['/batas-encaje'] },
                    { label: 'Catálogos', icon: 'pi pi-fw pi-book', routerLink: ['/catalogos'] }
                ]
            }
        ];
    }
}

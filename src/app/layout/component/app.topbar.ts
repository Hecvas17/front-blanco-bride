import { Component, HostListener, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '@/app/layout/service/layout.service';
import { AuthService } from '@/app/core/auth/auth.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, AppConfigurator],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>
            <a class="layout-topbar-logo" routerLink="/">
                <span class="layout-topbar-logo-text">Blanco Bride</span>
            </a>
        </div>

        <div class="layout-topbar-actions">
            <button class="layout-topbar-menu-button layout-topbar-action" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true">
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-calendar"></i>
                        <span>Calendar</span>
                    </button>
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-inbox"></i>
                        <span>Messages</span>
                    </button>
                    <div class="account-menu-wrapper" (click)="$event.stopPropagation()">
                        <button type="button" class="account-trigger" (click)="toggleAccountMenu($event)" [attr.aria-expanded]="accountMenuOpen" aria-haspopup="true" aria-label="Abrir menú de usuario">
                            <span class="account-trigger-avatar" aria-hidden="true"><i class="pi pi-user"></i></span>
                            <span class="account-trigger-name">{{ auth.getCurrentUser()?.nombre || 'Usuario' }}</span>
                            <i class="pi" [class.pi-chevron-down]="!accountMenuOpen" [class.pi-chevron-up]="accountMenuOpen" aria-hidden="true"></i>
                        </button>
                        @if (accountMenuOpen) {
                            <div class="account-dropdown" role="menu">
                                <div class="account-header">
                                    <div class="account-avatar-large" aria-hidden="true"><i class="pi pi-user"></i></div>
                                    <div class="account-header-info">
                                        <strong>{{ auth.getCurrentUser()?.nombre || 'Usuario' }}</strong>
                                        <span>{{ auth.getCurrentUser()?.email || '—' }}</span>
                                    </div>
                                </div>
                                <div class="account-settings" aria-label="Preferencias de apariencia">
                                    <div class="account-setting-row">
                                        <span class="account-setting-label">Tema</span>
                                        <button type="button" class="account-setting-action" (click)="toggleDarkMode()">
                                            <i class="pi" [class.pi-moon]="layoutService.isDarkTheme()" [class.pi-sun]="!layoutService.isDarkTheme()"></i>
                                            <span>{{ layoutService.isDarkTheme() ? 'Oscuro' : 'Claro' }}</span>
                                        </button>
                                    </div>
                                    <div class="account-setting-row">
                                        <span class="account-setting-label">Apariencia</span>
                                        <div class="account-palette-control relative">
                                            <button
                                                type="button"
                                                class="account-setting-action"
                                                pStyleClass="@next"
                                                enterFromClass="hidden"
                                                enterActiveClass="animate-scalein"
                                                leaveToClass="hidden"
                                                leaveActiveClass="animate-fadeout"
                                                [hideOnOutsideClick]="true"
                                            >
                                                <i class="pi pi-palette"></i>
                                                <span>Personalizar</span>
                                            </button>
                                            <app-configurator />
                                        </div>
                                    </div>
                                </div>
                                <div class="account-divider"></div>
                                <button type="button" class="account-option account-logout" (click)="logout()" role="menuitem">
                                    <i class="pi pi-sign-out"></i>
                                    <span>Cerrar sesión</span>
                                </button>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    </div>`
})
export class AppTopbar {
    layoutService = inject(LayoutService);
    auth = inject(AuthService);
    accountMenuOpen = false;

    toggleAccountMenu(event: MouseEvent): void {
        event.stopPropagation();
        this.accountMenuOpen = !this.accountMenuOpen;
    }

    @HostListener('document:click')
    closeAccountMenu(): void {
        this.accountMenuOpen = false;
    }

    @HostListener('document:keydown.escape')
    closeAccountMenuOnEscape(): void {
        this.accountMenuOpen = false;
    }

    logout(): void {
        this.accountMenuOpen = false;
        this.auth.logout();
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: !state.darkTheme
        }));
    }
}

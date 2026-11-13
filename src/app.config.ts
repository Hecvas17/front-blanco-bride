import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { authInterceptor } from './app/core/auth/auth.interceptor';

const primaryColorStorageKey = 'blanco-bride-primary-color';
const supportedPrimaryColors = ['noir', 'emerald', 'green', 'lime', 'orange', 'amber', 'yellow', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'] as const;
const primaryShades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const;

function getInitialPrimaryColor(): (typeof supportedPrimaryColors)[number] {
    if (typeof localStorage !== 'undefined') {
        const storedPrimaryColor = localStorage.getItem(primaryColorStorageKey);
        if (storedPrimaryColor && (supportedPrimaryColors as readonly string[]).includes(storedPrimaryColor)) {
            return storedPrimaryColor as (typeof supportedPrimaryColors)[number];
        }
    }

    return 'pink';
}

const initialPrimaryColor = getInitialPrimaryColor();
const BlancoBridePreset = definePreset(Aura, {
    semantic: {
        primary: Object.fromEntries(primaryShades.map((shade) => [shade, `{${initialPrimaryColor === 'noir' ? 'surface' : initialPrimaryColor}.${shade}}`]))
    }
});

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        provideZonelessChangeDetection(),
        providePrimeNG({ theme: { preset: BlancoBridePreset, options: { darkModeSelector: '.app-dark' } } })
    ]
};

import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal } from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { Pedido } from '../models/pedido.model';
import { PedidosService } from '../services/pedidos.service';
import { AlineacionBordado } from '../../formulario/models/formulario.model';
import { adaptarAdicionalADocumento, adaptarPedidoADocumento, LineaDocumentoPedido, PedidoDocumentoTipo, ReferenciaDocumentoPedido } from '../utils/pedido-documento';

export type PedidoDocumentoAlcance = 'original' | 'completo' | 'adicionales';

interface SeccionDocumento {
    titulo: string;
    fecha?: Date | string;
    lineas: LineaDocumentoPedido[];
}

@Component({
    selector: 'app-pedido-documento-preview',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './pedido-documento-preview.component.html',
    styleUrl: './pedido-documento-preview.component.scss'
})
export class PedidoDocumentoPreviewComponent implements OnChanges, OnDestroy {
    private readonly pedidosService = inject(PedidosService);
    @Input({ required: true }) pedido!: Pedido;
    @Input() tipoDocumento: PedidoDocumentoTipo = 'cliente';
    @Input() alcance: PedidoDocumentoAlcance = 'original';
    @Input() adicionalIds: string[] = [];
    readonly referenciasState = signal<ReferenciaDocumentoPedido[]>([]);
    private referenciasPromise: Promise<void> = Promise.resolve();
    private readonly objectUrls = new Set<string>();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['pedido'] && this.pedido) this.cargarReferencias();
    }

    ngOnDestroy(): void {
        this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        this.objectUrls.clear();
    }

    get mostrarPrecios(): boolean {
        return this.tipoDocumento === 'cliente';
    }

    get lineas(): LineaDocumentoPedido[] {
        return this.pedido ? adaptarPedidoADocumento(this.pedido).lineas : [];
    }

    get secciones(): SeccionDocumento[] {
        if (!this.pedido) return [];
        const originales = adaptarPedidoADocumento(this.pedido).lineas;
        const adicionales = this.pedido.adicionales.filter((adicional) => this.adicionalIds.includes(adicional.id));
        const secciones: SeccionDocumento[] = [];
        if (this.alcance !== 'adicionales') secciones.push({ titulo: 'PEDIDO ORIGINAL', lineas: originales });
        if (this.alcance !== 'original') {
            adicionales.forEach((adicional) => secciones.push({ titulo: `ADICIONAL ${adicional.folio}`, fecha: adicional.creadoEn, lineas: adaptarAdicionalADocumento(adicional) }));
        }
        return secciones;
    }

    get totalOriginal(): number {
        return this.pedido ? adaptarPedidoADocumento(this.pedido).lineas.reduce((total, linea) => total + (linea.subtotal ?? 0), 0) : 0;
    }

    get totalAdicionales(): number {
        return this.pedido?.adicionales.filter((adicional) => this.adicionalIds.includes(adicional.id)).reduce((total, adicional) => total + adicional.total, 0) ?? 0;
    }

    get referencias(): ReferenciaDocumentoPedido[] {
        return this.referenciasState();
    }

    async esperarReferencias(): Promise<void> {
        await this.referenciasPromise;
    }

    private cargarReferencias(): void {
        this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        this.objectUrls.clear();
        const fallback = this.pedido ? adaptarPedidoADocumento(this.pedido).referencias : [];
        this.referenciasState.set(fallback.map((referencia) => ({ ...referencia, cargando: referencia.esImagen })));
        this.referenciasPromise = new Promise<void>((resolve) => {
            this.pedidosService.listarReferencias(this.pedido.id).pipe(
                map((referencias) => referencias.map((referencia) => ({
                    id: referencia.id,
                    nombre: referencia.nombre,
                    tipo: referencia.tipo,
                    tipoMime: referencia.tipoMime,
                    archivoUrl: referencia.archivoUrl,
                    esImagen: (referencia.tipoMime ?? referencia.tipo).toLowerCase().includes('image') || /\.(jpe?g|png|webp|gif)$/i.test(referencia.nombre),
                    cargando: true
                }))),
                catchError(() => of(fallback.map((referencia) => ({ ...referencia, cargando: referencia.esImagen }))))
            ).subscribe((referencias) => {
                const cargas = referencias.map((referencia) => {
                    if (!referencia.esImagen || !referencia.id) return of({ ...referencia, cargando: false });
                    return this.pedidosService.obtenerArchivoReferencia(this.pedido.id, referencia.id).pipe(
                        map((blob) => {
                            const previewUrl = URL.createObjectURL(blob);
                            this.objectUrls.add(previewUrl);
                            return { ...referencia, previewUrl, cargando: false };
                        }),
                        catchError(() => of({ ...referencia, cargando: false, error: true }))
                    );
                });
                if (!cargas.length) {
                    this.referenciasState.set(referencias);
                    resolve();
                    return;
                }
                forkJoin(cargas).subscribe((resultado) => {
                    this.referenciasState.set(resultado);
                    resolve();
                });
            });
        });
    }

    get tituloDocumento(): string {
        return this.mostrarPrecios ? 'PDF PARA CLIENTE' : 'ORDEN DE PRODUCCIÓN';
    }

    get totalDocumento(): number {
        if (this.alcance === 'original') return this.pedido?.total ?? 0;
        if (this.alcance === 'adicionales') return this.totalAdicionales;
        return this.totalOriginal + this.totalAdicionales;
    }

    alineacionCss(value: AlineacionBordado | null | undefined): 'left' | 'center' | 'right' {
        return value === 'IZQUIERDA' ? 'left' : value === 'DERECHA' ? 'right' : 'center';
    }
}

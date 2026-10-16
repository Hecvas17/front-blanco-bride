import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Pedido } from '../models/pedido.model';
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
export class PedidoDocumentoPreviewComponent {
    @Input({ required: true }) pedido!: Pedido;
    @Input() tipoDocumento: PedidoDocumentoTipo = 'cliente';
    @Input() alcance: PedidoDocumentoAlcance = 'original';
    @Input() adicionalIds: string[] = [];

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
        return this.pedido ? adaptarPedidoADocumento(this.pedido).referencias : [];
    }

    get tituloDocumento(): string {
        return this.mostrarPrecios ? 'PDF PARA CLIENTE' : 'ORDEN DE PRODUCCIÓN';
    }

    get totalDocumento(): number {
        if (this.alcance === 'original') return this.pedido?.total ?? 0;
        if (this.alcance === 'adicionales') return this.totalAdicionales;
        return this.totalOriginal + this.totalAdicionales;
    }
}

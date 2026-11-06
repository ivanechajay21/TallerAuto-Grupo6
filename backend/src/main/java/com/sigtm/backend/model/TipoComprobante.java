package com.sigtm.backend.model;

/**
 * Tipo de comprobante de pago que puede emitir el taller.
 *
 * <p>Cada tipo tiene su propia serie y, por tanto, su propia numeración
 * correlativa. La factura se emite a clientes con RUC y la boleta a clientes
 * con DNI o RUC.</p>
 */
public enum TipoComprobante {

    FACTURA("F001", "Factura"),
    BOLETA("B001", "Boleta de venta");

    private final String serie;
    private final String etiqueta;

    TipoComprobante(String serie, String etiqueta) {
        this.serie = serie;
        this.etiqueta = etiqueta;
    }

    /**
     * @return la serie utilizada para numerar este tipo de comprobante.
     */
    public String getSerie() {
        return serie;
    }

    /**
     * @return el nombre legible del comprobante para la interfaz y los reportes.
     */
    public String getEtiqueta() {
        return etiqueta;
    }
}

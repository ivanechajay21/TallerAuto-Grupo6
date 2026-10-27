package com.sigtm.backend.model;
import com.fasterxml.jackson.annotation.JsonIgnore; import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.LocalDateTime;
@Entity @Table(name="pagos_proveedor") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PagoProveedor extends Auditable { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="factura_proveedor_id",nullable=false) @JsonIgnore private FacturaProveedor supplierInvoice; @Column(nullable=false,precision=12,scale=2) private BigDecimal amount; @Column(nullable=false,length=30) private String method; @Column(nullable=false) private LocalDateTime paidAt; @Column(length=100) private String reference; }

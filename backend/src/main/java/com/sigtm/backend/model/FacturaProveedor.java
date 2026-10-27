package com.sigtm.backend.model;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.LocalDate;
@Entity @Table(name="facturas_proveedor") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FacturaProveedor extends Auditable {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,unique=true,length=50) private String number;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="orden_compra_id",nullable=false) private OrdenCompra purchaseOrder;
 @Column(nullable=false) private LocalDate issueDate;
 @Column(nullable=false) private LocalDate dueDate;
 @Column(nullable=false,precision=12,scale=2) private BigDecimal total;
 @Column(nullable=false,precision=12,scale=2) private BigDecimal balance;
 @Column(nullable=false,length=20) private String status;
}

package com.sigtm.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/** Proveedor de repuestos, insumos o servicios para el taller. */
@Entity
@Table(name = "proveedores")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Proveedor extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "La razón social es obligatoria")
    @Size(max = 150)
    @Column(name = "razon_social", nullable = false, length = 150)
    private String businessName;

    @NotBlank(message = "El RUC o documento fiscal es obligatorio")
    @Size(max = 20)
    @Column(name = "ruc", nullable = false, unique = true, length = 20)
    private String taxId;

    @Size(max = 100) @Column(name = "contacto", length = 100)
    private String contactName;
    @Email @Size(max = 120) @Column(name = "correo", length = 120)
    private String email;
    @Size(max = 30) @Column(name = "telefono", length = 30)
    private String phone;
    @Size(max = 255) @Column(name = "direccion", length = 255)
    private String address;
    @Builder.Default @Column(name = "activo", nullable = false)
    private Boolean active = true;
}

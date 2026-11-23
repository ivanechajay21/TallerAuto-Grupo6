package com.sigtm.backend.repository;

import com.sigtm.backend.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Acceso a datos de los clientes del taller.
 *
 * <p>El número de documento actúa como clave natural de búsqueda, por lo que su consulta
 * resuelve a un único cliente cuando el valor coincide.</p>
 */
@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Long>, JpaSpecificationExecutor<Cliente> {
    /**
     * Busca un cliente por su número de documento.
     *
     * @param documentNumber número de documento del cliente.
     * @return el cliente encontrado o vacío si el documento no está registrado.
     */
    Optional<Cliente> findByDocumentNumber(String documentNumber);

    long countByActiveTrue();

    long countByActiveFalse();

    long countByWhatsappIsNotNullAndWhatsappNot(String whatsapp);
}

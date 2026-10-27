package com.sigtm.backend.service;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.Proveedor;
import com.sigtm.backend.repository.ProveedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Gestión del catálogo de proveedores de repuestos e insumos. */
@Service
@RequiredArgsConstructor
public class ProveedorService {
    private final ProveedorRepository proveedorRepository;
    private final AuditoriaService auditoriaService;

    @Transactional(readOnly = true)
    public List<Proveedor> listar(boolean incluirInactivos) {
        return incluirInactivos ? proveedorRepository.findAll() : proveedorRepository.findByActiveTrueOrderByBusinessNameAsc();
    }

    @Transactional(readOnly = true)
    public Proveedor obtener(Long id) {
        return proveedorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
    }

    @Transactional
    public Proveedor crear(Proveedor proveedor) {
        normalizar(proveedor);
        if (proveedorRepository.findByTaxIdIgnoreCase(proveedor.getTaxId()).isPresent()) {
            throw new DuplicateResourceException("Ya existe un proveedor con el documento " + proveedor.getTaxId());
        }
        if (proveedor.getActive() == null) proveedor.setActive(true);
        Proveedor guardado = proveedorRepository.save(proveedor);
        auditoriaService.registrar("CREATE", "PROVEEDOR", guardado.getId(),
                "Proveedor registrado: " + guardado.getBusinessName());
        return guardado;
    }

    @Transactional
    public Proveedor actualizar(Long id, Proveedor cambios) {
        Proveedor proveedor = obtener(id);
        normalizar(cambios);
        if (!proveedor.getTaxId().equalsIgnoreCase(cambios.getTaxId())
                && proveedorRepository.findByTaxIdIgnoreCase(cambios.getTaxId()).isPresent()) {
            throw new DuplicateResourceException("Ya existe un proveedor con el documento " + cambios.getTaxId());
        }
        proveedor.setBusinessName(cambios.getBusinessName());
        proveedor.setTaxId(cambios.getTaxId());
        proveedor.setContactName(cambios.getContactName());
        proveedor.setEmail(cambios.getEmail());
        proveedor.setPhone(cambios.getPhone());
        proveedor.setAddress(cambios.getAddress());
        if (cambios.getActive() != null) proveedor.setActive(cambios.getActive());
        Proveedor guardado = proveedorRepository.save(proveedor);
        auditoriaService.registrar("UPDATE", "PROVEEDOR", guardado.getId(),
                "Proveedor actualizado: " + guardado.getBusinessName());
        return guardado;
    }

    @Transactional
    public void desactivar(Long id) {
        Proveedor proveedor = obtener(id);
        proveedor.setActive(false);
        proveedorRepository.save(proveedor);
        auditoriaService.registrar("DELETE", "PROVEEDOR", proveedor.getId(),
                "Proveedor desactivado: " + proveedor.getBusinessName());
    }

    private void normalizar(Proveedor proveedor) {
        if (proveedor.getBusinessName() != null) proveedor.setBusinessName(proveedor.getBusinessName().trim());
        if (proveedor.getTaxId() != null) proveedor.setTaxId(proveedor.getTaxId().trim());
    }
}

package com.sigtm.backend.service;
import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.dto.CrearSolicitudCompraRequest;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReposicionService {
    private final ProductoRepository products;
    private final SolicitudCompraRepository requests;
    private final HistorialSolicitudCompraRepository history;
    private final PoliticaReposicionRepository policies;
    private final AuditoriaService audit;
    private final CompraService compraService;

 @Transactional(readOnly=true) public List<SolicitudCompra> listar(){return requests.findAllByOrderByRequestedAtDesc();}
 @Transactional(readOnly=true) public List<ComprasResponses.SolicitudCompraResponse> listarDto(){return requests.findAllByOrderByRequestedAtDesc().stream().map(ComprasResponses.SolicitudCompraResponse::from).toList();}
 @Transactional(readOnly=true)
 public List<Map<String,Object>> sugerencias(){
  List<Map<String,Object>> result = new ArrayList<>();
  for (Producto product : products.findByActiveTrue()) {
   PoliticaReposicion policy = policies.findByProductId(product.getId()).orElse(null);
   int current = product.getCurrentStock() == null ? 0 : product.getCurrentStock();
   int minStock = product.getMinStock() == null ? 0 : product.getMinStock();
   int threshold = policy != null && policy.getReorderPoint() != null ? policy.getReorderPoint() : minStock;
   if (current > threshold) continue;
   int target = policy != null && policy.getTargetStock() != null ? policy.getTargetStock() : Math.max(1, minStock * 2);
   int lot = policy != null && policy.getMinimumLot() != null ? policy.getMinimumLot() : 1;
   int needed = Math.max(lot, target - current);
   needed = ((needed + lot - 1) / lot) * lot;
   Map<String,Object> row = new LinkedHashMap<>();
   row.put("productId", product.getId());
   row.put("code", product.getCode());
   row.put("name", product.getName());
   row.put("currentStock", current);
   row.put("minStock", minStock);
   row.put("suggestedQuantity", needed);
   if (policy != null) {
    row.put("policyApplied", true);
    row.put("reorderPoint", threshold);
    row.put("targetStock", target);
    row.put("minimumLot", lot);
    row.put("leadTimeDays", policy.getLeadTimeDays());
    if (policy.getPreferredSupplier() != null) {
     row.put("preferredSupplierId", policy.getPreferredSupplier().getId());
     row.put("preferredSupplier", policy.getPreferredSupplier().getBusinessName());
    }
   } else {
    row.put("policyApplied", false);
   }
   result.add(row);
  }
  return result;
 }
 @Transactional public SolicitudCompra crear(CrearSolicitudCompraRequest r){SolicitudCompra s=SolicitudCompra.builder().code("SC-"+UUID.randomUUID().toString().substring(0,8).toUpperCase()).requestedAt(LocalDateTime.now()).status("PENDIENTE").notes(r.notes()).build(); Set<Long> ids=new HashSet<>(); for(CrearSolicitudCompraRequest.Item i:r.items()){if(!ids.add(i.productId()))throw new IllegalArgumentException("Producto repetido en solicitud"); Producto p=products.findById(i.productId()).orElseThrow(()->new ResourceNotFoundException("Producto no encontrado")); s.getItems().add(DetalleSolicitudCompra.builder().request(s).product(p).quantity(i.quantity()).build());} s=requests.save(s);audit.registrar("CREATE","SOLICITUD_COMPRA",s.getId(),"Solicitud interna "+s.getCode());return s;}
 @Transactional public ComprasResponses.SolicitudCompraResponse crearDto(CrearSolicitudCompraRequest r){return ComprasResponses.SolicitudCompraResponse.from(crear(r));}
 @Transactional public SolicitudCompra cambiarEstado(Long id,String estado,String comment){SolicitudCompra s=requests.findById(id).orElseThrow(()->new ResourceNotFoundException("Solicitud no encontrada")); if(!"PENDIENTE".equals(s.getStatus()))throw new IllegalArgumentException("La solicitud ya fue procesada"); if(!Set.of("APROBADA","RECHAZADA","CANCELADA").contains(estado))throw new IllegalArgumentException("Estado no válido"); String previous=s.getStatus(); s.setStatus(estado); history.save(HistorialSolicitudCompra.builder().request(s).previousStatus(previous).newStatus(estado).changedAt(LocalDateTime.now()).comment(comment==null?null:comment.trim()).build()); audit.registrar("UPDATE","SOLICITUD_COMPRA",s.getId(),"Solicitud "+s.getCode()+" "+estado.toLowerCase()); return requests.save(s);}
 @Transactional public ComprasResponses.SolicitudCompraResponse cambiarEstadoDto(Long id,String estado,String comment){return ComprasResponses.SolicitudCompraResponse.from(cambiarEstado(id,estado,comment));}
 @Transactional(readOnly=true) public List<HistorialSolicitudCompra> historial(Long id){if(!requests.existsById(id))throw new ResourceNotFoundException("Solicitud no encontrada");return history.findByRequestIdOrderByChangedAtDesc(id);}
 @Transactional public OrdenCompra convertirEnOrden(Long id,Long supplierId){SolicitudCompra s=requests.findById(id).orElseThrow(()->new ResourceNotFoundException("Solicitud no encontrada")); if(!"APROBADA".equals(s.getStatus()))throw new IllegalArgumentException("Solo se convierten solicitudes aprobadas"); OrdenCompra o=compraService.crearDesdeSolicitud(supplierId,s.getItems(),"Generada desde "+s.getCode()); s.setStatus("CONVERTIDA"); requests.save(s); return o;}
}

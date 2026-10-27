package com.sigtm.backend.service;

import com.sigtm.backend.model.FacturaProveedor;
import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.repository.FacturaProveedorRepository;
import com.sigtm.backend.repository.OrdenCompraRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;

/** Genera un libro XLSX con órdenes de compra y cuentas por pagar. */
@Service
@RequiredArgsConstructor
public class ExportacionComprasService {
    private final OrdenCompraRepository orders;
    private final FacturaProveedorRepository invoices;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    @Transactional(readOnly = true)
    public byte[] generarLibro() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            CellStyle header = headerStyle(workbook);
            Sheet purchases = workbook.createSheet("Órdenes de compra");
            writeHeaders(purchases, header, "Código", "Proveedor", "Estado", "Emisión", "Esperada", "Total");
            int row = 1;
            for (OrdenCompra order : orders.findAllByOrderByIssueDateDescIdDesc()) {
                Row data = purchases.createRow(row++);
                data.createCell(0).setCellValue(order.getCode());
                data.createCell(1).setCellValue(order.getSupplier().getBusinessName());
                data.createCell(2).setCellValue(order.getStatus());
                data.createCell(3).setCellValue(order.getIssueDate().format(DATE));
                data.createCell(4).setCellValue(order.getExpectedDate() == null ? "" : order.getExpectedDate().format(DATE));
                data.createCell(5).setCellValue(order.getTotal().doubleValue());
            }
            autosize(purchases, 6);

            Sheet payables = workbook.createSheet("Cuentas por pagar");
            writeHeaders(payables, header, "Factura", "Proveedor", "Vencimiento", "Total", "Saldo", "Estado");
            row = 1;
            for (FacturaProveedor invoice : invoices.findAll()) {
                Row data = payables.createRow(row++);
                data.createCell(0).setCellValue(invoice.getNumber());
                data.createCell(1).setCellValue(invoice.getPurchaseOrder().getSupplier().getBusinessName());
                data.createCell(2).setCellValue(invoice.getDueDate().format(DATE));
                data.createCell(3).setCellValue(invoice.getTotal().doubleValue());
                data.createCell(4).setCellValue(invoice.getBalance().doubleValue());
                data.createCell(5).setCellValue(invoice.getStatus());
            }
            autosize(payables, 6);
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("No se pudo generar el reporte de compras", exception);
        }
    }

    private CellStyle headerStyle(Workbook workbook) {
        Font font = workbook.createFont(); font.setBold(true); font.setColor(IndexedColors.WHITE.getIndex());
        CellStyle style = workbook.createCellStyle(); style.setFont(font); style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex()); style.setFillPattern(FillPatternType.SOLID_FOREGROUND); return style;
    }
    private void writeHeaders(Sheet sheet, CellStyle style, String... names) { Row row = sheet.createRow(0); for (int i = 0; i < names.length; i++) { Cell cell = row.createCell(i); cell.setCellValue(names[i]); cell.setCellStyle(style); } sheet.createFreezePane(0, 1); }
    private void autosize(Sheet sheet, int count) { for (int i = 0; i < count; i++) sheet.autoSizeColumn(i); }
}

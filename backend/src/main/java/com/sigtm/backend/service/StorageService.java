package com.sigtm.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Almacena en disco los archivos subidos por los usuarios y devuelve la URL pública con
 * la que quedan disponibles.
 *
 * <p>Los archivos se organizan en carpetas mensuales dentro de {@code app.upload.dir} y
 * se renombran con un UUID para evitar colisiones.</p>
 */
@Service
@Slf4j
public class StorageService {

    private static final long MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    /**
     * Guarda un archivo en disco y devuelve la URL pública accesible (ej: /uploads/2026-08/uuid.jpg).
     *
     * <p>El destino es la carpeta del mes en curso dentro de {@code app.upload.dir} y el
     * nombre se genera con un UUID conservando la extensión original. Si el archivo
     * viene vacío se devuelve {@code null} sin escribir nada en disco.</p>
     *
     * @param file archivo recibido en la petición multipart
     * @return la URL pública del archivo, o {@code null} si no había contenido
     * @throws IOException si no se puede crear la carpeta de destino o escribir el archivo
     */
    public String store(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }
        validateImage(file);
        String monthDir = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        Path directory = Paths.get(uploadDir).resolve(monthDir).toAbsolutePath().normalize();
        FileUtils.forceMkdir(directory.toFile());

        String extension = extensionFor(file.getContentType());
        String filename = UUID.randomUUID().toString().replace("-", "") + extension;
        Path target = directory.resolve(filename);
        try (InputStream input = file.getInputStream()) {
            FileUtils.copyInputStreamToFile(input, target.toFile());
        }

        Path base = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path relative = base.relativize(target);
        return "/uploads/" + relative.toString().replace('\\', '/');
    }

    private void validateImage(MultipartFile file) throws IOException {
        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new IllegalArgumentException("Cada imagen debe pesar como máximo 10 MB");
        }
        String contentType = StringUtils.defaultIfBlank(file.getContentType(), "");
        if (!StringUtils.equalsAnyIgnoreCase(contentType, "image/jpeg", "image/png")) {
            throw new IllegalArgumentException("Solo se permiten imágenes JPEG o PNG");
        }
        try (InputStream input = file.getInputStream()) {
            BufferedImage image = ImageIO.read(input);
            if (image == null || image.getWidth() <= 0 || image.getHeight() <= 0) {
                throw new IllegalArgumentException("El archivo no contiene una imagen válida");
            }
        }
    }

    private String extensionFor(String contentType) {
        return StringUtils.equalsIgnoreCase(contentType, "image/png") ? ".png" : ".jpg";
    }
}

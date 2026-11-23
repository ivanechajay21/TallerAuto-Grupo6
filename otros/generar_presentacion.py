"""Genera una presentación editable para la exposición de SIGTM (10 minutos)."""
from pathlib import Path

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.util import Inches, Pt


OUT = Path(__file__).with_name("Presentacion_SIGTM_Arquitectura_y_Calidad.pptx")
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Paleta sobria y consistente.
NAVY = "0B1F3A"
BLUE = "1769AA"
TEAL = "00A6A6"
GREEN = "22A06B"
AMBER = "EAA221"
RED = "D64545"
INK = "16243A"
MUTED = "5F6C7B"
LIGHT = "F4F7FA"
WHITE = "FFFFFF"
LINE = "D8E0E8"


def rgb(value):
    return RGBColor.from_string(value)


def rect(slide, x, y, w, h, fill, radius=False, line=None):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    shp = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid(); shp.fill.fore_color.rgb = rgb(fill)
    shp.line.color.rgb = rgb(line or fill)
    return shp


def text(slide, value, x, y, w, h, size=18, color=INK, bold=False,
         align=PP_ALIGN.LEFT, font="Aptos", valign=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.clear(); tf.word_wrap = True; tf.vertical_anchor = valign
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run(); run.text = value
    run.font.name = font; run.font.size = Pt(size); run.font.bold = bold
    run.font.color.rgb = rgb(color)
    tf.margin_left = tf.margin_right = Pt(0)
    tf.margin_top = tf.margin_bottom = Pt(0)
    return box


def bullet_list(slide, entries, x, y, w, h, size=16, color=INK, gap=8):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.clear(); tf.word_wrap = True
    tf.margin_left = tf.margin_right = Pt(0)
    for idx, item in enumerate(entries):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.text = item
        p.font.name = "Aptos"; p.font.size = Pt(size); p.font.color.rgb = rgb(color)
        p.space_after = Pt(gap); p.level = 0
        p.text = "• " + item
    return box


def base(slide, number, section):
    bg = slide.background.fill
    bg.solid(); bg.fore_color.rgb = rgb(WHITE)
    rect(slide, 0, 0, 13.333, 0.11, TEAL)
    text(slide, "SIGTM  |  Arquitectura y calidad", 0.5, 7.08, 5.2, 0.2, 8, MUTED)
    text(slide, section.upper(), 9.7, 7.06, 2.45, 0.22, 8, MUTED, True, PP_ALIGN.RIGHT)
    text(slide, f"{number:02d}", 12.25, 7.03, 0.55, 0.24, 9, TEAL, True, PP_ALIGN.RIGHT)


def title(slide, heading, subheading, number, section):
    base(slide, number, section)
    text(slide, heading, 0.55, 0.43, 12.0, 0.55, 27, NAVY, True)
    text(slide, subheading, 0.56, 1.07, 11.8, 0.36, 12, MUTED)


def card(slide, heading, body, x, y, w, h, accent=TEAL):
    rect(slide, x, y, w, h, LIGHT, True, LINE)
    rect(slide, x, y, 0.08, h, accent, True, accent)
    text(slide, heading, x + 0.25, y + 0.22, w - 0.42, 0.34, 15, NAVY, True)
    text(slide, body, x + 0.25, y + 0.65, w - 0.42, h - 0.8, 11.5, MUTED)


def connector(slide, x1, y1, x2, y2, color=TEAL):
    line = slide.shapes.add_connector(1, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    line.line.color.rgb = rgb(color); line.line.width = Pt(2.2)
    line.line.end_arrowhead = True


# 1. Portada
slide = prs.slides.add_slide(prs.slide_layouts[6])
rect(slide, 0, 0, 13.333, 7.5, NAVY)
rect(slide, 0, 0, 0.17, 7.5, TEAL)
rect(slide, 8.75, 0.6, 3.8, 5.8, "102C4F", True)
text(slide, "SIGTM", 0.72, 1.02, 4.5, 0.7, 36, WHITE, True)
text(slide, "Arquitectura, calidad\ny evolución del backend", 0.72, 1.85, 7.0, 1.35, 31, WHITE, True)
text(slide, "Exposición técnica · TallerAuto Grupo 6", 0.75, 3.42, 5.5, 0.35, 15, "B7C7D9")
text(slide, "MVC · DAO · SOLID · TDD · Git/GitHub", 0.75, 4.2, 6.4, 0.35, 15, "64E4D7", True)
text(slide, "Duración objetivo: 9 min 30 s\nParticipación: 5 integrantes", 0.75, 5.45, 4.8, 0.55, 13, "B7C7D9")
text(slide, "ABASTECIMIENTO\nCOMPRAS\nSEGURIDAD\nCALIDAD", 9.2, 1.45, 2.9, 3.0, 20, "64E4D7", True, PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)
text(slide, "Proyecto académico", 0.72, 6.93, 3.2, 0.25, 9, "B7C7D9")

# 2. Agenda y distribución
slide = prs.slides.add_slide(prs.slide_layouts[6]); title(slide, "Ruta de la exposición", "Cada integrante explica una parte conectada del sistema.", 2, "Agenda")
roles = [
    ("01", "Integrante 1", "Apertura, objetivo y agenda · diapositivas 1–2", "1:15", TEAL),
    ("02", "Integrante 2", "Proyecto, alcance y avances · diapositiva 3", "1:30", BLUE),
    ("03", "Integrante 3", "Arquitectura MVC, DAO y seguridad · diapositiva 4", "2:00", GREEN),
    ("04", "Integrante 4", "SOLID, TDD y librerías Java · diapositivas 5–7", "2:45", AMBER),
    ("05", "Integrante 5", "Git/GitHub, evidencias y cierre · diapositivas 8–10", "2:00", RED),
]
for i, (num, who, topic, duration, accent) in enumerate(roles):
    y = 1.62 + i * 0.92
    rect(slide, 0.75, y, 0.55, 0.55, accent, True)
    text(slide, num, 0.75, y + 0.13, 0.55, 0.22, 13, WHITE, True, PP_ALIGN.CENTER)
    text(slide, who, 1.52, y + 0.03, 2.2, 0.25, 15, NAVY, True)
    text(slide, topic, 3.75, y + 0.05, 5.25, 0.28, 14, INK)
    rect(slide, 10.55, y + 0.04, 1.25, 0.34, LIGHT, True, LINE)
    text(slide, duration, 10.55, y + 0.12, 1.25, 0.14, 11, accent, True, PP_ALIGN.CENTER)
text(slide, "Consejo: reemplacen “Integrante 1–5” por sus nombres antes de exponer.", 0.78, 6.47, 10.8, 0.28, 11, MUTED)

# 3. Alcance y avances
slide = prs.slides.add_slide(prs.slide_layouts[6]); title(slide, "¿Qué es SIGTM y qué avanzamos?", "Sistema de gestión para un taller automotriz, con frontend web y backend Java.", 3, "Proyecto")
card(slide, "Base tecnológica", "React + TypeScript\nSpring Boot + Java 21\nMySQL + Docker", 0.7, 1.65, 3.75, 1.55, BLUE)
card(slide, "Procesos existentes", "Clientes, vehículos, citas, órdenes de trabajo, inventario, facturación, roles y auditoría.", 4.8, 1.65, 3.75, 1.55, TEAL)
card(slide, "Extensión realizada", "Compras, proveedores, cotizaciones, aprobaciones, recepciones, devoluciones y planificación.", 8.9, 1.65, 3.75, 1.55, GREEN)
text(slide, "Flujo de abastecimiento incorporado", 0.72, 3.78, 3.8, 0.32, 17, NAVY, True)
steps = [("Proveedor", "Alta y evaluación"), ("Solicitud", "Necesidad de compra"), ("Orden", "Aprobación"), ("Recepción", "Ingreso / inspección"), ("Reporte", "Seguimiento")]
for i, (head, body) in enumerate(steps):
    x = 0.75 + i * 2.48
    rect(slide, x, 4.4, 2.12, 1.1, LIGHT, True, LINE)
    text(slide, head, x + 0.12, 4.63, 1.88, 0.24, 13, NAVY, True, PP_ALIGN.CENTER)
    text(slide, body, x + 0.13, 4.96, 1.86, 0.25, 10.5, MUTED, False, PP_ALIGN.CENTER)
    if i < len(steps)-1: connector(slide, x + 2.12, 4.95, x + 2.4, 4.95)
text(slide, "Resultado: funcionalidades nuevas de backend, listas para integrarse a pantallas futuras del frontend.", 0.75, 6.18, 11.6, 0.3, 12, MUTED)

# 4. Arquitectura MVC, DAO y seguridad
slide = prs.slides.add_slide(prs.slide_layouts[6]); title(slide, "Arquitectura: MVC + DAO + seguridad", "Separación de responsabilidades desde la interfaz hasta la persistencia.", 4, "Arquitectura")
layers = [
    ("Frontend", "React / TypeScript\nformularios y vistas", 0.72, BLUE),
    ("Controller", "REST API\nrecibe y responde HTTP", 3.2, TEAL),
    ("Service", "reglas de negocio\ntransacciones y auditoría", 5.68, GREEN),
    ("Repository / DAO", "Spring Data JPA\nconsultas por entidad", 8.16, AMBER),
    ("Datos", "MySQL\nmodelos y relaciones", 10.64, RED),
]
for i, (name, body, x, accent) in enumerate(layers):
    rect(slide, x, 2.08, 1.98, 1.35, LIGHT, True, LINE)
    rect(slide, x, 2.08, 1.98, 0.13, accent, True, accent)
    text(slide, name, x + 0.12, 2.4, 1.74, 0.25, 13, NAVY, True, PP_ALIGN.CENTER)
    text(slide, body, x + 0.14, 2.74, 1.7, 0.43, 10.5, MUTED, False, PP_ALIGN.CENTER)
    if i < 4: connector(slide, x + 1.98, 2.76, x + 2.37, 2.76)
card(slide, "MVC", "Modelo: entidades y DTO. Vista: React. Controlador: endpoints REST que orquestan la solicitud.", 0.74, 4.15, 3.72, 1.35, BLUE)
card(slide, "DAO", "Cada repositorio especializado —por ejemplo ClienteRepository u OrdenCompraRepository— encapsula el acceso a datos.", 4.82, 4.15, 3.72, 1.35, AMBER)
card(slide, "Seguridad transversal", "JWT, contraseñas cifradas, roles/permisos con @PreAuthorize, auditoría y límite de intentos de inicio de sesión.", 8.9, 4.15, 3.72, 1.35, RED)

# 5. SOLID mediante un flujo visual del portal
slide = prs.slides.add_slide(prs.slide_layouts[6]); title(slide, "SOLID visible: registro de clientes", "Demostración usando una función disponible en el frontend, sin mostrar código fuente.", 5, "Diseño")

# Flujo principal que el equipo puede seguir de izquierda a derecha mientras expone.
flow = [
    ("Portal\nClientes", "Formulario", BLUE),
    ("ClienteController", "HTTP / API", TEAL),
    ("ClienteService", "Reglas de negocio", GREEN),
    ("ClienteRepository", "DAO / consultas", AMBER),
    ("MySQL", "Persistencia", RED),
]
for i, (head, body, accent) in enumerate(flow):
    x = 0.45 + i * 2.58
    rect(slide, x, 1.72, 2.03, 1.26, LIGHT, True, LINE)
    rect(slide, x, 1.72, 2.03, 0.12, accent, True, accent)
    text(slide, head, x + 0.16, 1.99, 1.7, 0.37, 14, NAVY, True, PP_ALIGN.CENTER)
    text(slide, body, x + 0.14, 2.65, 1.75, 0.19, 10.5, MUTED, False, PP_ALIGN.CENTER)
    if i < 4: connector(slide, x + 2.03, 2.35, x + 2.48, 2.35)

# Servicios colaboradores del registro, representados por cajas en lugar de código.
rect(slide, 4.0, 3.65, 2.35, 0.85, "E9F7F4", True, "B9E5DB")
text(slide, "CodeGeneratorService", 4.18, 3.88, 2.0, 0.2, 12, GREEN, True, PP_ALIGN.CENTER)
text(slide, "genera código CLI", 4.18, 4.16, 2.0, 0.16, 9.5, MUTED, False, PP_ALIGN.CENTER)
rect(slide, 6.98, 3.65, 2.35, 0.85, "EAF3FA", True, "BED9EC")
text(slide, "AuditoriaService", 7.18, 3.88, 1.95, 0.2, 12, BLUE, True, PP_ALIGN.CENTER)
text(slide, "registra el evento", 7.18, 4.16, 1.95, 0.16, 9.5, MUTED, False, PP_ALIGN.CENTER)
connector(slide, 5.17, 3.65, 5.17, 3.15, GREEN)
connector(slide, 8.15, 3.65, 6.55, 3.15, BLUE)

# Evidencias SOLID, vinculadas explícitamente con las cajas de la parte superior.
solid_notes = [
    ("S", "Responsabilidad única", "Cada caja tiene una tarea: interfaz, HTTP, regla, datos o base de datos.", TEAL),
    ("D", "Inversión de dependencias", "ClienteService recibe Repository, generador y auditoría; no los crea directamente.", RED),
    ("I", "Interfaces enfocadas", "ClienteRepository trabaja con clientes; no mezcla vehículos, facturas u órdenes.", AMBER),
    ("L", "Sustitución", "En pruebas, el repositorio real se reemplaza por un mock con el mismo contrato.", GREEN),
    ("O", "Extensión", "Se puede sumar notificación o validación sin convertir el flujo en una clase gigante.", BLUE),
]
for i, (letter, head, body, accent) in enumerate(solid_notes):
    x = 0.46 + (i % 3) * 4.27
    y = 5.0 + (i // 3) * 0.82
    rect(slide, x, y, 3.9, 0.63, WHITE, True, LINE)
    rect(slide, x + 0.1, y + 0.11, 0.39, 0.39, accent, True, accent)
    text(slide, letter, x + 0.1, y + 0.2, 0.39, 0.14, 10, WHITE, True, PP_ALIGN.CENTER)
    text(slide, head, x + 0.62, y + 0.1, 1.65, 0.16, 10.5, NAVY, True)
    text(slide, body, x + 0.62, y + 0.31, 3.06, 0.2, 8.8, MUTED)

# 6. TDD
slide = prs.slides.add_slide(prs.slide_layouts[6]); title(slide, "TDD: una regla de negocio comprobable", "Caso: no permitir registrar un cliente cuyo documento ya pertenece a otro cliente.", 6, "Calidad")
phases = [
    ("1. RED", "La prueba exige una excepción para un documento duplicado. Sin esa regla, falla.", RED),
    ("2. GREEN", "ClienteService consulta el repositorio y lanza DuplicateResourceException.", GREEN),
    ("3. REFACTOR", "Se mejora el diseño sin alterar el comportamiento protegido por la prueba.", BLUE),
]
for i, (head, body, accent) in enumerate(phases):
    x = 0.78 + i * 4.15
    rect(slide, x, 1.75, 3.42, 1.5, LIGHT, True, LINE)
    rect(slide, x, 1.75, 3.42, 0.12, accent, True, accent)
    text(slide, head, x + 0.28, 2.05, 2.9, 0.3, 18, accent, True)
    text(slide, body, x + 0.28, 2.48, 2.86, 0.55, 11.5, MUTED)
    if i < 2: connector(slide, x + 3.42, 2.5, x + 4.0, 2.5, TEAL)
rect(slide, 0.8, 3.85, 11.75, 1.45, "102C4F", True)
text(slide, "Prueba existente: rechazaDocumentoQueYaPerteneceAOtroCliente()", 1.08, 4.1, 7.3, 0.3, 15, WHITE, True)
text(slide, "Configura al repositorio para devolver un cliente existente y verifica que no se guarde ni audite el nuevo registro.", 1.08, 4.56, 8.8, 0.28, 11.5, "D6E3EF")
text(slide, "./mvnw -Dtest=ClienteServiceTest test", 8.65, 4.2, 3.25, 0.35, 12, "64E4D7", True, PP_ALIGN.CENTER)
text(slide, "Demostración oral: mostrar primero el resultado fallido en una rama temporal y luego restaurar/implementar la validación hasta obtener BUILD SUCCESS.", 0.8, 5.88, 11.8, 0.4, 12, MUTED)

# 7. Librerías
slide = prs.slides.add_slide(prs.slide_layouts[6]); title(slide, "Librerías Java con uso funcional", "Dependencias declaradas en backend/pom.xml y vinculadas a necesidades concretas.", 7, "Tecnología")
libs = [
    ("Apache POI", "Exporta reportes de compras a archivos Excel .xlsx.", "ReporteExcelService", BLUE),
    ("Google Guava", "Controla intentos fallidos de autenticación y ayuda a limitar fuerza bruta.", "LoginAttemptService", RED),
    ("Apache Commons", "Normaliza MIME y gestiona archivos de imágenes de recepción.", "StorageService", AMBER),
    ("Logback", "Centraliza trazabilidad de aplicación, autenticación y eventos en contenedores.", "logback-spring.xml", GREEN),
]
for i, (head, body, place, accent) in enumerate(libs):
    x = 0.78 + (i % 2) * 6.02; y = 1.72 + (i // 2) * 2.08
    rect(slide, x, y, 5.55, 1.63, LIGHT, True, LINE)
    rect(slide, x, y, 0.13, 1.63, accent, True, accent)
    text(slide, head, x + 0.3, y + 0.25, 4.7, 0.27, 16, NAVY, True)
    text(slide, body, x + 0.3, y + 0.66, 4.7, 0.45, 11.5, MUTED)
    rect(slide, x + 0.3, y + 1.22, 1.9, 0.22, "E7EDF3", True, "E7EDF3")
    text(slide, place, x + 0.38, y + 1.26, 1.75, 0.12, 8.5, accent, True, PP_ALIGN.CENTER)
text(slide, "No se agregaron como dependencias decorativas: cada librería responde a una funcionalidad o requisito técnico documentado.", 0.8, 6.23, 11.7, 0.3, 12, INK)

# 8. Version control
slide = prs.slides.add_slide(prs.slide_layouts[6]); title(slide, "Control de versiones: Git + GitHub", "Flujo colaborativo para cambios revisables, trazables y verificables.", 8, "Colaboración")
gitsteps = [("Rama", "feature/...", BLUE), ("Cambios", "código + pruebas + docs", TEAL), ("Commit", "mensaje descriptivo", GREEN), ("Pull Request", "revisión y CI", AMBER), ("Merge", "integración a main", RED)]
for i, (head, body, accent) in enumerate(gitsteps):
    x = 0.48 + i * 2.55
    rect(slide, x, 2.05, 2.08, 1.32, LIGHT, True, LINE)
    text(slide, str(i+1), x + 0.18, 2.25, 0.32, 0.26, 14, accent, True)
    text(slide, head, x + 0.54, 2.22, 1.35, 0.25, 14, NAVY, True)
    text(slide, body, x + 0.18, 2.72, 1.73, 0.28, 10.5, MUTED, False, PP_ALIGN.CENTER)
    if i < 4: connector(slide, x + 2.08, 2.7, x + 2.46, 2.7, TEAL)
card(slide, "Qué debe evidenciarse en el PR", "Descripción del cambio, módulos afectados, pasos de prueba, documentación actualizada y evidencia opcional.", 0.75, 4.3, 3.7, 1.38, BLUE)
card(slide, "Qué protege el flujo", "Revisión de pares, pruebas automatizadas, control de dependencias y prevención de secretos en el repositorio.", 4.82, 4.3, 3.7, 1.38, GREEN)
card(slide, "Regla de oro", "No se suben .env, tokens, node_modules, target ni dist. Los cambios se validan antes del merge.", 8.89, 4.3, 3.7, 1.38, RED)

# 9. Evidencias/demo
slide = prs.slides.add_slide(prs.slide_layouts[6]); title(slide, "Evidencias para la evaluación", "Una demostración breve vale más que describir el código de memoria.", 9, "Evidencia")
evidence = [
    ("Arquitectura", "Abrir arquitectura-sigtm.drawio y explicar el flujo MVC → DAO.", "docs/arquitectura-sigtm.drawio", BLUE),
    ("TDD", "Abrir ClienteServiceTest y ejecutar la prueba de documento duplicado.", "backend/src/test/.../ClienteServiceTest.java", RED),
    ("Librerías", "Mostrar pom.xml y README_LIB_JAVA.md con el uso de cada dependencia.", "README_LIB_JAVA.md", AMBER),
    ("Módulos", "Mostrar README_MODULOS_ADICIONALES.md y los endpoints de abastecimiento.", "README_MODULOS_ADICIONALES.md", GREEN),
]
for i, (head, body, place, accent) in enumerate(evidence):
    y = 1.58 + i * 1.18
    rect(slide, 0.78, y, 11.75, 0.86, LIGHT, True, LINE)
    rect(slide, 0.78, y, 0.14, 0.86, accent, True, accent)
    text(slide, head, 1.18, y + 0.15, 1.5, 0.26, 14, NAVY, True)
    text(slide, body, 2.85, y + 0.14, 5.65, 0.32, 11.5, INK)
    text(slide, place, 8.75, y + 0.18, 3.25, 0.22, 9.5, accent, True, PP_ALIGN.RIGHT)
text(slide, "La métrica local alcanzada: 50.83 % Java frente a TypeScript. Presentar esta cifra como resultado técnico, no como sustituto de funcionalidad.", 0.8, 6.35, 11.55, 0.3, 11.5, MUTED)

# 10. Cierre
slide = prs.slides.add_slide(prs.slide_layouts[6])
rect(slide, 0, 0, 13.333, 7.5, NAVY)
rect(slide, 0, 0, 13.333, 0.12, TEAL)
text(slide, "Conclusión", 0.75, 0.75, 4.8, 0.55, 29, WHITE, True)
text(slide, "El valor del proyecto está en cómo las piezas trabajan juntas.", 0.77, 1.47, 8.8, 0.35, 16, "B7C7D9")
closing = [
    ("Arquitectura", "MVC y DAO separan responsabilidades."),
    ("Calidad", "TDD protege reglas de negocio con pruebas."),
    ("Diseño", "SOLID reduce acoplamiento y facilita evolución."),
    ("Colaboración", "Git/GitHub aportan trazabilidad y revisión."),
]
for i, (head, body) in enumerate(closing):
    y = 2.24 + i * 0.78
    rect(slide, 0.8, y, 0.32, 0.32, TEAL, True)
    text(slide, "✓", 0.8, y + 0.05, 0.32, 0.16, 11, WHITE, True, PP_ALIGN.CENTER)
    text(slide, head + ":", 1.4, y + 0.02, 1.65, 0.25, 14, "64E4D7", True)
    text(slide, body, 3.05, y + 0.02, 6.25, 0.25, 14, WHITE)
rect(slide, 9.7, 2.2, 2.55, 2.7, "102C4F", True)
text(slide, "Preguntas", 9.92, 2.73, 2.1, 0.4, 22, "64E4D7", True, PP_ALIGN.CENTER)
text(slide, "Gracias", 9.92, 3.55, 2.1, 0.35, 18, WHITE, True, PP_ALIGN.CENTER)
text(slide, "SIGTM · Grupo 6", 9.92, 4.18, 2.1, 0.25, 10, "B7C7D9", False, PP_ALIGN.CENTER)
text(slide, "Presentación preparada para 5 integrantes · 10 minutos máximo", 0.75, 6.85, 6.4, 0.22, 9, "B7C7D9")

prs.core_properties.title = "SIGTM - Arquitectura y Calidad"
prs.core_properties.subject = "Exposición técnica de 10 minutos"
prs.core_properties.author = "TallerAuto Grupo 6"
prs.save(OUT)
print(f"Presentación generada: {OUT}")

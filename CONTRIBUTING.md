# Guía de colaboración — SIGTM

Este documento define cómo trabaja el equipo de **5 integrantes** en el repositorio.
El objetivo es que `main` permanezca siempre estable, probada y desplegable.

---

## 1. Requisitos previos

- Cuenta de GitHub.
- Git instalado (`git --version`).
- Haber aceptado la invitación al repositorio.

---

## 2. Invitar a los 5 colaboradores (lo hace el creador)

1. Entrar al repositorio: <https://github.com/ivanechajay21/TallerAuto-Grupo6>.
2. Ir a **Settings** → **Collaborators** (o **Collaborators and teams**).
3. Pulsar **Add people**.
4. Escribir el **usuario de GitHub** de cada integrante y asignar el rol **Write**.
5. Repetir 5 veces (uno por integrante).
6. Cada invitado debe **aceptar la invitación** (correo o notificación de GitHub).

> **Rol recomendado:** `Write` para los 5. Permite crear ramas, hacer push y abrir Pull Requests, pero **no** modificar la configuración del repositorio. Reserva `Admin`/`Maintain` solo para el líder.

### 2.1 Proteger la rama `main` (obligatorio)

**Settings** → **Branches** → **Add branch protection rule**:

- **Branch name pattern:** `main`
- ✅ **Require a pull request before merging**
  - ✅ **Require approvals:** `1`
  - ✅ **Dismiss stale pull request approvals when new commits are pushed**
- ✅ **Require status checks to pass before merging**
  - Seleccionar los checks `Backend (Java 21)` y `Frontend (Node 20)` (aparecen tras el primer PR).
- ✅ **Require conversation resolution before merging**
- ✅ **Do not allow bypassing the above settings**
- ❌ **Allow force pushes** (desmarcado)
- ❌ **Allow deletions** (desmarcado)

> En repositorios **privados**, algunas reglas de protección requieren plan GitHub Pro/Team. En repositorios **públicos** están disponibles en el plan gratuito.

Con esto, **nadie puede hacer push directo a `main`**: todo entra por PR revisado y con CI en verde.

---

## 3. Flujo de trabajo diario

### 3.1 Clonar (una sola vez)

```bash
git clone https://github.com/ivanechajay21/TallerAuto-Grupo6.git
cd TALLERAUTO
git config user.name "Tu Nombre"
git config user.email "tu@correo.com"
```

### 3.2 Actualizar `main` y crear la rama

```bash
git checkout main
git pull origin main
git checkout -b feature/nombre-corto
```

### 3.3 Trabajar y commitear con frecuencia

```bash
git add .
git commit -m "feat: descripción concreta del cambio"
```

- No acumules días de trabajo sin commit.
- Un commit = un cambio lógico.
- Si tocaste varios temas, divide en varios commits.

### 3.4 Subir la rama

```bash
git push -u origin feature/nombre-corto
```

### 3.5 Abrir el Pull Request

1. GitHub mostrará **Compare & pull request**.
2. Título descriptivo y descripción (usa la plantilla automática).
3. Asignar **1 revisor** de otro integrante.
4. Esperar **aprobación + CI en verde**.
5. **Squash and merge** (recomendado) o **Merge commit**.
6. Borrar la rama remota tras el merge.

### 3.6 Volver a `main`

```bash
git checkout main
git pull origin main
git branch -d feature/nombre-corto
```

---

## 4. Estrategia de ramas (Git Flow simplificado)

| Rama | Propósito | ¿Quién escribe? |
|---|---|---|
| `main` | Código estable, probado y desplegable | Solo merges de PR aprobados |
| `feature/*` | Nueva funcionalidad | Cada integrante |
| `fix/*` | Corrección de errores | Cada integrante |
| `docs/*` | Documentación | Cada integrante |
| `test/*` | Pruebas | Cada integrante |
| `refactor/*` | Refactorización | Cada integrante |

**Convención de nombres:** `tipo/descripcion-corta-en-kebab-case`

Ejemplos:

- `feature/exportacion-excel-poi`
- `fix/token-reset-hash`
- `docs/manual-despliegue`
- `test/orden-trabajo-service`

**Reglas:**

- Una rama = una funcionalidad o corrección.
- No reutilices una rama ya mergeada.
- No trabajes directamente en `main`.
- Mantén la rama corta (ideal: menos de 1 semana).

---

## 5. Convención de commits

Formato: `tipo: descripción en imperativo y en minúscula`

| Tipo | Uso | Ejemplo |
|---|---|---|
| `feat` | Nueva funcionalidad | `feat: agregar exportación de reportes a Excel` |
| `fix` | Corrección de error | `fix: impedir stock negativo al registrar salida` |
| `docs` | Documentación | `docs: documentar el flujo de ramas` |
| `test` | Pruebas | `test: cubrir RolService con Mockito` |
| `refactor` | Refactorización | `refactor: extraer CurrentUserService` |
| `chore` | Configuración/mantenimiento | `chore: actualizar dependencias de Maven` |

**Evitar:** `"avances"`, `"cambios"`, `"subida"`, `"prueba"`, `"final"`.

**Buenos ejemplos:**

```text
feat: agregar validación de stock en la salida de inventario
fix: corregir cálculo del total en facturas pagadas
test: agregar pruebas de autorización en ProductoController
docs: actualizar README con el equipo y el flujo de trabajo
```

---

## 6. Reglas para evitar conflictos

1. **Actualiza antes de empezar:** `git pull origin main`.
2. **Ramas cortas:** integra pronto; cuanto más dure la rama, más conflictos.
3. **Archivos compartidos:** avisa en el chat antes de tocar `pom.xml`, `package.json`, `App.tsx`, `Sidebar.tsx`, `docker-compose.yml` o `application.yml`.
4. **Un tema por PR:** no mezcles refactor + feature + formato.
5. **Rebase, no merge, para actualizar tu rama:**
   ```bash
   git fetch origin
   git rebase origin/main
   ```
6. **Resolver conflictos:**
   ```bash
   git status
   # editar los archivos marcados
   git add archivo-resuelto
   git rebase --continue
   # si te pierdes:
   git rebase --abort
   ```

---

## 7. Antes de abrir un Pull Request

Ejecuta las pruebas localmente:

```bash
# Backend (sin base de datos)
cd backend
./mvnw -Dtest=ProductoServiceTest,RolServiceTest,ProductoControllerTest,RolControllerTest test

# Frontend
cd frontend
npm test
```

Checklist:

- [ ] La rama está actualizada con `main`.
- [ ] Las pruebas pasan.
- [ ] No subí `.env`, contraseñas ni tokens.
- [ ] No subí `node_modules/`, `target/` ni `dist/`.
- [ ] Actualicé la documentación si cambió el comportamiento.
- [ ] El PR tiene título y descripción claros.
- [ ] Asigné un revisor.

---

## 8. Revisión de código (code review)

El revisor debe comprobar:

- ¿El cambio hace lo que dice el PR?
- ¿Hay pruebas? ¿Cubren el caso feliz y los errores?
- ¿Se respetan las capas (Controller → Service → Repository)?
- ¿Hay credenciales, tokens o datos sensibles en el diff?
- ¿Se rompió alguna regla de seguridad (`@PreAuthorize`, validación, CORS)?
- ¿El código es legible y consistente con el resto?

**No apruebes** si:

- El CI está en rojo.
- Hay secretos en el código.
- Falta la prueba del cambio.
- El PR mezcla demasiados temas.

---

## 9. Seguridad: reglas no negociables

- **Nunca** hagas commit de `.env`, `.env.local` ni claves.
- Usa `.env.example` como plantilla.
- No imprimas tokens ni contraseñas en logs.
- No desactives `@PreAuthorize` para “probar rápido”.
- No subas archivos de usuarios reales (`uploads/`).
- Si detectas una credencial expuesta, avisa al líder y **rótala**.

---

## 10. Reparto sugerido para 5 integrantes

| Integrante | Área principal | Archivos típicos |
|---|---|---|
| 1 | Líder · Backend y seguridad | `security/`, `AuthService`, `pom.xml` |
| 2 | Backend · Negocio y API | `service/`, `controller/`, `repository/` |
| 3 | Frontend · UI/UX | `pages/`, `components/`, `context/` |
| 4 | QA · Pruebas, CI y docs | `src/test/`, `*.test.tsx`, `.github/`, `docs/` |
| 5 | DevOps · Docker y BD | `docker-compose.yml`, `Dockerfile`, `application.yml`, migraciones |

> Ajusten el reparto según el avance real. Lo importante es que **cada quien tenga un área** y que los archivos compartidos se coordinen.

---

## 11. Definición de “terminado” (Definition of Done)

Un cambio está terminado cuando:

1. Está en una rama propia.
2. Tiene pruebas y pasan.
3. El CI está en verde.
4. Tiene al menos **1 aprobación**.
5. Se mergeó a `main`.
6. La documentación quedó actualizada.
7. La rama se eliminó.

---

## 12. Comandos útiles

```bash
# Ver en qué rama estoy y qué cambió
git status
git branch

# Ver historial compacto
git log --oneline --graph --decorate -15

# Ver diferencias antes de commitear
git diff

# Deshacer cambios no confirmados de un archivo
git restore archivo.java

# Traer cambios remotos sin mergear
git fetch origin

# Actualizar mi rama con main
git rebase origin/main

# Ver ramas remotas
git branch -r
```

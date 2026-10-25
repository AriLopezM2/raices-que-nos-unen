# Raíces que nos unen — Unidad I

## Publicación con GitHub y Railway

Versión lista para subir el código a GitHub y ejecutar el servidor Node.js en Railway. **No necesitas base de datos para una beta**: las salas y puntuaciones son temporales en memoria. El progreso de las actividades individuales se guarda en cada navegador (`localStorage`), no se centraliza.

### 1. Probar en tu computadora (opcional)

Instala Node.js 20+ desde https://nodejs.org/ y, en la carpeta del proyecto, ejecuta:

```bash
npm start
```

Abre http://localhost:3000. Para detener el servidor: Ctrl+C.

### 2. Subir a GitHub

1. En https://github.com/ crea un repositorio nuevo, por ejemplo `raices-que-nos-unen` (mejor **privado** durante las pruebas).
2. Selecciona **Add file > Upload files** dentro del repositorio.
3. **Descomprime este ZIP** y sube los archivos que contiene directamente a la **raíz del repositorio**. No subas solo el ZIP ni una carpeta que encierre todos los archivos.
4. Verifica que `package.json` y `server.js` aparezcan directamente al abrir la página principal del repositorio.
5. Haz clic en **Commit changes**.

También puedes subir el código mediante Git y GitHub Desktop si te resulta más cómodo.

### 3. Publicar en Railway

1. En https://railway.com/ regístrate o inicia sesión y conecta tu cuenta de GitHub.
2. En el panel de Railway, haz clic en **New Project > Deploy from GitHub repo**.
3. Selecciona el repositorio `raices-que-nos-unen` y confirma el despliegue.
4. Railway reconocerá `package.json`. Si no detecta el inicio, configura **Start Command** con `npm start` (o `node server.js`).
5. Cuando el despliegue figure como activo, abre el servicio, ve a **Settings > Networking > Generate Domain**.
6. Visita la dirección HTTPS que Railway haya generado, por ejemplo `https://<nombre-asignado>.up.railway.app` (este ejemplo NO es una URL real).
7. Comprueba que la web se abre desde un celular con datos móviles, fuera de tu Wi-Fi.

**Comprobación de salud:** abre `https://<tu-dominio>/api/health`. Debes ver un JSON que incluye `"status":"ok"`.

### 4. Probar el juego multijugador

1. El organizador abre el dominio público, entra en **Desafíos > Crear sala** y genera un PIN.
2. Comparte el **enlace de invitación** que muestra el organizador (el PIN va incluido) o comunica el PIN por separado.
3. Otros estudiantes abren el mismo dominio desde sus celulares, pulsan **Unirse a partida**, ingresan PIN y apodo.
4. El organizador inicia y controla la partida desde el navegador.

El prototipo admite **hasta 40 participantes por sala** según su código actual. No hay cuentas ni contraseñas de organizador permanentes.

### 5. Crear el QR

Cuando Railway te asigne el dominio, usa exactamente esa URL para crear un QR de acceso general. Para QR de una sala concreta, utiliza la invitación que genera la web, que agrega el PIN a la dirección. El QR general seguirá funcionando mientras conserves ese dominio.

### 6. Actualizaciones

Edita `data.js` para modificar contenidos y preguntas, y `styles.css` o `learning.css` para estilos. Sube los cambios al mismo repositorio con un nuevo commit: Railway normalmente desplegará la rama vinculada automáticamente.

## Notas técnicas y límites de la beta

- Frontend: HTML/CSS/JS. Backend: Node.js incorporado (`http`, sin dependencias externas).
- La sincronización usa **Server-Sent Events (SSE)** y solicitudes HTTP, no WebSocket ni Socket.IO.
- `server.js` ya escucha en `process.env.PORT` y en `0.0.0.0`, apropiado para Railway.
- Mantén **una sola réplica del servicio**: las salas están en memoria de ese único proceso.
- Al reiniciarse/republicarse el servidor se pierden salas y puntuaciones activas.
- El progreso individual solo está en el navegador local; se borra si el usuario elimina los datos del sitio y no se transfiere entre dispositivos. El CSV individual se exporta manualmente.
- La creación de salas está abierta y no hay protección contra abuso para Internet público; úsalo como **beta supervisada**, no como plataforma de producción definitiva. Para abrirlo a una audiencia amplia hay que incorporar límites de solicitudes, autenticación del organizador, monitoreo, mayor seguridad y, si se desea persistencia, base de datos.
- La plataforma y los cuestionarios son un prototipo académico independiente. Conviene validar las preguntas históricas con la docente antes de aplicar el sistema como evaluación formal.
- Railway ofrece opciones de prueba y planes de pago, con créditos y límites cambiantes. Revisa https://docs.railway.com/pricing/plans antes de aceptar sus condiciones.

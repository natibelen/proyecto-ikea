# proyecto-ikea

## Cómo hacer una sesión de prueba

1. Abre el panel de investigadores agregando `#investigadores` al final de la URL (PIN: taller2026) y pulsa «Demo construcción» o «Demo observación». Sigue el flujo hasta el final; las demos quedan marcadas con `es_demo=1` y no contaminan los datos reales. Con «← Volver al panel» regresas en cualquier momento.
2. Para sesiones reales, entrega al participante solo un **número de participante**: del **1 al 30** queda en construcción y del **31 al 60** en observación. El grupo sale del número (el participante no ve ningún grupo ni letra). El campo solo acepta números, avisa si el número es menor que 1 o mayor que 60, y rechaza un número ya usado.
3. En el panel, la tarjeta «Números de participante» muestra el próximo número libre de cada grupo y los ya usados. Sin Google Sheets solo conoce los números usados **en ese computador**; con Google Sheets conectado combina los de todos los computadores y participantes en línea.
4. Desde el panel también puedes ver los 6 diseños, revisar registros, exportar CSV, vincular un archivo CSV local, borrar datos demo o todos los registros y reiniciar la sesión en curso. El PIN está dentro del código, así que es una barrera visual y no seguridad real. Cámbialo en la constante PIN.

## Poner el experimento en línea

La app es una página estática: se publica gratis con **GitHub Pages** y las respuestas se guardan en una **hoja de Google Sheets** mediante un pequeño script de **Google Apps Script** (`servidor/Codigo.gs`). Cada respuesta queda también en el navegador del participante como respaldo.

### 1. Crear la hoja y el script (una sola vez)

Se necesita una cuenta de Google. Recomendado: un Gmail personal o compartido del equipo (las cuentas institucionales a veces no permiten publicar scripts con acceso «Cualquier persona»).

1. En Google Drive, crea una hoja de cálculo vacía (por ejemplo «Efecto IKEA – respuestas»). No la compartas públicamente.
2. En la hoja: **Extensiones → Apps Script**. Borra lo que aparece, pega todo el contenido de `servidor/Codigo.gs` y guarda (ícono de disco).
3. **Implementar → Nueva implementación** → en el engranaje elige **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
4. Pulsa **Implementar** y autoriza. Google mostrará «Google no ha verificado esta app»: pulsa *Configuración avanzada* → *Ir a … (no seguro)* → *Permitir*. Es normal: el script es de ustedes y solo escribe en esa hoja.
5. Copia la **URL de la aplicación web** (termina en `/exec`).
6. Pégala en `proyecto/js/config.js`:
   ```js
   const SHEETS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   ```
7. Haz commit y push.

Si más adelante cambian `Codigo.gs`, usen **Implementar → Gestionar implementaciones → Editar (lápiz) → Versión: nueva versión**; así la URL no cambia.

### 2. Publicar la página con GitHub Pages (una sola vez)

Lo debe hacer la dueña del repositorio (natibelen):

1. En GitHub: **Settings → Pages**.
2. *Source*: **Deploy from a branch**. *Branch*: la rama a publicar (por ejemplo `Actualizacion` o `main`) y carpeta **/ (root)** → **Save**.
3. Tras uno o dos minutos la app queda en:
   `https://natibelen.github.io/proyecto-ikea/proyecto/`
   - Panel de investigadoras: `https://natibelen.github.io/proyecto-ikea/proyecto/#investigadores`
   - Cada push a esa rama actualiza la página automáticamente.

### 3. Comprobar que todo funciona

1. Abre el panel (`…/proyecto/#investigadores`). En «En línea (Google Sheets)» debe decir **conectado**.
2. Haz una demo completa. En la hoja aparecerá la pestaña **respuestas** con 6 filas `DEMO-…` y `es_demo = 1`.

### 4. Invitar participantes

- En el panel, tarjeta «Link para un participante»: escribe el número (sugiere el próximo libre), pulsa **Copiar link** y envíaselo a esa persona. El link se ve así: `…/proyecto/?p=12`.
- Con su link, la persona lee el consentimiento y entra directo a la actividad, sin escribir ningún número.
- Si un número ya tiene respuestas en la hoja, su link muestra «Este enlace ya fue utilizado» y no deja participar de nuevo.
- Desde un celular o tablet la página pide abrir el link en un computador (la tarea se hace con mouse o trackpad).
- Al terminar, la pantalla final confirma el envío («Ya puedes cerrar esta pestaña»). Si se cortó internet, muestra **Reintentar**. Lo pendiente también se reenvía solo la próxima vez que se abra la página en ese navegador.
- Las sesiones presenciales también se envían a la hoja si el computador tiene internet. Para subir sesiones antiguas de un computador: panel → **Enviar pendientes**.

### 5. Descargar los datos

En la hoja: pestaña **respuestas** → **Archivo → Descargar → Valores separados por comas (.csv)**. Ese archivo tiene las mismas columnas que el CSV de la app (más `recibido_en`) y se analiza igual:

```bash
cd analisis_efecto_ikea
python analizar.py --input datos --output resultados
```

### Privacidad

- **Este repositorio es público.** No subas a GitHub CSV con respuestas reales: guárdenlos en la hoja de Google y en sus computadores. El consentimiento menciona un repositorio *privado*; si quieren guardar datos en GitHub, hagan privado el repositorio (GitHub Pages en repositorios privados requiere GitHub Pro, gratis con GitHub Student Developer Pack).
- La URL del script queda visible en el código de la página. Por eso el script solo informa qué **números** ya tienen respuestas (nunca precios ni tiempos) y valida cada fila que recibe; filas con formato inválido se descartan.

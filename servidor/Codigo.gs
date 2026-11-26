/**
 * Receptor de respuestas del experimento «Efecto IKEA» para Google Apps Script.
 *
 * Instalación (detalle en el README principal):
 *   1. Crear una hoja de cálculo de Google vacía.
 *   2. Extensiones → Apps Script → pegar este archivo completo → Guardar.
 *   3. Implementar → Nueva implementación → Aplicación web.
 *      Ejecutar como: «Yo». Quién tiene acceso: «Cualquier persona».
 *   4. Copiar la URL que termina en /exec y pegarla en SHEETS_URL (proyecto/js/config.js).
 *
 * Las respuestas quedan en la pestaña «respuestas», con las mismas columnas que el CSV
 * de la aplicación más «recibido_en». Para el análisis: Archivo → Descargar → CSV.
 *
 * La URL del script queda visible en el código de la página, por eso:
 *   - doGet solo informa qué números de participante ya tienen respuestas (nunca los precios);
 *   - doPost valida estrictamente cada fila y descarta lo que no tenga el formato esperado.
 */
const HOJA = 'respuestas';
const COLS = ['participant_id', 'session_code', 'group', 'es_demo', 'order', 'object_type', 'difficulty', 'price_clp',
  'build_time_s', 'response_time_s', 'errors', 'removals', 'completed', 'timestamp', 'recibido_en'];
// Debe coincidir con GRUPOS en proyecto/js/config.js.
const RANGOS = { construccion: [1, 30], observacion: [31, 60] };
const MAX_FILAS_POR_ENVIO = 200;

function hoja_() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const h = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);
  if (h.getLastRow() === 0) {
    h.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold');
    h.setFrozenRows(1);
  }
  return h;
}

function json_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

/** Grupo que corresponde a un código: número 1–60, código antiguo C01/O01 o DEMO-C/DEMO-O. */
function grupoDe_(codigo) {
  if (/^\d{1,2}$/.test(codigo)) {
    const n = Number(codigo);
    for (const g in RANGOS) if (n >= RANGOS[g][0] && n <= RANGOS[g][1]) return g;
    return null;
  }
  if (/^(C\d{2,3}|DEMO-C)$/.test(codigo)) return 'construccion';
  if (/^(O\d{2,3}|DEMO-O)$/.test(codigo)) return 'observacion';
  return null;
}

const entero_ = (v, min, max) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max;
const decimalOVacio_ = v => v === '' || (/^\d+(\.\d+)?$/.test(v) && Number(v) < 100000);
const enteroOVacio_ = v => v === '' || entero_(v, 0, 100000);

/** Devuelve '' si la fila es válida, o el motivo del rechazo. */
function valida_(r) {
  if (!r || typeof r !== 'object') return 'fila vacía';
  const v = {};
  COLS.forEach(c => { v[c] = String(r[c] === undefined || r[c] === null ? '' : r[c]).trim() });
  if (!/^[A-Z0-9]{2,12}$/.test(v.participant_id)) return 'participant_id';
  const grupo = grupoDe_(v.session_code);
  if (!grupo || grupo !== v.group) return 'session_code/group';
  const esDemo = v.session_code.indexOf('DEMO-') === 0;
  if (v.es_demo !== (esDemo ? '1' : '0')) return 'es_demo';
  if (!entero_(v.order, 1, 6)) return 'order';
  if (v.object_type !== 'pulsera' && v.object_type !== 'collar') return 'object_type';
  if (!entero_(v.difficulty, 1, 3)) return 'difficulty';
  if (!entero_(v.price_clp, 1, 1000000)) return 'price_clp';
  if (!decimalOVacio_(v.build_time_s) || !decimalOVacio_(v.response_time_s)) return 'tiempos';
  if (!enteroOVacio_(v.errors) || !enteroOVacio_(v.removals)) return 'errores/retiros';
  if (v.completed !== '1') return 'completed';
  if (v.timestamp !== '' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(v.timestamp)) return 'timestamp';
  return '';
}

/** Recibe {rows:[...]} desde la aplicación y agrega las filas nuevas a la hoja. */
function doPost(e) {
  const candado = LockService.getScriptLock();
  try {
    candado.waitLock(20000);
  } catch (x) {
    return json_({ ok: false, error: 'servidor ocupado, reintentar' });
  }
  try {
    const datos = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const filas = Array.isArray(datos.rows) ? datos.rows.slice(0, MAX_FILAS_POR_ENVIO) : [];
    const h = hoja_();
    const ultima = h.getLastRow();
    // Clave participant_id|order: evita duplicar una respuesta reenviada.
    const existentes = new Set();
    if (ultima > 1) h.getRange(2, 1, ultima - 1, 5).getValues().forEach(f => existentes.add(String(f[0]) + '|' + String(f[4])));
    const ahora = new Date().toISOString();
    const nuevas = [];
    let rechazadas = 0, repetidas = 0;
    filas.forEach(r => {
      if (valida_(r)) { rechazadas++; return; }
      const clave = String(r.participant_id).trim() + '|' + String(r.order).trim();
      if (existentes.has(clave)) { repetidas++; return; }
      existentes.add(clave);
      nuevas.push(COLS.map(c => c === 'recibido_en' ? ahora : String(r[c] === undefined || r[c] === null ? '' : r[c]).trim()));
    });
    if (nuevas.length) {
      const rango = h.getRange(ultima + 1, 1, nuevas.length, COLS.length);
      rango.setNumberFormat('@'); // texto plano: Sheets no convierte números ni fechas
      rango.setValues(nuevas);
    }
    return json_({ ok: true, agregadas: nuevas.length, repetidas: repetidas, rechazadas: rechazadas });
  } catch (x) {
    return json_({ ok: false, error: String(x) });
  } finally {
    candado.releaseLock();
  }
}

/** ?accion=usados → { ok, usados: { "12": 6, ... } } (solo sesiones reales con número 1–60). */
function doGet(e) {
  const accion = (e && e.parameter && e.parameter.accion) || '';
  if (accion === 'usados') {
    const h = hoja_();
    const ultima = h.getLastRow();
    const usados = {};
    if (ultima > 1) {
      h.getRange(2, 1, ultima - 1, 4).getValues().forEach(f => {
        const codigo = String(f[1]);
        if (String(f[3]) === '0' && /^\d{1,2}$/.test(codigo)) usados[codigo] = (usados[codigo] || 0) + 1;
      });
    }
    return json_({ ok: true, usados: usados });
  }
  return json_({ ok: true, servicio: 'efecto-ikea' });
}

/**
 * Modo en línea: envío de respuestas a Google Sheets (vía Google Apps Script),
 * consulta de números ya usados y link personalizado ?p=N.
 * Con SHEETS_URL vacía todo esto queda desactivado y la app funciona solo en local.
 */
const ONLINE = !!SHEETS_URL;
/** Número de participante que viene en el link (…/?p=12), o null. */
const PARAM_P = (() => { try { return new URLSearchParams(location.search).get('p') } catch (e) { return null } })();
/** Celulares y tablets: sin mouse ni trackpad. */
const ES_MOVIL = (() => { try { return matchMedia('(hover: none) and (pointer: coarse)').matches } catch (e) { return false } })();

S.sheet = { estado: ONLINE ? 'idle' : 'off', msg: '', usados: null };
let SQ = Promise.resolve();

/** fetch con tiempo límite, para que un participante nunca quede esperando indefinidamente. */
async function fetchT(url, opts = {}, ms = 15000) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    try { return await fetch(url, { ...opts, signal: c.signal }) } finally { clearTimeout(t) }
}

/** Vuelve a dibujar las pantallas que muestran el estado del envío. */
function sheetCambio() { if (S.screen == 'thanks' || adminVisible()) render() }

/**
 * Envía a la hoja todos los registros aún no enviados (sin marca _s), reales y demo.
 * El cuerpo va como texto plano para evitar la verificación previa (preflight) de CORS.
 * Los envíos se encolan; el servidor descarta duplicados, así que reintentar es seguro.
 */
function flushSheets() {
    if (!ONLINE) return Promise.resolve(true);
    return SQ = SQ.then(async () => {
        const rows = DB.rows.filter(r => !r._s);
        if (!rows.length) { S.sheet.estado = 'ok'; sheetCambio(); return true }
        S.sheet.estado = 'enviando'; sheetCambio();
        try {
            const body = JSON.stringify({ rows: rows.map(r => Object.fromEntries(H.map(h => [h, r[h] ?? '']))) });
            const j = await (await fetchT(SHEETS_URL, { method: 'POST', body }, 25000)).json();
            if (!j.ok) throw new Error(j.error || 'respuesta inválida del servidor');
            rows.forEach(r => { r._s = 1 }); save();
            S.sheet.estado = 'ok';
            S.sheet.msg = `Último envío: ${j.agregadas} nueva(s)` + (j.repetidas ? `, ${j.repetidas} ya estaban` : '') + (j.rechazadas ? `, ${j.rechazadas} rechazada(s) por formato` : '') + '.';
            return true
        } catch (e) {
            S.sheet.estado = 'error'; S.sheet.msg = 'No se pudo enviar: ' + (e.name == 'AbortError' ? 'tiempo de espera agotado' : e.message);
            return false
        } finally { sheetCambio() }
    })
}

/** Números reales con respuestas en la hoja: { "12": 6, ... }, o null si no hay conexión. */
async function usadosHoja() {
    if (!ONLINE) return null;
    try {
        const j = await (await fetchT(SHEETS_URL + '?accion=usados', {}, 8000)).json();
        if (!j.ok || typeof j.usados != 'object') throw new Error();
        S.sheet.usados = j.usados; return j.usados
    } catch (e) { return null }
}

/** Link personalizado para un número de participante. */
const linkPara = n => location.href.split(/[?#]/)[0] + '?p=' + n;

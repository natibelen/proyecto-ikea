/**
 * Controlador principal de la aplicación.
 * Coordina pantallas, flujo experimental, eventos, interacción y panel investigador.
 * Las funciones auxiliares de configuración, almacenamiento, accesorios, CSV y
 * consentimiento se encuentran en los archivos cargados antes de este.
 */
const bar = () => { const n = DB.sess.idx; return `<div class="prog"><div style="width:${n / 6 * 100}%"></div></div><p class="mut">Accesorio ${n + 1} de 6</p>` };
const isC = () => DB.sess.group == 'construccion';
const GN = { construccion: 'Construcción', observacion: 'Observación' };
const STG = { tutorial: 'tutorial', task: 'armando', eval: 'valorando', thanks: 'finalizada' };
/** Franja visible solo en sesiones demo (los participantes reales nunca la ven). */
const demoBar = () => DB.sess && DB.sess.demo ? `<div class="demo-bar"><span><b>Modo demo</b> · ${GN[DB.sess.group].toLowerCase()}</span><button class="btn s" data-act="panel">← Volver al panel</button></div>` : '';

/* ---------- Asignación de números (solo panel investigador) ---------- */
const esNum = c => /^\d+$/.test(String(c ?? ''));
/** Números reales usados en ESTE computador → cantidad de respuestas guardadas. */
function numsUsados() {
    const m = {};
    DB.rows.forEach(r => { if (!r.es_demo && esNum(r.session_code)) { const n = +r.session_code; m[n] = (m[n] || 0) + 1 } });
    // Números registrados en Google Sheets (todos los computadores y participantes en línea).
    Object.entries(S.sheet.usados || {}).forEach(([c, k]) => { if (esNum(c)) m[+c] = Math.max(m[+c] || 0, k) });
    const s = DB.sess; if (s && !s.demo && esNum(s.code) && !(+s.code in m)) m[+s.code] = 0;
    return m
}
const proximoLibre = () => { const m = numsUsados(); for (let n = NMIN; n <= NMAX; n++) if (!(n in m)) return n; return '' };
function asignador() {
    const m = numsUsados();
    return Object.entries(GRUPOS).map(([g, [a, b]]) => {
        const us = Object.keys(m).map(Number).filter(n => n >= a && n <= b).sort((x, y) => x - y);
        let next = null; for (let n = a; n <= b; n++) if (!(n in m)) { next = n; break }
        return `<div><b>${GN[g]} (${a}–${b})</b><p class="big">${next ?? '—'}</p><p class="mut">${next ? 'Próximo número libre' : 'Rango completo'}</p>
<p class="mut">Usados: ${us.length}/${b - a + 1}${us.length ? '<br>' + us.map(n => m[n] < 6 ? `${n}*` : n).join(', ') : ''}</p></div>`
    }).join('')
}
function sessInfo() {
    const s = DB.sess; if (!s) return 'ninguna';
    return `${s.demo ? 'demo de ' + GN[s.group].toLowerCase() : 'nº ' + s.code + ' (' + GN[s.group].toLowerCase() + ')'} — accesorio ${Math.min(s.idx + 1, 6)} de 6, etapa: ${STG[s.stage] || s.stage}`
}
function sheetInfo() {
    if (!ONLINE) return '<b>no configurado</b>. Para activarlo, pega la URL del Apps Script en SHEETS_URL (proyecto/js/config.js); ver README.';
    const pend = DB.rows.filter(r => !r._s).length;
    const est = { idle: 'conectando…', enviando: 'enviando…', ok: 'conectado', error: '<b class="warn">error de conexión</b>' }[S.sheet.estado] || S.sheet.estado;
    return `${est}. Registros de este navegador pendientes de enviar: ${pend}. ${S.sheet.msg || ''}`
}
function fileInfo() {
    if (!FH) return 'sin vincular.';
    const pend = DB.rows.filter(r => !r.es_demo && !r._f).length;
    const perm = S.fperm == null ? 'comprobando permiso…' : S.fperm ? 'permiso de escritura concedido' : '<b class="warn">falta permiso de escritura</b>';
    return `${FH.name} — ${perm}; registros reales pendientes de escribir: ${pend}.`
}

const SC = {
    welcome: () => `<div class="card c"><div class="deco">✿ ✦ ♡ ✦ ✿</div><h1>Bienvenido</h1><p class="sub">Proyecto de Investigación de Psico-Informática</p>
<div class="pair">${acc('pulsera', LV[3].t)}${acc('collar', LV[2].t)}</div>
<p>Esta es una actividad universitaria de investigación. Dura unos 3 a 8 minutos.</p>${ES_MOVIL
            ? '<p class="aviso">Esta actividad debe realizarse desde un <b>computador</b> (con mouse o trackpad). Abre este mismo enlace en un computador para participar.</p>'
            : '<button class="btn" data-act="to" data-s="consent">Comenzar</button>'}</div>`,
    consent: () => `<div class="card consent">${CONSENT}
<label class="chk decl"><input type="checkbox" id="ok"> <span>Declaro mi consentimiento para participar en este estudio bajo los términos anteriormente descritos.</span></label>
<div class="c"><button class="btn" id="cont" disabled data-act="consentOk">Continuar</button></div></div>`,
    code: () => `<div class="card"><h2>Número de participante</h2><p>Ingresa el número de participante que te entregó la persona investigadora.</p>
<input class="t" id="code" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="Número de participante" aria-describedby="err"><p class="err" id="err" role="alert"></p><button class="btn" data-act="start">Continuar</button></div>`,
    aviso: () => `<div class="card c"><div class="deco">✿</div><h2>${S.aviso || ''}</h2><p>Si crees que es un error, escribe a las investigadoras (los correos están en el consentimiento informado).</p></div>`,
    verificando: () => `<div class="card c"><p class="mut">Preparando la actividad…</p></div>`,
    tutorial: () => {
        const C = isC(), st = C ? [['Mira el modelo', 'Arriba verás el diseño que debes reproducir, con los mismos colores y orden.', acc('pulsera', LV[2].t, { lab: 1 })], ['Arrastra una cuenta', 'Llévala desde la bandeja hasta el espacio de la cuerda donde va y suéltala.', acc('pulsera', part(4))], ['Corrige y confirma', 'Para corregir, arrastra una cuenta a otro espacio o fuera de la cuerda. Cuando termines, pulsa Confirmar.', acc('pulsera', part(12))]] :
            [['Mira el accesorio', 'Verás un accesorio ya terminado, con el tamaño suficiente para apreciar los detalles.', acc('collar', LV[2].t)], ['Escribe un precio', 'Indica cuánto dinero pagarías por él, en pesos chilenos (CLP).', '<p style="font-size:2rem;margin:40px 0">$ ______ CLP</p>'], ['Continúa', 'Son 6 accesorios en total: 3 pulseras y 3 collares.', '<p style="font-size:2rem;margin:40px 0">✿ ✿ ✿ ✿ ✿ ✿</p>']];
        return `${demoBar()}<div class="card"><h2>Cómo funciona</h2><div class="g3">${st.map(s => `<div><b>${s[0]}</b><br>${s[2]}<p>${s[1]}</p></div>`).join('')}</div><div class="c"><button class="btn" data-act="begin">Entendido, empezar</button></div></div>`
    },
    task: () => {
        const [t, l] = TASKS[DB.sess.idx], tr = LV[l].tr, cols = T.slots.map(id => id == null ? null : tr[id]);
        return `${demoBar()}<div class="card">${bar()}<h2>Reproduce este diseño</h2><p>Arrastra las cuentas de la bandeja hasta su lugar en la cuerda, con los mismos colores y en el mismo orden que el modelo, partiendo desde «inicio».</p>
<div class="cols"><div><p class="mut">Modelo (${t})</p>${acc(t, LV[l].t, { lab: 1 })}</div><div><p class="mut">Tu ${t}</p>${acc(t, cols, { rm: 1, lab: 1, id: 'build' })}</div></div>
<div class="tray">${tr.map((c, id) => `<button class="tb${T.slots.includes(id) ? ' u' : ''}" style="background:${COL[c]}" data-drag="t" data-id="${id}" aria-label="Cuenta ${CN[c]}"></button>`).join('')}</div>
<p class="err">${T.msg || ''}</p><div class="c"><button class="btn" data-act="confirm" ${T.slots.includes(null) ? 'disabled' : ''}>Confirmar diseño</button></div></div>`
    },
    eval: () => {
        const [t, l] = TASKS[DB.sess.idx];
        return `${demoBar()}<div class="card">${bar()}<div class="c">${acc(t, LV[l].t)}</div><h2>¿Cuánto dinero pagarías por este accesorio?</h2>
<div class="pf"><span>$</span><input id="price" inputmode="numeric" autocomplete="off" aria-label="Monto en pesos chilenos"><span>CLP</span></div>

<p class="err" id="err"></p><div class="c"><button class="btn" id="sub" disabled data-act="submit">Continuar</button></div></div>`},
    thanks: () => {
        const propio = r => DB.sess && r.participant_id == DB.sess.id;
        const pend = ONLINE && DB.rows.some(r => propio(r) && !r._s);
        const estado = !pend ? `<p>Tus respuestas quedaron registradas.${ONLINE ? ' Ya puedes cerrar esta pestaña.' : ''}</p>`
            : S.sheet.estado == 'error' ? `<p class="warn">No se pudieron enviar tus respuestas. Revisa tu conexión a internet y pulsa «Reintentar».</p><button class="btn" data-act="sync">Reintentar</button>`
                : `<p class="mut">Enviando tus respuestas… no cierres esta pestaña todavía.</p>`;
        return `${demoBar()}<div class="card c"><div class="deco">♡ ✿ ♡</div><h1>¡Gracias por participar!</h1>${estado}<p>Al terminar el estudio, el equipo de investigación podrá explicarte su propósito completo.</p>${pend ? '' : '<button class="btn s" data-act="end">Cerrar</button>'}</div>`
    },
    admin: () => {
        if (!S.auth) return `<div class="card"><h2>Acceso investigadores</h2><input class="t" id="pin" type="password" aria-label="PIN"><p class="err" id="err"></p><button class="btn" data-act="pin">Entrar</button> <button class="btn s" data-act="out">Volver</button></div>`;
        const R = DB.rows, real = R.filter(r => !r.es_demo).length;
        return `<div class="card"><h2>Panel de investigación</h2>
<p><b>Almacenamiento:</b> localStorage de este navegador y dispositivo${ONLINE ? ' y, además, Google Sheets (cada respuesta se envía a la hoja).' : '. Sin Google Sheets configurado no hay servidor: borrar datos del sitio o cambiar de equipo pierde los registros; exporta el CSV al terminar cada sesión.'} Si se recarga a mitad de tarea, esa tarea reinicia (el cronómetro también).</p>
<p><b>Sesión en curso:</b> ${sessInfo()}</p>
<p><b>Archivo CSV local:</b> ${fileInfo()} ${S.fmsg || ''}<br>Vincula un archivo nuevo o vacío (Chrome o Edge): se copian ahí los registros reales de este computador y cada nueva respuesta real se agrega al final. Las demos no se escriben en el archivo.</p>
<button class="btn" data-act="link">Vincular archivo CSV</button>${FH && S.fperm === false ? ' <button class="btn" data-act="reauth">Reautorizar archivo</button>' : ''}
<p>Sesión de prueba (las demos no contaminan los datos reales; se marcan es_demo=1):</p>
<button class="btn" data-act="demo" data-g="C">Demo construcción</button> <button class="btn" data-act="demo" data-g="O">Demo observación</button> <button class="btn s" data-act="resetsess" ${DB.sess ? '' : 'disabled'}>Reiniciar sesión actual</button></div>
<div class="card"><h2>En línea (Google Sheets)</h2>
<p><b>Estado:</b> ${sheetInfo()}</p>
${ONLINE ? '<button class="btn" data-act="sync">Enviar pendientes</button> <button class="btn s" data-act="refrescar">Actualizar números usados</button>' : ''}
<h3>Link para un participante</h3>
<p>Cada participante en línea recibe su propio link con su número. Se salta la pantalla de número y, si ese número ya tiene respuestas en la hoja, el link no deja volver a participar.</p>
<div class="linkgen"><input class="t" id="lnum" inputmode="numeric" autocomplete="off" aria-label="Número para el link" value="${S.lnum ?? proximoLibre()}"><button class="btn" data-act="copylink">Copiar link</button></div>
<p class="mut" id="lout">${linkOut(S.lnum ?? proximoLibre())}</p></div>
<div class="card"><h2>Números de participante</h2>
<p>Entrega al participante solo el número. Del 1 al 30 se asigna construcción y del 31 al 60 observación.</p>
<div class="g3 g2">${asignador()}</div>
<p class="mut">${S.sheet.usados ? 'Se combinan los números usados <b>en este computador</b> y los registrados en <b>Google Sheets</b> (todos los computadores y participantes en línea).' : 'Solo se cuentan los números usados <b>en este computador</b>' + (ONLINE ? ' (no se pudo consultar Google Sheets)' : '') + '. Si trabajan en varios computadores sin Google Sheets, repártanse los números de antemano (por ejemplo, PC A: 1–15 y 31–45; PC B: 16–30 y 46–60).'} * = sesión incompleta (menos de 6 respuestas).</p></div>
<div class="card"><h2>Diseños experimentales</h2><div class="g3">${[1, 2, 3].map(l => `<div><b>Nivel ${l} (${DL[l]})</b>${acc('pulsera', LV[l].t)}${acc('collar', LV[l].t)}<p class="mut">${LV[l].t.map(c => CN[c][0]).join(' ')}<br>(r=rosa, m=marrón, c=crema) · 12 cuentas</p></div>`).join('')}</div></div>
<div class="card"><h2>Registros (${R.length}; reales: ${real})</h2><button class="btn" data-act="csv" data-a="0">CSV datos reales</button> <button class="btn s" data-act="csv" data-a="1">CSV incluyendo demo</button> <button class="btn s" data-act="deldemo">Borrar registros demo</button> <button class="btn s danger" data-act="delall" ${R.length || DB.sess ? '' : 'disabled'}>Borrar todos los registros</button>${S.rmsg ? `<p class="ok">${S.rmsg}</p>` : ''}
<p class="mut">Si la descarga no arranca en tu navegador, copia el texto de abajo y pégalo en un archivo .csv. El separador es la coma: si Excel lo abre en una sola columna, usa Datos → Desde texto/CSV y elige «Coma».</p><textarea id="csvbox" readonly>${S.csv}</textarea>
<div class="tw"><table><tr>${H.map(h => `<th>${h}</th>`).join('')}</tr>${R.slice(-80).map(r => `<tr>${H.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</table></div>
<button class="btn s" data-act="out">Salir</button></div>`}
};
function render() { $('#app').innerHTML = SC[S.screen]() }
function go(s) { S.screen = s; render(); scrollTo(0, 0) }
const adminVisible = () => S.screen == 'admin' && S.auth;
function refreshAdmin() { if (adminVisible()) render() }
function stageScreen() {
    const s = DB.sess; if (!s) return 'welcome'; if (s.stage == 'eval' && isC() && !s.pending) s.stage = 'task';
    if (s.stage == 'task') { T = newT(); E = null } if (s.stage == 'eval') E = newE(); return s.stage
}
const newT = () => ({ slots: Array(12).fill(null), t0: performance.now(), err: 0, rm: 0, msg: '' });
const newE = () => ({ t1: performance.now(), sub: false });
/** Sale del panel: el cambio de hash dispara route(), que hace el único render. */
function leaveAdmin() { S.auth = false; if (location.hash) location.hash = ''; else route() }

/** Descarga un texto como archivo CSV (con BOM para que Excel reconozca los acentos). */
function descargar(texto, nombre) {
    try {
        const u = URL.createObjectURL(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
        a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000)
    } catch (e) { }
}
function startSess(code, group, demo) { DB.sess = { id: (demo ? 'D' : 'P') + Math.random().toString(36).slice(2, 7).toUpperCase(), code, group, demo, idx: 0, stage: 'tutorial', pending: null }; save() }
function chk() { const p = ($('#price').value || '').replace(/\D/g, ''); $('#sub').disabled = !p }
const rangoMsg = `El número debe estar entre ${NMIN} y ${NMAX}.`;
const linkOut = v => { const n = parseInt(v, 10); return grupoDe(n) ? `${linkPara(n)} <span class="mut">(${GN[grupoDe(n)].toLowerCase()})</span>` : `<span class="warn">${rangoMsg}</span>` };
/** true si el número ya tiene respuestas: en este navegador o, si hay conexión, en la hoja. */
async function numeroUsado(c) {
    if (DB.rows.some(r => String(r.session_code) == c && !r.es_demo)) return true;
    const u = await usadosHoja(); return !!(u && u[c])
}
const A = {
    to: d => go(d.s),
    start: async () => {
        if (S.busy) return;
        const v = ($('#code').value || '').replace(/\D/g, ''), er = $('#err'), n = parseInt(v, 10);
        if (!v) { er.textContent = 'Ingresa tu número de participante.'; return }
        const g = grupoDe(n); if (!g) { er.textContent = rangoMsg; return }
        const c = String(n), b = $('[data-act="start"]');
        S.busy = true; if (b) b.disabled = true;
        const usado = await numeroUsado(c); S.busy = false;
        if (S.screen != 'code') return;
        if (b) b.disabled = false;
        if (usado) { $('#err').textContent = 'Este número ya fue utilizado. Consulta con la persona investigadora.'; return }
        S.auth = false; startSess(c, g, false); go('tutorial')
    },
    /** Tras aceptar el consentimiento: con link personalizado (?p=N) se inicia directo; si no, se pide el número. */
    consentOk: async () => {
        if (PARAM_P == null || DB.sess) { go('code'); return }
        const v = PARAM_P.replace(/\D/g, ''), n = parseInt(v, 10), g = /^\d+$/.test(PARAM_P) ? grupoDe(n) : null;
        if (!g) { go('code'); $('#code').value = v.slice(0, 3); $('#err').textContent = rangoMsg; return }
        go('verificando');
        const c = String(n);
        if (await numeroUsado(c)) { S.aviso = 'Este enlace ya fue utilizado.'; go('aviso'); return }
        S.auth = false; startSess(c, g, false); go('tutorial')
    },
    begin: () => { const s = DB.sess; s.stage = isC() ? 'task' : 'eval'; save(); if (isC()) T = newT(); else E = newE(); go(s.stage) },
    confirm: () => {
        const [t, l] = TASKS[DB.sess.idx], tr = LV[l].tr;
        if (!T.slots.every((id, i) => id != null && tr[id] == LV[l].t[i])) { T.err++; T.msg = 'Todavía no coincide con el modelo. Revisa los colores y el orden.'; render(); return }
        DB.sess.pending = { bt: (performance.now() - T.t0) / 1000, err: T.err, rm: T.rm }; DB.sess.stage = 'eval'; save(); E = newE(); go('eval')
    },
    submit: () => {
        if (E.sub) return; const s = DB.sess, p = +($('#price').value || '').replace(/\D/g, '');
        if (!(p >= 1 && p <= MAX)) { $('#err').textContent = 'Ingresa un monto entero en CLP, entre $1 y $1.000.000.'; return }
        E.sub = true; $('#sub').disabled = true; const [t, l] = TASKS[s.idx], C = isC(), pe = s.pending || {};
        const row = { participant_id: s.id, session_code: s.code, group: s.group, es_demo: s.demo ? 1 : 0, order: s.idx + 1, object_type: t, difficulty: l, price_clp: p, build_time_s: C ? +pe.bt.toFixed(2) : '', response_time_s: +((performance.now() - E.t1) / 1000).toFixed(2), errors: C ? pe.err : '', removals: C ? pe.rm : '', completed: 1, timestamp: new Date().toISOString() };
        if (!DB.rows.some(r => r.participant_id == s.id && r.order == s.idx + 1)) DB.rows.push(row);
        s.idx++; s.pending = null; s.stage = s.idx >= 6 ? 'thanks' : (C ? 'task' : 'eval'); save(); T = C ? newT() : null; E = C ? null : newE(); go(s.stage);
        if (!s.demo) flushPending();
        flushSheets()
    },
    end: () => { DB.sess = null; S.auth = false; save(); go('welcome') },
    pin: () => { if ($('#pin').value == PIN) { S.auth = true; render(); alEntrarPanel() } else $('#err').textContent = 'PIN incorrecto.' },
    demo: d => {
        const s = DB.sess;
        if (s && !s.demo && s.stage != 'thanks' && !confirm(`Hay una sesión real en curso (nº ${s.code}, accesorio ${s.idx + 1} de 6). Si inicias la demo, esa sesión se interrumpe (las respuestas ya enviadas se conservan). ¿Continuar?`)) return;
        // La sesión del panel (S.auth) se mantiene en memoria para volver sin PIN con «Volver al panel».
        startSess('DEMO-' + d.g, d.g == 'C' ? 'construccion' : 'observacion', true);
        try { sessionStorage.setItem('demo_tab', DB.sess.id) } catch (e) { }
        if (location.hash) location.hash = ''; else route()
    },
    panel: () => {
        if (!DB.sess || !DB.sess.demo) return;
        DB.sess = null; T = E = null; save();
        try { sessionStorage.removeItem('demo_tab') } catch (e) { }
        if (location.hash == '#investigadores') route(); else location.hash = '#investigadores'
    },
    resetsess: () => {
        if (!DB.sess || !confirm('¿Reiniciar la sesión en curso (' + sessInfo() + ')? Se pierde el progreso no enviado; las respuestas ya enviadas se conservan.')) return;
        DB.sess = null; T = E = null; save(); render()
    },
    csv: d => { const all = d.a == '1'; S.csv = csv(all); render(); descargar(S.csv, all ? 'efecto_ikea_datos_con_demo.csv' : 'efecto_ikea_datos.csv') },
    deldemo: () => { if (confirm('¿Borrar los registros de demostración?')) { DB.rows = DB.rows.filter(r => !r.es_demo); save(); render() } },
    delall: () => {
        const n = DB.rows.length, real = DB.rows.filter(r => !r.es_demo).length;
        if (!n && !DB.sess) return;
        if (!confirm(`¿Borrar TODOS los registros de este navegador?\n\n• ${n} registro(s): ${real} real(es) y ${n - real} demo.\n• También se elimina la sesión en curso, si hay una.\n• Antes de borrar se descargará automáticamente una copia de respaldo (CSV con todo).\n• Un archivo CSV vinculado y la hoja de Google Sheets NO se modifican.`)) return;
        const r = prompt('Para confirmar, escribe BORRAR en mayúsculas:');
        if ((r || '').trim() !== 'BORRAR') { if (r !== null) alert('No se borró nada: el texto no coincide.'); return }
        const f = new Date(), z = x => String(x).padStart(2, '0');
        const nombre = `efecto_ikea_respaldo_${f.getFullYear()}-${z(f.getMonth() + 1)}-${z(f.getDate())}_${z(f.getHours())}-${z(f.getMinutes())}.csv`;
        if (n) descargar(csv(true), nombre);
        DB.rows = []; DB.sess = null; T = E = null; S.csv = ''; save();
        S.rmsg = n ? `Registros borrados. Respaldo descargado: ${nombre}` : 'Sesión en curso eliminada.'; render()
    },
    link: async () => {
        try {
            const h = await showSaveFilePicker({ suggestedName: 'efecto_ikea_datos.csv', types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }] });
            FH = h; S.fperm = true; await idb('put', FH);
            const vacio = !(await FH.getFile()).size;
            if (vacio) DB.rows.forEach(r => { delete r._f }); save();
            const n = DB.rows.filter(r => !r.es_demo && !r._f).length;
            S.fmsg = 'Archivo vinculado.' + (n ? ` Copiando ${n} registro(s) real(es) existentes…` : '');
            await flushPending()
        } catch (e) { S.fmsg = e.name == 'AbortError' ? '' : 'Este navegador o contexto no permite vincular archivos. Usa Chrome o Edge con la página servida desde el computador.' }
        render()
    },
    reauth: async () => {
        try { S.fperm = (await FH.requestPermission({ mode: 'readwrite' })) == 'granted' } catch (e) { S.fperm = false }
        S.fmsg = S.fperm ? 'Permiso concedido.' : 'Permiso denegado: vuelve a vincular el archivo.';
        render(); if (S.fperm) flushPending()
    },
    sync: () => { flushSheets().then(() => usadosHoja()).then(refreshAdmin) },
    refrescar: () => { usadosHoja().then(u => { S.sheet.msg = u ? 'Números actualizados desde la hoja.' : 'No se pudo consultar la hoja.'; refreshAdmin() }) },
    copylink: async () => {
        const n = parseInt(($('#lnum').value || ''), 10), out = $('#lout');
        if (!grupoDe(n)) { out.innerHTML = linkOut(n); return }
        try { await navigator.clipboard.writeText(linkPara(n)); out.innerHTML = `${linkOut(n)} — <b>copiado</b>` }
        catch (e) { out.innerHTML = linkOut(n) + ' — selecciónalo y cópialo a mano' }
    },
    out: () => leaveAdmin()
};
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) A[b.dataset.act](b.dataset) });
document.addEventListener('change', e => { if (e.target.id == 'ok') $('#cont').disabled = !e.target.checked });
document.addEventListener('input', e => {
    if (e.target.id == 'price') { const n = e.target.value.replace(/\D/g, '').slice(0, 8); e.target.value = n ? (+n).toLocaleString('es-CL') : ''; $('#err').textContent = ''; chk() }
    if (e.target.id == 'lnum') {
        const v = e.target.value.replace(/\D/g, '').slice(0, 3); if (e.target.value != v) e.target.value = v;
        S.lnum = v; $('#lout').innerHTML = v ? linkOut(v) : ''
    }
    if (e.target.id == 'code') {
        // Solo dígitos (también al pegar). Se permiten 3 para poder avisar si se escribe, p. ej., 100.
        const v = e.target.value.replace(/\D/g, '').slice(0, 3), n = parseInt(v, 10);
        if (e.target.value != v) e.target.value = v;
        $('#err').textContent = v && !grupoDe(n) ? rangoMsg : ''
    }
});
document.addEventListener('keydown', e => { if (e.key == 'Enter') { if (e.target.id == 'code') A.start(); if (e.target.id == 'pin') A.pin() } });

/* ---------- Archivo CSV vinculado (File System Access API) ---------- */
let FH = null, D = null, FQ = Promise.resolve();
const idb = (m, v) => new Promise(res => { try { const r = indexedDB.open('taller_h', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onerror = () => res(null); r.onsuccess = () => { const st = r.result.transaction('h', m == 'get' ? 'readonly' : 'readwrite').objectStore('h'), q = m == 'get' ? st.get('fh') : st.put(v, 'fh'); q.onsuccess = () => res(q.result); q.onerror = () => res(null) } } catch (e) { res(null) } });
idb('get').then(h => { if (h) { FH = h; checkPerm() } });
/** Consulta (sin pedir) el permiso del archivo y actualiza el panel si cambió. */
async function checkPerm() {
    if (!FH) return; let p = null;
    try { p = (await FH.queryPermission({ mode: 'readwrite' })) == 'granted' } catch (e) { p = false }
    if (p !== S.fperm) { S.fperm = p; refreshAdmin() }
}
/**
 * Escribe al final del archivo los registros reales aún no escritos (marcados con _f).
 * Nunca solicita permiso: así el diálogo del navegador no aparece frente al participante.
 * Las escrituras se encolan para que no se pisen entre sí.
 */
function flushPending() {
    return FQ = FQ.then(async () => {
        const rows = DB.rows.filter(r => !r.es_demo && !r._f); if (!FH || !rows.length) return;
        try {
            if ((await FH.queryPermission({ mode: 'readwrite' })) != 'granted') {
                S.fperm = false; S.fmsg = 'Falta permiso de escritura: pulsa «Reautorizar archivo». Las respuestas siguen guardadas en el navegador y se escribirán al reautorizar.'; refreshAdmin(); return
            }
            const f = await FH.getFile(), w = await FH.createWritable({ keepExistingData: true });
            await w.seek(f.size); await w.write((f.size ? '' : '﻿' + H.join(',') + '\n') + rows.map(csvLine).join('\n') + '\n'); await w.close();
            rows.forEach(r => { r._f = 1 }); save(); S.fperm = true; S.fmsg = `Última escritura correcta (${rows.length} registro(s)).`
        } catch (x) { S.fmsg = 'No se pudo escribir en el archivo: ' + x.message }
        refreshAdmin()
    })
}

/* ---------- Arrastrar y soltar cuentas ---------- */
const mv = e => { if (D) { D.g.style.left = e.clientX + 'px'; D.g.style.top = e.clientY + 'px' } };
document.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-drag]'); if (!el || !T || S.screen != 'task') return; e.preventDefault();
    const tr = LV[TASKS[DB.sess.idx][1]].tr, g = document.createElement('div'); g.className = 'ghost';
    g.style.background = COL[el.dataset.drag == 't' ? tr[+el.dataset.id] : tr[T.slots[+el.dataset.i]]]; document.body.appendChild(g);
    D = { k: el.dataset.drag, id: +el.dataset.id, i: +el.dataset.i, g }; mv(e)
});
document.addEventListener('pointermove', mv);
document.addEventListener('pointercancel', () => { if (D) { D.g.remove(); D = null } });
document.addEventListener('pointerup', e => {
    if (!D) return; const d = D; D = null; d.g.remove();
    const sv = $('#build'), t = TASKS[DB.sess.idx][0], sl = T.slots; let hit = -1;
    if (sv) {
        const p = sv.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(sv.getScreenCTM().inverse()); let best = 30;
        for (let i = 0; i < 12; i++) { const [x, y] = pos(t, i), dd = Math.hypot(x - q.x, y - q.y); if (dd < best) { best = dd; hit = i } }
    }
    if (d.k == 't') { if (hit >= 0) { if (sl[hit] != null) T.rm++; sl[hit] = d.id } }
    else { const id = sl[d.i]; if (hit < 0) { sl[d.i] = null; T.rm++ } else if (hit != d.i) { sl[d.i] = sl[hit]; sl[hit] = id } }
    T.msg = ''; render()
});

/* ---------- Enrutamiento ---------- */
function route() { S.screen = location.hash == '#investigadores' ? 'admin' : stageScreen(); render(); scrollTo(0, 0); if (adminVisible()) alEntrarPanel() }
function alEntrarPanel() { checkPerm(); if (ONLINE) usadosHoja().then(refreshAdmin) }
// Una demo a medias solo se retoma en la misma pestaña donde se inició (p. ej. al recargar).
// Al abrir el enlace en otra pestaña o ventana se descarta y se empieza en la bienvenida.
// Las sesiones reales a medias sí se retoman, para no perder datos por un cierre accidental.
(() => {
    let tab = null; try { tab = sessionStorage.getItem('demo_tab') } catch (e) { }
    if (DB.sess && DB.sess.demo && tab !== DB.sess.id) { DB.sess = null; save() }
})();
addEventListener('hashchange', route); route();
flushSheets(); // reenvía lo que haya quedado pendiente (p. ej. si se cortó internet)

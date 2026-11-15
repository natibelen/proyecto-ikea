/**
 * Persistencia local y utilidades de consulta del DOM.
 * Los datos siguen guardándose en localStorage, como en la versión original.
 */
let DB = { rows: [], sess: null, v: 2 };
try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.rows) DB = d } catch (e) { }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)) } catch (e) { } };
// v2: cada registro lleva _f=1 cuando ya se escribió en el archivo CSV vinculado.
// Los registros anteriores a v2 ya se escribían al instante, así que se marcan como escritos.
if (DB.v !== 2) { DB.rows.forEach(r => { r._f = 1 }); DB.v = 2; save() }
const $ = s => document.querySelector(s);
let S = { screen: 'welcome', auth: false, csv: '', fmsg: '', fperm: null }, T = null, E = null;

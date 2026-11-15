/**
 * Conversión de los registros de investigación a texto CSV.
 * Respeta comillas y separadores según las reglas habituales del formato CSV.
 */
const csvEsc = v => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v };
const csvLine = r => H.map(h => csvEsc(r[h])).join(',');
const csv = a => [H.join(','), ...DB.rows.filter(r => a || !r.es_demo).map(csvLine)].join('\n');

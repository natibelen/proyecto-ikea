/**
 * Conversión de los registros de investigación a texto CSV.
 * Respeta comillas y separadores según las reglas habituales del formato CSV.
 */
const csv=a=>{const e=v=>{v=String(v??'');return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
return[H.join(','),...DB.rows.filter(r=>a||!r.es_demo).map(r=>H.map(h=>e(r[h])).join(','))].join('\n')};

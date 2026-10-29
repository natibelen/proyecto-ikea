/**
 * Configuración experimental: paleta, diseños, tareas, claves y columnas CSV.
 * Evitar incluir aquí lógica de interfaz o persistencia.
 */
const COL=['#E8A0B4','#A67B68','#E9D3A4'],CN=['rosa','marrón','crema'];
const LV={1:{t:Array(12).fill(0),tr:Array(12).fill(0)},
2:{t:[0,1,0,1,0,1,0,1,0,1,0,1],tr:[1,0,0,1,0,1,1,0,1,0,0,1]},
3:{t:[0,2,1,1,0,2,0,1,2,2,1,0],tr:[2,0,1,2,1,0,0,2,1,1,2,0]}};
const TASKS=[['pulsera',1],['pulsera',2],['pulsera',3],['collar',1],['collar',2],['collar',3]];
const DL=['','facil','medio','dificil'];
const KEY='taller_v1',PIN='taller2026',MAX=1000000;
const H=['participant_id','session_code','group','es_demo','order','object_type','difficulty','price_clp','build_time_s','response_time_s','errors','removals','completed','timestamp'];
const LIK=['Muy poco esfuerzo','Poco esfuerzo','Algo de esfuerzo','Esfuerzo moderado','Bastante esfuerzo','Mucho esfuerzo','Muchísimo esfuerzo'];

/**
 * Persistencia local y utilidades de consulta del DOM.
 * Los datos siguen guardándose en localStorage, como en la versión original.
 */
let DB={rows:[],sess:null};
try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&d.rows)DB=d}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}};
const $=s=>document.querySelector(s);
let S={screen:'welcome',auth:false,csv:''},T=null,E=null;

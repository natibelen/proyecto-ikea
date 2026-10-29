/**
 * Geometría y representación SVG de pulseras y collares.
 * pos() calcula posiciones; acc() dibuja; part() genera espacios de ejemplo.
 */
function pos(t,i){if(t=='pulsera'){const a=(-90+i*30)*Math.PI/180;return[200+105*Math.cos(a),145+105*Math.sin(a)]}
const a=(150-i*120/11)*Math.PI/180;return[200+210*Math.cos(a),40+210*Math.sin(a)]}
function acc(t,cols,o={}){let s=`<svg ${o.id?`id="${o.id}" `:''}viewBox="0 0 400 290" class="acc" role="img" aria-label="${t}">`;
s+=t=='pulsera'?'<circle cx="200" cy="145" r="105" fill="none" stroke="#C9A58F" stroke-width="3"/>':'<path d="M18 145A210 210 0 0 0 382 145" fill="none" stroke="#C9A58F" stroke-width="3"/><circle cx="18" cy="145" r="6" fill="#C9A58F"/><circle cx="382" cy="145" r="6" fill="#C9A58F"/>';
cols.forEach((c,i)=>{const[x,y]=pos(t,i);
s+=c==null?`<circle cx="${x}" cy="${y}" r="17" fill="#FFF8F0" stroke="#D9BFAE" stroke-dasharray="4 4"/>`:
`<g ${o.rm?`data-drag="s" data-i="${i}" class="pl"`:''}><circle cx="${x}" cy="${y}" r="17" fill="${COL[c]}" stroke="rgba(111,82,68,.3)"/><circle cx="${x-5}" cy="${y-6}" r="5" fill="#fff" opacity=".55"/></g>`});
if(o.lab){const[x,y]=pos(t,0);s+=`<text x="${x}" y="${y-26}" text-anchor="middle" font-size="14" fill="#A67B68" font-family="Quicksand,sans-serif">inicio ▾</text>`}
return s+'</svg>'}
const part=k=>Array.from({length:12},(_,i)=>i<k?i%2:null);

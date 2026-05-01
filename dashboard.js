// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== CONTROL & SEGUIMIENTO (Google Sheets) =====
const CSEG_URL='https://script.google.com/macros/s/AKfycbxVL9dvF5inJZa3bUtwXJZBccNmrmfUZjbqfXvNMZBQK9bOWraDvD5bMcT-BXGp6SEmVA/exec';
const CSEG_FILTER=s=>!s.toUpperCase().includes('H. MTTO')&&!s.toUpperCase().includes('H.MTTO');
function csegHeaderRow(s){const n=s.toUpperCase();if(n.includes('CAT')&&n.includes('LOGO'))return 5;if(n.includes('CRONOGRAMA')||n.includes('DASHBOARD'))return 14;return 4;}
function csegTipoHoja(s){const n=s.toUpperCase();if(n.includes('CAT')&&n.includes('LOGO'))return'catalogo';if(n.includes('DASHBOARD'))return'dashboard';if(n.includes('CRONOGRAMA'))return'cronograma';if(n.includes('C.I.')||n.includes('BIMENSUAL')||n.includes('LOCATIVA'))return'ci';if(n.includes('CONTROL PREOP')||n.includes('CTRL PREOP'))return'preop';return'tabla';}
function csegSheetKey(s){return s.toLowerCase().replace(/[^a-z0-9]/g,'_');}
function csegTimestamp(){const t=new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});const el=document.getElementById('cseg-last-update');if(el)el.innerHTML=`<span class="hmtto-sync-dot"></span>Actualizado a las ${t}`;}

// ── Metadatos del documento (código, vigencia, título) ──
function parseMeta(meta){
  // Código, Vigencia, Revisión están en columnas V(21) y W(22), filas 1-3
  // meta[0]=fila1, meta[1]=fila2, meta[2]=fila3
  let codigo='',vigencia='',revision='',titulo='';
  if(meta&&meta.length>=1){
    // Col W (índice 22) contiene el valor; col V (21) la etiqueta
    const row0=meta[0]||[], row1=meta[1]||[], row2=meta[2]||[];
    codigo  = String(row0[22]||row0[21]||'').trim();
    vigencia= String(row1[22]||row1[21]||'').trim();
    revision= String(row2[22]||row2[21]||'').trim();
    // Limpiar prefijos de etiqueta si el valor los incluye
    codigo  = codigo.replace(/^[Cc][oó]digo\s*[:\s]*/,'').trim();
    vigencia= vigencia.replace(/^[Vv]igencia\s*[:\s]*/,'').trim();
    revision= revision.replace(/^[Rr]evisión?\s*[:\s]*/,'').trim();
    // Título: buscar en toda la meta la celda más larga que no sea la empresa ni un código/fecha
    const flat=meta.flat().map(v=>String(v).trim()).filter(v=>v.length>10);
    const candidatos=flat.filter(v=>!v.toUpperCase().includes('MORENO VARGAS')&&!v.match(/^[A-Z0-9]{1,4}-[A-Z]-\d+$/)&&!v.match(/^\d{1,2}[\/\-]\d/));
    if(candidatos.length)titulo=candidatos.reduce((a,b)=>b.length>a.length?b:a,'');
  }
  return{codigo,vigencia,revision,titulo};
}
function renderDocHeader(meta,fallbackTitle){
  const{codigo,vigencia,revision,titulo}=parseMeta(meta||[]);
  const tituloFinal=(titulo||fallbackTitle||'').toUpperCase();
  return`<div style="display:grid;grid-template-columns:220px 1fr 180px;border:2px solid var(--gray-300);border-bottom:none;border-radius:8px 8px 0 0;overflow:hidden;background:var(--white);font-family:'DM Sans',sans-serif">
    <div style="border-right:2px solid var(--gray-300);padding:12px 14px;display:flex;align-items:center;gap:10px">
      <div style="width:36px;height:36px;background:var(--yellow);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:var(--navy);flex-shrink:0;font-family:'Space Grotesk',sans-serif;line-height:1.1;text-align:center">MM&amp;E</div>
      <span style="font-size:10px;font-weight:700;color:var(--navy);line-height:1.35;text-transform:uppercase">MORENO VARGAS<br>SOCIEDAD ANÓNIMA</span>
    </div>
    <div style="border-right:2px solid var(--gray-300);padding:12px 20px;display:flex;align-items:center;justify-content:center">
      <span style="font-size:13px;font-weight:700;color:var(--navy);text-align:center;text-transform:uppercase;letter-spacing:.3px">${tituloFinal}</span>
    </div>
    <div style="padding:10px 14px;font-size:10px;color:var(--gray-700)">
      <div style="display:grid;grid-template-columns:60px 1fr;gap:2px 6px;line-height:1.9">
        <span style="font-weight:600;color:var(--gray-500)">Código:</span><span>${codigo||'—'}</span>
        <span style="font-weight:600;color:var(--gray-500)">Vigencia:</span><span>${vigencia||'—'}</span>
        <span style="font-weight:600;color:var(--gray-500)">Revisión:</span><span>${revision||'—'}</span>
      </div>
    </div>
  </div>`;
}
let csegSheets=[],csegActiva='',csegData={},csegInterval=null,csegOverrides={};

function csegRenderCatalogo(sheet,filtro){
  const{headers,rows}=csegData[sheet];
  const term=filtro.toLowerCase();
  const filtered=term?rows.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(term))):rows;
  const totalRows=rows.length||1;
  const idCols=new Set(headers.filter(h=>{const filled=rows.filter(r=>String(r[h]??'').trim()).length;return filled/totalRows>0.7;}));
  const ths=headers.map(h=>`<th style="white-space:nowrap;font-size:10px;padding:9px 10px;background:var(--navy);color:var(--white);text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.4px;border-right:1px solid rgba(255,255,255,.08)">${h}</th>`).join('');
  const trs=filtered.map(row=>{
    const tds=headers.map(h=>{
      const v=String(row[h]??'').trim();
      let bg='',color='';
      if(!idCols.has(h)){if(v){bg='rgba(76,175,80,.12)';color='#2E7D32';}else{bg='rgba(229,57,53,.1)';color='#C62828';}}
      return`<td style="font-size:11px;padding:7px 10px;border-right:1px solid var(--gray-100);border-bottom:1px solid var(--gray-100);background:${bg};color:${color};white-space:nowrap">${v||''}</td>`;
    }).join('');
    return`<tr>${tds}</tr>`;
  }).join('');
  return`<div style="background:var(--white);border-radius:12px;border:1px solid var(--gray-200);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.04)">
    <div style="padding:10px 14px;background:var(--gray-50);border-bottom:1px solid var(--gray-200);display:flex;gap:16px;align-items:center;font-size:11px;color:var(--gray-500)">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(76,175,80,.25);margin-right:4px"></span>Entregado</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(229,57,53,.18);margin-right:4px"></span>Pendiente</span>
      <span style="margin-left:auto;color:var(--gray-400)">${filtered.length} de ${rows.length} equipos</span>
    </div>
    <div style="overflow-x:auto;max-height:calc(100vh - 300px)"><table style="width:100%;border-collapse:collapse;font-family:'DM Sans',sans-serif"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>
  </div>`;
}

async function csegRenderCI(sheet,filtro){
  const{headers,rows}=csegData[sheet];
  const sheetKey=csegSheetKey(sheet);
  if(!csegOverrides[sheetKey])csegOverrides[sheetKey]=await(window.ciGetOverrides?window.ciGetOverrides(sheetKey):{});
  const overrides=csegOverrides[sheetKey];
  const keyCol=headers.find(h=>h.toUpperCase().includes('CEMA'))||headers[0];
  const esFechaCol=h=>{const u=h.toUpperCase();return u.includes('FECHA')||/\b(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC|ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\b/.test(u);};
  const term=filtro.toLowerCase();
  const filtered=term?rows.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(term))):rows;
  const ths=headers.map(h=>{
    const esF=esFechaCol(h);
    return`<th style="white-space:nowrap;font-size:10px;padding:9px 10px;background:${esF?'#1a3a5c':'var(--navy)'};color:var(--white);text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.4px;border-right:1px solid rgba(255,255,255,.08)">${h}</th>`;
  }).join('');
  const trs=filtered.map((row,i)=>{
    const rowKey=String(row[keyCol]||i).trim()||String(i);
    const tds=headers.map(h=>{
      const v=String(row[h]??'').trim();
      if(esFechaCol(h)){
        const cellKey=rowKey+'::'+h;
        const autoEstado=v?'verde':'rojo';
        const estado=overrides[cellKey]||autoEstado;
        const bg=estado==='verde'?'rgba(76,175,80,.2)':'rgba(229,57,53,.15)';
        const border=estado==='verde'?'rgba(76,175,80,.4)':'rgba(229,57,53,.35)';
        const tc=estado==='verde'?'#1B5E20':'#B71C1C';
        const icon=estado==='verde'?'&#10003;':'&#9679;';
        const ck=cellKey.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const ss2=sheet.replace(/'/g,"\\'");
        return`<td style="padding:4px 6px;border-right:1px solid rgba(0,0,0,.06);border-bottom:1px solid rgba(0,0,0,.06);text-align:center"><div onclick="window.csegToggleCICell('${sheetKey}','${ck}','${ss2}')" style="background:${bg};border:1px solid ${border};color:${tc};font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;cursor:pointer;min-width:64px;display:inline-block" title="Clic para cambiar">${icon} ${v||'—'}</div></td>`;
      }
      return`<td style="font-size:11px;padding:7px 10px;border-right:1px solid rgba(0,0,0,.05);border-bottom:1px solid rgba(0,0,0,.05);white-space:nowrap">${v||'<span style="color:var(--gray-300)">—</span>'}</td>`;
    }).join('');
    return`<tr>${tds}</tr>`;
  }).join('');
  return`<div style="background:var(--white);border-radius:12px;border:1px solid var(--gray-200);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.04)">
    <div style="padding:10px 16px;background:var(--gray-50);border-bottom:1px solid var(--gray-200);display:flex;gap:20px;align-items:center;flex-wrap:wrap;font-size:11px;color:var(--gray-500)">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(76,175,80,.3);margin-right:4px"></span>Entregada</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(229,57,53,.25);margin-right:4px"></span>Falta</span>
      <span style="color:var(--blue)">&#8505; Clic en celda de fecha para cambiar &mdash; se guarda para todos</span>
      <span style="margin-left:auto;color:var(--gray-400)">${filtered.length} de ${rows.length} registros</span>
    </div>
    <div style="overflow-x:auto;max-height:calc(100vh - 300px)"><table style="width:100%;border-collapse:collapse;font-family:'DM Sans',sans-serif"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>
  </div>`;
}
window.csegToggleCICell=async function(sheetKey,cellKey,sheet){
  if(!csegOverrides[sheetKey])csegOverrides[sheetKey]={};
  const actual=csegOverrides[sheetKey][cellKey];
  const nuevo=(!actual||actual==='rojo')?'verde':'rojo';
  csegOverrides[sheetKey][cellKey]=nuevo;
  if(window.ciSetOverride)await window.ciSetOverride(sheetKey,cellKey,nuevo);
  await csegRenderTabla(sheet,document.getElementById('cseg-search')?.value||'');
};

function csegRenderPreop(sheet,filtro){
  const{headers,rows}=csegData[sheet];
  const term=filtro.toLowerCase();
  const fechaCol=headers.find(h=>h.toUpperCase().includes('FECHA'));
  const detalleCols=headers.filter(h=>{const u=h.toUpperCase();return u.includes('DIAGNOS')||u.includes('ESPECIALIDAD')||u.includes('TECNICO')||(u.includes('TIPO')&&u.includes('MANT'))||u.includes('TERMINAC')||u.includes('ORDEN')||u.includes('OT')||u.includes('DESCRIPCI');});
  const grupoCols=headers.filter(h=>!detalleCols.includes(h));
  let lastGrupo={};
  const filled=rows.map(row=>{
    const r={...row};
    grupoCols.forEach(h=>{if(String(r[h]??'').trim())lastGrupo[h]=r[h];else r[h]=lastGrupo[h]??'';});
    return r;
  });
  const filtered=term?filled.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(term))):filled;
  if(!filtered.length)return'<div style="text-align:center;padding:40px;color:var(--gray-400)">Sin resultados</div>';
  const cemaCol=grupoCols.find(h=>h.toUpperCase().includes('CEMA'))||grupoCols[1]||grupoCols[0];
  let prevKey='',rowsHtml='';
  filtered.forEach(row=>{
    const gKey=(String(row[fechaCol]||'')+String(row[cemaCol]||'')).trim();
    const isNew=gKey!==prevKey;prevKey=gKey;
    if(isNew){
      rowsHtml+=`<tr style="background:rgba(46,117,182,.06);border-top:2px solid rgba(46,117,182,.15)">`;
      rowsHtml+=grupoCols.map(h=>`<td style="font-size:11px;font-weight:600;padding:8px 10px;color:var(--navy);border-right:1px solid var(--gray-100);white-space:nowrap">${String(row[h]??'').trim()||'&#8212;'}</td>`).join('');
      rowsHtml+=detalleCols.map(h=>`<td style="font-size:11px;padding:8px 10px;border-right:1px solid var(--gray-100);white-space:nowrap">${String(row[h]??'').trim()||'&#8212;'}</td>`).join('');
      rowsHtml+=`</tr>`;
    }else{
      rowsHtml+=`<tr style="background:var(--white);border-top:1px solid var(--gray-100)">`;
      rowsHtml+=grupoCols.map(()=>`<td style="padding:6px 10px;border-right:1px solid var(--gray-100)"></td>`).join('');
      rowsHtml+=detalleCols.map(h=>`<td style="font-size:11px;padding:6px 10px;color:var(--gray-600);border-right:1px solid var(--gray-100);white-space:nowrap">${String(row[h]??'').trim()||'&#8212;'}</td>`).join('');
      rowsHtml+=`</tr>`;
    }
  });
  const allCols=[...grupoCols,...detalleCols];
  const ths=allCols.map((h,i)=>`<th style="white-space:nowrap;font-size:10px;padding:9px 10px;background:${i<grupoCols.length?'#1a3a5c':'var(--navy)'};color:var(--white);text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.4px;border-right:1px solid rgba(255,255,255,.08)">${h}</th>`).join('');
  return`<div style="background:var(--white);border-radius:12px;border:1px solid var(--gray-200);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.04)">
    <div style="overflow-x:auto;max-height:calc(100vh - 300px)"><table style="width:100%;border-collapse:collapse;font-family:'DM Sans',sans-serif"><thead><tr>${ths}</tr></thead><tbody>${rowsHtml}</tbody></table></div>
    <div style="padding:10px 16px;background:var(--gray-50);border-top:1px solid var(--gray-200);font-size:11px;color:var(--gray-400)">${filtered.length} registros &mdash; fila azul = nuevo equipo/periodo</div>
  </div>`;
}

function csegRenderTablaEstandar(sheet,filtro){
  const{headers,rows}=csegData[sheet];
  const term=filtro.toLowerCase();
  const filtered=term?rows.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(term))):rows;
  function celda(v,h){
    const s=String(v??'').trim();if(!s)return'<span style="color:var(--gray-300)">&#8212;</span>';
    if(s.match(/^\d{4}-\d{2}-\d{2}T/))return new Date(s).toLocaleDateString('es-CO');
    if(['B','M','NA','N/A'].includes(s.toUpperCase())){const cfg={B:{bg:'rgba(76,175,80,.15)',c:'#2E7D32'},M:{bg:'rgba(229,57,53,.13)',c:'#C62828'},NA:{bg:'rgba(148,163,184,.15)',c:'#64748B'},'N/A':{bg:'rgba(148,163,184,.15)',c:'#64748B'}};const x=cfg[s.toUpperCase()]||cfg.NA;return`<span style="background:${x.bg};color:${x.c};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${s}</span>`;}
    const hU=h.toUpperCase();
    if(s.match(/^\d+(\.\d+)?%$/)||((hU.includes('AVANCE')||hU.includes('CUMPL'))&&!isNaN(parseFloat(s)))){const pct=Math.min(100,parseFloat(s));const color=pct>=80?'var(--green)':pct>=50?'var(--orange)':'var(--red)';return`<div style="min-width:80px"><div style="font-size:11px;font-weight:700;color:${color}">${s.includes('%')?s:pct+'%'}</div><div style="height:4px;background:var(--gray-200);border-radius:2px;margin-top:2px"><div style="width:${pct}%;height:4px;background:${color};border-radius:2px"></div></div></div>`;}
    if(s.toUpperCase()==='SI'||s.toUpperCase()==='SI\u0301')return`<span style="background:rgba(76,175,80,.12);color:#2E7D32;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">&#10004; SI</span>`;
    if(s.toUpperCase()==='NO')return`<span style="background:rgba(229,57,53,.1);color:#C62828;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">&#10006; NO</span>`;
    return s;
  }
  function rowBg(row){for(const h of headers){const v=String(row[h]??'').toUpperCase();if(v==='M')return'rgba(229,57,53,.05)';if(v==='B')return'rgba(76,175,80,.05)';}return'';}
  const ths=headers.map(h=>`<th style="white-space:nowrap;font-size:10px;padding:9px 10px;background:var(--navy);color:var(--white);text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.4px;border-right:1px solid rgba(255,255,255,.08)">${h}</th>`).join('');
  const trs=filtered.map(row=>`<tr style="background:${rowBg(row)};border-bottom:1px solid var(--gray-100)">${headers.map(h=>`<td style="font-size:11px;padding:7px 10px;border-right:1px solid var(--gray-100);white-space:nowrap">${celda(row[h],h)}</td>`).join('')}</tr>`).join('');
  return`<div style="background:var(--white);border-radius:12px;border:1px solid var(--gray-200);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.04)">
    <div style="overflow-x:auto;max-height:calc(100vh - 300px)"><table style="width:100%;border-collapse:collapse;font-family:'DM Sans',sans-serif"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>
    <div style="padding:10px 16px;background:var(--gray-50);border-top:1px solid var(--gray-200);font-size:11px;color:var(--gray-400);text-align:right">${filtered.length} de ${rows.length} registros</div>
  </div>`;
}

async function csegRenderTabla(sheet,filtro=''){
  const d=csegData[sheet]||{};
  const cont=document.getElementById('cseg-container');
  const toolbar=document.getElementById('cseg-toolbar');
  const countEl=document.getElementById('cseg-count');
  if(!d.rows?.length){cont.innerHTML='<div style="text-align:center;padding:60px;color:var(--gray-400)"><i class="bi bi-inbox" style="font-size:40px;display:block;margin-bottom:12px;opacity:.4"></i><p>Sin registros</p></div>';toolbar.style.display='none';return;}
  toolbar.style.display='flex';
  const term=filtro.toLowerCase();
  const n=term?d.rows.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(term))).length:d.rows.length;
  if(countEl)countEl.textContent=`${n} de ${d.rows.length} registros`;
  let html='';
  const docHdr=renderDocHeader(d.meta||[],sheet);
  if(d.tipo==='catalogo')html=csegRenderCatalogo(sheet,filtro);
  else if(d.tipo==='ci')html=await csegRenderCI(sheet,filtro);
  else if(d.tipo==='preop')html=csegRenderPreop(sheet,filtro);
  else html=csegRenderTablaEstandar(sheet,filtro);
  // Wrap tabla con encabezado documental (quitar border-radius top de la tabla)
  const tableWrap=html.replace('border-radius:12px','border-radius:0 0 12px 12px').replace('border-radius:8px 8px 0 0','border-radius:0');
  cont.innerHTML=docHdr+tableWrap;
}

async function csegCargarTab(sheet){
  csegActiva=sheet;
  document.querySelectorAll('#cseg-tabs .hmtto-tab').forEach(t=>t.classList.toggle('active',t.dataset.sheet===sheet));
  const cont=document.getElementById('cseg-container');
  cont.innerHTML=`<div class="eq-loading"><i class="bi bi-arrow-repeat" class="u-spin"></i> Cargando...</div>`;
  document.getElementById('cseg-toolbar').style.display='none';
  try{
    const hr=csegHeaderRow(sheet);
    const json=await hmttoFetch(activeUrl()+'?sheet='+encodeURIComponent(sheet)+'&hr='+hr);
    csegData[sheet]={headers:json.headers||[],rows:json.rows||[],tipo:csegTipoHoja(sheet),meta:json.meta||[]};
    csegTimestamp();
    await csegRenderTabla(sheet);
  }catch(e){
    cont.innerHTML=`<div style="text-align:center;padding:60px;color:var(--gray-400)"><i class="bi bi-exclamation-triangle" style="font-size:36px;display:block;margin-bottom:12px"></i><p>Error: ${e.message}</p></div>`;
  }
}

async function csegCargarSheets(){
  const tabsEl=document.getElementById('cseg-tabs');
  tabsEl.innerHTML='<div class="hmtto-tab-skeleton"></div><div class="hmtto-tab-skeleton" style="width:90px"></div><div class="hmtto-tab-skeleton" style="width:110px"></div>';
  try{
    const json=await hmttoFetch(activeUrl());
    csegSheets=(json.sheets||[]).filter(CSEG_FILTER);
    if(!csegSheets.length){tabsEl.innerHTML='<p style="color:var(--gray-400);font-size:13px;padding:10px 0">Sin hojas disponibles</p>';return;}
    tabsEl.innerHTML=csegSheets.map(s=>{
      const label=s.replace(/^C\.I\.\s*/i,'').trim()||s;
      return`<button class="hmtto-tab${s===csegActiva?' active':''}" data-sheet="${s}" onclick="window.csegSelTab(this.dataset.sheet)">${label}</button>`;
    }).join('');
    if(!csegActiva||!csegSheets.includes(csegActiva))csegActiva=csegSheets[0];
    await csegCargarTab(csegActiva);
  }catch(e){
    tabsEl.innerHTML='';
    document.getElementById('cseg-container').innerHTML=`<div style="text-align:center;padding:60px;color:var(--gray-400)"><i class="bi bi-exclamation-triangle" style="font-size:36px;display:block;margin-bottom:12px"></i><p>Error: ${e.message}</p></div>`;
  }
}
window.csegSelTab=async function(sheet){
  if(!csegData[sheet])await csegCargarTab(sheet);
  else{csegActiva=sheet;document.querySelectorAll('#cseg-tabs .hmtto-tab').forEach(t=>t.classList.toggle('active',t.dataset.sheet===sheet));const s=document.getElementById('cseg-search');if(s)s.value='';await csegRenderTabla(sheet);}
};
window.csegFiltrar=function(){csegRenderTabla(csegActiva,document.getElementById('cseg-search').value);};
window.csegRefresh=async function(){const icon=document.getElementById('cseg-refresh-icon');if(icon){icon.style.animation='spin .6s linear infinite';icon.style.display='inline-block';}csegData={};csegOverrides={};await csegCargarSheets();if(icon)icon.style.animation='';};
window.initCtrlSegPage=function(){
  window.scrollTo({top:0,behavior:'instant'});
  csegCargarSheets();
  if(csegInterval)clearInterval(csegInterval);
  csegInterval=setInterval(async()=>{
    if(!document.getElementById('page-ctrl-seg').classList.contains('active'))return;
    try{
      const hr=csegHeaderRow(csegActiva);
      const json=await hmttoFetch(activeUrl()+'?sheet='+encodeURIComponent(csegActiva)+'&hr='+hr);
      const prev=csegData[csegActiva]?.rows?.length;
      csegData[csegActiva]={headers:json.headers||[],rows:json.rows||[],tipo:csegTipoHoja(csegActiva)};
      if((json.rows||[]).length!==prev){await csegRenderTabla(csegActiva,document.getElementById('cseg-search')?.value||'');showToast('info','Control actualizado');}
      csegTimestamp();
    }catch(e){window._handleError&&window._handleError('csegAutoRefresh',e);}
  },60000);
};
const HMTTO_URL='https://script.google.com/macros/s/AKfycbxVL9dvF5inJZa3bUtwXJZBccNmrmfUZjbqfXvNMZBQK9bOWraDvD5bMcT-BXGp6SEmVA/exec';
// Solo mostrar hojas cuyo nombre contenga "H. MTTO" o "MTTO"
const HMTTO_FILTER = s => s.toUpperCase().includes('H. MTTO') || s.toUpperCase().includes('H.MTTO');
let hmttoSheets=[],hmttoActiva='',hmttoData={},hmttoInterval=null;

function activeUrl(){return(window._proyectoActivo&&window._proyectoActivo.url)||CSEG_URL;}
async function hmttoFetch(url){
  // Replace base URL with active project URL
  url=url.replace(CSEG_URL,activeUrl()).replace(HMTTO_URL,activeUrl());
  const r=await fetch(url);
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
}

function hmttoTimestamp(){
  const now=new Date();
  const t=now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('hmtto-last-update').innerHTML=
    `<span class="hmtto-sync-dot"></span>Actualizado a las ${t}`;
}

// Extrae el nombre del proyecto de la pestaña: "H. MTTO. RB164" → "RB164"
function hmttoTabLabel(s){
  return s.replace(/H\.?\s*MTTO\.?\s*/i,'').trim()||s;
}

async function hmttoCargarSheets(){
  const tabsEl=document.getElementById('hmtto-tabs');
  tabsEl.innerHTML='<div class="hmtto-tab-skeleton"></div><div class="hmtto-tab-skeleton" style="width:80px"></div><div class="hmtto-tab-skeleton" style="width:100px"></div>';
  try{
    // Determinar URLs: si hay proyecto activo solo esa, si "Todos" todas
    var urlsToFetch=[];
    if(window._proyectoActivo&&window._proyectoActivo.url){
      urlsToFetch=[{url:window._proyectoActivo.url,proyecto:window._proyectoActivo.nombre}];
    }else{
      urlsToFetch=(window._proyectos||[]).filter(function(p){return p.url;}).map(function(p){return{url:p.url,proyecto:p.nombre};});
      if(!urlsToFetch.length)urlsToFetch=[{url:activeUrl(),proyecto:''}];
    }
    var sheetsAll=[];
    window._hmttoSheetUrls={};
    for(var iU=0;iU<urlsToFetch.length;iU++){
      try{
        var jsonU=await hmttoFetch(urlsToFetch[iU].url);
        (jsonU.sheets||[]).filter(HMTTO_FILTER).forEach(function(s){
          var tag=urlsToFetch.length>1?' · '+urlsToFetch[iU].proyecto:'';
          var display=s+tag;
          sheetsAll.push(display);
          window._hmttoSheetUrls[display]={url:urlsToFetch[iU].url,realName:s,proyecto:urlsToFetch[iU].proyecto};
        });
      }catch(eU){console.warn('[hmtto] error proyecto:',eU);}
    }
    hmttoSheets=sheetsAll;
    if(!hmttoSheets.length){
      tabsEl.innerHTML='<p style="color:var(--gray-400);font-size:13px;padding:10px 0">Sin hojas de historial de mantenimiento encontradas</p>';
      document.getElementById('hmtto-container').innerHTML='';
      return;
    }
    tabsEl.innerHTML=hmttoSheets.map(s=>
      `<button class="hmtto-tab${s===hmttoActiva?' active':''}" onclick="window.hmttoSelTab('${s}')">${hmttoTabLabel(s)}</button>`
    ).join('');
    if(!hmttoActiva||!hmttoSheets.includes(hmttoActiva))hmttoActiva=hmttoSheets[0];
    await hmttoCargarTab(hmttoActiva);
  }catch(e){
    tabsEl.innerHTML='';
    document.getElementById('hmtto-container').innerHTML=`<div class="eq-empty" style="text-align:center;padding:60px 20px;color:var(--gray-400)"><i class="bi bi-exclamation-triangle" style="font-size:36px;display:block;margin-bottom:12px"></i><p>Error al conectar con Google Sheets.<br><small style="color:var(--gray-300)">${e.message}</small></p></div>`;
  }
}

async function hmttoCargarTab(sheet){
  hmttoActiva=sheet;
  document.querySelectorAll('.hmtto-tab').forEach(t=>t.classList.toggle('active',t.textContent===hmttoTabLabel(sheet)));
  const cont=document.getElementById('hmtto-container');
  const toolbar=document.getElementById('hmtto-toolbar');
  cont.innerHTML=`<div class="eq-loading"><i class="bi bi-arrow-repeat" class="u-spin"></i> Cargando ${hmttoTabLabel(sheet)}…</div>`;
  toolbar.style.display='none';
  try{
    var sheetInfo=window._hmttoSheetUrls&&window._hmttoSheetUrls[sheet];
    var urlToUse=sheetInfo?sheetInfo.url:activeUrl();
    var realSheetName=sheetInfo?sheetInfo.realName:sheet;
    const json=await hmttoFetch(urlToUse+'?sheet='+encodeURIComponent(realSheetName));
    hmttoData[sheet]={headers:json.headers||[],rows:json.rows||[],meta:json.meta||[]};
    hmttoTimestamp();
    hmttoRenderTabla(sheet);
  }catch(e){
    cont.innerHTML=`<div style="text-align:center;padding:60px 20px;color:var(--gray-400)"><i class="bi bi-exclamation-triangle" style="font-size:36px;display:block;margin-bottom:12px"></i><p>Error al cargar <strong>${hmttoTabLabel(sheet)}</strong>.<br><small>${e.message}</small></p></div>`;
  }
}

function hmttoFormatVal(v,h){
  if(v===''||v===null||v===undefined)return'<span style="color:var(--gray-300)">—</span>';
  const str=String(v).trim();
  if(!str||str==='0')return'<span style="color:var(--gray-300)">—</span>';
  // Fechas serializadas ISO
  if(str.match(/^\d{4}-\d{2}-\d{2}T/))return new Date(str).toLocaleDateString('es-CO');
  // Columna TIPO DE MANTENIMIENTO → badge
  const hU=h.toUpperCase();
  if(hU.includes('TIPO')&&hU.includes('MANT')){
    const up=str.toUpperCase();
    if(up.includes('PREV'))return`<span style="background:rgba(76,175,80,.15);color:#2E7D32;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap">✅ ${str}</span>`;
    if(up.includes('CORR'))return`<span style="background:rgba(229,57,53,.13);color:#C62828;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap">🔴 ${str}</span>`;
  }
  return str;
}

function hmttoRowClass(row,headers){
  // Detectar tipo de mantenimiento para colorear la fila
  const tipoKey=headers.find(h=>h.toUpperCase().includes('TIPO')&&h.toUpperCase().includes('MANT'));
  if(!tipoKey)return'';
  const tipo=String(row[tipoKey]||'').toUpperCase();
  if(tipo.includes('PREV'))return' hmtto-row-prev';
  if(tipo.includes('CORR'))return' hmtto-row-corr';
  return'';
}

function hmttoRenderTabla(sheet,filtro='',mes=''){
  const {headers,rows}=hmttoData[sheet]||{headers:[],rows:[]};
  const cont=document.getElementById('hmtto-container');
  const toolbar=document.getElementById('hmtto-toolbar');
  const countEl=document.getElementById('hmtto-count');
  if(!rows.length){
    cont.innerHTML='<div style="text-align:center;padding:60px 20px;color:var(--gray-400)"><i class="bi bi-inbox" style="font-size:40px;display:block;margin-bottom:12px;opacity:.4"></i><p>Sin registros en esta pestaña</p></div>';
    toolbar.style.display='none';return;
  }
  // Detectar columna de fecha principal
  const fechaH=headers.find(h=>{const u=h.toUpperCase();return u.includes('FECHA')&&(u.includes('REPORTE')||u.includes('APERTURA')||u.includes('INICIO'))||u==='FECHA';}) || headers.find(h=>h.toUpperCase().includes('FECHA'));
  const term=filtro.toLowerCase();
  let filtered=term?rows.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(term))):rows;
  // Filtrar por mes si se seleccionó
  if(mes&&fechaH){
    filtered=filtered.filter(r=>{
      const v=String(r[fechaH]??'').trim();
      if(!v)return false;
      // Soporta formatos: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, "01/01/2026"
      const parts=v.split(/[\/\-]/);
      if(parts.length>=2){
        // Intentar detectar mes
        const candidates=[parts[1],parts[0]];
        return candidates.some(p=>p.padStart(2,'0')===mes);
      }
      return false;
    });
  }
  toolbar.style.display='flex';
  countEl.textContent=`${filtered.length} de ${rows.length} registros`;
  if(!filtered.length){
    cont.innerHTML=`<div style="text-align:center;padding:40px 20px;color:var(--gray-400)"><i class="bi bi-search" style="font-size:32px;display:block;margin-bottom:10px;opacity:.4"></i><p>Sin coincidencias para "<strong>${filtro}</strong>"</p></div>`;
    return;
  }
  const ths=headers.map(h=>`<th style="white-space:nowrap;font-size:10px;letter-spacing:.4px">${h}</th>`).join('');
  const trs=filtered.map(row=>{
    const cls=hmttoRowClass(row,headers);
    const tds=headers.map(h=>`<td style="font-size:12px;white-space:nowrap">${hmttoFormatVal(row[h],h)}</td>`).join('');
    return`<tr class="hmtto-row${cls}">${tds}</tr>`;
  }).join('');
  const {meta:hmttoMeta}=hmttoData[sheet]||{};
  const hmttoHdr=renderDocHeader(hmttoMeta||[],sheet.replace(/H\.?\s*MTTO\.?\s*/i,'HISTORIAL DE MANTENIMIENTO ').trim());
  cont.innerHTML=hmttoHdr+`
    <div style="background:var(--white);border-radius:0 0 12px 12px;border:1px solid var(--gray-200);border-top:none;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.04)">
      <div style="overflow-x:auto;max-height:calc(100vh - 280px)">
        <table style="width:100%;border-collapse:collapse;font-family:'DM Sans',sans-serif">
          <thead>
            <tr style="background:var(--navy);position:sticky;top:0;z-index:2">
              ${ths}
            </tr>
          </thead>
          <tbody>${trs}</tbody>
        </table>
      </div>
      <div style="padding:10px 16px;background:var(--gray-50);border-top:1px solid var(--gray-200);display:flex;gap:20px;align-items:center">
        <span style="font-size:11px;color:var(--gray-500)"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(76,175,80,.25);margin-right:4px"></span>Preventivo</span>
        <span style="font-size:11px;color:var(--gray-500)"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(229,57,53,.18);margin-right:4px"></span>Correctivo</span>
        <span style="font-size:11px;color:var(--gray-400);margin-left:auto">${filtered.length} de ${rows.length} registros</span>
      </div>
    </div>`;
}

window.hmttoSelTab=async function(sheet){
  if(!hmttoData[sheet])await hmttoCargarTab(sheet);
  else{
    hmttoActiva=sheet;
    document.querySelectorAll('.hmtto-tab').forEach(t=>t.classList.toggle('active',t.textContent===hmttoTabLabel(sheet)));
    const busq=document.getElementById('hmtto-search');
    if(busq)busq.value='';
    hmttoRenderTabla(sheet);
  }
};

window.hmttoFiltrar=function(){
  const term=document.getElementById('hmtto-search').value.trim();
  const mes=document.getElementById('hmtto-mes')?.value||'';
  hmttoRenderTabla(hmttoActiva,term,mes);
};

window.hmttoDescargar=function(){
  const {headers,rows}=hmttoData[hmttoActiva]||{headers:[],rows:[]};
  if(!rows.length){showToast('error','Sin datos para descargar');return}
  const term=document.getElementById('hmtto-search')?.value.trim()||'';
  const mes=document.getElementById('hmtto-mes')?.value||'';
  const fechaH=headers.find(h=>{const u=h.toUpperCase();return u.includes('FECHA')&&(u.includes('REPORTE')||u.includes('APERTURA'))||u==='FECHA';})||headers.find(h=>h.toUpperCase().includes('FECHA'));
  let data=term?rows.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(term.toLowerCase()))):rows;
  if(mes&&fechaH)data=data.filter(r=>{const v=String(r[fechaH]??'');const p=v.split(/[\/\-]/);return p.length>=2&&[p[0],p[1]].some(x=>x.padStart(2,'0')===mes);});
  // Generar CSV con BOM UTF-8 para Excel
  const bom='﻿';
  const sep=';';
  const escape=v=>{const s=String(v??'');return s.includes(sep)||s.includes('"')||s.includes('\n')?'"'+s.replace(/"/g,'""')+'"':s;};
  const csv=bom+[headers.map(escape).join(sep),...data.map(r=>headers.map(h=>escape(r[h]??'')).join(sep))].join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const proj=hmttoTabLabel(hmttoActiva);
  const sufijo=term?`_${term}`:'';
  const mesSufijo=mes?`_mes${mes}`:'';
  a.href=url;a.download=`MOVA_Historial_${proj}${sufijo}${mesSufijo}.csv`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('success',`Descargando ${data.length} registros`);
};
window.hmttoRefresh=async function(){
  const icon=document.getElementById('hmtto-refresh-icon');
  if(icon){icon.style.animation='spin .6s linear infinite';icon.style.display='inline-block'}
  hmttoData={};// limpiar caché
  await hmttoCargarSheets();
  if(icon)icon.style.animation='';
};

// Auto-polling cada 60 segundos mientras la página esté activa
window.initHistMttoPage=function(){
  // Forzar scroll al tope — el contenido siempre arranca desde el header
  document.querySelector('.main')?.scrollTo({top:0});
  window.scrollTo({top:0,behavior:'instant'});
  hmttoCargarSheets();
  if(hmttoInterval)clearInterval(hmttoInterval);
  hmttoInterval=setInterval(async()=>{
    if(document.getElementById('page-hist-mtto').classList.contains('active')){
      // Solo recarga la pestaña activa silenciosamente
      try{
        const json=await hmttoFetch(activeUrl()+'?sheet='+encodeURIComponent(hmttoActiva));
        const prev=hmttoData[hmttoActiva]?.rows?.length;
        hmttoData[hmttoActiva]={headers:json.headers||[],rows:json.rows||[]};
        if((json.rows||[]).length!==prev){
          hmttoRenderTabla(hmttoActiva,document.getElementById('hmtto-search')?.value||'');
          showToast('info','Historial actualizado — nuevos registros detectados');
        }
        hmttoTimestamp();
      }catch(e){/* silencioso */}
    }
  },60000);
};


// ── Helpers globales para CI (usados en dashboard e inicio) ──
function isYellowBg(hex){
  if(!hex||hex==='#ffffff'||hex==='#000000'||hex==='')return false;
  const h=hex.toLowerCase().replace('#','');
  if(h.length!==6)return false;
  const r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
  return r>180&&g>150&&b<120;
}
function esNoAplica(val,frecuencia,verdesEnFila,totalMeses,cellBg){
  const v=(val||'').trim().toUpperCase();
  if(v&&v!=='N/A'&&v!=='NA'&&v!=='-'&&v!=='N/D')return false;
  if(cellBg){
    if(isYellowBg(cellBg))return true;
    const h=cellBg.toLowerCase().replace('#','');
    if(h.length===6){
      const r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
      if(r>180&&g<100&&b<100)return false;
    }
  }
  const freq=(frecuencia||'').trim().toUpperCase();
  if(freq==='MENSUAL'||freq.includes('MENSUAL'))return false;
  if(freq.includes('QUINCENAL')||freq.includes('SEMANAL'))return false;
  if(freq.includes('SEMESTRAL')||freq.includes('TRIMESTRAL')||freq.includes('ANUAL')||freq.includes('BIMENSUAL'))return true;
  return (totalMeses-verdesEnFila)/totalMeses>0.7;
}

// ===== DASHBOARD KPIs DINÁMICO =====
const DASH_MESES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DASH_COLORS=['blue','green','red','yellow','purple','blue','green','red','yellow'];
const HMTTO_SHEETS_FILTER=s=>s.toUpperCase().includes('H. MTTO')||s.toUpperCase().includes('H.MTTO');
let _dashAnio=2026,_dashMes=-1,_dashCache={};

// ── Helpers ──
function dashGetAnio(){return parseInt(document.getElementById('dash-anio')?.value||new Date().getFullYear());}
function dashGetMes(){return parseInt(document.getElementById('dash-mes')?.value??'-1');}
function dashCategoria(cema){return cema?cema.substring(0,3).toUpperCase():'???';}
function dashFmt(n){return n>=1000?(n/1000).toFixed(1)+'k':String(n);}
function dashSpinner(id){const el=document.getElementById(id);if(el)el.style.display='block';}
function dashHide(id){const el=document.getElementById(id);if(el)el.style.display='none';}
function dashShow(id,html){const el=document.getElementById(id);if(el){el.innerHTML=html||'';el.style.display='block';}}

// Colores distintos para gráficas de barras
const DASH_BAR_COLORS=[
  '#2E75B6','#E65100','#2E7D32','#C62828','#6A1B9A',
  '#00838F','#F57F17','#4527A0','#AD1457','#37474F'
];
function dashBarChart(items,maxVal,colorOverride){
  if(!items.length)return'<p style="color:var(--gray-300);font-size:12px;text-align:center;padding:20px">Sin datos</p>';
  const max=maxVal||Math.max(...items.map(i=>i.n),1);
  return items.map((item,idx)=>{
    const pct=Math.round((item.n/max)*100);
    const hex=colorOverride||DASH_BAR_COLORS[idx%DASH_BAR_COLORS.length];
    return`<div class="dash-bar-row">
      <span class="dash-bar-label wide" title="${item.label}">${item.label}</span>
      <div class="dash-bar-track">
        <div style="width:${pct}%;height:100%;border-radius:10px;background:${hex};display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:10px;font-weight:700;color:#fff;transition:width .6s ease">
          ${item.n>0&&pct>15?item.n:''}
        </div>
      </div>
      <span class="dash-bar-count">${item.n}</span>
    </div>`;
  }).join('');
}

function dashMonthGrid(monthly,color,onClick){
  const max=Math.max(...monthly.map(m=>m.n),1);
  return`<div class="dash-month-grid">${monthly.map((m,i)=>`
    <div class="dash-month-cell" onclick="${onClick?`${onClick}(${i})`:''}">
      <div class="mc-name">${DASH_MESES[i]}</div>
      <div class="mc-val">${m.n}</div>
      <div class="mc-bar" style="width:${Math.round((m.n/max)*100)%101}%;background:var(--${color||'blue'})"></div>
    </div>`).join('')}</div>`;
}

function dashDrilldown(title, html){
  document.getElementById('dash-drill-title').textContent=title;
  document.getElementById('dash-drill-body').innerHTML=html;
  const ov=document.getElementById('dash-drill-overlay');
  ov.style.display='flex';
}

// ── Tab navigation ──
window.dashTab=function(tab){
  document.querySelectorAll('.dash-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  document.querySelectorAll('.dash-tab-content').forEach(el=>el.style.display='none');
  const content=document.getElementById('dash-tab-'+tab);
  if(content)content.style.display='block';
};

// ════════════════════════════════════════
// TAB 1: MANTENIMIENTO (Google Sheets)
// ════════════════════════════════════════
async function dashLoadMtto(anio,mes=-1){
  dashSpinner('dash-mtto-loading');dashHide('dash-mtto-content');
  try{
    // Determinar URLs a consultar: si hay proyecto activo, solo esa; si no, todas las URLs configuradas
    var urlsToQuery=[];
    if(window._proyectoActivo&&window._proyectoActivo.url){
      urlsToQuery=[window._proyectoActivo.url];
    }else{
      urlsToQuery=(window._proyectos||[]).filter(function(p){return p.url;}).map(function(p){return p.url;});
      if(!urlsToQuery.length)urlsToQuery=[CSEG_URL];
    }

    let totalPrev=0,totalCorr=0,totalAll=0,totalOT=0;
    const byMesPrevFull=Array(12).fill(0),byMesCorrFull=Array(12).fill(0);
    const byCategoria={},byMesPrev=Array(12).fill(0),byMesCorr=Array(12).fill(0);
    const byEquipo={};

    // Por cada proyecto, traer hojas H.MTTO y procesar
    for(var iU=0;iU<urlsToQuery.length;iU++){
      var url=urlsToQuery[iU];
      try{
        const sheetsRespP=await fetch(url);
        const sheetsJsonP=await sheetsRespP.json();
        const mttoSheetsP=(sheetsJsonP.sheets||[]).filter(HMTTO_SHEETS_FILTER);
        if(!mttoSheetsP.length)continue;
        // Fetch all H.MTTO sheets de este proyecto en paralelo
        const sheetResultsP=await Promise.allSettled(
          mttoSheetsP.map(function(sheet){return fetch(url+'?sheet='+encodeURIComponent(sheet)+'&hr=4').then(function(r){return r.json();});})
        );
        sheetResultsP.forEach(function(result){
          if(result.status!=='fulfilled')return;
          const json0=result.value;
          (json0.rows||[]).forEach(function(row){
            const fd0=parseFechaRow(row);if(!fd0||fd0.yr!==anio)return;
            const tipoKey0=Object.keys(row).find(function(k){return k.toUpperCase().includes('TIPO')&&k.toUpperCase().includes('MANT');});
            const tipo0=String(row[tipoKey0]||'').toUpperCase();
            const m0=fd0.mes;
            if(m0>=0&&m0<12){
              if(tipo0.includes('PREV'))byMesPrevFull[m0]++;
              if(tipo0.includes('CORR'))byMesCorrFull[m0]++;
            }
          });
        });
      }catch(eP){console.warn('[dashLoadMtto] proyecto error:',eP);}
    }

    // Pass 2: re-agregar con filtro de mes desde cada proyecto
    // Pass 2: para KPIs filtrados — re-fetch cada proyecto y aplicar filtro de mes + categoría/equipo/OT
    // (Los datos quedan en byMesPrev/byMesCorr/byCategoria/byEquipo/totalPrev/totalCorr/totalOT)
    for(var iU2=0;iU2<urlsToQuery.length;iU2++){
      var url2=urlsToQuery[iU2];
      try{
        var sheetsR2=await fetch(url2);
        var sheetsJ2=await sheetsR2.json();
        var mttoSheets2=(sheetsJ2.sheets||[]).filter(HMTTO_SHEETS_FILTER);
        if(!mttoSheets2.length)continue;
        var sheetResults2=await Promise.allSettled(
          mttoSheets2.map(function(sheet){return fetch(url2+'?sheet='+encodeURIComponent(sheet)+'&hr=4').then(function(r){return r.json();});})
        );
        sheetResults2.forEach(function(result){
          if(result.status!=='fulfilled')return;
          var json=result.value;
          var rows=(json.rows||[]).filter(function(r){
            var fd=parseFechaRow(r);
            if(!fd)return true;
            if(fd.yr!==anio)return false;
            if(mes>=0&&fd.mes!==mes)return false;
            return true;
          });
          rows.forEach(function(row){
            function norm(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();}
            var tipoKey=Object.keys(row).find(function(k){return norm(k).includes('TIPO')&&norm(k).includes('MANT');});
            var cemaKey=Object.keys(row).find(function(k){return norm(k)==='CEMA'||norm(k).includes('CEMA');});
            var rowKeys=Object.keys(row);
            var otKey=rowKeys.find(function(k){
              var n=norm(k);
              return n==='OT'||n.startsWith('OT ')||n.startsWith('OT#')||
                     (n.includes('ORDEN')&&n.includes('TRAB'))||
                     (n.includes('NUMERO')&&n.includes('OT'))||
                     n.includes('N OT')||n.includes('NO OT')||
                     k.toUpperCase()==='OT N°'||k.toUpperCase()==='OT#'||
                     k.toUpperCase().includes('OT N°');
            }) || (rowKeys.length>18?rowKeys[18]:null);
            var tipo=String(row[tipoKey]||'').toUpperCase();
            var cema=String(row[cemaKey]||'').trim();
            var cat=dashCategoria(cema);
            var fd=parseFechaRow(row);
            var rowMes=fd?fd.mes:-1;
            var otVal=String(row[otKey]||'').trim();
            if(otVal&&otVal!=='0'&&otVal!=='—')totalOT++;
            var isPrev=tipo.includes('PREV');
            var isCorr=tipo.includes('CORR');
            if(isPrev){totalPrev++;if(rowMes>=0&&rowMes<12)byMesPrev[rowMes]++;}
            if(isCorr){totalCorr++;if(rowMes>=0&&rowMes<12)byMesCorr[rowMes]++;}
            if(isPrev||isCorr)totalAll++;
            if(cat&&cat!=='???'){byCategoria[cat]=(byCategoria[cat]||0)+1;}
            if(cema){byEquipo[cema]=(byEquipo[cema]||0)+1;}
          });
        });
      }catch(eP2){console.warn('[dashLoadMtto pass2] error:',eP2);}
    }

    const pctPrev=totalAll?Math.round(totalPrev/totalAll*100):0;
    const pctOT=totalAll?Math.round(totalOT/totalAll*100):0;
    // Update top KPI card
    const kpiOT=document.getElementById('kpi-pct-ot');
    if(kpiOT){
      if(totalOT===0&&totalAll>0){
        // No encontró columna OT — mostrar total de intervenciones
        kpiOT.className='kpi-card good';
        kpiOT.innerHTML=`<div class="kpi-label">Intervenciones con OT</div><div class="kpi-value">${totalAll}</div><div class="kpi-trend up">▲ total en ${anio}</div>`;
      }else{
        const cls=pctOT>=80?'good':pctOT>=60?'warn':'bad';
        kpiOT.className='kpi-card '+cls;
        kpiOT.innerHTML=`<div class="kpi-label">% O.T. Ejecutadas</div><div class="kpi-value">${pctOT}%</div><div class="kpi-trend ${pctOT>=80?'up':'down'}">${pctOT>=80?'▲':'▼'} ${totalOT} de ${totalAll}</div>`;
      }
    }
    const topCats=Object.entries(byCategoria).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>({label:k,n:v}));
    const topEquipos=Object.entries(byEquipo).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>({label:k,n:v}));
    const maxMes=Math.max(...byMesPrev.map((v,i)=>v+byMesCorr[i]),1);

    const html=`
    <div class="dash-section">
      <div class="dash-section-title">🔧 Resumen de Mantenimiento ${anio}</div>
      <div class="dash-kpi-grid">
        <div class="dash-kpi green" onclick="dashOpenDrill('mtto_prev')">
          <div class="dash-kpi-label">Preventivos</div>
          <div class="dash-kpi-value">${dashFmt(totalPrev)}</div>
          <div class="dash-kpi-sub">${pctPrev}% del total</div>
          <div class="dash-kpi-hint">👆 Ver por mes</div>
        </div>
        <div class="dash-kpi red" onclick="dashOpenDrill('mtto_corr')">
          <div class="dash-kpi-label">Correctivos</div>
          <div class="dash-kpi-value">${dashFmt(totalCorr)}</div>
          <div class="dash-kpi-sub">${100-pctPrev}% del total</div>
          <div class="dash-kpi-hint">👆 Ver por mes</div>
        </div>
        <div class="dash-kpi blue" onclick="dashOpenDrill('mtto_total')">
          <div class="dash-kpi-label">Total Intervenciones</div>
          <div class="dash-kpi-value">${dashFmt(totalAll)}</div>
          <div class="dash-kpi-sub">Todos los proyectos</div>
          <div class="dash-kpi-hint">👆 Ver por mes</div>
        </div>
        <div class="dash-kpi ${pctPrev>=70?'green':'yellow'}">
          <div class="dash-kpi-label">Índice Preventivo</div>
          <div class="dash-kpi-value">${pctPrev}%</div>
          <div class="dash-kpi-sub">Meta: ≥ 70%</div>
          <div class="dash-kpi-hint">${pctPrev>=70?'✅ Dentro de meta':'⚠️ Por debajo de meta'}</div>
        </div>
      </div>
    </div>
    <div class="dash-two-col">
      <div class="dash-card">
        <div class="dash-card-title">📊 Preventivo vs Correctivo por mes
          <span class="dash-badge blue">Barras apiladas</span>
        </div>
        ${byMesPrev.map((v,i)=>{
          const corr=byMesCorr[i];const total=v+corr;
          const maxT=Math.max(...byMesPrev.map((x,j)=>x+byMesCorr[j]),1);
          const barW=Math.round(total/maxT*100);
          const pp=total?Math.round(v/total*100):0;
          return`<div class="dash-bar-row">
            <span class="dash-bar-label">${DASH_MESES[i]}</span>
            <div class="dash-bar-track" style="height:20px;position:relative" title="Preventivos:${v} | Correctivos:${corr}">
              ${total===0
                ?'<div style="height:100%;width:4px;background:var(--gray-200);border-radius:2px"></div>'
                :`<div style="position:absolute;left:0;top:0;height:100%;width:${barW}%;border-radius:10px;overflow:hidden;display:flex">
                    <div style="width:${pp}%;background:#2E7D32;opacity:.85;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">${v>0&&pp>20?v:''}</div>
                    <div style="width:${100-pp}%;background:#C62828;opacity:.85;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">${corr>0&&(100-pp)>20?corr:''}</div>
                  </div>`
              }
            </div>
            <span class="dash-bar-count" style="font-weight:700;color:${total>0?'var(--navy)':'var(--gray-300)'}">${total}</span>
          </div>`;
        }).join('')}
        <div style="display:flex;gap:16px;margin-top:10px;font-size:11px;color:var(--gray-500)">
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--green);margin-right:4px"></span>Preventivo</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--red);margin-right:4px"></span>Correctivo</span>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-card-title">🏷️ Intervenciones por Categoría</div>
        ${dashBarChart(topCats)}
        <div class="dash-card-title" class="u-mt-16">🚜 Top 5 Equipos</div>
        ${dashBarChart(topEquipos,'',DASH_BAR_COLORS[0])}
      </div>
    </div>`;

    dashStoreDrill('mtto_prev',`Preventivos por mes ${anio}`,byMesPrevFull,'green','Preventivos');
    dashStoreDrill('mtto_corr',`Correctivos por mes ${anio}`,byMesCorrFull,'red','Correctivos');
    dashStoreDrill('mtto_total',`Total por mes ${anio}`,byMesPrevFull.map((v,i)=>v+byMesCorrFull[i]),'blue','Total');
    dashHide('dash-mtto-loading');
    dashShow('dash-mtto-content',html);
  }catch(e){
    dashHide('dash-mtto-loading');
    dashShow('dash-mtto-content',`<div class="eq-empty" style="text-align:center;padding:40px"><i class="bi bi-exclamation-triangle"></i><p>Error cargando mantenimiento: ${e.message}</p></div>`);
  }
}

// Cache for drilldown data
window._dashDrillCache={};

// ── Datos reales 2025 (del tablero de indicadores) ──
const _DISP_2025_PCT=[95.0,95.0,95.0,95.0,95.4,95.4,96.6,95.5,97.0,97.8,97.0,95.5];
const _DISP_2025_NUM=[76,76,76,76,83,83,84,128,130,131,130,128];
const _DISP_2025_DEN=[80,80,80,80,87,87,87,134,134,134,134,134];
const _CUMPL_2025_PCT=[96.1,97.7,97.1,98.4,96.8,97.4,95.2,95.2,97.1,94.8,97.8,93.1];
const _CUMPL_2025_NUM=[245,293,369,305,329,336,295,300,330,294,264,270];
const _CUMPL_2025_DEN=[255,300,380,310,340,345,310,315,340,310,270,290];
// 2026: se carga dinámicamente; null = mes sin datos aún
const _DISP_2026_PCT=[null,null,null,null,null,null,null,null,null,null,null,null];
const _DISP_2026_NUM=[null,null,null,null,null,null,null,null,null,null,null,null];
const _DISP_2026_DEN=[null,null,null,null,null,null,null,null,null,null,null,null];
const _CUMPL_2026_PCT=[null,null,null,null,null,null,null,null,null,null,null,null];
const _CUMPL_2026_NUM=[null,null,null,null,null,null,null,null,null,null,null,null];
const _CUMPL_2026_DEN=[null,null,null,null,null,null,null,null,null,null,null,null];

// ── Construir HTML de drilldown con numerador/denominador ──
function buildDispCumplDrill(key,title,pctArr,numArr,denArr,color,meta){
  const valid=pctArr.filter(v=>v!==null);
  const maxPct=Math.max(...valid,1);
  const promedio=valid.length?Math.round(valid.reduce((a,b)=>a+b,0)/valid.length*10)/10:null;
  const rows=DASH_MESES.map((m,i)=>{
    const v=pctArr[i],n=numArr[i],d=denArr[i];
    const isCurrent=_dashMes===i;
    if(v===null) return`<div class="dash-bar-row" style="opacity:.35">
      <span class="dash-bar-label" class="u-fs-10">${m}</span>
      <div class="dash-bar-track"><div style="width:3px;height:100%;background:var(--gray-200);border-radius:2px"></div></div>
      <span class="dash-bar-count" style="font-size:10px;color:var(--gray-300)">—</span>
    </div>`;
    const pct=Math.round(v/maxPct*100);
    const cumpleMeta=v>=meta*100;
    const barColor=cumpleMeta?color:'#C62828';
    return`<div class="dash-bar-row" style="${isCurrent?'background:rgba(46,117,182,.06);border-radius:6px;padding:2px 6px;margin:-2px -6px':''}">
      <span class="dash-bar-label" style="${isCurrent?'font-weight:800;color:var(--navy)':''}">${isCurrent?'▶ ':''}${m}</span>
      <div class="dash-bar-track">
        <div style="width:${pct}%;height:100%;border-radius:10px;background:${barColor};display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:10px;font-weight:700;color:#fff;transition:width .5s ease">
          ${pct>20?v+'%':''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;min-width:60px">
        <span style="font-size:12px;font-weight:700;color:${cumpleMeta?'var(--green-dark)':'var(--red)'}">${v}%</span>
        ${n!==null?`<span style="font-size:10px;color:var(--gray-400)">${n}/${d}</span>`:''}
      </div>
    </div>`;
  }).join('');
  const metaLine=`Meta: ${Math.round(meta*100)}% · Promedio: ${promedio!==null?promedio+'%':'—'}`;
  window._dashDrillCache[key]={
    title,
    html:`<div style="margin-bottom:14px;padding:10px 14px;background:var(--gray-50);border-radius:8px;border-left:3px solid ${color}">
      <strong style="font-family:'Space Grotesk',sans-serif;color:var(--navy)">${title}</strong>
      <span style="display:block;font-size:12px;color:var(--gray-500);margin-top:3px">${metaLine}</span>
    </div>${rows}`
  };
}

// ── Parsear hoja de indicador desde Google Sheets ──
// Busca filas donde la col "Periodo" contiene meses (Enero, Febrero...)
async function parseIndicadorSheet(sheetName){
  try{
    const resp=await fetch(activeUrl()+'?sheet='+encodeURIComponent(sheetName)+'&hr=1');
    const json=await resp.json();
    const rows=json.rows||[];
    const MESES_MAP={'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11};
    const result={pct:Array(12).fill(null),num:Array(12).fill(null),den:Array(12).fill(null)};
    // Buscar columna que tenga "Periodo" o "Mes"
    let periodoCol=null,numCol=null,denCol=null,resCol=null;
    // Escanear hasta encontrar la fila de resultados (busca "Enero" en cualquier columna)
    for(const row of rows){
      const vals=Object.values(row).map(v=>String(v||'').trim().toLowerCase());
      const hasMes=vals.some(v=>MESES_MAP.hasOwnProperty(v));
      if(hasMes){
        // Encontramos una fila de datos — deducir columnas de la fila anterior que tiene "Periodo"
        const keys=Object.keys(row);
        // Buscar el mes en cada columna
        for(const k of keys){
          const v=String(row[k]||'').trim().toLowerCase();
          if(MESES_MAP.hasOwnProperty(v)){periodoCol=k;break;}
        }
        break;
      }
    }
    // Si encontramos la columna periodo, determinar las demás por posición
    if(periodoCol){
      // Buscar headers row — la fila que tiene "Numerador","Denominador","Resultado"
      let headersRow=null;
      for(const row of rows){
        const vals=Object.values(row).map(v=>String(v||'').toLowerCase());
        if(vals.some(v=>v.includes('numerador'))&&vals.some(v=>v.includes('denominador'))){
          headersRow=row;break;
        }
      }
      if(headersRow){
        const keys=Object.keys(headersRow);
        for(const k of keys){
          const v=String(headersRow[k]||'').toLowerCase().trim();
          if(v.includes('numerador'))numCol=k;
          else if(v.includes('denominador'))denCol=k;
          else if(v.includes('resultado'))resCol=k;
        }
      }
      // Leer filas de datos
      for(const row of rows){
        const periodo=String(row[periodoCol]||'').trim().toLowerCase();
        const mesIdx=MESES_MAP[periodo];
        if(mesIdx===undefined)continue;
        const res=parseFloat(String(row[resCol]||'0').replace(',','.'));
        const num=parseFloat(String(row[numCol]||'').replace(',','.'));
        const den=parseFloat(String(row[denCol]||'').replace(',','.'));
        if(!isNaN(res)&&res>0){
          result.pct[mesIdx]=Math.round(res*(res<=1?100:1)*10)/10; // si viene como 0.95 → 95
          if(!isNaN(num)&&!isNaN(den)){result.num[mesIdx]=num;result.den[mesIdx]=den;}
        }
      }
    }
    return result;
  }catch(e){console.warn('parseIndicadorSheet',sheetName,e);return null;}
}

// ── Cargar y cachear disponibilidad y cumplimiento ──
async function dashLoadDispCumpl(anio){
  if(anio===2025){
    buildDispCumplDrill('disp_mes','Disponibilidad de Equipos 2025',_DISP_2025_PCT,_DISP_2025_NUM,_DISP_2025_DEN,'#2E7D32',0.85);
    buildDispCumplDrill('cumpl_mes','Cumplimiento Actividades 2025',_CUMPL_2025_PCT,_CUMPL_2025_NUM,_CUMPL_2025_DEN,'#2E75B6',0.95);
    const dAvg=Math.round(_DISP_2025_PCT.reduce((a,b)=>a+b,0)/_DISP_2025_PCT.length*10)/10;
    const cAvg=Math.round(_CUMPL_2025_PCT.reduce((a,b)=>a+b,0)/_CUMPL_2025_PCT.length*10)/10;
    updateDispCumplCards(dAvg,cAvg,2025,_dashMes,_DISP_2025_PCT,_CUMPL_2025_PCT);
    return;
  }

  // ── 2026: fuentes reales ──
  // DISPONIBILIDAD ← Firestore colección "equipos", campo "estado"
  // ════════════════════════════════════════════════════════════════════
  // ESTRATEGIA: Persistencia mensual en Firestore
  // Colección: indicadores_mensuales/{YYYY_MM}
  // Campos: disp_num, disp_den, cumpl_num, cumpl_den, fecha
  // 
  // Al cargar:  1) Leer historial completo del año desde Firestore
  //             2) Calcular lectura REAL del mes actual (equipos + sheets)
  //             3) Guardar/actualizar el mes actual en Firestore
  //             4) Mostrar datos históricos + lectura actual
  // ════════════════════════════════════════════════════════════════════

  const dPct=Array(12).fill(null),dNum=Array(12).fill(null),dDen=Array(12).fill(null);
  const cPct=Array(12).fill(null),cNum=Array(12).fill(null),cDen=Array(12).fill(null);
  const mesHoy=new Date().getMonth();
  const mesRef=_dashMes>=0?_dashMes:mesHoy;
  const anioStr=String(anio);

  // ── PASO 1: Cargar historial guardado de Firestore ──
  try{
    const histSnap=await getDocs(
      query(collection(db,'indicadores_mensuales'),
        where('anio','==',anioStr))
    );
    histSnap.docs.forEach(d=>{
      const data=d.data();
      const m=parseInt(data.mes);
      if(m>=0&&m<12){
        if(data.disp_num!=null&&data.disp_den>0){
          dNum[m]=data.disp_num;dDen[m]=data.disp_den;
          dPct[m]=Math.round(data.disp_num/data.disp_den*1000)/10;
        }
        if(data.cumpl_num!=null&&data.cumpl_den>0){
          cNum[m]=data.cumpl_num;cDen[m]=data.cumpl_den;
          cPct[m]=Math.round(data.cumpl_num/data.cumpl_den*1000)/10;
        }
      }
    });
    console.log('[Indicadores] Historial cargado:',histSnap.docs.length,'meses');
  }catch(e){console.warn('[Indicadores] Error cargando historial:',e);}

  // ── PASO 2: Calcular lectura REAL del mes actual ──
  let dispNumHoy=null,dispDenHoy=null;
  let cumplNumHoy=null,cumplDenHoy=null;

  // Disponibilidad actual ← Firestore equipos filtrado por proyecto
  try{
    const snap=await getDcsByProy('equipos');
    const total=snap.docs.length;
    const varados=snap.docs.filter(d=>{
      const est=(d.data().estado||'').toLowerCase();
      return est.includes('varad')||est.includes('fuera')||est.includes('baja')||est.includes('inactiv');
    }).length;
    if(total>0){dispNumHoy=total-varados;dispDenHoy=total;}
    console.log('[Disponibilidad] proyecto:',(window._proyectoActivo?.nombre||'todos'),'total:',total,'varados:',varados);
  }catch(e){console.warn('[Disponibilidad] Error:',e);}

  // Cumplimiento actual ← Google Sheets cronograma
  // Busca la seccion "INTERVENCIONES PLANEADAS VS EJECUTADAS" dinamicamente
  try{
    const sheetsResp=await fetch(activeUrl());
    const allSheets=((await sheetsResp.json()).sheets)||[];
    const cronSheet=allSheets.find(s=>{
      const n=s.toUpperCase().replace(/\s+/g,'');
      return n.includes('CRONOGRAMA')||n==='DASHBOARD'||(n.includes('DASH')&&n.includes('CRONO'));
    })||allSheets.find(s=>s.toUpperCase().includes('CRONOGRAMA'));
    if(cronSheet){
      // hr=1 para leer TODAS las filas y encontrar la sub-seccion dinamicamente
      const resp=await fetch(activeUrl()+'?sheet='+encodeURIComponent(cronSheet)+'&hr=1');
      const json=await resp.json();
      const allRows=json.rows||[];
      console.log('[Cumplimiento] cronSheet:',cronSheet,'total rows:',allRows.length);
      const MESES_MAP={enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,
                       julio:6,agosto:7,septiembre:8,octubre:9,noviembre:10,diciembre:11};
      // Escanear filas buscando la sub-cabecera: fila que tenga MES + EJECUTADO + PLANEADO
      let colMes=null,colEjec=null,colPlan=null,dataStartIdx=-1;
      for(let i=0;i<allRows.length;i++){
        const row=allRows[i];
        const keys=Object.keys(row);
        const vals=keys.map(k=>String(row[k]||'').toUpperCase().trim());
        const hasMes=vals.some(v=>v==='MES');
        const hasEjec=vals.some(v=>v.includes('EJECUTAD'));
        const hasPlan=vals.some(v=>v.includes('PLANEADO')||v.includes('PROGRAMADO'));
        if(hasMes&&(hasEjec||hasPlan)){
          // Mapear columnas por nombre
          keys.forEach(k=>{
            const v=String(row[k]||'').toUpperCase().trim();
            if(v==='MES')colMes=k;
            else if(v.includes('EJECUTAD'))colEjec=k;
            else if(v.includes('PLANEADO')||v.includes('PROGRAMADO'))colPlan=k;
          });
          dataStartIdx=i+1;
          console.log('[Cumplimiento] Sub-header en fila idx',i,'colMes:',colMes,'colEjec:',colEjec,'colPlan:',colPlan);
          break;
        }
      }
      // Fallback: usuario dijo filas 27-42, con hr=1 eso es indices 25-41
      if(dataStartIdx<0){
        console.warn('[Cumplimiento] Sub-header no encontrado, usando indices 25-41 (filas 27-42)');
        const h0=json.headers||[];
        dataStartIdx=25; colMes=h0[0]; colEjec=h0[1]; colPlan=h0[2];
      }
      // Leer hasta 16 filas de datos desde el inicio de la seccion
      const dataRows=allRows.slice(dataStartIdx,dataStartIdx+16);
      dataRows.forEach(row=>{
        const mesVal=String(row[colMes]||'').trim().toLowerCase();
        const mesIdx=MESES_MAP[mesVal];
        if(mesIdx===undefined)return;
        const ejec=parseFloat(String(row[colEjec]||'0').replace(/[^\d.,]/g,'').replace(',','.'));
        const plan=parseFloat(String(row[colPlan]||'0').replace(/[^\d.,]/g,'').replace(',','.'));
        if(!isNaN(plan)&&plan>0){
          cNum[mesIdx]=isNaN(ejec)?0:Math.round(ejec);
          cDen[mesIdx]=Math.round(plan);
          cPct[mesIdx]=Math.round((isNaN(ejec)?0:ejec)/plan*1000)/10;
          if(mesIdx===mesHoy){cumplNumHoy=cNum[mesIdx];cumplDenHoy=cDen[mesIdx];}
        }
      });
      console.log('[Cumplimiento] resultado:',cPct.map((v,i)=>v!=null?DASH_MESES[i]+':'+v+'%':'').filter(Boolean));
    }
  }catch(e){console.warn('[Cumplimiento] Error:',e);}

  // ── PASO 3: Sobrescribir mes actual con lectura real y guardar en Firestore ──
  if(dispNumHoy!==null){
    dNum[mesHoy]=dispNumHoy;dDen[mesHoy]=dispDenHoy;
    dPct[mesHoy]=Math.round(dispNumHoy/dispDenHoy*1000)/10;
  }
  if(cumplNumHoy!==null){
    cNum[mesHoy]=cumplNumHoy;cDen[mesHoy]=cumplDenHoy;
    cPct[mesHoy]=Math.round(cumplNumHoy/cumplDenHoy*1000)/10;
  }

  // Persistir en Firestore (solo actualiza si hay datos nuevos)
  try{
    const docKey=`${anio}_${String(mesHoy+1).padStart(2,'0')}`;
    const payload={
      anio:anioStr,mes:mesHoy,
      ...(dispNumHoy!==null?{disp_num:dispNumHoy,disp_den:dispDenHoy}:{}),
      ...(cumplNumHoy!==null?{cumpl_num:cumplNumHoy,cumpl_den:cumplDenHoy}:{}),
      fecha:serverTimestamp(),
      actualizadoPor:window.nombreOperador||'sistema'
    };
    await setDoc(doc(db,'indicadores_mensuales',docKey),payload,{merge:true});
    console.log('[Indicadores] Snapshot guardado:',docKey,payload);
  }catch(e){console.warn('[Indicadores] Error guardando:',e);}

  buildDispCumplDrill('disp_mes',`Disponibilidad de Equipos ${anio}`,dPct,dNum,dDen,'#2E7D32',0.85);
  buildDispCumplDrill('cumpl_mes',`Cumplimiento Actividades ${anio}`,cPct,cNum,cDen,'#2E75B6',0.95);
  const dValid=dPct.filter(v=>v!==null);
  const cValid=cPct.filter(v=>v!==null);
  const dAvg=dValid.length?Math.round(dValid.reduce((a,b)=>a+b,0)/dValid.length*10)/10:null;
  const cAvg=cValid.length?Math.round(cValid.reduce((a,b)=>a+b,0)/cValid.length*10)/10:null;
  updateDispCumplCards(dAvg,cAvg,anio,_dashMes,dPct,cPct);
}

function updateDispCumplCards(dAvg,cAvg,anio,mes,dArr,cArr){
  // Valor a mostrar: mes específico o promedio
  const dVal=mes>=0&&dArr[mes]!=null?dArr[mes]:dAvg;
  const cVal=mes>=0&&cArr[mes]!=null?cArr[mes]:cAvg;
  const mesLabel=mes>=0?DASH_MESES[mes]:'Promedio';
  // KPI top dashboard
  const dispCard=document.getElementById('dash-kpi-disp')||document.querySelector('#dash-kpis-grid .kpi-card:first-child');
  if(dispCard&&dVal){
    const dPrev=mes>0&&dArr[mes-1]!=null?dArr[mes-1]:null;
    const dDiff=dPrev?Math.round((dVal-dPrev)*10)/10:null;
    dispCard.className='kpi-card '+(dVal>=85?'good':'warn');
    dispCard.innerHTML=`<div class="kpi-label">Disponibilidad · ${mesLabel} <span style="font-size:9px;opacity:.5">👆</span></div><div class="kpi-value">${dVal}%</div><div class="kpi-trend up">${dDiff!==null?(dDiff>=0?'▲ +'+dDiff+'%':'▼ '+dDiff+'%'):'▲ Meta: 85%'}</div>`;
  }
  const cumplCard=document.getElementById('dash-kpi-cumpl')||document.querySelectorAll('#dash-kpis-grid .kpi-card')[1];
  if(cumplCard&&cVal){
    const cPrev=mes>0&&cArr[mes-1]!=null?cArr[mes-1]:null;
    const cDiff=cPrev?Math.round((cVal-cPrev)*10)/10:null;
    cumplCard.className='kpi-card '+(cVal>=95?'good':'warn');
    cumplCard.innerHTML=`<div class="kpi-label">Cumplimiento · ${mesLabel} <span style="font-size:9px;opacity:.5">👆</span></div><div class="kpi-value">${cVal}%</div><div class="kpi-trend up">${cDiff!==null?(cDiff>=0?'▲ +'+cDiff+'%':'▼ '+cDiff+'%'):'▲ Meta: 95%'}</div>`;
  }
  // KPI inicio (si existen)
  const inicioDisp=document.querySelector('#inicio-kpi-grid .kpi-card:first-child');
  if(inicioDisp&&dVal){inicioDisp.className='kpi-card '+(dVal>=85?'good':'warn');inicioDisp.innerHTML=`<div class="kpi-label">Disponibilidad</div><div class="kpi-value">${dVal}%</div><div class="kpi-trend up">▲ Meta: 85%</div>`;}
  const inicioCumpl=document.querySelectorAll('#inicio-kpi-grid .kpi-card')[1];
  if(inicioCumpl&&cVal){inicioCumpl.className='kpi-card '+(cVal>=95?'good':'warn');inicioCumpl.innerHTML=`<div class="kpi-label">Cumplimiento</div><div class="kpi-value">${cVal}%</div><div class="kpi-trend up">▲ Meta: 95%</div>`;}
}

function dashStoreStaticDrill(){
  dashLoadDispCumpl(_dashAnio);
}
function dashStoreDrill(key,title,arr,color,label){
  const max=Math.max(...arr,1);
  const total=arr.reduce((a,b)=>a+b,0);
  const colHex={'blue':'#2E75B6','green':'#2E7D32','red':'#C62828','yellow':'#E65100','purple':'#6A1B9A'};
  const hex=colHex[color]||color||'#2E75B6';
  const rows=DASH_MESES.map((m,i)=>{
    const pct=Math.round(arr[i]/max*100);
    const isCurrent=_dashMes===i;
    return`<div class="dash-bar-row" style="${isCurrent?'background:rgba(46,117,182,.06);border-radius:6px;padding:2px 4px;margin-left:-4px':''}">
      <span class="dash-bar-label" style="${isCurrent?'font-weight:800;color:var(--navy)':''}">
        ${isCurrent?'▶ ':''}${m}
      </span>
      <div class="dash-bar-track">
        <div style="width:${pct}%;height:100%;border-radius:10px;background:${hex}${isCurrent?'':'99'};display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:10px;font-weight:700;color:#fff;transition:width .5s ease">
          ${arr[i]>0&&pct>15?arr[i]:''}
        </div>
      </div>
      <span class="dash-bar-count" style="${isCurrent?'font-weight:700;color:var(--navy)':''}">${arr[i]}</span>
    </div>`;
  }).join('');
  const mesFiltro=_dashMes>=0?` (filtrado: ${DASH_MESES[_dashMes]})` :'';
  const mesVal=_dashMes>=0?` · Mes seleccionado: ${arr[_dashMes]}`:'';
  window._dashDrillCache[key]={
    title:`${title}`,
    html:`<div style="margin-bottom:14px;padding:10px 14px;background:var(--gray-50);border-radius:8px;border-left:3px solid ${hex}">
      <strong style="font-family:'Space Grotesk',sans-serif;color:var(--navy)">${label}: ${total} total en ${_dashAnio}</strong>${mesVal?`<span style="display:block;font-size:12px;color:var(--blue);margin-top:2px">${mesVal}</span>`:''}
    </div>${rows}`
  };
}
window.dashOpenDrill=function(key){
  const d=window._dashDrillCache[key];
  if(d)dashDrilldown(d.title,d.html);
};
function dashMonthDrillHtml(arr,color,label){
  const max=Math.max(...arr,1);
  const rows=DASH_MESES.map((m,i)=>`
    <div class="dash-bar-row">
      <span class="dash-bar-label">${m}</span>
      <div class="dash-bar-track"><div class="dash-bar-fill ${color}" style="width:${Math.round(arr[i]/max*100)}%">${arr[i]>0&&Math.round(arr[i]/max*100)>15?arr[i]:''}</div></div>
      <span class="dash-bar-count">${arr[i]}</span>
    </div>`).join('');
  const total=arr.reduce((a,b)=>a+b,0);
  return`<div class="u-mb-12"><strong style="font-family:'Space Grotesk',sans-serif;color:var(--navy)">${label}: ${total} en ${_dashAnio}</strong></div>${rows}`;
}

// ════════════════════════════════════════
// Helper: consulta con filtro de año (para no descargar toda la colección)
async function getDcsByProyF(colName,anio){
  const ini=new Date(anio,0,1);
  const fin=new Date(anio+1,0,1);
  const col=collection(db,colName);
  const q=query(col,where("fecha",">=",Timestamp.fromDate(ini)),where("fecha","<",Timestamp.fromDate(fin)));
  return getDocs(q);
}

// TAB 2: PREOPERACIONALES (Firestore)
// ════════════════════════════════════════
async function dashLoadPreop(anio,mes=-1){
  dashSpinner('dash-preop-loading');dashHide('dash-preop-content');
  try{
    const cols=['inspecciones_linea_amarilla','inspecciones_linea_blanca'];
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const ayer=new Date(hoy);ayer.setDate(ayer.getDate()-1);
    const manana=new Date(hoy);manana.setDate(manana.getDate()+1);
    const ini=new Date(anio,0,1),fin=new Date(anio+1,0,1);
    let totalAnio=0,totalAmarilla=0,totalBlanca=0,hoyN=0,ayerN=0;
    const byCategoria={},byProyecto={},byMes=Array(12).fill(0);
    const byDia=Array(7).fill(0); // último 7 días
    for(const col of cols){
      const snap=await getDcsByProyF(col,anio);
      snap.docs.forEach(d=>{
        const data=d.data();
        const f=data.fecha?.toDate?.();
        if(!f)return;
        const inYear=f>=ini&&f<fin;
        const inMes=mes<0||f.getMonth()===mes;
        if(inYear&&inMes){
          totalAnio++;
          if(col.includes('amarilla'))totalAmarilla++;else totalBlanca++;
          const mes=f.getMonth();byMes[mes]++;
          const cema=data.equipo?.cema||data.cema||'';
          const cat=dashCategoria(cema);
          if(cat&&cat!=='???')byCategoria[cat]=(byCategoria[cat]||0)+1;
          const proy=data.equipo?.ubicacion||data.proyecto||'Sin proyecto';
          const proyNorm=String(proy).split(' ')[0].toUpperCase().substring(0,10);
          byProyecto[proyNorm]=(byProyecto[proyNorm]||0)+1;
        }
        if(f>=hoy&&f<manana)hoyN++;
        if(f>=ayer&&f<hoy)ayerN++;
      });
    }
    const varDia=ayerN>0?Math.round((hoyN-ayerN)/ayerN*100):null;
    const topCats=Object.entries(byCategoria).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>({label:k,n:v}));
    const topProys=Object.entries(byProyecto).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>({label:k,n:v}));
    const maxMes=Math.max(...byMes,1);

    const html=`
    <div class="dash-section">
      <div class="dash-section-title">✅ Preoperacionales ${anio}</div>
      <div class="dash-kpi-grid">
        <div class="dash-kpi blue" onclick="dashOpenDrill('preop_total')">
          <div class="dash-kpi-label">Total Año ${anio}</div>
          <div class="dash-kpi-value">${dashFmt(totalAnio)}</div>
          <div class="dash-kpi-sub">Amarilla: ${totalAmarilla} · Blanca: ${totalBlanca}</div>
          <div class="dash-kpi-hint">👆 Ver por mes</div>
        </div>
        <div class="dash-kpi ${hoyN>0?'green':'yellow'}">
          <div class="dash-kpi-label">Hoy</div>
          <div class="dash-kpi-value">${hoyN}</div>
          <div class="dash-kpi-sub">Ayer: ${ayerN}</div>
          <div class="dash-kpi-hint">${varDia!==null?(varDia>=0?'▲ +'+varDia+'%':'▼ '+varDia+'%'):'Sin datos ayer'}</div>
        </div>
        <div class="dash-kpi blue">
          <div class="dash-kpi-label">Línea Amarilla</div>
          <div class="dash-kpi-value">${dashFmt(totalAmarilla)}</div>
          <div class="dash-kpi-sub">${totalAnio?Math.round(totalAmarilla/totalAnio*100):0}% del total</div>
        </div>
        <div class="dash-kpi green">
          <div class="dash-kpi-label">Línea Blanca</div>
          <div class="dash-kpi-value">${dashFmt(totalBlanca)}</div>
          <div class="dash-kpi-sub">${totalAnio?Math.round(totalBlanca/totalAnio*100):0}% del total</div>
        </div>
      </div>
    </div>
    <div class="dash-two-col">
      <div class="dash-card">
        <div class="dash-card-title">🏷️ Por Categoría de Equipo</div>
        ${dashBarChart(topCats)}
      </div>
      <div class="dash-card">
        <div class="dash-card-title">📍 Por Proyecto / Ubicación</div>
        ${dashBarChart(topProys,'',DASH_BAR_COLORS[0])}
        <div class="dash-card-title" class="u-mt-16">📅 Por Mes</div>
        ${byMes.map((v,i)=>`<div class="dash-bar-row">
          <span class="dash-bar-label">${DASH_MESES[i]}</span>
          <div class="dash-bar-track"><div class="dash-bar-fill blue" style="width:${Math.round(v/maxMes*100)}%">${v>0&&Math.round(v/maxMes*100)>15?v:''}</div></div>
          <span class="dash-bar-count">${v}</span>
        </div>`).join('')}
      </div>
    </div>`;

    dashStoreDrill('preop_total',`Preoperacionales por mes ${anio}`,byMes,'blue','Total');
    window._dashMonthly=window._dashMonthly||{};
    window._dashMonthly.preop=byMes.slice();
    window._dashMonthly.preopAmar=byMes.map((_,i)=>{return 0;}); // placeholder
    // Make KPI clickable
    const preKpi=document.getElementById('dash-tab-preop');
    if(preKpi)preKpi.setAttribute('data-drillkey','preop_total');
    dashHide('dash-preop-loading');
    dashShow('dash-preop-content',html);
  }catch(e){
    dashHide('dash-preop-loading');
    dashShow('dash-preop-content',`<div class="eq-empty" style="text-align:center;padding:40px"><i class="bi bi-exclamation-triangle"></i><p>Error: ${e.message}</p></div>`);
  }
}

// ════════════════════════════════════════
// TAB 3: INSPECCIONES (Bimensuales + Locativas)
// ════════════════════════════════════════
async function dashLoadInsp(anio,mes=-1){
  dashSpinner('dash-insp-loading');dashHide('dash-insp-content');
  try{
    const ini=new Date(anio,0,1),fin=new Date(anio+1,0,1);
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const ayer=new Date(hoy);ayer.setDate(ayer.getDate()-1);
    const manana=new Date(hoy);manana.setDate(manana.getDate()+1);

    const colsBim=['insp_bimensual_amarilla','insp_bimensual_blanca'];
    const colsLoc=['insp_loc_instalaciones','insp_loc_redes','insp_loc_talleres_eq','insp_loc_talleres_areas','insp_loc_oficinas','insp_loc_habitaciones'];

    let totalBim=0,totalLoc=0,bimHoy=0,bimAyer=0,locHoy=0,locAyer=0;
    const byMesBim=Array(12).fill(0),byMesLoc=Array(12).fill(0);
    const byTipoLoc={};

    for(const col of colsBim){
      const snap=await getDcsByProyF(col,anio);
      snap.docs.forEach(d=>{
        const f=d.data().fecha?.toDate?.();if(!f)return;
        if(f>=ini&&f<fin){if(mes<0||f.getMonth()===mes)totalBim++;byMesBim[f.getMonth()]++;}
        if(f>=hoy&&f<manana)bimHoy++;
        if(f>=ayer&&f<hoy)bimAyer++;
      });
    }
    for(const col of colsLoc){
      const snap=await getDcsByProyF(col,anio);
      const label=col.replace('insp_loc_','').replace(/_/g,' ');
      snap.docs.forEach(d=>{
        const f=d.data().fecha?.toDate?.();if(!f)return;
        if(f>=ini&&f<fin){totalLoc++;byMesLoc[f.getMonth()]++;byTipoLoc[label]=(byTipoLoc[label]||0)+1;}
        if(f>=hoy&&f<manana)locHoy++;
        if(f>=ayer&&f<hoy)locAyer++;
      });
    }

    const maxBim=Math.max(...byMesBim,1),maxLoc=Math.max(...byMesLoc,1);
    const topLoc=Object.entries(byTipoLoc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,n:v}));
    const bimVar=bimAyer>0?Math.round((bimHoy-bimAyer)/bimAyer*100):null;

    const html=`
    <div class="dash-section">
      <div class="dash-section-title">🔍 Inspecciones ${anio}</div>
      <div class="dash-kpi-grid">
        <div class="dash-kpi green" onclick="dashOpenDrill('insp_bim')">
          <div class="dash-kpi-label">Bimensuales</div>
          <div class="dash-kpi-value">${dashFmt(totalBim)}</div>
          <div class="dash-kpi-sub">Amarilla + Blanca</div>
          <div class="dash-kpi-hint">👆 Ver por mes</div>
        </div>
        <div class="dash-kpi blue" onclick="dashOpenDrill('insp_loc')">
          <div class="dash-kpi-label">Locativas</div>
          <div class="dash-kpi-value">${dashFmt(totalLoc)}</div>
          <div class="dash-kpi-sub">6 tipos</div>
          <div class="dash-kpi-hint">👆 Ver por mes</div>
        </div>
        <div class="dash-kpi ${bimHoy>0?'green':'yellow'}">
          <div class="dash-kpi-label">Bimensuales Hoy</div>
          <div class="dash-kpi-value">${bimHoy}</div>
          <div class="dash-kpi-sub">Ayer: ${bimAyer}</div>
          <div class="dash-kpi-hint">${bimVar!==null?(bimVar>=0?'▲ +'+bimVar+'%':'▼ '+bimVar+'%'):'—'}</div>
        </div>
        <div class="dash-kpi blue">
          <div class="dash-kpi-label">Total Inspecciones</div>
          <div class="dash-kpi-value">${dashFmt(totalBim+totalLoc)}</div>
          <div class="dash-kpi-sub">Bim + Locativas</div>
        </div>
      </div>
    </div>
    <div class="dash-two-col">
      <div class="dash-card">
        <div class="dash-card-title">📊 Bimensuales por mes</div>
        ${byMesBim.map((v,i)=>`<div class="dash-bar-row">
          <span class="dash-bar-label">${DASH_MESES[i]}</span>
          <div class="dash-bar-track"><div class="dash-bar-fill green" style="width:${Math.round(v/maxBim*100)}%">${v>0&&Math.round(v/maxBim*100)>15?v:''}</div></div>
          <span class="dash-bar-count">${v}</span>
        </div>`).join('')}
      </div>
      <div class="dash-card">
        <div class="dash-card-title">🏢 Locativas por tipo</div>
        ${dashBarChart(topLoc)}
        <div class="dash-card-title" class="u-mt-16">📅 Locativas por mes</div>
        ${byMesLoc.map((v,i)=>`<div class="dash-bar-row">
          <span class="dash-bar-label">${DASH_MESES[i]}</span>
          <div class="dash-bar-track"><div class="dash-bar-fill blue" style="width:${Math.round(v/maxLoc*100)}%">${v>0&&Math.round(v/maxLoc*100)>15?v:''}</div></div>
          <span class="dash-bar-count">${v}</span>
        </div>`).join('')}
      </div>
    </div>`;

    dashStoreDrill('insp_bim',`Bimensuales por mes ${anio}`,byMesBim,'green','Bimensuales');
    dashStoreDrill('insp_loc',`Locativas por mes ${anio}`,byMesLoc,'blue','Locativas');
    window._dashMonthly=window._dashMonthly||{};
    window._dashMonthly.bim=byMesBim.slice();
    window._dashMonthly.loc=byMesLoc.slice();
    dashHide('dash-insp-loading');
    dashShow('dash-insp-content',html);
  }catch(e){
    dashHide('dash-insp-loading');
    dashShow('dash-insp-content',`<div class="eq-empty" style="text-align:center;padding:40px"><i class="bi bi-exclamation-triangle"></i><p>Error: ${e.message}</p></div>`);
  }
}

// ════════════════════════════════════════
// TAB 4: FALLAS (Firestore)
// ════════════════════════════════════════
async function dashLoadFallas(anio,mes=-1){
  dashSpinner('dash-fallas-loading');dashHide('dash-fallas-content');
  try{
    const ini=new Date(anio,0,1),fin=new Date(anio+1,0,1);
    const snap=await getDcsByProyF('reportes_fallas',anio);
    let total=0,abiertas=0,cerradas=0;
    const byTipo={},byPrio={},byMes=Array(12).fill(0),byCategoria={};
    let ultimaFalla=null,diasSinFalla=0;
    // MTTR: tiempo atención
    const tiemposAtencion=[]; // horas de cada falla cerrada
    const mttrPorMes=Array.from({length:12},()=>[]);
    const mttrPorPrio={Alta:[],Media:[],Baja:[]};
    const distribTiempo={'<24h':0,'1-3 días':0,'3-7 días':0,'+7 días':0};

    snap.docs.forEach(d=>{
      const data=d.data();
      const f=data.fecha?.toDate?.();
      if(f&&f>=ini&&f<fin&&(mes<0||f.getMonth()===mes)){
        total++;
        if(data.estado==='abierta')abiertas++;else cerradas++;
        const mAct=f.getMonth();byMes[mAct]++;
        const tipo=data.tipoFalla||'Sin tipo';byTipo[tipo]=(byTipo[tipo]||0)+1;
        const prio=data.prioridad||'Sin prioridad';byPrio[prio]=(byPrio[prio]||0)+1;
        const cat=dashCategoria(data.cema||'');if(cat!=='???')byCategoria[cat]=(byCategoria[cat]||0)+1;
        if(!ultimaFalla||f>ultimaFalla)ultimaFalla=f;
        // MTTR: si está cerrada, calcular tiempo
        const fc=data.fechaCierre?.toDate?.();
        if(fc&&fc>=f){
          const horas=(fc-f)/(1000*60*60);
          tiemposAtencion.push(horas);
          mttrPorMes[mAct].push(horas);
          if(mttrPorPrio[prio])mttrPorPrio[prio].push(horas);
          if(horas<24)distribTiempo['<24h']++;
          else if(horas<72)distribTiempo['1-3 días']++;
          else if(horas<168)distribTiempo['3-7 días']++;
          else distribTiempo['+7 días']++;
        }
      }
    });

    // Calcular MTTR promedio
    const mttrProm=tiemposAtencion.length?tiemposAtencion.reduce((a,b)=>a+b,0)/tiemposAtencion.length:null;
    const mttrPromMes=mttrPorMes.map(arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0);
    const mttrAlta=mttrPorPrio.Alta.length?mttrPorPrio.Alta.reduce((a,b)=>a+b,0)/mttrPorPrio.Alta.length:null;
    const mttrMedia=mttrPorPrio.Media.length?mttrPorPrio.Media.reduce((a,b)=>a+b,0)/mttrPorPrio.Media.length:null;
    const mttrBaja=mttrPorPrio.Baja.length?mttrPorPrio.Baja.reduce((a,b)=>a+b,0)/mttrPorPrio.Baja.length:null;

    // Update top KPI MTTR card
    const kpiMttr=document.getElementById('kpi-mttr');
    if(kpiMttr){
      if(mttrProm!==null){
        const fmtTiempo=mttrProm<24?Math.round(mttrProm*10)/10+'h':Math.round(mttrProm/24*10)/10+'d';
        const status=mttrProm<24?'good':mttrProm<72?'warn':'bad';
        kpiMttr.className='kpi-card '+status;
        kpiMttr.innerHTML='<div class="kpi-label">Tiempo Atención (MTTR) <span style="font-size:9px;opacity:.5">👆</span></div><div class="kpi-value">'+fmtTiempo+'</div><div class="kpi-trend '+(mttrProm<48?'up':'down')+'">'+(mttrProm<48?'▲':'▼')+' '+tiemposAtencion.length+' fallas cerradas</div>';
      }else{
        kpiMttr.className='kpi-card';
        kpiMttr.innerHTML='<div class="kpi-label">Tiempo Atención (MTTR)</div><div class="kpi-value" style="font-size:20px">—</div><div class="kpi-trend" style="color:var(--gray-300)">Sin fallas cerradas</div>';
      }
    }

    // Drilldown MTTR mensual
    const mttrLabels=mttrPromMes.map(h=>h>0?(h<24?(Math.round(h*10)/10)+'h':(Math.round(h/24*10)/10)+'d'):'—');
    const mttrCounts=mttrPromMes.map(h=>Math.round(h*10)/10); // valores en horas para el bar
    dashStoreDrill('mttr_mes','Tiempo de Atención por mes '+anio,mttrCounts,'blue','MTTR (horas)');

    if(ultimaFalla){
      const diffMs=new Date()-ultimaFalla;
      diasSinFalla=Math.floor(diffMs/(1000*60*60*24));
    }

    const topTipos=Object.entries(byTipo).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,n:v}));
    const topCats=Object.entries(byCategoria).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>({label:k,n:v}));
    const maxMes=Math.max(...byMes,1);
    const prioColors={'Alta':'red','Media':'yellow','Baja':'green'};

    const html=`
    <div class="dash-section">
      <div class="dash-section-title">⚠️ Fallas ${anio}</div>
      <div class="dash-kpi-grid">
        <div class="dash-kpi ${abiertas>0?'red':'green'}" onclick="dashOpenDrill('fallas_mes')">
          <div class="dash-kpi-label">Total Fallas</div>
          <div class="dash-kpi-value">${total}</div>
          <div class="dash-kpi-sub">Abiertas: ${abiertas} · Cerradas: ${cerradas}</div>
          <div class="dash-kpi-hint">👆 Ver por mes</div>
        </div>
        <div class="dash-kpi red">
          <div class="dash-kpi-label">Abiertas</div>
          <div class="dash-kpi-value">${abiertas}</div>
          <div class="dash-kpi-sub">${total?Math.round(abiertas/total*100):0}% pendientes</div>
        </div>
        <div class="dash-kpi ${diasSinFalla>7?'green':diasSinFalla>3?'yellow':'red'}">
          <div class="dash-kpi-label">Días sin Falla</div>
          <div class="dash-kpi-value">${diasSinFalla}</div>
          <div class="dash-kpi-sub">${ultimaFalla?'Última: '+ultimaFalla.toLocaleDateString('es-CO'):'Sin registro'}</div>
        </div>
        <div class="dash-kpi ${byPrio['Alta']>0?'yellow':'green'}">
          <div class="dash-kpi-label">Alta Prioridad</div>
          <div class="dash-kpi-value">${byPrio['Alta']||0}</div>
          <div class="dash-kpi-sub">Media: ${byPrio['Media']||0} · Baja: ${byPrio['Baja']||0}</div>
        </div>
      </div>
    </div>
    <div class="dash-two-col">
      <div class="dash-card">
        <div class="dash-card-title">📊 Fallas por mes</div>
        ${byMes.map((v,i)=>`<div class="dash-bar-row">
          <span class="dash-bar-label">${DASH_MESES[i]}</span>
          <div class="dash-bar-track"><div class="dash-bar-fill red" style="width:${Math.round(v/maxMes*100)}%">${v>0&&Math.round(v/maxMes*100)>15?v:''}</div></div>
          <span class="dash-bar-count">${v}</span>
        </div>`).join('')}
      </div>
      <div class="dash-card">
        <div class="dash-card-title">⚙️ Por Tipo de Falla</div>
        ${dashBarChart(topTipos,'','#C62828')}
        <div class="dash-card-title" class="u-mt-16">🏷️ Por Categoría de Equipo</div>
        ${dashBarChart(topCats)}
        <div class="dash-card-title" class="u-mt-16">🚨 Por Prioridad</div>
        ${Object.entries(byPrio).map(([k,v])=>`<div class="dash-bar-row">
          <span class="dash-bar-label">${k}</span>
          <div class="dash-bar-track"><div class="dash-bar-fill ${prioColors[k]||'blue'}" style="width:${total?Math.round(v/total*100):0}%">${v>0&&total&&Math.round(v/total*100)>15?v:''}</div></div>
          <span class="dash-bar-count">${v}</span>
        </div>`).join('')}
      </div>
    </div>
    <div class="dash-section" style="margin-top:24px">
      <div class="dash-section-title">⏱️ Tiempos de Atención (MTTR)</div>
      <div class="dash-kpi-grid">
        <div class="dash-kpi ${mttrProm===null?'':mttrProm<24?'green':mttrProm<72?'yellow':'red'}">
          <div class="dash-kpi-label">MTTR Promedio</div>
          <div class="dash-kpi-value">${mttrProm===null?'—':(mttrProm<24?Math.round(mttrProm*10)/10+'h':Math.round(mttrProm/24*10)/10+'d')}</div>
          <div class="dash-kpi-sub">${tiemposAtencion.length} fallas cerradas</div>
        </div>
        <div class="dash-kpi ${mttrAlta===null?'':mttrAlta<8?'green':mttrAlta<24?'yellow':'red'}">
          <div class="dash-kpi-label">Prioridad Alta</div>
          <div class="dash-kpi-value">${mttrAlta===null?'—':(mttrAlta<24?Math.round(mttrAlta*10)/10+'h':Math.round(mttrAlta/24*10)/10+'d')}</div>
          <div class="dash-kpi-sub">${mttrPorPrio.Alta.length} cerradas · Meta: <8h</div>
        </div>
        <div class="dash-kpi ${mttrMedia===null?'':mttrMedia<24?'green':mttrMedia<72?'yellow':'red'}">
          <div class="dash-kpi-label">Prioridad Media</div>
          <div class="dash-kpi-value">${mttrMedia===null?'—':(mttrMedia<24?Math.round(mttrMedia*10)/10+'h':Math.round(mttrMedia/24*10)/10+'d')}</div>
          <div class="dash-kpi-sub">${mttrPorPrio.Media.length} cerradas · Meta: <24h</div>
        </div>
        <div class="dash-kpi ${mttrBaja===null?'':mttrBaja<72?'green':mttrBaja<168?'yellow':'red'}">
          <div class="dash-kpi-label">Prioridad Baja</div>
          <div class="dash-kpi-value">${mttrBaja===null?'—':(mttrBaja<24?Math.round(mttrBaja*10)/10+'h':Math.round(mttrBaja/24*10)/10+'d')}</div>
          <div class="dash-kpi-sub">${mttrPorPrio.Baja.length} cerradas · Meta: <3d</div>
        </div>
      </div>
    </div>
    <div class="dash-two-col" class="u-mt-16">
      <div class="dash-card">
        <div class="dash-card-title">📊 Distribución de Tiempos</div>
        ${Object.entries(distribTiempo).map(([k,v],i)=>{
          const total2=Object.values(distribTiempo).reduce((a,b)=>a+b,0);
          const pct=total2?Math.round(v/total2*100):0;
          const c=['#22c55e','#eab308','#f97316','#ef4444'][i];
          return`<div class="dash-bar-row">
            <span class="dash-bar-label">${k}</span>
            <div class="dash-bar-track">
              <div style="width:${pct}%;height:100%;border-radius:10px;background:${c};display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:10px;font-weight:700;color:#fff">${pct>15?pct+'%':''}</div>
            </div>
            <span class="dash-bar-count">${v}</span>
          </div>`;
        }).join('')}
        ${tiemposAtencion.length===0?'<p style="color:var(--gray-300);text-align:center;font-size:12px;padding:20px">Sin fallas cerradas para análisis</p>':''}
      </div>
      <div class="dash-card">
        <div class="dash-card-title">📅 MTTR por mes</div>
        ${(()=>{
          const maxMttr=Math.max(...mttrPromMes,1);
          return mttrPromMes.map((h,i)=>{
            const fmt=h>0?(h<24?Math.round(h*10)/10+'h':Math.round(h/24*10)/10+'d'):'—';
            const pct=Math.round(h/maxMttr*100);
            const c=h===0?'var(--gray-200)':h<24?'#22c55e':h<72?'#eab308':'#ef4444';
            return`<div class="dash-bar-row">
              <span class="dash-bar-label">${DASH_MESES[i]}</span>
              <div class="dash-bar-track">
                <div style="width:${pct}%;height:100%;border-radius:10px;background:${c};display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:10px;font-weight:700;color:#fff">${pct>15&&h>0?fmt:''}</div>
              </div>
              <span class="dash-bar-count">${fmt}</span>
            </div>`;
          }).join('');
        })()}
      </div>
    </div>`;

    dashStoreDrill('fallas_mes',`Fallas por mes ${anio}`,byMes,'red','Fallas');
    window._dashMonthly=window._dashMonthly||{};
    window._dashMonthly.fallas=byMes.slice();
    dashHide('dash-fallas-loading');
    dashShow('dash-fallas-content',html);
  }catch(e){
    dashHide('dash-fallas-loading');
    dashShow('dash-fallas-content',`<div class="eq-empty" style="text-align:center;padding:40px"><i class="bi bi-exclamation-triangle"></i><p>Error: ${e.message}</p></div>`);
  }
}


// ── KPIs del Inicio ──
async function loadInicioKPIs(){
  const now=new Date();
  const anio=now.getFullYear();
  const mes=now.getMonth(); // 0-indexed
  const MES_NOMBRES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNombre=MES_NOMBRES[mes];
  const mesIni=new Date(anio,mes,1);       // primer día del mes
  const mesFin=new Date(anio,mes+1,1);     // primer día del mes siguiente
  const titulo=document.getElementById('inicio-kpi-title');
  if(titulo)titulo.textContent=`Indicadores — ${mesNombre} ${anio}`;

  function setKPI(id,label,valor,sub,status){
    const el=document.getElementById(id);if(!el)return;
    el.className='kpi-card '+status;
    const isUp=status==='good';
    el.innerHTML=`<div class="kpi-label">${label}</div><div class="kpi-value">${valor}</div><div class="kpi-trend ${isUp?'up':'down'}">${isUp?'▲':'▼'} ${sub}</div>`;
  }

  try{
    // ── Fallas del mes ──
    const sfallas=await getDcsByProyF('reportes_fallas',new Date().getFullYear());
    let fAbiertas=0,fTotal=0;
    sfallas.docs.forEach(d=>{
      const f=d.data().fecha?.toDate?.();
      if(f&&f>=mesIni&&f<mesFin){fTotal++;if(d.data().estado==='abierta')fAbiertas++;}
    });
    const pctF=fTotal?Math.round(fAbiertas/fTotal*100):0;
    setKPI('inicio-kpi-fallas','Fallas Abiertas',fAbiertas,`${pctF}% de ${fTotal} en ${mesNombre}`,pctF>30?'warn':'good');

    // ── Solicitudes Mtto del mes ──
    const smtto=await getDcsByProyF('solicitudes_mtto',new Date().getFullYear());
    let mtPend=0,mtTotal=0;
    smtto.docs.forEach(d=>{
      const f=d.data().fecha?.toDate?.();
      if(f&&f>=mesIni&&f<mesFin){mtTotal++;if(d.data().estado==='pendiente')mtPend++;}
    });
    setKPI('inicio-kpi-mtto','Solicitudes Mtto.',mtPend,`${mtPend} pendientes de ${mtTotal} en ${mesNombre}`,mtPend>5?'warn':'good');

    // ── Google Sheets: CI y OT ──
    if(typeof CSEG_URL!=='undefined'){
      try{
        const sr=await fetch(activeUrl());
        const sj=await sr.json();
        const allS=sj.sheets||[];
        function normS(s){return s.toUpperCase().replace(/[	 ]/g,'').replace(/./g,'');}

        // Detectar hojas
        const bimSh=allS.find(s=>{const n=normS(s);return n.includes('CI')&&n.includes('BIMENSUAL');})||allS.find(s=>normS(s).includes('BIMENSUAL'));
        const locSh=allS.find(s=>{const n=normS(s);return n.includes('CI')&&n.includes('LOCATIVA');})||allS.find(s=>normS(s).includes('LOCATIVA'));
        const hmttoList=allS.filter(s=>s.toUpperCase().includes('H. MTTO')||s.toUpperCase().includes('H.MTTO'));

        // CI: contar solo la columna del mes actual
        const MES_ABREV=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
        const mesAbrev=MES_ABREV[mes];
        const mesCompleto=mesNombre.toUpperCase();

        async function ciCountMes(sheetName,elemId,label){
          const el=document.getElementById(elemId);if(!el||!sheetName)return;
          const r=await fetch(activeUrl()+'?sheet='+encodeURIComponent(sheetName)+'&hr=4&colors=true');
          const j=await r.json();
          const headers=j.headers||[];
          const bgColors=j.bgColors||[];
          const MESES_ES=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
          const allMesCols=headers.filter(h=>{
            const u=h.toUpperCase().replace(/[^A-Z]/g,'');
            return MESES_ES.some(m=>u===m||u.startsWith(m.substring(0,3)));
          });
          // Buscar columna del mes actual — múltiples estrategias
          const mesCol=allMesCols.find(h=>{
            const u=h.toUpperCase().replace(/[^A-Z]/g,'');
            return u===mesCompleto||u===mesAbrev||u.startsWith(mesAbrev);
          });
          console.log('[CI Inicio]',label,'mesCol:',mesCol,'mesCompleto:',mesCompleto,'headers:',headers.join('|'));
          // Si no encontramos la columna del mes, mostrar advertencia
          if(!mesCol){
            el.className='kpi-card';
            el.innerHTML=`<div class="kpi-label">${label}</div><div class="kpi-value">—</div><div class="kpi-trend" style="color:var(--orange)">Col. "${mesCompleto}" no encontrada</div>`;
            return;
          }
          // Detectar columna FRECUENCIA
          const freqCol=headers.find(h=>h.toUpperCase().includes('FRECUENCIA')||h.toUpperCase().includes('FRECUEN'));
          let v=0,ro=0,noAplica=0;
          (j.rows||[]).forEach((row,i)=>{
            const bg=bgColors[i]||{};
            const val=String(row[mesCol]??'').trim().toUpperCase();
            const cellBg=bg[mesCol]||'';
            const frecuencia=freqCol?String(row[freqCol]||''):'';
            // Calcular verdes en esta fila para heurística no-aplica
            const verdesEnFila=allMesCols.filter(c=>{const v2=String(row[c]??'').trim();return v2&&v2.toUpperCase()!=='N/A'&&v2!=='-'&&/\d/.test(v2);}).length;
            // N/A amarillo (color) → no aplica
            if((val==='N/A'||val==='NA'||!val||val==='-')&&isYellowBg(cellBg)){noAplica++;return;}
            // N/A sin color → usar frecuencia como heurística
            if(val==='N/A'||val==='NA'||!val||val==='-'||val==='N/D'){
              if(esNoAplica(val,frecuencia,verdesEnFila,allMesCols.length,cellBg)){noAplica++;}
              else{ro++;}
              return;
            }
            if(/^(SEMESTRAL|MENSUAL|TRIMESTRAL|ANUAL|QUINCENAL|SEMANAL)$/.test(val))return;
            if(/^\d{1,2}[\/\-]\d/.test(val)||/^\d{4}-\d{2}/.test(val)||(typeof row[mesCol]==='number'&&row[mesCol]>40000))v++;
          });
          const tot=v+ro;
          const pct=tot?Math.round(v/tot*100):0;
          const noAplicaNote=noAplica>0?` · ${noAplica} no aplican`:'';
          if(tot>0||v>0){
            setKPI(elemId,label,pct+'%',`${v} de ${tot} en ${mesNombre}${noAplicaNote}`,pct>=80?'good':pct>=50?'warn':'bad');
          }else if(noAplica>0){
            el.className='kpi-card';
            el.innerHTML=`<div class="kpi-label">${label}</div><div class="kpi-value">0%</div><div class="kpi-trend">0 entregadas · ${noAplica} no aplican</div>`;
          }else{
            el.className='kpi-card';
            el.innerHTML=`<div class="kpi-label">${label}</div><div class="kpi-value">—</div><div class="kpi-trend">Sin datos en ${mesNombre}</div>`;
          }
        }

        // OT del mes actual en Google Sheets
        async function otCountMes(){
          let totAll=0,totOT=0;
          // Función robusta: detecta DD/MM/YYYY, M/D/YYYY, YYYY-MM-DD, ISO
          function parseFechaInicio(row){
            const fechaCols=Object.keys(row).filter(k=>k.toUpperCase().includes('FECHA'));
            for(const k of fechaCols){
              const v=String(row[k]||'').trim();
              if(!v)continue;
              // ISO: 2026-04-01T...
              const iso=v.match(/^(\d{4})-(\d{2})-(\d{2})/);
              if(iso)return{yr:parseInt(iso[1]),mes:parseInt(iso[2])-1};
              // Con separador / o -
              const parts=v.replace(/-/g,'/').split('/');
              if(parts.length>=3){
                const p0=parseInt(parts[0]),p1=parseInt(parts[1]),p2=parseInt(parts[2]);
                // Si p2 > 100 → es el año (DD/MM/YYYY o D/M/YYYY)
                if(p2>100)return{yr:p2,mes:p0>12?p1-1:p1-1}; // DD/MM/YYYY → mes=p1-1
                // Si p0 > 100 → YYYY/MM/DD
                if(p0>100)return{yr:p0,mes:p1-1};
              }
            }
            return null;
          }
          for(const sh of hmttoList.slice(0,3)){
            const rr=await fetch(activeUrl()+'?sheet='+encodeURIComponent(sh)+'&hr=4');
            const jj=await rr.json();
            (jj.rows||[]).forEach(row=>{
              const fd=parseFechaInicio(row);
              if(!fd||fd.yr!==anio||fd.mes!==mes)return;
              totAll++;
              const rowKeys=Object.keys(row);
              const otK=rowKeys.find(k=>{const n=k.toUpperCase().replace(/\s/g,'');return n==='OT'||n.startsWith('OT')||n.includes('ORDENDETRABAJO');})||(rowKeys.length>18?rowKeys[18]:null);
              const otV=String(row[otK]||'').trim();
              if(otV&&otV!=='0'&&otV!=='—'&&otV!=='N/A')totOT++;
            });
          }
          const kOT=document.getElementById('inicio-kpi-ot');if(!kOT)return;
          if(totOT===0&&totAll>0){
            setKPI('inicio-kpi-ot',`Intervenciones ${mesNombre}`,totAll,'Total registradas en el mes','good');
          }else{
            const pOT=totAll?Math.round(totOT/totAll*100):0;
            setKPI('inicio-kpi-ot','% O.T. Ejecutadas',pOT+'%',`${totOT} de ${totAll} en ${mesNombre}`,pOT>=80?'good':pOT>=60?'warn':'bad');
          }
        }

        await Promise.allSettled([
          ciCountMes(bimSh,'inicio-kpi-bim','% C.I. Bimensual'),
          ciCountMes(locSh,'inicio-kpi-loc','% C.I. Locativas'),
          otCountMes(),
        ]);
      }catch(e){console.warn('inicio CI/OT:',e);}
    }
  }catch(e){console.warn('loadInicioKPIs:',e);}
}
window.loadInicioKPIs=loadInicioKPIs;
async function dashLoadTopKPIs(anio,mes=-1){
  try{
    // Fallas abiertas
    const sfallas=await getDcsByProyF('reportes_fallas',anio);
    const ini=new Date(anio,0,1),fin=new Date(anio+1,0,1);
    let fAbiertas=0,fTotal=0;
    sfallas.docs.forEach(d=>{
      const f=d.data().fecha?.toDate?.();
      if(f&&f>=ini&&f<fin&&(mes<0||f.getMonth()===mes)){fTotal++;if(d.data().estado==='abierta')fAbiertas++;}
    });
    const kpiFallas=document.getElementById('kpi-pct-fallas');
    if(kpiFallas){
      const pct=fTotal?Math.round(fAbiertas/fTotal*100):0;
      const cls=pct>30?'warn':pct>0?'good':'good';
      kpiFallas.className='kpi-card '+cls;
      kpiFallas.innerHTML=`<div class="kpi-label">Fallas Abiertas</div><div class="kpi-value">${fAbiertas}</div><div class="kpi-trend ${pct>30?'down':'up'}">${pct>30?'▼':'▲'} ${pct}% de ${fTotal} reportes</div>`;
    }
    // Solicitudes mantenimiento
    const smtto=await getDcsByProyF('solicitudes_mtto',anio);
    let mtPend=0,mtTotal=0;
    smtto.docs.forEach(d=>{
      const f=d.data().fecha?.toDate?.();
      if(f&&f>=ini&&f<fin&&(mes<0||f.getMonth()===mes)){mtTotal++;if(d.data().estado==='pendiente')mtPend++;}
    });
    const kpiMtto=document.getElementById('kpi-pct-mtto');
    if(kpiMtto){
      kpiMtto.className='kpi-card '+(mtPend>5?'warn':'good');
      kpiMtto.innerHTML=`<div class="kpi-label">Solicitudes Mtto.</div><div class="kpi-value">${mtPend}</div><div class="kpi-trend ${mtPend>5?'down':'up'}">${mtPend>5?'▼':'▲'} ${mtPend} pendientes de ${mtTotal}</div>`;
    }
    // ── Daños por mala operación ──
    try{
      const sdanos=await getDcsByProyF('reportes_danos',anio);
      let dTotal=0,dMes=0,dCostoTotal=0;
      const dByMes=Array(12).fill(0);
      sdanos.docs.forEach(d=>{
        const data=d.data();
        const f=data.fecha?.toDate?.();
        if(f&&f>=ini&&f<fin){
          dByMes[f.getMonth()]++;
          if(mes<0||f.getMonth()===mes){
            dTotal++;
            dCostoTotal+=parseFloat(data.costoEstimado)||0;
          }
        }
      });
      dashStoreDrill('danos_mes','Daños por mes '+anio,dByMes,'red','Reportes');
      const kpiDanos=document.getElementById('kpi-danos');
      if(kpiDanos){
        const status=dTotal===0?'good':dTotal>5?'bad':'warn';
        kpiDanos.className='kpi-card '+status;
        const costoStr=dCostoTotal>0?(dCostoTotal>=1000000?'$'+(dCostoTotal/1000000).toFixed(1)+'M':'$'+(dCostoTotal/1000).toFixed(0)+'k'):'';
        kpiDanos.innerHTML='<div class="kpi-label">Daños Mala Operación <span style="font-size:9px;opacity:.5">👆</span></div><div class="kpi-value">'+dTotal+'</div><div class="kpi-trend '+(dTotal===0?'up':'down')+'">'+(dTotal===0?'▲ Sin reportes':'▼ '+(costoStr||dTotal+' reportes'))+'</div>';
      }
    }catch(e){console.warn('danos KPI:',e);}
    // ── CI desde Google Sheets: contar celdas con fecha (verde) vs N/A (rojo) ──
    // El sheet tiene filas=inspecciones, columnas=meses (ENERO, FEBRERO...).
    // Verde = celda tiene una fecha (30/1/2026). Rojo = celda tiene N/A o vacío.
    async function getCIfromSheet(sheetName,label,elemId,headerRow,targetMes){
      const el=document.getElementById(elemId);if(!el)return;
      try{
        const resp=await fetch(activeUrl()+'?sheet='+encodeURIComponent(sheetName)+'&hr='+(headerRow||4)+'&colors=true');
        const json=await resp.json();
        const headers=json.headers||[];
        const rows=json.rows||[];
        const bgColors=json.bgColors||[];
        const MESES_ES=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
        const MES_ABREV2=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
        const allMesCols=headers.filter(h=>{const u=h.toUpperCase().replace(/[^A-Z]/g,'');return MESES_ES.some(m=>u===m||u.startsWith(m.substring(0,3)));});
        let mesCols=allMesCols;
        if(targetMes>=0&&targetMes<12){
          const tNom=MESES_ES[targetMes],tAbr=MES_ABREV2[targetMes];
          const col=allMesCols.find(h=>{const u=h.toUpperCase().replace(/[^A-Z]/g,'');return u===tNom||u===tAbr||u.startsWith(tAbr);});
          if(col){mesCols=[col];}
          else{
            el.className='kpi-card';
            el.innerHTML=`<div class="kpi-label">${label}</div><div class="kpi-value">—</div><div class="kpi-trend" style="color:var(--orange)">Col. "${MESES_ES[targetMes]}" no encontrada</div>`;
            return;
          }
        }
        if(!mesCols.length){mesCols=headers.filter(h=>!h.toUpperCase().includes('INSPECCION')&&!h.toUpperCase().includes('SEDE')&&!h.toUpperCase().includes('FRECUENCIA'));}
        const freqCol=headers.find(h=>h.toUpperCase().includes('FRECUENCIA'));
        let verde=0,rojo=0,noAplica=0;
        rows.forEach((row,i)=>{
          const bg=bgColors[i]||{};
          const frecuencia=freqCol?String(row[freqCol]||''):'';
          const verdesEnFila=allMesCols.filter(c=>{const v2=String(row[c]??'').trim();return v2&&v2.toUpperCase()!=='N/A'&&v2!=='-'&&/\d/.test(v2);}).length;
          mesCols.forEach(col=>{
            const raw=row[col]??'';
            const v=String(raw).trim().toUpperCase();
            const cellBg=bg[col]||'';
            if((v==='N/A'||v==='NA'||!v||v==='-')&&isYellowBg(cellBg)){noAplica++;return;}
            if(!v||v==='N/A'||v==='NA'||v==='—'||v==='-'||v==='N/D'){
              if(esNoAplica(v,frecuencia,verdesEnFila,allMesCols.length,cellBg)){noAplica++;}
              else{rojo++;}
              return;
            }
            if(/^(SEMESTRAL|MENSUAL|TRIMESTRAL|ANUAL|QUINCENAL|SEMANAL)$/.test(v))return;
            const isDate=/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(v)||/^\d{4}-\d{2}-\d{2}/.test(v)||(typeof raw==='number'&&raw>40000);
            if(isDate){verde++;return;}
            if(v.length>0&&v!=='0')verde++;else rojo++;
          });
        });
        console.log('[Dashboard CI]',label,'mes:',targetMes,'verde:',verde,'rojo:',rojo,'noAplica:',noAplica);
        const total=verde+rojo;
        const pct=total?Math.round(verde/total*100):null;
        const noAplicaNote=noAplica>0?` · ${noAplica} no aplican`:'';
        if(pct!==null){
          el.className='kpi-card '+(pct>=80?'good':pct>=50?'warn':'bad');
          el.innerHTML=`<div class="kpi-label">${label}</div><div class="kpi-value">${pct}%</div><div class="kpi-trend ${pct>=80?'up':'down'}">${pct>=80?'▲':'▼'} ${verde} de ${total}${noAplicaNote}</div>`;
        }else{
          el.className='kpi-card';
          el.innerHTML=`<div class="kpi-label">${label}</div><div class="kpi-value">—</div><div class="kpi-trend">Sin datos</div>`;
        }
      }catch(e){
        console.warn('CI sheet error:',e);
        el.innerHTML=`<div class="kpi-label">${label}</div><div class="kpi-value">—</div><div class="kpi-trend" class="u-color-red">Error al cargar</div>`;
      }
    }
    // Obtener nombres reales hojas CI — muy permisivo con variantes de nombre
    try{
      const sheetsR=await fetch(activeUrl());
      const sheetsJ=await sheetsR.json();
      const allSheets=sheetsJ.sheets||[];
      function normalizeSheet(s){return s.toUpperCase().replace(/[	 ]/g,'').replace(/./g,'');}
      function findCI(keywords){
        // Prioridad: coincidencia exacta de todas las palabras clave
        return allSheets.find(s=>{
          const n=normalizeSheet(s);
          return keywords.every(kw=>n.includes(kw));
        })||allSheets.find(s=>{
          const n=normalizeSheet(s);
          return keywords.some(kw=>n.includes(kw));
        });
      }
      const bimSheet=findCI(['CI','BIMENSUAL'])||findCI(['BIMENSUAL']);
      const locSheet=findCI(['CI','LOCATIVA'])||findCI(['LOCATIVA']);
      console.log('[Dashboard CI] Hojas encontradas — Bimensual:',bimSheet,'Locativas:',locSheet);
      console.log('[Dashboard CI] Todas las hojas:',allSheets);
      await Promise.allSettled([
        bimSheet?getCIfromSheet(bimSheet,'% C.I. Bimensual','kpi-pct-bim',4,mes):Promise.resolve(),
        locSheet?getCIfromSheet(locSheet,'% C.I. Locativas','kpi-pct-loc',4,mes):Promise.resolve(),
      ]);
    }catch(e){console.warn('CI sheets list error:',e);}
  }catch(e){console.warn('dashLoadTopKPIs:',e);}
}


// ── Helper: cuando "Todos" está activo, ejecuta una función con cada proyecto y agrega resultados ──
async function dashEachProject(fnProyecto){
  // fnProyecto recibe (url) y devuelve datos. Agrega resultados.
  if(window._proyectoActivo){
    return [await fnProyecto(window._proyectoActivo.url||CSEG_URL)];
  }
  // Modo "Todos": ejecutar para cada proyecto con URL
  var projs=(window._proyectos||[]).filter(function(p){return p.url;});
  if(!projs.length){
    return [await fnProyecto(CSEG_URL)];
  }
  var results=await Promise.allSettled(projs.map(function(p){return fnProyecto(p.url);}));
  return results.filter(function(r){return r.status==='fulfilled';}).map(function(r){return r.value;});
}
window.dashEachProject=dashEachProject;
// ── Init principal ──
window.initDashboardPage=async function(){
  window.scrollTo({top:0,behavior:'instant'});
  _dashAnio=dashGetAnio();
  _dashMes=dashGetMes();
  window._dashMonthly={};
  dashStoreStaticDrill();
  const icon=document.getElementById('dash-refresh-icon');
  if(icon){icon.style.animation='spin .6s linear infinite';icon.style.display='inline-block';}
  const mesLabel=_dashMes>=0?` · ${DASH_MESES[_dashMes]}`:'';
  document.getElementById('dash-subtitle').textContent=`Año ${_dashAnio}${mesLabel} · Actualizando...`;
  ['mtto','preop','insp','fallas'].forEach(t=>{
    const c=document.getElementById('dash-tab-'+t+'-content');if(c)c.style.display='none';
    dashSpinner('dash-'+t+'-loading');
  });
  dashLoadTopKPIs(_dashAnio,_dashMes);
  await Promise.allSettled([
    dashLoadMtto(_dashAnio,_dashMes),
    dashLoadPreop(_dashAnio,_dashMes),
    dashLoadInsp(_dashAnio,_dashMes),
    dashLoadFallas(_dashAnio,_dashMes)
  ]);
  const ahora=new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('dash-subtitle').textContent=`Año ${_dashAnio}${mesLabel} · Actualizado a las ${ahora}`;
  if(icon)icon.style.animation='';
};



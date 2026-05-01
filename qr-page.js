// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== CÓDIGOS QR DE EQUIPOS =====
window._qrEquipoCema=null;
window._qrEquipoData=null;
window._qrEquipos=[];
window._qrPendingCema=null;

// Read ?eq=XXX or ?cema=XXX from URL on page load
function qrGetCemaFromUrl(){
  try{
    var u=new URL(window.location.href);
    var c=u.searchParams.get('eq')||u.searchParams.get('cema');
    return c?c.toUpperCase().trim():null;
  }catch(e){return null;}
}
window.qrGetCemaFromUrl=qrGetCemaFromUrl;

// Initialize QR equipo screen
window.initQrEquipoPage=async function(){
  var cema=window._qrEquipoCema||qrGetCemaFromUrl();
  if(!cema){
    document.getElementById('qr-eq-cema').textContent='Sin CEMA';
    document.getElementById('qr-eq-nombre').textContent='No se especifico equipo';
    return;
  }
  document.getElementById('qr-eq-cema').textContent=cema;
  document.getElementById('qr-eq-nombre').textContent='Cargando...';
  try{
    var q1=query(collection(db,'equipos'),where('nombre','==',cema));
    var snap=await getDocs(q1);
    if(snap.empty){
      q1=query(collection(db,'equipos'),where('codigo','==',cema));
      snap=await getDocs(q1);
    }
    if(snap.empty){
      document.getElementById('qr-eq-nombre').textContent='Equipo no registrado';
      window._qrEquipoData={cema:cema};
      registrarScanQR(cema,'no_encontrado');
      return;
    }
    var eq=snap.docs[0].data();
    eq.id=snap.docs[0].id;
    window._qrEquipoData=eq;
    document.getElementById('qr-eq-nombre').textContent=eq.codigo||eq.tipo||'';
    if(eq.proyecto){
      var pBadge=document.getElementById('qr-eq-proyecto');
      pBadge.textContent='Proyecto: '+eq.proyecto;
      pBadge.style.display='inline-block';
    }
    registrarScanQR(cema,'ok');
  }catch(e){
    console.warn('initQrEquipoPage:',e);
    document.getElementById('qr-eq-nombre').textContent='Error al cargar';
  }
};

// Audit log
async function registrarScanQR(cema,resultado){
  try{
    await addDoc(collection(db,'qr_scans'),{
      cema:cema,
      resultado:resultado,
      operador:window.nombreOperador||'-',
      ipe:window.ipeActivo||'-',
      uid:window._auth&&window._auth.currentUser?window._auth.currentUser.uid:'-',
      fecha:serverTimestamp(),
      proyecto:window._proyectoActivo?window._proyectoActivo.nombre:'-',
      userAgent:(navigator.userAgent||'').substring(0,150)
    });
  }catch(e){window._handleError&&window._handleError('registrarScanQR',e);}
}

// Action button handler
window.qrAccion=function(accion){
  var cema=window._qrEquipoCema||qrGetCemaFromUrl();
  if(!cema){showToast('error','CEMA no detectado');return;}
  window._qrPendingCema=cema;
  if(accion==='preop')window.navTo('preoperacionales');
  else if(accion==='falla')window.navTo('fallas');
  else if(accion==='mtto')window.navTo('ordenes');
  else if(accion==='hv'){
    if(window.rolActivo==='admin')window.navTo('hojavida');
    else showToast('error','Solo admin puede ver hoja de vida');
  }
};

// Autofill CEMA after navigation
function qrAutofillCema(){
  var cema=window._qrPendingCema;
  if(!cema)return;
  setTimeout(function(){
    var ids=['preop-cema','falla-cema','mtto-cema'];
    for(var i=0;i<ids.length;i++){
      var el=document.getElementById(ids[i]);
      if(el&&!el.value){
        el.value=cema;
        el.dispatchEvent(new Event('input',{bubbles:true}));
        showToast('info','CEMA '+cema+' autocompletado');
        break;
      }
    }
    window._qrPendingCema=null;
  },800);
}
window.qrAutofillCema=qrAutofillCema;

// ── PÁGINA GENERADOR DE QR ──
window.initQrGenPage=async function(){
  var sel=document.getElementById('qrgen-filter-proj');
  if(sel&&window._proyectos&&window._proyectos.length){
    sel.innerHTML='<option value="">Todos los proyectos</option>';
    window._proyectos.forEach(function(p){
      sel.innerHTML+='<option value="'+p.nombre+'">'+p.nombre+'</option>';
    });
    if(window._proyectoActivo)sel.value=window._proyectoActivo.nombre;
  }
  var grid=document.getElementById('qrgen-grid');
  grid.innerHTML='<div class="eq-loading">Cargando equipos...</div>';
  try{
    var snap=await getDocs(collection(db,'equipos'));
    window._qrEquipos=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
    window._qrEquipos.sort(function(a,b){return (a.nombre||'').localeCompare(b.nombre||'');});
    qrgenRender();
  }catch(e){
    grid.innerHTML='<p class="u-color-red">Error: '+e.message+'</p>';
  }
};

function qrgenRender(){
  var grid=document.getElementById('qrgen-grid');if(!grid)return;
  var filtroProj=(document.getElementById('qrgen-filter-proj')?.value||'').toLowerCase();
  var search=(document.getElementById('qrgen-search')?.value||'').toLowerCase().trim();
  var equipos=window._qrEquipos.filter(function(eq){
    var matchProj=!filtroProj||(eq.proyecto&&eq.proyecto.toLowerCase().includes(filtroProj));
    var matchSearch=!search||(eq.nombre||'').toLowerCase().includes(search)||(eq.codigo||'').toLowerCase().includes(search);
    return matchProj&&matchSearch;
  });
  document.getElementById('qrgen-count').textContent=equipos.length+' equipo(s)';
  if(!equipos.length){
    grid.innerHTML='<div class="eq-empty" style="grid-column:1/-1;text-align:center;padding:60px"><i class="bi bi-inbox" style="font-size:48px;color:var(--gray-300);display:block;margin-bottom:12px"></i><p class="u-color-gray-400">Sin equipos</p></div>';
    return;
  }
  grid.innerHTML='';
  var baseUrl=window.location.origin+window.location.pathname;
  equipos.forEach(function(eq,idx){
    var card=document.createElement('div');
    card.className='qr-card';
    var qrUrl=baseUrl+'?cema='+encodeURIComponent(eq.nombre||eq.codigo);
    card.innerHTML='<div class="qr-card-canvas" id="qr-canvas-'+idx+'"></div>'
      +'<div class="qr-card-cema">'+(eq.nombre||'-')+'</div>'
      +'<div class="qr-card-name">'+(eq.codigo||'-')+'</div>'
      +'<div class="qr-card-proj">'+(eq.proyecto||'')+'</div>'
      +'<div style="display:flex;gap:6px;margin-top:8px"><button data-idx="'+idx+'" data-canvas="qr-canvas-'+idx+'" onclick="window.qrgenDescargarUno(this.dataset.idx,this.dataset.canvas)" style="padding:6px 8px;border:1px solid var(--gray-200);background:var(--white);border-radius:6px;font-size:11px;cursor:pointer;flex:1" title="Descargar PNG"><i class="bi bi-download"></i> PNG</button><button data-idx="'+idx+'" onclick="window.qrgenImprimirUno(this.dataset.idx)" style="padding:6px 8px;border:1px solid var(--gray-200);background:var(--white);border-radius:6px;font-size:11px;cursor:pointer;flex:1" title="Imprimir"><i class="bi bi-printer"></i> Imprimir</button></div>';
    grid.appendChild(card);
    setTimeout(function(){
      try{
        var canvasDiv=document.getElementById('qr-canvas-'+idx);
        if(canvasDiv&&typeof QRCode!=='undefined'){
          new QRCode(canvasDiv,{text:qrUrl,width:140,height:140,colorDark:'#0f2137',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
        }
      }catch(e){window._handleError&&window._handleError('qrgen',e);}
    },50*idx);
  });
}

window.qrgenFiltrar=qrgenRender;

function buildPrintCard(eq,baseUrl){
  var qrUrl=baseUrl+'?cema='+encodeURIComponent(eq.nombre||eq.codigo);
  var card=document.createElement('div');
  card.className='qr-print-card';
  var canvasId='print-qr-'+Math.random().toString(36).substr(2,9);
  card.innerHTML='<div class="qr-print-logo">MM&E <span>MOVA</span></div>'
    +'<div class="qr-print-canvas-sheet" id="'+canvasId+'"></div>'
    +'<div class="qr-print-cema">'+(eq.nombre||'-')+'</div>'
    +'<div class="qr-print-name">'+(eq.codigo||eq.tipo||'')+'</div>'
    +'<div class="qr-print-proj">'+(eq.proyecto||'')+'</div>';
  return{card:card,canvasId:canvasId,qrUrl:qrUrl};
}

window.qrgenImprimir=function(){
  var filtroProj=(document.getElementById('qrgen-filter-proj')?.value||'').toLowerCase();
  var search=(document.getElementById('qrgen-search')?.value||'').toLowerCase().trim();
  var equipos=window._qrEquipos.filter(function(eq){
    var matchProj=!filtroProj||(eq.proyecto&&eq.proyecto.toLowerCase().includes(filtroProj));
    var matchSearch=!search||(eq.nombre||'').toLowerCase().includes(search)||(eq.codigo||'').toLowerCase().includes(search);
    return matchProj&&matchSearch;
  });
  if(!equipos.length){showToast('error','Sin equipos para imprimir');return;}
  qrgenImprimirLista(equipos);
};

// Descargar QR individual como PNG
window.qrgenDescargarUno=function(idx,canvasId){
  try{
    var div=document.getElementById(canvasId);
    if(!div){showToast('error','QR no encontrado');return;}
    var img=div.querySelector('img')||div.querySelector('canvas');
    if(!img){showToast('error','QR no generado aún');return;}
    var equipos=qrgenFiltrados();
    var i=parseInt(idx);
    var eq=equipos[i];if(!eq){showToast('error','Equipo no encontrado');return;}
    var nombre='QR_'+(eq.nombre||eq.codigo||'equipo').replace(/[^a-zA-Z0-9]/g,'_')+'.png';
    // Si es <img>, descarga directa por src
    if(img.tagName==='IMG'){
      var a=document.createElement('a');
      a.href=img.src;
      a.download=nombre;
      a.click();
    }else if(img.tagName==='CANVAS'){
      var a=document.createElement('a');
      a.href=img.toDataURL('image/png');
      a.download=nombre;
      a.click();
    }
    showToast('success','QR descargado');
  }catch(e){showToast('error','Error: '+e.message);}
};

// Helper: lista de equipos filtrados
function qrgenFiltrados(){
  var filtroProj=(document.getElementById('qrgen-filter-proj')?.value||'').toLowerCase();
  var search=(document.getElementById('qrgen-search')?.value||'').toLowerCase().trim();
  return window._qrEquipos.filter(function(eq){
    var matchProj=!filtroProj||(eq.proyecto&&eq.proyecto.toLowerCase().includes(filtroProj));
    var matchSearch=!search||(eq.nombre||'').toLowerCase().includes(search)||(eq.codigo||'').toLowerCase().includes(search);
    return matchProj&&matchSearch;
  });
}

// Descargar todos los QR (como PDF compilado o múltiples PNGs)
window.qrgenDescargarTodos=async function(){
  var equipos=qrgenFiltrados();
  if(!equipos.length){showToast('error','Sin equipos');return;}
  if(equipos.length>50){if(!confirm('¿Descargar PDF con '+equipos.length+' QRs? (puede tardar)'))return;}
  showToast('info','Generando PDF con '+equipos.length+' códigos QR...');
  try{
    var{jsPDF}=window.jspdf;
    var pdf=new jsPDF({orientation:'p',unit:'mm',format:'a4'});
    // 4 QR por página A4 (2x2 grid de 100mm x 100mm)
    var baseUrl=window.location.origin+window.location.pathname;
    for(var i=0;i<equipos.length;i++){
      var eq=equipos[i];
      var idxInPage=i%4;
      if(i>0&&idxInPage===0)pdf.addPage();
      var col=idxInPage%2,row=Math.floor(idxInPage/2);
      var x=col*100+5,y=row*145+5;
      // Render QR offscreen
      var div=document.createElement('div');
      div.style.cssText='position:absolute;left:-9999px';
      document.body.appendChild(div);
      var qrUrl=baseUrl+'?cema='+encodeURIComponent(eq.nombre||eq.codigo);
      new QRCode(div,{text:qrUrl,width:300,height:300,colorDark:'#0f2137',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
      await new Promise(function(r){setTimeout(r,80);});
      var img=div.querySelector('img')||div.querySelector('canvas');
      var dataUrl=img.tagName==='IMG'?img.src:img.toDataURL('image/png');
      // Logo
      pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.setTextColor(15,33,55);
      pdf.text('MM&E MOVA',x+50,y+8,{align:'center'});
      // QR
      pdf.addImage(dataUrl,'PNG',x+25,y+12,50,50);
      // CEMA
      pdf.setFontSize(16);pdf.text(String(eq.nombre||'-'),x+50,y+72,{align:'center'});
      pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(80,80,80);
      pdf.text(String(eq.codigo||eq.tipo||''),x+50,y+80,{align:'center'});
      if(eq.proyecto){pdf.setTextColor(46,117,182);pdf.text(String(eq.proyecto).toUpperCase(),x+50,y+86,{align:'center'});}
      // Border
      pdf.setDrawColor(220,220,220);pdf.rect(x,y,90,135);
      document.body.removeChild(div);
    }
    var fname='QRs_MOVA_'+new Date().toISOString().substring(0,10)+'.pdf';
    pdf.save(fname);
    showToast('success','PDF descargado: '+fname);
  }catch(e){console.error('descargar QRs:',e);showToast('error','Error: '+e.message);}
};

window.qrgenImprimirUno=function(idx){
  var i=parseInt(idx);
  var filtroProj=(document.getElementById('qrgen-filter-proj')?.value||'').toLowerCase();
  var search=(document.getElementById('qrgen-search')?.value||'').toLowerCase().trim();
  var equipos=window._qrEquipos.filter(function(eq){
    var matchProj=!filtroProj||(eq.proyecto&&eq.proyecto.toLowerCase().includes(filtroProj));
    var matchSearch=!search||(eq.nombre||'').toLowerCase().includes(search)||(eq.codigo||'').toLowerCase().includes(search);
    return matchProj&&matchSearch;
  });
  if(equipos[i])qrgenImprimirLista([equipos[i]]);
};

function qrgenImprimirLista(equipos){
  var sheet=document.getElementById('qr-print-sheet');
  var area=document.getElementById('qr-print-area');
  sheet.innerHTML='';
  var baseUrl=window.location.origin+window.location.pathname;
  var pending=[];
  equipos.forEach(function(eq){
    var b=buildPrintCard(eq,baseUrl);
    sheet.appendChild(b.card);
    pending.push(b);
  });
  area.style.display='block';
  setTimeout(function(){
    pending.forEach(function(p){
      var div=document.getElementById(p.canvasId);
      if(div&&typeof QRCode!=='undefined'){
        new QRCode(div,{text:p.qrUrl,width:200,height:200,colorDark:'#0f2137',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
      }
    });
    setTimeout(function(){
      window.print();
      area.style.display='none';
    },500);
  },200);
}


// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== GALERÍA DE EQUIPOS =====
var _galeriaFotos=[];  // cache
var _galeriaCarouselIdx=0;
var _galeriaCarouselTimer=null;
var _galeriaUploadFile=null;

// ── Cargar fotos desde Firestore + Hoja de Vida ──
async function galeriaCargarFotos(){
  var fotos=[];
  // 1. Fotos de la colección galeria (subidas directamente)
  try{
    var snap=await getDocs(collection(db,'galeria'));
    snap.docs.forEach(function(d){
      var dat=d.data();
      if(dat.foto)fotos.push({id:d.id,cema:dat.cema||'—',proyecto:dat.proyecto||'',foto:dat.foto,tipo:'galeria',fecha:dat.fecha});
    });
  }catch(e){console.warn('galeria load:',e);}
  // 2. Fotos de Hoja de Vida
  try{
    var snapHV=await getDocs(collection(db,'hojas_vida'));
    snapHV.docs.forEach(function(d){
      var dat=d.data();
      if(dat.foto){
        fotos.push({id:'hv_'+d.id,cema:dat.placa||dat.cema||d.id,proyecto:dat.proyecto||'',foto:dat.foto,tipo:'hojavida',fecha:dat.actualizadoEn});
      }
    });
  }catch(e){console.warn('hoja vida fotos:',e);}
  _galeriaFotos=fotos;
  return fotos;
}

// ── Carrusel en inicio ──
window.inicioCarouselInit=async function(){
  var container=document.getElementById('inicio-galeria-carousel');
  if(!container)return;
  // Always reload fotos to reflect project changes
  var fotos=await galeriaCargarFotos();
  // Filter by active project
  if(window._proyectoActivo){
    var pn=window._proyectoActivo.nombre.toLowerCase();
    var filtered=fotos.filter(function(f){return f.proyecto&&f.proyecto.toLowerCase().includes(pn);});
    if(filtered.length)fotos=filtered;
  }
  if(!fotos.length){
    container.innerHTML='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,.35);gap:8px"><i class="bi bi-images" style="font-size:32px"></i><span style="font-size:12px">Sin fotos — agrega en Galería</span></div>';
    return;
  }
  // Shuffle for variety
  fotos=fotos.slice().sort(function(){return Math.random()-.5;});
  var html='';
  fotos.forEach(function(f,i){
    var active=i===0?' active':'';
    html+='<div class="galeria-slide'+active+'"><img src="'+f.foto+'" alt="'+f.cema+'" loading="lazy">'
      +'<div class="galeria-slide-info"><div class="galeria-slide-cema">'+f.cema+'</div>'
      +'<div class="galeria-slide-sub">'+(f.proyecto||'')+'</div></div></div>';
  });
  // Navigation
  html+='<button class="galeria-nav prev" onclick="galeriaCarouselNav(-1)">&#8249;</button>';
  html+='<button class="galeria-nav next" onclick="galeriaCarouselNav(1)">&#8250;</button>';
  // Dots (max 8)
  var dotsCount=Math.min(fotos.length,8);
  html+='<div class="galeria-dots">';
  for(var i=0;i<dotsCount;i++){html+='<div class="galeria-dot'+(i===0?' active':'')+'" onclick="galeriaCarouselGo('+i+')"></div>';}
  html+='</div>';
  container.innerHTML=html;
  _galeriaCarouselIdx=0;
  // Auto-rotate every 4s
  if(_galeriaCarouselTimer)clearInterval(_galeriaCarouselTimer);
  _galeriaCarouselTimer=setInterval(function(){galeriaCarouselNav(1);},4000);
}

function galeriaCarouselNav(dir){
  var container=document.getElementById('inicio-galeria-carousel');
  if(!container)return;
  var slides=container.querySelectorAll('.galeria-slide');
  var dots=container.querySelectorAll('.galeria-dot');
  if(!slides.length)return;
  slides[_galeriaCarouselIdx].classList.remove('active');
  if(dots[_galeriaCarouselIdx])dots[_galeriaCarouselIdx].classList.remove('active');
  _galeriaCarouselIdx=(_galeriaCarouselIdx+dir+slides.length)%slides.length;
  slides[_galeriaCarouselIdx].classList.add('active');
  if(dots[_galeriaCarouselIdx])dots[_galeriaCarouselIdx].classList.add('active');
}
function galeriaCarouselGo(idx){
  var dir=idx-_galeriaCarouselIdx;
  if(dir!==0)galeriaCarouselNav(dir);
}
window.galeriaCarouselNav=galeriaCarouselNav;
window.galeriaCarouselGo=galeriaCarouselGo;

// ── Página Galería ──
window.initGaleriaPage=async function(){
  // Populate project selects
  var selFilter=document.getElementById('galeria-filter-proj');
  var selUpload=document.getElementById('galeria-upload-proj');
  if(selFilter&&window._proyectos.length){
    selFilter.innerHTML='<option value="">Todos los proyectos</option>';
    selUpload.innerHTML='<option value="">Seleccionar...</option>';
    window._proyectos.forEach(function(p){
      selFilter.innerHTML+='<option value="'+p.nombre+'">'+p.nombre+'</option>';
      selUpload.innerHTML+='<option value="'+p.nombre+'">'+p.nombre+'</option>';
    });
  }
  if(window._proyectoActivo){
    if(selFilter)selFilter.value=window._proyectoActivo.nombre;
    if(selUpload)selUpload.value=window._proyectoActivo.nombre;
  }
  _galeriaFotos=[];
  await galeriaCargarFotos();
  galeriaRenderGrid();
};

function galeriaRenderGrid(filtro){
  var grid=document.getElementById('galeria-grid');if(!grid)return;
  var fotos=_galeriaFotos;
  if(filtro)fotos=fotos.filter(function(f){return f.proyecto&&f.proyecto.toLowerCase()===filtro.toLowerCase();});
  var countEl=document.getElementById('galeria-count');
  if(countEl)countEl.textContent=fotos.length+' foto(s)';
  if(!fotos.length){
    grid.innerHTML='<div class="eq-empty" style="grid-column:1/-1;text-align:center;padding:60px"><i class="bi bi-images" style="font-size:48px;color:var(--gray-300);display:block;margin-bottom:12px"></i><p class="u-color-gray-400">Sin fotos. Sube la primera.</p></div>';
    return;
  }
  var html='';
  fotos.forEach(function(f){
    var badge=f.tipo==='hojavida'?'<span style="position:absolute;top:6px;left:6px;background:rgba(46,117,182,.85);color:#fff;padding:2px 7px;border-radius:8px;font-size:9px;font-weight:700">HV</span>':'';
    var delBtn=f.tipo==='galeria'?'<button class="gallery-item-del" data-id="'+f.id+'" onclick="event.stopPropagation();window.galeriaEliminar(this.dataset.id)" title="Eliminar">✕</button>':'';
    html+='<div class="gallery-item" onclick="window.galeriaVerFoto(\''+f.id+'\')">'
      +'<img src="'+f.foto+'" loading="lazy" alt="'+f.cema+'">'
      +badge+delBtn
      +'<div class="gallery-item-info"><div class="gallery-item-cema">'+f.cema+'</div><div style="font-size:10px;opacity:.8">'+f.proyecto+'</div></div>'
      +'</div>';
  });
  grid.innerHTML=html;
}

window.galeriaFiltrar=function(){
  var filtro=document.getElementById('galeria-filter-proj').value;
  galeriaRenderGrid(filtro);
};

window.galeriaVerFoto=function(id){
  var idx=_galeriaFotos.findIndex(function(x){return x.id===id;});
  if(idx<0)return;
  window.galeriaLightboxGo(idx);
};

window._galeriaLightboxIdx=0;

window.galeriaLightboxGo=function(idx){
  if(!_galeriaFotos.length)return;
  if(idx<0)idx=_galeriaFotos.length-1;
  if(idx>=_galeriaFotos.length)idx=0;
  window._galeriaLightboxIdx=idx;
  var f=_galeriaFotos[idx];
  var lb=document.getElementById('galeria-lightbox');
  var img=document.getElementById('galeria-lightbox-img');
  var cemaEl=document.getElementById('galeria-lightbox-cema');
  var projEl=document.getElementById('galeria-lightbox-proj');
  var counter=document.getElementById('galeria-lightbox-counter');
  if(lb&&img){
    img.src=f.foto;
    lb.style.display='flex';
  }
  if(cemaEl)cemaEl.textContent=(f.cema||'—');
  if(projEl)projEl.textContent=(f.proyecto||'');
  if(counter)counter.textContent=(idx+1)+' / '+_galeriaFotos.length;
};

window.galeriaLightboxNext=function(){
  window.galeriaLightboxGo(window._galeriaLightboxIdx+1);
};

window.galeriaLightboxPrev=function(){
  window.galeriaLightboxGo(window._galeriaLightboxIdx-1);
};

// Botones lightbox (event listeners más robustos que inline onclick)
(function(){
  var btnPrev=document.getElementById('galeria-btn-prev');
  var btnNext=document.getElementById('galeria-btn-next');
  if(btnPrev)btnPrev.addEventListener('click',function(e){e.stopPropagation();window.galeriaLightboxPrev();});
  if(btnNext)btnNext.addEventListener('click',function(e){e.stopPropagation();window.galeriaLightboxNext();});
})();

// Teclado: flechas y ESC
document.addEventListener('keydown',function(e){
  var lb=document.getElementById('galeria-lightbox');
  if(!lb||lb.style.display==='none')return;
  if(e.key==='ArrowRight')window.galeriaLightboxNext();
  else if(e.key==='ArrowLeft')window.galeriaLightboxPrev();
  else if(e.key==='Escape')lb.style.display='none';
});

// ── Upload ──
window.galeriaSubir=function(input){
  var file=input.files[0];if(!file)return;
  if(file.size>5*1024*1024){showToast('error','Máximo 5MB por foto');return;}
  _galeriaUploadFile=file;
  var reader=new FileReader();
  reader.onload=function(e){
    var preview=document.getElementById('galeria-upload-preview');
    if(preview){preview.src=e.target.result;preview.style.display='block';}
    document.getElementById('galeria-upload-form').style.display='block';
  };
  reader.readAsDataURL(file);
  input.value='';
};

window.galeriaGuardar=async function(){
  var cema=document.getElementById('galeria-upload-cema').value.trim();
  var proj=document.getElementById('galeria-upload-proj').value;
  var preview=document.getElementById('galeria-upload-preview');
  if(!cema){showToast('error','Ingresa el CEMA del equipo');return;}
  if(!proj){showToast('error','Selecciona el proyecto');return;}
  if(!preview||!preview.src){showToast('error','Selecciona una foto');return;}
  // Compress image to max ~200KB
  var canvas=document.createElement('canvas');
  var img=new Image();
  img.onload=async function(){
    var maxW=800,maxH=600;
    var w=img.width,h=img.height;
    if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
    if(h>maxH){w=Math.round(w*maxH/h);h=maxH;}
    canvas.width=w;canvas.height=h;
    canvas.getContext('2d').drawImage(img,0,0,w,h);
    var compressed=canvas.toDataURL('image/jpeg',0.8);
    try{
      var id2=cema.toLowerCase().replace(/[^a-z0-9]/g,'_')+'_'+Date.now();
      await setDoc(doc(db,'galeria',id2),{
        cema:cema.toUpperCase(),
        proyecto:proj,
        foto:compressed,
        fecha:serverTimestamp(),
        subidoPor:window.nombreOperador||'—'
      });
      document.getElementById('galeria-upload-form').style.display='none';
      _galeriaFotos=[];
      await galeriaCargarFotos();
      galeriaRenderGrid(document.getElementById('galeria-filter-proj').value);
      showToast('success','Foto guardada');
    }catch(e){showToast('error','Error: '+e.message);}
  };
  img.src=preview.src;
};

window.galeriaCancelarUpload=function(){
  document.getElementById('galeria-upload-form').style.display='none';
  _galeriaUploadFile=null;
};

window.galeriaEliminar=async function(id){
  if(!confirm('Eliminar esta foto?'))return;
  try{
    await deleteDoc(doc(db,'galeria',id));
    _galeriaFotos=_galeriaFotos.filter(function(f){return f.id!==id;});
    galeriaRenderGrid(document.getElementById('galeria-filter-proj').value);
    showToast('success','Foto eliminada');
  }catch(e){showToast('error','Error: '+e.message);}
};

// ===== INICIO DINÁMICO: Próximos Mantenimientos + Actividad Reciente =====
window.cargarInicioProxMtto=async function(){
  var cont=document.getElementById('inicio-prox-mtto');
  if(!cont)return;
  try{
    var pendientes=[];
    try{
      var snap=await getDcsByProy('solicitudes_mtto');
      snap.docs.forEach(function(d){
        var data=d.data();
        if(data.estado&&data.estado!=='pendiente'&&data.estado!=='abierta')return;
        pendientes.push({
          fecha:data.fecha&&data.fecha.toDate?data.fecha.toDate():new Date(),
          cema:data.cema||(data.equipo&&data.equipo.cema)||'—',
          tipo:data.tipoMtto||'Mantenimiento',
          prioridad:data.urgencia||'media',
          fuente:'firestore'
        });
      });
    }catch(e){window._handleError&&window._handleError("proxMttoFirestore",e);}
    try{
      var url=activeUrl();
      var sheetsR=await fetch(url);
      var sheetsJ=await sheetsR.json();
      var cronSheet=(sheetsJ.sheets||[]).find(function(s){var n=s.toUpperCase().replace(/\s+/g,'');return n.includes('CRONOGRAMA')||(n.includes('DASH')&&n.includes('CRONO'));});
      if(cronSheet){
        var resp=await fetch(url+'?sheet='+encodeURIComponent(cronSheet)+'&hr=1');
        var json=await resp.json();
        var rows=json.rows||[];
        var startIdx=-1;
        for(var i=0;i<rows.length;i++){
          var rowVals=Object.values(rows[i]).map(function(v){return String(v||'').toUpperCase();});
          if(rowVals.some(function(v){return v.includes('PROXIMOS')||v.includes('PRÓXIMOS');})&&rowVals.some(function(v){return v.includes('MANTENIMIENTO');})){
            startIdx=i+1;break;
          }
        }
        if(startIdx>=0){
          var dataRows=rows.slice(startIdx,startIdx+15);
          dataRows.forEach(function(row){
            var keys=Object.keys(row);
            var cema=String(row[keys[0]]||'').trim();
            var tipo=String(row[keys[2]]||row[keys[1]]||'').trim();
            var fechaStr=String(row[keys[3]]||row[keys[keys.length-1]]||'').trim();
            if(!cema||cema.length>10)return;
            var fecha=null;
            if(fechaStr){
              var p=fechaStr.replace(/-/g,'/').split('/');
              if(p.length>=3){
                var d=parseInt(p[0]),m=parseInt(p[1])-1,y=parseInt(p[2]);
                if(y>2000)fecha=new Date(y,m,d);
              }
            }
            if(!fecha)return;
            pendientes.push({fecha:fecha,cema:cema,tipo:tipo||'Preventivo',prioridad:'media',fuente:'cronograma'});
          });
        }
      }
    }catch(eC){console.warn('[prox-mtto] cronograma:',eC);}
    pendientes.sort(function(a,b){return a.fecha-b.fecha;});
    var top=pendientes.slice(0,5);
    if(!top.length){
      cont.innerHTML='<div style="text-align:center;padding:20px;color:var(--gray-400);font-size:12px"><i class="bi bi-check-circle" style="font-size:28px;display:block;margin-bottom:6px;color:var(--green)"></i>Sin mantenimientos pendientes</div>';
      return;
    }
    var html='';
    var MES_ABR=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    top.forEach(function(p){
      var d=p.fecha.getDate();
      var m=MES_ABR[p.fecha.getMonth()];
      var hoy=new Date();hoy.setHours(0,0,0,0);
      var diasDif=Math.floor((p.fecha-hoy)/(1000*60*60*24));
      var bg='linear-gradient(135deg,var(--blue),var(--blue-bright))';
      if(diasDif<0)bg='linear-gradient(135deg,var(--red),#EF5350)';
      else if(diasDif<=3)bg='linear-gradient(135deg,#E65100,#F57C00)';
      var prevTag=p.tipo.toUpperCase().includes('CORR')?'cal-tag-corr':'cal-tag-prev';
      var prevLbl=p.tipo.toUpperCase().includes('CORR')?'Correctivo':'Preventivo';
      var alerta=diasDif<0?' · ⚠ Vencido '+Math.abs(diasDif)+'d':diasDif===0?' · Hoy':diasDif<=7?' · '+diasDif+'d':'';
      html+='<div class="cal-item">'
        +'<div class="cal-date" style="background:'+bg+'"><span class="cal-date-day">'+d+'</span><span class="cal-date-month">'+m+'</span></div>'
        +'<div class="cal-info"><div class="cal-info-title">'+(p.tipo||'Mtto.')+' — '+p.cema+'</div>'
        +'<div class="cal-info-sub">'+(p.fuente==='cronograma'?'Cronograma':'Solicitado')+alerta+'</div>'
        +'<span class="cal-info-tag '+prevTag+'">'+prevLbl+'</span></div></div>';
    });
    cont.innerHTML=html;
  }catch(e){
    cont.innerHTML='<div style="text-align:center;padding:20px;color:var(--gray-400);font-size:12px">Error al cargar</div>';
  }
};

window.cargarInicioActividad=async function(){
  var cont=document.getElementById('inicio-actividad');
  if(!cont)return;
  try{
    var actividades=[];
    var colecciones=[
      {col:'reportes_fallas',accion:'reportó falla',color:'#ef4444',campo:'reportadoPor'},
      {col:'solicitudes_mtto',accion:'solicitó mantenimiento',color:'#f97316',campo:'solicitadoPor'},
      {col:'inspecciones_linea_amarilla',accion:'completó preop. amarilla',color:'#22c55e',campo:'operador'},
      {col:'inspecciones_linea_blanca',accion:'completó preop. blanca',color:'#22c55e',campo:'operador'},
      {col:'reportes_danos',accion:'reportó daño',color:'#dc2626',campo:'reportadoPor'},
      {col:'novedades',accion:'publicó novedad',color:'#8b5cf6',campo:'autor'}
    ];
    for(var i=0;i<colecciones.length;i++){
      var c=colecciones[i];
      try{
        var snap=await getDocs(collection(db,c.col));
        snap.docs.forEach(function(d){
          var data=d.data();
          var f=data.fecha&&data.fecha.toDate?data.fecha.toDate():null;
          var fAct=data.actualizado&&data.actualizado.toDate?data.actualizado.toDate():null;
          var fEvento=fAct||f;
          if(!fEvento)return;
          var cema=data.cema||(data.equipo&&data.equipo.cema)||data.identificacion||'';
          var titulo=data.titulo||data.tipoFalla||data.tipoMtto||'';
          var quien=data[c.campo]||data.operador||data.actualizadoPor||data.cerradoPor||'—';
          actividades.push({fecha:fEvento,quien:quien,accion:c.accion,ref:cema||titulo||'',color:c.color});
          if(data.fechaCierre&&data.fechaCierre.toDate){
            actividades.push({fecha:data.fechaCierre.toDate(),quien:data.cerradoPor||'—',accion:'cerró '+(c.col==='reportes_fallas'?'falla':'reporte'),ref:cema||'',color:'#16a34a'});
          }
        });
      }catch(eC){}
    }
    actividades.sort(function(a,b){return b.fecha-a.fecha;});
    var top=actividades.slice(0,8);
    if(!top.length){
      cont.innerHTML='<div style="text-align:center;padding:20px;color:var(--gray-400);font-size:12px">Sin actividad reciente</div>';
      return;
    }
    function tiempoRel(d){
      var diff=(Date.now()-d.getTime())/1000;
      if(diff<60)return'Hace un momento';
      if(diff<3600)return'Hace '+Math.floor(diff/60)+'m';
      if(diff<86400)return'Hace '+Math.floor(diff/3600)+'h';
      if(diff<2592000)return'Hace '+Math.floor(diff/86400)+'d';
      return d.toLocaleDateString('es-CO',{day:'2-digit',month:'short'});
    }
    function iniciales(nombre){
      var p=String(nombre||'').trim().split(/\s+/);
      if(p.length>=2)return(p[0][0]+p[1][0]).toUpperCase();
      return(p[0]||'??').substring(0,2).toUpperCase();
    }
    var html='';
    top.forEach(function(a){
      var ini=iniciales(a.quien);
      html+='<div class="activity-item">'
        +'<div class="activity-avatar" style="background:linear-gradient(135deg,'+a.color+','+a.color+'aa)">'+ini+'</div>'
        +'<div style="flex:1"><div class="activity-text"><strong>'+a.quien+'</strong> '+a.accion+(a.ref?' <strong>'+a.ref+'</strong>':'')+'</div>'
        +'<div class="activity-time">'+tiempoRel(a.fecha)+'</div></div></div>';
    });
    cont.innerHTML=html;
  }catch(e){
    cont.innerHTML='<div style="text-align:center;padding:20px;color:var(--gray-400);font-size:12px">Error al cargar</div>';
  }
};

window.abrirCierreFalla=async function(fallaId){
  try{
    var col=window._cierreColeccion||'reportes_fallas';
    var snap=await getDoc(doc(db,col,fallaId));
    if(!snap.exists()){showToast('error','Falla no encontrada');return;}
    var d=snap.data();
    var cema=d.cema||(d.equipo&&d.equipo.cema)||'—';
    var tipo=d.tipoFalla||'—';
    var fecha=d.fecha&&d.fecha.toDate?d.fecha.toDate().toLocaleDateString('es-CO'):'—';
    document.getElementById('falla-cierre-id').value=fallaId;
    document.getElementById('falla-cierre-subtitulo').textContent=cema+' · '+tipo;
    document.getElementById('falla-cierre-info').innerHTML=
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px">'
      +'<div><span style="color:var(--gray-400);font-size:10px;text-transform:uppercase">CEMA</span><div style="font-weight:700;color:var(--navy)">'+cema+'</div></div>'
      +'<div><span style="color:var(--gray-400);font-size:10px;text-transform:uppercase">Tipo</span><div style="font-weight:700;color:var(--navy)">'+tipo+'</div></div>'
      +'<div><span style="color:var(--gray-400);font-size:10px;text-transform:uppercase">Prioridad</span><div style="font-weight:700;color:var(--red)">'+(d.prioridad||'—')+'</div></div>'
      +'<div style="grid-column:1/-1"><span style="color:var(--gray-400);font-size:10px;text-transform:uppercase">Reportada</span><div style="font-weight:600;color:var(--gray-600)">'+fecha+'</div></div>'
      +(d.descripcion?'<div style="grid-column:1/-1"><span style="color:var(--gray-400);font-size:10px;text-transform:uppercase">Descripcion</span><div style="color:var(--gray-600);font-size:11px">'+d.descripcion+'</div></div>':'')
      +'</div>';
    document.getElementById('falla-cierre-ot').value='';
    document.getElementById('falla-cierre-obs').value='';
    document.getElementById('fallas-lista-overlay').style.display='none';
    document.getElementById('falla-cierre-overlay').style.display='flex';
  }catch(e){showToast('error','Error: '+e.message);}
};

window.confirmarCierreFalla=async function(){
  var id=document.getElementById('falla-cierre-id').value;
  var obs=document.getElementById('falla-cierre-obs').value.trim();
  var ot=document.getElementById('falla-cierre-ot').value.trim();
  if(!obs){showToast('error','Las observaciones son obligatorias');return;}
  var btn=document.getElementById('btn-confirmar-cierre');
  btn.disabled=true;btn.textContent='Cerrando...';
  try{
    var data={estado:'cerrada',fechaCierre:serverTimestamp(),observacionCierre:obs,cerradoPor:window.nombreOperador||'—'};
    if(ot)data.otCierre=ot;
    var col=window._cierreColeccion||'reportes_fallas';
    await setDoc(doc(db,col,id),data,{merge:true});
    document.getElementById('falla-cierre-overlay').style.display='none';
    showToast('success','Falla cerrada correctamente');
    if(window.loadInicioKPIs)window.loadInicioKPIs();
  }catch(e){showToast('error','Error: '+e.message);}
  finally{btn.disabled=false;btn.innerHTML='<i class="bi bi-check-lg"></i> Confirmar Cierre';}
};

window.verFallasAbiertas=async function(){
  var body=document.getElementById('fallas-lista-body');
  body.innerHTML='<div class="eq-loading"><i class="bi bi-arrow-repeat" class="u-spin"></i> Cargando...</div>';
  document.getElementById('fallas-lista-overlay').style.display='flex';
  try{
    var snap=await getDocs(query(collection(db,'reportes_fallas'),where('estado','==','abierta')));
    if(snap.empty){
      body.innerHTML='<div style="text-align:center;padding:40px;color:var(--gray-400)"><i class="bi bi-check-circle" style="font-size:48px;color:var(--green);display:block;margin-bottom:12px"></i><p>No hay fallas abiertas</p></div>';
      return;
    }
    var prioOrder={Alta:0,Media:1,Baja:2};
    var prioColor={Alta:'var(--red)',Media:'var(--orange)',Baja:'var(--green)'};
    var fallas=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
    fallas.sort(function(a,b){return (prioOrder[a.prioridad]||3)-(prioOrder[b.prioridad]||3);});
    body.innerHTML='';
    fallas.forEach(function(f){
      var cema=f.cema||(f.equipo&&f.equipo.cema)||'—';
      var fecha=f.fecha&&f.fecha.toDate?f.fecha.toDate().toLocaleDateString('es-CO'):'—';
      var dias=f.fecha&&f.fecha.toDate?Math.floor((new Date()-f.fecha.toDate())/(1000*60*60*24)):null;
      var color=prioColor[f.prioridad]||'var(--gray-300)';
      var div=document.createElement('div');
      div.style.cssText='border:1px solid var(--gray-200);border-radius:10px;padding:14px 16px;margin-bottom:10px;border-left:3px solid '+color;
      var inner='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">'
        +'<div style="flex:1"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
        +'<strong style="color:var(--navy);font-size:14px">'+cema+'</strong>'
        +'<span style="background:'+color+';color:#fff;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">'+(f.prioridad||'Sin prioridad')+'</span>'
        +'</div>'
        +'<div style="font-size:12px;color:var(--gray-500);margin-bottom:4px">'+(f.descripcion||'Sin descripcion')+'</div>'
        +'<div style="font-size:11px;color:var(--gray-400)">Reportada: '+fecha+(dias!==null?' · '+dias+' dias':'')+' '+(f.tipoFalla||'')+'</div>'
        +'</div></div>';
      div.innerHTML=inner;
      var btn=document.createElement('button');
      btn.style.cssText='flex-shrink:0;padding:8px 16px;background:#2e7d32;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer';
      btn.innerHTML='<i class="bi bi-check-lg"></i> Cerrar';
      btn.onclick=function(){window.abrirCierreFalla(f.id);};
      div.querySelector('div').appendChild(btn);
      body.appendChild(div);
    });
    var note=document.createElement('p');
    note.style.cssText='font-size:11px;color:var(--gray-400);text-align:center;margin-top:8px';
    note.textContent=fallas.length+' falla(s) abierta(s)';
    body.appendChild(note);
  }catch(e){body.innerHTML='<p class="u-color-red">Error: '+e.message+'</p>';}
};

// ===== PROYECTOS =====
window._proyectos=[];
window._proyectoActivo=null;

async function cargarProyectos(){
  try{
    var snap=await getDocs(collection(db,'proyectos'));
    window._proyectos=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
    window._proyectos.sort(function(a,b){return a.nombre.localeCompare(b.nombre);});
    return window._proyectos;
  }catch(e){console.warn('cargarProyectos:',e);return[];}
}

// Assign color class and emoji by project name
function proyColorClass(nombre){
  var n=(nombre||'').toLowerCase();
  if(n.includes('rubial'))return'rubiales';
  if(n.includes('scatec'))return'scatec';
  if(n.includes('guajir'))return'guajira';
  return'default';
}
function proyEmoji(nombre){
  var n=(nombre||'').toLowerCase();
  if(n.includes('rubial'))return'🟠';
  if(n.includes('scatec'))return'🟢';
  if(n.includes('guajir'))return'💨';
  if(n==='todos')return'⊞';
  return'📁';
}
function renderProjBtns(containerId){
  var c=document.getElementById(containerId);if(!c)return;
  if(!window._proyectos.length){c.innerHTML='<span style="font-size:12px;color:var(--gray-400)">Sin proyectos configurados</span>';return;}
  var activo=window._proyectoActivo?window._proyectoActivo.id:'todos';
  var html='';
  // Botón TODOS
  var todosActive=(activo==='todos'?' active todos':'');
  html+='<button class="proj-btn'+todosActive+'" data-proj-id="todos" onclick="window.seleccionarProyecto(this.dataset.projId)">'
    +'<div class="proj-btn-icon">⊞</div>'
    +'<div class="proj-btn-info">'
    +'<span class="proj-btn-label">Proyecto</span>'
    +'<span class="proj-btn-name">Todos</span>'
    +'</div>'
    +'</button>';
  // Botón por proyecto
  window._proyectos.forEach(function(p){
    var isActive=(p.id===activo);
    var colorCls=proyColorClass(p.nombre);
    var cls='proj-btn'+(isActive?' active '+colorCls:'');
    html+='<button class="'+cls+'" data-proj-id="'+p.id+'" onclick="window.seleccionarProyecto(this.dataset.projId)">'
      +'<div class="proj-btn-icon">'+proyEmoji(p.nombre)+'</div>'
      +'<div class="proj-btn-info">'
      +'<span class="proj-btn-label">Proyecto</span>'
      +'<span class="proj-btn-name">'+p.nombre+'</span>'
      +'</div>'
      +'</button>';
  });
  c.innerHTML=html;
}

window.seleccionarProyecto=async function(proyId){
  // Handle "todos" — clear active project
  if(proyId==='todos'){
    window._proyectoActivo=null;
  }else{
    var proy=window._proyectos.find(function(p){return p.id===proyId;});
    if(!proy)return;
    window._proyectoActivo=proy;
  }
  // Sync ALL project button bars in the app
  var allBars=['dash-proj-btns','hmtto-proj-btns','cseg-proj-btns','cuentas-proj-btns','trib-proj-btns','planner-proj-btns'];
  allBars.forEach(function(bid){
    var c=document.getElementById(bid);if(!c)return;
    c.querySelectorAll('.proj-btn').forEach(function(b){
      var pid=b.dataset.projId;
      var isActive=(proyId==='todos'?pid==='todos':pid===proyId);
      // Remove all active classes
      b.classList.remove('active','todos','rubiales','scatec','guajira','default');
      if(isActive){
        b.classList.add('active');
        if(pid==='todos'){b.classList.add('todos');}
        else if(window._proyectoActivo){
          var colorCls=typeof proyColorClass==='function'?proyColorClass(window._proyectoActivo.nombre):'default';
          b.classList.add(colorCls);
        }
      }
    });
  });
  hmttoCache={};hmttoCacheTs={};
  if(typeof clearFsCache==='function')clearFsCache();
  var label=window._proyectoActivo?window._proyectoActivo.nombre:'Todos los proyectos';
  showToast('info','Proyecto: '+label);
  // Reload current page
  var page=document.querySelector('.page-section.active');
  var pageId=page?page.id.replace('page-',''):'';
  // Always update inicio KPIs and carousels
  if(window.loadInicioKPIs)window.loadInicioKPIs();
  if(window.inicioCarouselInit)setTimeout(window.inicioCarouselInit,300);
  // Page-specific reload
  if(pageId==='dashboard'&&window.initDashboardPage){
    if(typeof _dashAnio!=='undefined'){dashStoreStaticDrill&&dashStoreStaticDrill();dashLoadDispCumpl&&dashLoadDispCumpl(_dashAnio);}
    window.initDashboardPage();
  }
  else if(pageId==='hist-mtto'&&window.initHistMttoPage)window.initHistMttoPage();
  else if(pageId==='ctrl-seg'&&window.initCtrlSegPage)window.initCtrlSegPage();
  else if(pageId==='cuentas'&&window.initCuentasPage)window.initCuentasPage();
  else if(pageId==='tribologia'&&window.initTribologiaPage)window.initTribologiaPage();
  else if(pageId==='planner'&&window.initPlannerPage)window.initPlannerPage();
  else if(pageId==='galeria'&&window.initGaleriaPage)window.initGaleriaPage();
  else if(pageId==='qrgen'&&window.initQrGenPage)window.initQrGenPage();
  else if(pageId==='equipos'&&window.cargarEquipos)window.cargarEquipos(window._proyectoActivo?window._proyectoActivo.nombre.toLowerCase():'todos');
};

function getProyectoUrl(){
  // null = todos los proyectos → usar URL default (Rubiales o la primera disponible)
  if(window._proyectoActivo&&window._proyectoActivo.url)return window._proyectoActivo.url;
  // Fallback: primer proyecto configurado o URL hardcodeada
  if(window._proyectos&&window._proyectos.length&&window._proyectos[0].url)return window._proyectos[0].url;
  return CSEG_URL;
}
window.getProyectoUrl=getProyectoUrl;

async function initProjBars(){
  if(!window._proyectos.length)await cargarProyectos();
  ['dash-proj-btns','hmtto-proj-btns','cseg-proj-btns','cuentas-proj-btns','trib-proj-btns','planner-proj-btns'].forEach(renderProjBtns);
}
window.initProjBars=initProjBars;

window.initProyectosPage=async function(){
  var lista=document.getElementById('proj-lista');
  if(lista)lista.innerHTML='<div class="eq-loading">Cargando...</div>';
  await cargarProyectos();
  renderListaProyectos();
};

function renderListaProyectos(){
  var lista=document.getElementById('proj-lista');if(!lista)return;
  if(!window._proyectos.length){
    lista.innerHTML='<div class="eq-empty" style="text-align:center;padding:60px"><i class="bi bi-folder-plus" style="font-size:48px;color:var(--gray-300);display:block;margin-bottom:16px"></i><p class="u-color-gray-400">No hay proyectos</p><button onclick="window.abrirModalProyecto()" style="padding:10px 24px;background:var(--navy);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Agregar proyecto</button></div>';
    return;
  }
  var rows='';
  window._proyectos.forEach(function(p){
    var urlTxt=p.url?'<span style="color:#2e7d32">OK</span> '+p.url.substring(0,50)+'...':'<span class="u-color-red">Sin URL</span>';
    rows+='<tr>'
      +'<td style="padding:12px;font-weight:700;color:var(--navy)">'+p.nombre+'</td>'
      +'<td style="padding:12px;font-size:11px;color:var(--gray-400);font-family:monospace">'+urlTxt+'</td>'
      +'<td style="padding:12px;color:var(--gray-400);font-size:12px">'+(p.descripcion||'—')+'</td>'
      +'<td style="padding:12px;display:flex;gap:6px">'
      +'<button data-edit-id="'+p.id+'" onclick="window.abrirModalProyecto(this.dataset.editId)" style="padding:6px 12px;border-radius:6px;border:1px solid var(--gray-200);background:var(--white);font-size:11px;cursor:pointer;color:var(--navy)">Editar</button>'
      +'<button data-del-id="'+p.id+'" data-del-name="'+p.nombre+'" onclick="window.eliminarProyecto(this.dataset.delId,this.dataset.delName)" style="padding:6px 12px;border-radius:6px;border:1px solid rgba(229,57,53,.2);background:rgba(229,57,53,.05);font-size:11px;cursor:pointer;color:var(--red)">Eliminar</button>'
      +'</td></tr>';
  });
  lista.innerHTML='<div class="card"><div class="card-body" style="padding:0;overflow-x:auto"><table class="eq-table"><thead><tr><th>Nombre</th><th>URL Apps Script</th><th>Descripcion</th><th>Acciones</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

window.abrirModalProyecto=function(id){
  document.getElementById('proj-nombre').value='';
  document.getElementById('proj-desc').value='';
  document.getElementById('proj-url').value='';
  document.getElementById('proj-edit-id').value='';
  document.getElementById('proj-modal-title').textContent='Nuevo Proyecto';
  if(id){
    var p=window._proyectos.find(function(x){return x.id===id;});
    if(p){
      document.getElementById('proj-modal-title').textContent='Editar Proyecto';
      document.getElementById('proj-nombre').value=p.nombre||'';
      document.getElementById('proj-desc').value=p.descripcion||'';
      document.getElementById('proj-url').value=p.url||'';
      document.getElementById('proj-edit-id').value=id;
    }
  }
  document.getElementById('proj-modal-overlay').style.display='flex';
};

window.guardarProyecto=async function(){
  var nombre=document.getElementById('proj-nombre').value.trim();
  var url=document.getElementById('proj-url').value.trim();
  var desc=document.getElementById('proj-desc').value.trim();
  var editId=document.getElementById('proj-edit-id').value;
  if(!nombre){showToast('error','El nombre es obligatorio');return;}
  if(!url){showToast('error','La URL es obligatoria');return;}
  try{
    var data={nombre:nombre,url:url,descripcion:desc,actualizado:serverTimestamp()};
    if(editId){
      await setDoc(doc(db,'proyectos',editId),data,{merge:true});
    }else{
      var id=nombre.toLowerCase().replace(/[^a-z0-9]/g,'_');
      data.creado=serverTimestamp();
      await setDoc(doc(db,'proyectos',id),data);
    }
    document.getElementById('proj-modal-overlay').style.display='none';
    await cargarProyectos();
    renderListaProyectos();
    await initProjBars();
    showToast('success','Proyecto guardado');
  }catch(e){showToast('error','Error: '+e.message);}
};

window.eliminarProyecto=async function(id,nombre){
  if(!confirm('Eliminar proyecto "'+nombre+'"?'))return;
  try{
    await deleteDoc(doc(db,'proyectos',id));
    if(window._proyectoActivo&&window._proyectoActivo.id===id)window._proyectoActivo=null;
    await cargarProyectos();
    renderListaProyectos();
    await initProjBars();
    showToast('success','Proyecto eliminado');
  }catch(e){showToast('error','Error: '+e.message);}
};

// Helper: query with project filter
// In-memory cache for Firestore collections (TTL: 3 min)
var _fsCache={},_fsCacheTs={};
function fsCacheKey(col,proy){return (proy||'all')+'|'+col;}
async function getDcsByProy(colName){
  var ckey=fsCacheKey(colName,window._proyectoActivo?.id);
  var now=Date.now();
  if(_fsCache[ckey]&&(now-_fsCacheTs[ckey])<180000){
    return _fsCache[ckey]; // cache hit: < 3 min
  }
  var result;
  if(window._proyectoActivo){
    var pn=window._proyectoActivo.nombre;
    var variants=[pn,pn.toLowerCase(),pn.toUpperCase(),pn.charAt(0).toUpperCase()+pn.slice(1).toLowerCase()];
    for(var v of variants){
      try{
        var snap=await getDocs(query(collection(db,colName),where('proyecto','==',v)));
        if(snap.docs.length>0){result=snap;break;}
      }catch(e){window._handleError&&window._handleError('proxMttoFirestore',e);}
    }
  }
  if(!result)result=await getDocs(collection(db,colName));
  _fsCache[ckey]=result;
  _fsCacheTs[ckey]=now;
  return result;
}
// Clear FS cache on project change
function clearFsCache(){_fsCache={};_fsCacheTs={};}

window.initHojaVidaPage=function(){
  hvSubscribir();hvSetupSearch();hvSetupImport();
  document.getElementById('hv-btn-edit')?.addEventListener('click',hvToggleEdit);
  document.getElementById('hv-btn-save')?.addEventListener('click',hvGuardarEdicion);
  document.getElementById('hv-btn-cancel')?.addEventListener('click',hvCancelarEdicion);
  document.getElementById('hv-btn-pdf')?.addEventListener('click',hvExportarPDF);
  // Carga manual de foto
  const fotoInput=document.getElementById('hv-foto-input');
  if(fotoInput&&!fotoInput.dataset.bound){
    fotoInput.dataset.bound='1';
    fotoInput.addEventListener('change',async(e)=>{
      const file=e.target.files[0];if(!file||!hvEquipoActual)return;
      if(!file.type.startsWith('image/')){showToast('error','Solo se admiten imágenes');return;}
      showToast('info','Subiendo foto...');
      const reader=new FileReader();
      reader.onload=async(ev)=>{
        // Guardar como base64 en Firestore (para fotos pequeñas <500KB)
        if(file.size>600000){showToast('error','Foto muy grande (máx 600KB). Usa una URL externa.');return;}
        const b64=ev.target.result;
        const id=String(hvEquipoActual.placa).replace(/[^\w]/g,'_');
        try{
          const{setDoc,doc,serverTimestamp}=window._firestoreOps||{};
          if(setDoc&&doc){await setDoc(doc(window._db,'hojas_vida',id),{foto:b64,actualizado:serverTimestamp()},{merge:true});}
          hvEquipoActual.foto=b64;
          document.getElementById('hv-photo').innerHTML=`<img src="${b64}" alt="Foto" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
          showToast('success','Foto actualizada');
        }catch(err){showToast('error','Error: '+err.message);}
      };
      reader.readAsDataURL(file);
      e.target.value='';
    });
  }
};
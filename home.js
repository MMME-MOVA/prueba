// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

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
    }catch(e){window._handleError&&window._handleError('inicioKPIsFirestore',e);}
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
        var snap=await getDocs(query(collection(db,c.col),orderBy("fecha","desc"),limit(100)));
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


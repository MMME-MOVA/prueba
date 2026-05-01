// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== TRIBOLOGÍA =====
window._tribInformes=[];
window._tribInformeActivo=null;
window._tribParams={};
window._tribAPIConfig=null;

// Parámetros default — basados en estándares industriales (ISO/SAE)
window._tribParamsDefault={
  // ACEITE MOTOR (ppm = partes por millón, valores normales/precaución/críticos)
  motor_fe:{label:'Hierro (Fe)',unidad:'ppm',normal:50,precaucion:100,grupo:'Motor',ayuda:'Desgaste de bloque, cilindros, árbol levas'},
  motor_cu:{label:'Cobre (Cu)',unidad:'ppm',normal:25,precaucion:50,grupo:'Motor',ayuda:'Cojinetes, válvulas, bujes de biela'},
  motor_pb:{label:'Plomo (Pb)',unidad:'ppm',normal:30,precaucion:60,grupo:'Motor',ayuda:'Capa antifricción de cojinetes'},
  motor_si:{label:'Silicio (Si)',unidad:'ppm',normal:15,precaucion:25,grupo:'Motor',ayuda:'Contaminación por polvo/sello roto'},
  motor_al:{label:'Aluminio (Al)',unidad:'ppm',normal:15,precaucion:30,grupo:'Motor',ayuda:'Pistones, cabeza'},
  motor_cr:{label:'Cromo (Cr)',unidad:'ppm',normal:10,precaucion:20,grupo:'Motor',ayuda:'Camisas, anillos'},
  motor_visc:{label:'Viscosidad 100°C',unidad:'cSt',normal_min:13.5,normal_max:16.3,grupo:'Motor',ayuda:'Espesor del aceite (degradación si baja, contaminación si sube)'},
  motor_agua:{label:'Agua',unidad:'%',normal:0.1,precaucion:0.2,grupo:'Motor',ayuda:'Fugas de refrigerante o condensación'},
  motor_hollin:{label:'Hollín',unidad:'%',normal:1.5,precaucion:3.0,grupo:'Motor',ayuda:'Combustión incompleta, filtro de aire'},
  motor_tbn:{label:'TBN (alcalinidad)',unidad:'mg KOH/g',normal_min:6,normal_max:99,grupo:'Motor',ayuda:'Reserva alcalina; bajo = aceite agotado'},
  // ACEITE HIDRÁULICO
  hidr_iso:{label:'Limpieza ISO 4406',unidad:'codigo',normal_max:'18/16/13',precaucion_max:'20/18/15',grupo:'Hidráulico',ayuda:'Conteo de partículas; >20/18/15 daña componentes'},
  hidr_visc:{label:'Viscosidad 40°C',unidad:'cSt',normal_min:42,normal_max:50,grupo:'Hidráulico',ayuda:'ISO VG 46 estándar'},
  hidr_agua:{label:'Agua',unidad:'ppm',normal:200,precaucion:500,grupo:'Hidráulico',ayuda:'Hidrólisis y oxidación del aceite'},
  hidr_fe:{label:'Hierro (Fe)',unidad:'ppm',normal:20,precaucion:40,grupo:'Hidráulico',ayuda:'Bombas, motores hidráulicos'},
  hidr_si:{label:'Silicio (Si)',unidad:'ppm',normal:10,precaucion:20,grupo:'Hidráulico',ayuda:'Contaminación externa'},
  // TRANSMISIÓN / DIFERENCIAL
  trans_fe:{label:'Hierro (Fe)',unidad:'ppm',normal:200,precaucion:400,grupo:'Transmisión',ayuda:'Engranajes, ejes'},
  trans_cu:{label:'Cobre (Cu)',unidad:'ppm',normal:50,precaucion:100,grupo:'Transmisión',ayuda:'Sincronizadores, bujes'},
  trans_visc:{label:'Viscosidad 100°C',unidad:'cSt',normal_min:13.5,normal_max:18.5,grupo:'Transmisión',ayuda:'Aceite SAE 80W-90 o 85W-140'},
  trans_agua:{label:'Agua',unidad:'%',normal:0.1,precaucion:0.3,grupo:'Transmisión',ayuda:'Sellos defectuosos'},
  // REFRIGERANTE
  ref_ph:{label:'pH',unidad:'',normal_min:7.5,normal_max:10.5,grupo:'Refrigerante',ayuda:'Acidez/alcalinidad — debe ser ligeramente alcalino'},
  ref_glicol:{label:'Glicol',unidad:'%',normal_min:30,normal_max:60,grupo:'Refrigerante',ayuda:'Concentración para anticongelación'},
  ref_nitritos:{label:'Nitritos',unidad:'ppm',normal_min:800,normal_max:2400,grupo:'Refrigerante',ayuda:'Inhibidor de corrosión'},
  ref_dureza:{label:'Dureza',unidad:'ppm CaCO3',normal:170,precaucion:300,grupo:'Refrigerante',ayuda:'Calcio/magnesio del agua usada'}
};

// Cargar parámetros
async function tribCargarParametros(){
  try{
    var snap=await getDocs(collection(db,'tribologia_parametros'));
    if(snap.empty){
      window._tribParams=Object.assign({},window._tribParamsDefault);
    }else{
      window._tribParams={};
      snap.docs.forEach(function(d){window._tribParams[d.id]=d.data();});
      Object.keys(window._tribParamsDefault).forEach(function(k){
        if(!window._tribParams[k])window._tribParams[k]=window._tribParamsDefault[k];
      });
    }
  }catch(e){window._tribParams=Object.assign({},window._tribParamsDefault);}
}

// Cargar API key config
async function tribCargarAPIConfig(){
  try{
    var snap=await getDoc(doc(db,'config','tribologia_api'));
    if(snap.exists())window._tribAPIConfig=snap.data();
  }catch(e){window._tribAPIConfig=null;}
}

// Cargar informes
async function tribCargarInformes(){
  try{
    var q1=query(collection(db,'tribologia_informes'),orderBy('fechaMuestra','desc'));
    if(window._proyectoActivo){
      try{q1=query(collection(db,'tribologia_informes'),where('proyecto','==',window._proyectoActivo.nombre),orderBy('fechaMuestra','desc'));}catch(e){window._handleError&&window._handleError("tribologiaQuery",e);}
    }
    var snap=await getDocs(q1);
    window._tribInformes=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
  }catch(e){
    console.warn('tribCargarInformes:',e);
    var snap=await getDocs(collection(db,'tribologia_informes'));
    window._tribInformes=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
  }
}

// Init page
window.initTribologiaPage=async function(){
  // Render proj bar
  if(typeof renderProjBtns==='function')renderProjBtns('trib-proj-btns');
  await Promise.all([tribCargarParametros(),tribCargarAPIConfig(),tribCargarInformes()]);
  tribRenderLista();
};

function tribRenderLista(){
  var lista=document.getElementById('trib-lista');
  var search=(document.getElementById('trib-search')?.value||'').toLowerCase().trim();
  var infs=window._tribInformes;
  if(search)infs=infs.filter(function(i){return ((i.cema||'')+' '+(i.equipo||'')).toLowerCase().includes(search);});
  if(!infs.length){
    lista.innerHTML='<div style="text-align:center;padding:40px;color:var(--gray-400);font-size:12px">Sin informes</div>';
    return;
  }
  var html='';
  infs.forEach(function(i){
    var statusCls={normal:'tr-status-normal',precaucion:'tr-status-precaucion',critico:'tr-status-critico'}[i.estadoGeneral]||'tr-status-pendiente';
    var f=i.fechaMuestra?(typeof i.fechaMuestra==='string'?i.fechaMuestra:''):'—';
    var active=window._tribInformeActivo&&window._tribInformeActivo.id===i.id?' active':'';
    html+='<div class="tr-list-item'+active+'" data-id="'+i.id+'" onclick="window.tribAbrirInforme(this.dataset.id)">'
      +'<div><span class="tr-status-dot '+statusCls+'"></span><span class="tr-list-cema">'+(i.cema||'—')+'</span></div>'
      +'<div class="tr-list-meta">'+(i.equipo||'')+' · '+f+'</div></div>';
  });
  lista.innerHTML=html;
}

window.tribFiltrarLista=tribRenderLista;

window.tribNuevoInforme=function(){
  window._tribInformeActivo={id:null,nuevo:true,fechaMuestra:new Date().toISOString().substring(0,10)};
  tribRenderDetalle();
};

window.tribAbrirInforme=function(id){
  window._tribInformeActivo=window._tribInformes.find(function(i){return i.id===id;});
  if(!window._tribInformeActivo)return;
  tribRenderLista();
  tribRenderDetalle();
};

function tribRenderDetalle(){
  var d=document.getElementById('trib-detail');
  var inf=window._tribInformeActivo;
  if(!inf){d.innerHTML='';return;}
  // Build form by group
  var grupos={'Motor':[],'Hidráulico':[],'Transmisión':[],'Refrigerante':[]};
  Object.entries(window._tribParams).forEach(function(arr){
    var k=arr[0],p=arr[1];
    if(grupos[p.grupo])grupos[p.grupo].push({id:k,...p});
  });

  var html='<div class="tr-detail-header">'
    +'<div>'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;color:var(--navy);font-size:18px">'+(inf.nuevo?'Nuevo Informe':inf.cema||'—')+'</span>'
    +(inf.estadoGeneral?'<span class="tr-status-dot '+(inf.estadoGeneral==='normal'?'tr-status-normal':inf.estadoGeneral==='precaucion'?'tr-status-precaucion':'tr-status-critico')+'" style="margin-left:4px"></span><span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gray-500)">'+inf.estadoGeneral+'</span>':'')
    +'</div>'
    +'<div style="font-size:12px;color:var(--gray-500)">'+(inf.equipo||'')+(inf.proyecto?' · '+inf.proyecto:'')+'</div>'
    +'</div>'
    +(inf.id?'<button onclick="window.tribEliminarInforme(\''+inf.id+'\')" style="background:rgba(239,68,68,.1);color:var(--red);border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:11px"><i class="bi bi-trash"></i> Eliminar</button>':'')
    +'</div>';

  // Datos básicos
  html+='<div class="tr-section-title">📋 Datos del Informe</div>'
    +'<div class="tr-grid">'
    +'<div class="tr-input-group"><label>CEMA *</label><input id="trib-cema" value="'+(inf.cema||'')+'" placeholder="Ej: 9DD3178"></div>'
    +'<div class="tr-input-group"><label>Equipo</label><input id="trib-equipo" value="'+(inf.equipo||'')+'" placeholder="Excavadora PC200"></div>'
    +'<div class="tr-input-group"><label>Laboratorio</label><input id="trib-lab" value="'+(inf.laboratorio||'')+'" placeholder="Ej: Wearcheck"></div>'
    +'<div class="tr-input-group"><label>Fecha de Muestra *</label><input type="date" id="trib-fecha" value="'+(inf.fechaMuestra||'')+'"></div>'
    +'<div class="tr-input-group"><label>Horómetro / Km</label><input id="trib-horometro" type="number" value="'+(inf.horometro||'')+'"></div>'
    +'<div class="tr-input-group"><label>N° Informe Lab.</label><input id="trib-numinforme" value="'+(inf.numInforme||'')+'"></div>'
    +'</div>';

  // PDF
  html+='<div class="tr-section-title">📎 PDF del Laboratorio (opcional)</div>'
    +(inf.pdfUrl?'<div style="background:var(--gray-50);padding:10px 14px;border-radius:8px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px"><i class="bi bi-file-pdf" class="u-color-red"></i> '+(inf.pdfNombre||'informe.pdf')+'</span><a href="'+inf.pdfUrl+'" target="_blank" style="color:var(--blue);font-size:11px;text-decoration:none">Ver PDF</a></div>':'<div class="tr-pdf-zone" onclick="document.getElementById(\'trib-pdf-input\').click()"><i class="bi bi-cloud-upload" style="font-size:24px;color:var(--gray-400)"></i><div style="font-size:11px;color:var(--gray-500);margin-top:4px">Click para subir PDF (máx 4MB)</div></div><input type="file" id="trib-pdf-input" accept="application/pdf" class="u-hidden" onchange="window.tribSubirPDF(this)">');

  // Each group
  Object.keys(grupos).forEach(function(grupo){
    if(!grupos[grupo].length)return;
    var iconos={'Motor':'⚙️','Hidráulico':'💧','Transmisión':'⚡','Refrigerante':'❄️'};
    html+='<div class="tr-section-title">'+(iconos[grupo]||'')+' '+grupo+'</div>';
    html+='<div class="tr-grid">';
    grupos[grupo].forEach(function(p){
      var val=inf.valores&&inf.valores[p.id]!==undefined?inf.valores[p.id]:'';
      // Determine status class
      var cls='';
      if(val!==''&&val!==null){
        var num=parseFloat(val);
        if(p.normal_min!==undefined||p.normal_max!==undefined){
          // Range param
          if(!isNaN(num)){
            if(p.normal_min!==undefined&&num<p.normal_min)cls='warn';
            else if(p.normal_max!==undefined&&!isNaN(parseFloat(p.normal_max))&&num>parseFloat(p.normal_max))cls='warn';
            else cls='ok';
          }
        }else if(p.normal!==undefined){
          // Threshold param
          if(!isNaN(num)){
            if(num<=p.normal)cls='ok';
            else if(p.precaucion!==undefined&&num<=p.precaucion)cls='warn';
            else cls='bad';
          }
        }
      }
      var hint='';
      if(p.normal_min!==undefined||p.normal_max!==undefined){
        hint=(p.normal_min!==undefined?'≥'+p.normal_min:'')+(p.normal_min!==undefined&&p.normal_max!==undefined?' / ':'')+(p.normal_max!==undefined?'≤'+p.normal_max:'')+' '+p.unidad;
      }else if(p.normal!==undefined){
        hint='Normal: ≤'+p.normal+' '+p.unidad+(p.precaucion?' · Precaución: ≤'+p.precaucion:'');
      }
      html+='<div class="tr-input-group"><label title="'+(p.ayuda||'')+'">'+p.label+'</label><input data-param="'+p.id+'" value="'+val+'" class="'+cls+'" placeholder="'+p.unidad+'" oninput="window.tribValidarVivo(this)"><span class="tr-unit">'+hint+'</span></div>';
    });
    html+='</div>';
  });

  // Verdict (if exists)
  if(inf.veredictoIA){
    var vCls=inf.estadoGeneral==='normal'?'normal':inf.estadoGeneral==='precaucion'?'precaucion':'critico';
    var vIcon=inf.estadoGeneral==='normal'?'✅':inf.estadoGeneral==='precaucion'?'⚠️':'🚨';
    html+='<div class="tr-veredict-card '+vCls+'">'
      +'<div class="tr-veredict-title">'+vIcon+' Veredicto IA · '+inf.estadoGeneral.toUpperCase()+'</div>'
      +'<div class="tr-veredict-text">'+inf.veredictoIA+'</div>'
      +(inf.veredictoFecha?'<div style="font-size:10px;color:var(--gray-400);margin-top:8px">Generado: '+(typeof inf.veredictoFecha==='string'?inf.veredictoFecha:new Date(inf.veredictoFecha?.toMillis?.()||0).toLocaleString('es-CO'))+'</div>':'')
      +'</div>';
  }

  // Action buttons
  html+='<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap">'
    +'<button onclick="window.tribGenerarVeredictoIA()" style="padding:10px 18px;border-radius:8px;border:none;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;font-size:13px;font-weight:600;cursor:pointer"><i class="bi bi-stars"></i> Generar Veredicto IA</button>'
    +'<button onclick="window.tribGuardarInforme()" style="padding:10px 24px;border-radius:8px;border:none;background:var(--navy);color:#fff;font-size:13px;font-weight:600;cursor:pointer"><i class="bi bi-save"></i> Guardar</button>'
    +'</div>';

  // History (other reports for same CEMA)
  if(inf.cema){
    var historial=window._tribInformes.filter(function(i){return i.cema===inf.cema&&i.id!==inf.id;});
    if(historial.length){
      html+='<div class="tr-section-title">📊 Historial de '+inf.cema+'</div>';
      // Stats
      var totalInformes=historial.length+1;
      var normales=historial.filter(function(i){return i.estadoGeneral==='normal';}).length+(inf.estadoGeneral==='normal'?1:0);
      var precauciones=historial.filter(function(i){return i.estadoGeneral==='precaucion';}).length+(inf.estadoGeneral==='precaucion'?1:0);
      var criticos=historial.filter(function(i){return i.estadoGeneral==='critico';}).length+(inf.estadoGeneral==='critico'?1:0);
      html+='<div class="tr-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">'
        +'<div class="tr-summary-stat"><div class="tr-summary-stat-val">'+totalInformes+'</div><div class="tr-summary-stat-lbl">Análisis</div></div>'
        +'<div class="tr-summary-stat"><div class="tr-summary-stat-val" style="color:#22c55e">'+normales+'</div><div class="tr-summary-stat-lbl">Normales</div></div>'
        +'<div class="tr-summary-stat"><div class="tr-summary-stat-val" style="color:#eab308">'+precauciones+'</div><div class="tr-summary-stat-lbl">Precaución</div></div>'
        +'<div class="tr-summary-stat"><div class="tr-summary-stat-val" style="color:#ef4444">'+criticos+'</div><div class="tr-summary-stat-lbl">Críticos</div></div>'
        +'</div>';
      html+='<div style="background:var(--gray-50);border-radius:8px;overflow:hidden">';
      historial.slice(0,8).forEach(function(h){
        var cls=h.estadoGeneral==='normal'?'tr-status-normal':h.estadoGeneral==='precaucion'?'tr-status-precaucion':h.estadoGeneral==='critico'?'tr-status-critico':'tr-status-pendiente';
        html+='<div class="tr-history-row"><span><span class="tr-status-dot '+cls+'"></span><strong>'+(h.fechaMuestra||'—')+'</strong></span><span>'+(h.horometro||'—')+' h</span><span style="color:var(--gray-500)">'+(h.veredictoIA||'').substring(0,80)+(h.veredictoIA&&h.veredictoIA.length>80?'...':'')+'</span><button data-id="'+h.id+'" onclick="window.tribAbrirInforme(this.dataset.id)" style="background:transparent;border:1px solid var(--gray-200);padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px">Ver</button></div>';
      });
      html+='</div>';
    }
  }

  d.innerHTML=html;
}

// Live validation as user types
window.tribValidarVivo=function(input){
  var pid=input.dataset.param;
  var p=window._tribParams[pid];if(!p)return;
  var val=parseFloat(input.value);
  input.classList.remove('ok','warn','bad');
  if(isNaN(val)||input.value==='')return;
  if(p.normal_min!==undefined||p.normal_max!==undefined){
    if(p.normal_min!==undefined&&val<p.normal_min)input.classList.add('warn');
    else if(p.normal_max!==undefined&&!isNaN(parseFloat(p.normal_max))&&val>parseFloat(p.normal_max))input.classList.add('warn');
    else input.classList.add('ok');
  }else if(p.normal!==undefined){
    if(val<=p.normal)input.classList.add('ok');
    else if(p.precaucion!==undefined&&val<=p.precaucion)input.classList.add('warn');
    else input.classList.add('bad');
  }
};

// Subir PDF
window.tribSubirPDF=function(input){
  var f=input.files[0];if(!f)return;
  if(f.size>4*1024*1024){showToast('error','PDF supera 4MB');return;}
  var reader=new FileReader();
  reader.onload=function(e){
    if(!window._tribInformeActivo)window._tribInformeActivo={};
    window._tribInformeActivo.pdfUrl=e.target.result;
    window._tribInformeActivo.pdfNombre=f.name;
    tribRenderDetalle();
    showToast('success','PDF cargado (recuerda Guardar)');
  };
  reader.readAsDataURL(f);
};

// Recoger valores del formulario y calcular estado general
function tribRecogerValores(){
  var valores={};
  var statuses=[];
  document.querySelectorAll('#trib-detail input[data-param]').forEach(function(inp){
    var pid=inp.dataset.param;
    var v=inp.value.trim();
    if(v!=='')valores[pid]=isNaN(parseFloat(v))?v:parseFloat(v);
    if(inp.classList.contains('bad'))statuses.push('critico');
    else if(inp.classList.contains('warn'))statuses.push('precaucion');
    else if(inp.classList.contains('ok'))statuses.push('normal');
  });
  var estadoGeneral=null;
  if(statuses.includes('critico'))estadoGeneral='critico';
  else if(statuses.includes('precaucion'))estadoGeneral='precaucion';
  else if(statuses.includes('normal'))estadoGeneral='normal';
  return{valores:valores,estadoGeneral:estadoGeneral};
}

// Guardar informe
window.tribGuardarInforme=async function(){
  var cema=document.getElementById('trib-cema').value.trim().toUpperCase();
  var fecha=document.getElementById('trib-fecha').value;
  if(!cema){showToast('error','El CEMA es obligatorio');return;}
  if(!fecha){showToast('error','La fecha de muestra es obligatoria');return;}

  var rec=tribRecogerValores();
  var data={
    cema:cema,
    equipo:document.getElementById('trib-equipo').value.trim(),
    laboratorio:document.getElementById('trib-lab').value.trim(),
    fechaMuestra:fecha,
    horometro:parseFloat(document.getElementById('trib-horometro').value)||null,
    numInforme:document.getElementById('trib-numinforme').value.trim(),
    valores:rec.valores,
    estadoGeneral:rec.estadoGeneral,
    proyecto:window._proyectoActivo?window._proyectoActivo.nombre:'',
    actualizado:serverTimestamp(),
    actualizadoPor:window.nombreOperador||'-'
  };
  // Preserve PDF and IA fields
  if(window._tribInformeActivo){
    if(window._tribInformeActivo.pdfUrl){data.pdfUrl=window._tribInformeActivo.pdfUrl;data.pdfNombre=window._tribInformeActivo.pdfNombre;}
    if(window._tribInformeActivo.veredictoIA){data.veredictoIA=window._tribInformeActivo.veredictoIA;data.veredictoFecha=window._tribInformeActivo.veredictoFecha;}
  }
  try{
    var id;
    if(window._tribInformeActivo&&window._tribInformeActivo.id){
      id=window._tribInformeActivo.id;
      await setDoc(doc(db,'tribologia_informes',id),data,{merge:true});
    }else{
      data.creado=serverTimestamp();
      var refDoc=await addDoc(collection(db,'tribologia_informes'),data);
      id=refDoc.id;
    }
    showToast('success','Informe guardado');
    await tribCargarInformes();
    window._tribInformeActivo=window._tribInformes.find(function(i){return i.id===id;});
    tribRenderLista();tribRenderDetalle();
  }catch(e){showToast('error','Error: '+e.message);}
};

window.tribEliminarInforme=async function(id){
  if(!confirm('¿Eliminar este informe?'))return;
  try{
    await deleteDoc(doc(db,'tribologia_informes',id));
    window._tribInformeActivo=null;
    await tribCargarInformes();
    tribRenderLista();
    document.getElementById('trib-detail').innerHTML='<div class="eq-empty" style="text-align:center;padding:80px 20px;color:var(--gray-400)"><i class="bi bi-flask" style="font-size:64px;display:block;margin-bottom:16px;opacity:.4"></i><p style="font-size:14px">Informe eliminado</p></div>';
    showToast('success','Eliminado');
  }catch(e){showToast('error','Error: '+e.message);}
};

// ── IA: Generar veredicto ──
window.tribGenerarVeredictoIA=async function(){
  if(!window._tribAPIConfig||!window._tribAPIConfig.apiKey){
    showToast('error','Configura primero la API key de Anthropic');
    window.tribAbrirAPIKey();
    return;
  }
  var rec=tribRecogerValores();
  if(Object.keys(rec.valores).length===0){
    showToast('error','Ingresa al menos un valor');return;
  }
  var cema=document.getElementById('trib-cema').value.trim()||'(sin CEMA)';
  var equipo=document.getElementById('trib-equipo').value.trim()||'(sin equipo)';
  var horometro=document.getElementById('trib-horometro').value||'-';

  // Build prompt with all values + parameters
  var paramsTxt='PARÁMETROS DE REFERENCIA:\\n';
  Object.entries(rec.valores).forEach(function(arr){
    var k=arr[0],v=arr[1];
    var p=window._tribParams[k];
    if(!p)return;
    var ref='';
    if(p.normal_min!==undefined||p.normal_max!==undefined){
      ref='Rango normal: '+(p.normal_min!==undefined?p.normal_min:'')+(p.normal_min!==undefined&&p.normal_max!==undefined?' a ':'')+(p.normal_max!==undefined?p.normal_max:'')+' '+p.unidad;
    }else if(p.normal!==undefined){
      ref='Normal: ≤'+p.normal+', Precaución: ≤'+(p.precaucion||p.normal*2)+' '+p.unidad;
    }
    paramsTxt+='- '+p.grupo+' · '+p.label+': '+v+' '+p.unidad+' ('+ref+(p.ayuda?' — '+p.ayuda:'')+')\\n';
  });

  var prompt='Eres un experto en tribología y mantenimiento predictivo de maquinaria pesada. Analiza los siguientes resultados de un análisis de aceites para el equipo:\\n\\nEQUIPO: '+equipo+' (CEMA: '+cema+')\\nHORÓMETRO/KM: '+horometro+'\\n\\n'+paramsTxt+'\\nPor favor entrega un VEREDICTO TÉCNICO en español que incluya:\\n1. Diagnóstico general (Normal/Precaución/Crítico)\\n2. Componentes posiblemente comprometidos según los valores fuera de rango\\n3. Causas probables de los desvíos\\n4. Recomendaciones específicas y acciones inmediatas (mantenimiento, cambio de aceite, inspecciones, etc.)\\n5. Plazo sugerido para la próxima muestra\\n\\nResponde de manera concisa, directa y técnica. Máximo 250 palabras.';

  var btn=document.querySelector('#trib-detail button[onclick*="tribGenerarVeredictoIA"]');
  if(btn){btn.disabled=true;btn.innerHTML='<span style="display:inline-block;width:14px;height:14px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span> Analizando...';}

  try{
    var resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':window._tribAPIConfig.apiKey,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body:JSON.stringify({
        model:window._tribAPIConfig.model||'claude-opus-4-7',
        max_tokens:800,
        messages:[{role:'user',content:prompt}]
      })
    });
    if(!resp.ok){
      var err=await resp.text();
      throw new Error('API error '+resp.status+': '+err.substring(0,200));
    }
    var json=await resp.json();
    var texto=(json.content||[]).map(function(c){return c.text||'';}).join('\\n').trim();
    if(!texto)throw new Error('Respuesta vacía de la IA');
    if(!window._tribInformeActivo)window._tribInformeActivo={};
    window._tribInformeActivo.veredictoIA=texto;
    window._tribInformeActivo.veredictoFecha=new Date().toLocaleString('es-CO');
    window._tribInformeActivo.estadoGeneral=rec.estadoGeneral||'normal';
    showToast('success','Veredicto generado. Recuerda Guardar.');
    tribRenderDetalle();
  }catch(e){
    console.error('tribGenerarVeredictoIA:',e);
    showToast('error','Error IA: '+e.message);
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML='<i class="bi bi-stars"></i> Generar Veredicto IA';}
  }
};

// ── Modal Parámetros ──
window.tribAbrirParametros=function(){
  var c=document.getElementById('trib-params-list');
  var grupos={'Motor':[],'Hidráulico':[],'Transmisión':[],'Refrigerante':[]};
  Object.entries(window._tribParams).forEach(function(arr){
    var k=arr[0],p=arr[1];
    if(grupos[p.grupo])grupos[p.grupo].push({id:k,...p});
  });
  var html='';
  Object.keys(grupos).forEach(function(grupo){
    if(!grupos[grupo].length)return;
    html+='<div style="margin-bottom:18px"><h4 style="font-family:\'Space Grotesk\',sans-serif;color:var(--navy);font-size:13px;text-transform:uppercase;margin-bottom:10px">'+grupo+'</h4>';
    html+='<div style="display:grid;grid-template-columns:1fr 80px 80px 60px;gap:8px;font-size:10px;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:6px;padding:0 8px"><div>Parámetro</div><div>Normal</div><div>Precaución</div><div>Unidad</div></div>';
    grupos[grupo].forEach(function(p){
      var col2='',col3='';
      if(p.normal_min!==undefined||p.normal_max!==undefined){
        col2='<input class="cp-tariff-input" data-param="'+p.id+'" data-field="normal_min" value="'+(p.normal_min||'')+'" placeholder="min" type="number" step="any">';
        col3='<input class="cp-tariff-input" data-param="'+p.id+'" data-field="normal_max" value="'+(p.normal_max||'')+'" placeholder="max">';
      }else{
        col2='<input class="cp-tariff-input" data-param="'+p.id+'" data-field="normal" value="'+(p.normal||'')+'" type="number" step="any">';
        col3='<input class="cp-tariff-input" data-param="'+p.id+'" data-field="precaucion" value="'+(p.precaucion||'')+'" type="number" step="any">';
      }
      html+='<div style="display:grid;grid-template-columns:1fr 80px 80px 60px;gap:8px;align-items:center;padding:6px 8px;border-bottom:1px solid var(--gray-100)"><div style="font-size:12px;color:var(--gray-600)">'+p.label+'</div>'+col2+col3+'<div style="font-size:11px;color:var(--gray-400)">'+p.unidad+'</div></div>';
    });
    html+='</div>';
  });
  c.innerHTML=html;
  document.getElementById('trib-params-overlay').style.display='flex';
};

window.tribGuardarParametros=async function(){
  try{
    var inputs=document.querySelectorAll('#trib-params-list input[data-param]');
    var batch=[];
    var paramsByKey={};
    inputs.forEach(function(inp){
      var pid=inp.dataset.param;
      var fld=inp.dataset.field;
      if(!paramsByKey[pid])paramsByKey[pid]=Object.assign({},window._tribParams[pid]);
      var v=inp.value.trim();
      if(v==='')delete paramsByKey[pid][fld];
      else paramsByKey[pid][fld]=isNaN(parseFloat(v))?v:parseFloat(v);
    });
    Object.entries(paramsByKey).forEach(function(arr){
      var pid=arr[0],p=arr[1];
      window._tribParams[pid]=p;
      batch.push(setDoc(doc(db,'tribologia_parametros',pid),p));
    });
    await Promise.all(batch);
    document.getElementById('trib-params-overlay').style.display='none';
    showToast('success','Parámetros guardados');
    if(window._tribInformeActivo)tribRenderDetalle();
  }catch(e){showToast('error','Error: '+e.message);}
};

// ── Modal API Key ──
window.tribAbrirAPIKey=function(){
  if(window._tribAPIConfig){
    document.getElementById('trib-apikey-input').value=window._tribAPIConfig.apiKey||'';
    document.getElementById('trib-apikey-model').value=window._tribAPIConfig.model||'claude-opus-4-7';
  }
  document.getElementById('trib-apikey-overlay').style.display='flex';
};

window.tribGuardarAPIKey=async function(){
  var apiKey=document.getElementById('trib-apikey-input').value.trim();
  var model=document.getElementById('trib-apikey-model').value;
  if(!apiKey){showToast('error','Ingresa la API key');return;}
  try{
    await setDoc(doc(db,'config','tribologia_api'),{apiKey:apiKey,model:model,actualizado:serverTimestamp()});
    window._tribAPIConfig={apiKey:apiKey,model:model};
    document.getElementById('trib-apikey-overlay').style.display='none';
    showToast('success','API Key guardada');
  }catch(e){showToast('error','Error: '+e.message);}
};

// ===== TRIBOLOGÍA EN HOJA DE VIDA =====
// Función helper para mostrar resumen tribológico de un equipo
window.tribResumenEquipo=async function(cema){
  if(!cema)return null;
  try{
    var snap=await getDocs(query(collection(db,'tribologia_informes'),where('cema','==',cema.toUpperCase())));
    var infs=snap.docs.map(function(d){return d.data();});
    if(!infs.length)return null;
    infs.sort(function(a,b){return (b.fechaMuestra||'').localeCompare(a.fechaMuestra||'');});
    var total=infs.length;
    var normales=infs.filter(function(i){return i.estadoGeneral==='normal';}).length;
    var precauciones=infs.filter(function(i){return i.estadoGeneral==='precaucion';}).length;
    var criticos=infs.filter(function(i){return i.estadoGeneral==='critico';}).length;
    var ultimo=infs[0];
    return{total:total,normales:normales,precauciones:precauciones,criticos:criticos,ultimo:ultimo};
  }catch(e){return null;}
};


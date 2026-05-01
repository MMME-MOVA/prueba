// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== CUENTAS POR PAGAR =====
// Catálogo de tarifas por categoría (basado en el documento Scatec)
window._cpTarifasDefault={
  '2BS':{nombre:'Buses livianos',linea:'L. BLANCA',tarifa:700000,unidad:'DÍA'},
  '2DC':{nombre:'Camionetas doble cabina',linea:'L. BLANCA',tarifa:300000,unidad:'DÍA'},
  '3SD':{nombre:'Carrotanque combustible',linea:'L. BLANCA',tarifa:950000,unidad:'DÍA'},
  '4CM':{nombre:'Compactador monorodillo',linea:'EQUIPO MENOR',tarifa:450000,unidad:'DÍA'},
  '4CS':{nombre:'Canguro saltarín (Rana)',linea:'EQUIPO MENOR',tarifa:60000,unidad:'DÍA'},
  '4ES':{nombre:'Equipo de soldadura',linea:'EQUIPO MENOR',tarifa:70000,unidad:'DÍA'},
  '4GE1':{nombre:'Generador de energía (planta)',linea:'EQUIPO MENOR',tarifa:430000,unidad:'DÍA'},
  '4GE2':{nombre:'Generador de energía',linea:'EQUIPO MENOR',tarifa:420000,unidad:'DÍA'},
  '4MC':{nombre:'Mezcladora de concreto',linea:'EQUIPO MENOR',tarifa:600000,unidad:'DÍA'},
  '6FC':{nombre:'Hormigonera',linea:'L. AMARILLA',tarifa:170000,unidad:'HORA'},
  '7CF':{nombre:'Mini cargador',linea:'L. AMARILLA',tarifa:85000,unidad:'HORA'},
  '7EO1':{nombre:'Excavadora PC200',linea:'L. AMARILLA',tarifa:169000,unidad:'HORA'},
  '7EO2':{nombre:'Excavadora PC 300',linea:'L. AMARILLA',tarifa:215000,unidad:'HORA'},
  '7TO':{nombre:'Bulldozer',linea:'L. AMARILLA',tarifa:150000,unidad:'HORA'},
  '8CC':{nombre:'Compactador cilíndrico',linea:'L. AMARILLA',tarifa:159000,unidad:'HORA'},
  '8MN':{nombre:'Motoniveladora',linea:'L. AMARILLA',tarifa:169030,unidad:'HORA'},
  '9DD':{nombre:'Volquetas doble troque',linea:'L. BLANCA',tarifa:1400000,unidad:'DÍA'},
  '9TC':{nombre:'Tractocamión',linea:'L. BLANCA',tarifa:800000,unidad:'DÍA'},
  '9TG1':{nombre:'Camión grúa 13T',linea:'L. BLANCA',tarifa:750000,unidad:'DÍA'},
  '9TG2':{nombre:'Camión grúa 20T',linea:'L. BLANCA',tarifa:883330,unidad:'DÍA'},
  '9TS':{nombre:'Turbos',linea:'L. BLANCA',tarifa:333330,unidad:'DÍA'},
  '9TT':{nombre:'Carrotanque de agua',linea:'L. BLANCA',tarifa:860000,unidad:'DÍA'}
};
window._cpTarifas={};
window._cpRegistros=[];

function cpFmt(n){
  if(!n||n===0)return'$0';
  if(n>=1000000)return'$'+(n/1000000).toFixed(1)+'M';
  if(n>=1000)return'$'+Math.round(n/1000)+'k';
  return'$'+Math.round(n).toLocaleString('es-CO');
}
function cpFmtFull(n){
  return'$'+Math.round(n||0).toLocaleString('es-CO');
}
function cpLineaCls(linea){
  if(linea==='L. BLANCA')return'cp-line-blanca';
  if(linea==='L. AMARILLA')return'cp-line-amarilla';
  return'cp-line-menor';
}

// Cargar tarifas desde Firestore (con fallback a default)
async function cpCargarTarifas(){
  try{
    var snap=await getDocs(collection(db,'cuentas_tarifas'));
    if(snap.empty){
      // Inicializar con defaults
      window._cpTarifas=Object.assign({},window._cpTarifasDefault);
    }else{
      window._cpTarifas={};
      snap.docs.forEach(function(d){
        window._cpTarifas[d.id]=d.data();
      });
      // Agregar las que falten desde default
      Object.keys(window._cpTarifasDefault).forEach(function(k){
        if(!window._cpTarifas[k])window._cpTarifas[k]=window._cpTarifasDefault[k];
      });
    }
  }catch(e){window._cpTarifas=Object.assign({},window._cpTarifasDefault);}
}

// Cargar registros del proyecto activo
async function cpCargarRegistros(){
  var anio=document.getElementById('cp-anio')?.value||'2026';
  try{
    var q1=query(collection(db,'cuentas_costos'),where('anio','==',anio));
    if(window._proyectoActivo){
      q1=query(collection(db,'cuentas_costos'),where('anio','==',anio),where('proyecto','==',window._proyectoActivo.nombre));
    }
    var snap=await getDocs(q1);
    window._cpRegistros=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
  }catch(e){window._cpRegistros=[];console.warn('cpCargarRegistros',e);}
}

window.initCuentasPage=async function(){
  // Render proj bar
  if(typeof renderProjBtns==='function')renderProjBtns('cuentas-proj-btns');
  await cpCargarTarifas();
  await cpCargarRegistros();
  cpRenderTodo();
};

window.cpRecargar=async function(){
  await cpCargarRegistros();
  cpRenderTodo();
};

function cpRenderTodo(){
  var mes=parseInt(document.getElementById('cp-mes')?.value??'-1');
  // Filter registros by mes
  var regs=window._cpRegistros;
  if(mes>=0){
    var MESES=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    regs=regs.filter(function(r){return (r.mes||'').toUpperCase()===MESES[mes];});
  }

  // Acumular por línea, mes, categoría
  var totalCosto=0,totalUnidades=0;
  var porLinea={'L. BLANCA':{costo:0,unidades:0},'L. AMARILLA':{costo:0,unidades:0},'EQUIPO MENOR':{costo:0,unidades:0}};
  var porMes={};
  var porCategoria={};
  var categoriasUsadas=new Set();

  regs.forEach(function(r){
    (r.detalles||[]).forEach(function(d){
      var costo=parseFloat(d.costoTotal)||0;
      var unidades=parseInt(d.unidades)||0;
      totalCosto+=costo;
      totalUnidades+=unidades;
      var linea=d.linea||'EQUIPO MENOR';
      if(porLinea[linea]){porLinea[linea].costo+=costo;porLinea[linea].unidades+=unidades;}
      var mesKey=r.mes||'';
      if(!porMes[mesKey])porMes[mesKey]={blanca:0,amarilla:0,menor:0,total:0,unidades:0};
      if(linea==='L. BLANCA')porMes[mesKey].blanca+=costo;
      else if(linea==='L. AMARILLA')porMes[mesKey].amarilla+=costo;
      else porMes[mesKey].menor+=costo;
      porMes[mesKey].total+=costo;
      porMes[mesKey].unidades+=unidades;
      var cat=d.categoria;
      if(!porCategoria[cat])porCategoria[cat]={costo:0,unidades:0,linea:linea,nombre:d.tipoEquipo||cat};
      porCategoria[cat].costo+=costo;
      porCategoria[cat].unidades+=unidades;
      if(unidades>0)categoriasUsadas.add(cat);
    });
  });

  // KPIs superiores
  var totalCats=Object.keys(window._cpTarifas).length;
  var promedio=totalUnidades>0?totalCosto/totalUnidades:0;
  var summary=document.getElementById('cp-summary');
  summary.children[0].innerHTML='<div class="cp-card-label">Costo Total</div><div class="cp-card-value">'+cpFmt(totalCosto)+'</div><div class="cp-card-sub">'+cpFmtFull(totalCosto)+'</div>';
  summary.children[1].innerHTML='<div class="cp-card-label">Total Equipos</div><div class="cp-card-value">'+totalUnidades+'</div><div class="cp-card-sub">Unidades trabajadas</div>';
  summary.children[2].innerHTML='<div class="cp-card-label">Categorías Activas</div><div class="cp-card-value">'+categoriasUsadas.size+' / '+totalCats+'</div><div class="cp-card-sub">Trabajando</div>';
  summary.children[3].innerHTML='<div class="cp-card-label">Costo Promedio</div><div class="cp-card-value">'+cpFmt(promedio)+'</div><div class="cp-card-sub">por unidad</div>';

  // Tabla por línea
  var tbLineas=document.querySelector('#cp-tabla-lineas tbody');
  var lineasArr=[
    ['L. BLANCA',porLinea['L. BLANCA']],
    ['L. AMARILLA',porLinea['L. AMARILLA']],
    ['EQUIPO MENOR',porLinea['EQUIPO MENOR']]
  ];
  tbLineas.innerHTML='';
  lineasArr.forEach(function(arr){
    var l=arr[0],d=arr[1];
    var pct=totalCosto>0?(d.costo/totalCosto*100).toFixed(1):'0.0';
    tbLineas.innerHTML+='<tr><td><span class="cp-line-tag '+cpLineaCls(l)+'">'+l+'</span></td><td class="cp-money'+(d.costo===0?' zero':'')+'">'+cpFmtFull(d.costo)+'</td><td>'+pct+'%</td><td>'+d.unidades+'</td></tr>';
  });
  tbLineas.innerHTML+='<tr class="cp-total"><td>TOTAL</td><td class="cp-money'+(totalCosto===0?' zero':'')+'">'+cpFmtFull(totalCosto)+'</td><td>100%</td><td>'+totalUnidades+'</td></tr>';

  // Tabla por mes
  var tbMes=document.querySelector('#cp-tabla-mes tbody');
  var MESES2=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  tbMes.innerHTML='';
  MESES2.forEach(function(m){
    var d=porMes[m]||{blanca:0,amarilla:0,menor:0,total:0,unidades:0};
    if(d.total===0&&mes>=0)return;
    tbMes.innerHTML+='<tr><td style="font-weight:600">'+m.charAt(0)+m.slice(1).toLowerCase()+'</td><td class="cp-money'+(d.blanca===0?' zero':'')+'">'+cpFmtFull(d.blanca)+'</td><td class="cp-money'+(d.amarilla===0?' zero':'')+'">'+cpFmtFull(d.amarilla)+'</td><td class="cp-money'+(d.menor===0?' zero':'')+'">'+cpFmtFull(d.menor)+'</td><td class="cp-money'+(d.total===0?' zero':'')+'">'+cpFmtFull(d.total)+'</td><td>'+d.unidades+'</td></tr>';
  });
  tbMes.innerHTML+='<tr class="cp-total"><td>TOTAL</td><td>'+cpFmtFull(porLinea['L. BLANCA'].costo)+'</td><td>'+cpFmtFull(porLinea['L. AMARILLA'].costo)+'</td><td>'+cpFmtFull(porLinea['EQUIPO MENOR'].costo)+'</td><td>'+cpFmtFull(totalCosto)+'</td><td>'+totalUnidades+'</td></tr>';

  // Tabla por categoría
  var tbCat=document.querySelector('#cp-tabla-cat tbody');
  tbCat.innerHTML='';
  var catsOrdenadas=Object.keys(window._cpTarifas).sort();
  catsOrdenadas.forEach(function(cat){
    var t=window._cpTarifas[cat];
    var d=porCategoria[cat]||{costo:0,unidades:0};
    var pct=totalCosto>0?(d.costo/totalCosto*100).toFixed(2):'0.00';
    tbCat.innerHTML+='<tr><td><strong>'+cat+'</strong></td><td>'+t.nombre+'</td><td><span class="cp-line-tag '+cpLineaCls(t.linea)+'">'+t.linea+'</span></td><td>'+d.unidades+'</td><td class="cp-money'+(d.costo===0?' zero':'')+'">'+cpFmtFull(d.costo)+'</td><td>'+pct+'%</td></tr>';
  });

  // Lista de períodos
  var lista=document.getElementById('cp-periodos-lista');
  if(!regs.length){
    lista.innerHTML='<div class="eq-empty" style="text-align:center;padding:40px;color:var(--gray-400)"><i class="bi bi-calendar2-x" style="font-size:36px;display:block;margin-bottom:10px;opacity:.4"></i><p>Sin períodos calculados. Usa "Calcular Período" para empezar.</p></div>';
  }else{
    var html='';
    regs.sort(function(a,b){return (b.fecha?.toMillis?.()||0)-(a.fecha?.toMillis?.()||0);}).forEach(function(r){
      var totRow=(r.detalles||[]).reduce(function(s,d){return s+(parseFloat(d.costoTotal)||0);},0);
      var unidsRow=(r.detalles||[]).reduce(function(s,d){return s+(parseInt(d.unidades)||0);},0);
      html+='<div style="background:var(--white);border:1px solid var(--gray-200);border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">'
        +'<div><strong style="color:var(--navy)">'+r.mes+' · '+r.periodo+'</strong>'
        +'<span style="color:var(--gray-400);font-size:11px;margin-left:8px">'+(r.proyecto||'—')+' · '+unidsRow+' equipos · '+(r.detalles||[]).length+' categorías</span></div>'
        +'<div style="display:flex;gap:8px;align-items:center"><span class="cp-money'+(totRow===0?' zero':'')+'">'+cpFmtFull(totRow)+'</span>'
        +'<button data-id="'+r.id+'" onclick="window.cpEliminarRegistro(this.dataset.id)" style="background:rgba(229,57,53,.1);color:var(--red);border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px"><i class="bi bi-trash"></i></button>'
        +'</div></div>';
    });
    lista.innerHTML=html;
  }
  // Render charts
  cpRenderCharts(porMes,porCategoria);
}


window._cpCharts={};
function cpRenderCharts(porMes,porCategoria){
  if(typeof Chart==='undefined'){console.warn('Chart.js no cargado');return;}
  var MESES=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  var MESES_LBL=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var costos=MESES.map(function(m){return (porMes[m]||{total:0}).total;});
  var unidades=MESES.map(function(m){return (porMes[m]||{unidades:0}).unidades;});

  // Tendencia: costo (barra) + unidades (línea)
  var ctx1=document.getElementById('cp-chart-tendencia');
  if(ctx1){
    if(window._cpCharts.tendencia)window._cpCharts.tendencia.destroy();
    window._cpCharts.tendencia=new Chart(ctx1,{
      type:'bar',
      data:{
        labels:MESES_LBL,
        datasets:[
          {type:'bar',label:'Costo (COP)',data:costos,backgroundColor:'rgba(46,117,182,.65)',borderColor:'#1565C0',borderWidth:1,yAxisID:'y',borderRadius:6,order:2},
          {type:'line',label:'Unidades',data:unidades,borderColor:'#E65100',backgroundColor:'rgba(230,81,0,.1)',borderWidth:3,yAxisID:'y1',tension:0.3,fill:true,pointRadius:5,pointBackgroundColor:'#E65100',pointBorderColor:'#fff',pointBorderWidth:2,order:1}
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{
          legend:{position:'top',labels:{font:{size:12,weight:600}}},
          tooltip:{callbacks:{
            label:function(ctx){
              if(ctx.dataset.label==='Costo (COP)'){
                var v=ctx.parsed.y;
                return'Costo: $'+(v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?Math.round(v/1000)+'k':v.toLocaleString('es-CO'));
              }
              return'Unidades: '+ctx.parsed.y;
            }
          }}
        },
        scales:{
          y:{type:'linear',position:'left',title:{display:true,text:'Costo (COP)',font:{size:11,weight:700}},ticks:{callback:function(v){return v>=1000000?'$'+(v/1000000).toFixed(0)+'M':v>=1000?'$'+Math.round(v/1000)+'k':'$'+v;}},grid:{color:'rgba(0,0,0,.04)'}},
          y1:{type:'linear',position:'right',title:{display:true,text:'Unidades',font:{size:11,weight:700}},grid:{drawOnChartArea:false},ticks:{precision:0}}
        }
      }
    });
  }

  // Categoría: barras horizontales
  var ctx2=document.getElementById('cp-chart-categoria');
  if(ctx2){
    if(window._cpCharts.categoria)window._cpCharts.categoria.destroy();
    var cats=Object.keys(porCategoria).sort(function(a,b){return (porCategoria[b].costo||0)-(porCategoria[a].costo||0);});
    var labels=cats.map(function(c){return c+' · '+(porCategoria[c].nombre||c).substring(0,18);});
    var data=cats.map(function(c){return porCategoria[c].costo||0;});
    var colorByLinea={'L. BLANCA':'#1565C0','L. AMARILLA':'#E65100','EQUIPO MENOR':'#6D28D9'};
    var bgColors=cats.map(function(c){return colorByLinea[(porCategoria[c]||{}).linea]||'#94a3b8';});
    window._cpCharts.categoria=new Chart(ctx2,{
      type:'bar',
      data:{
        labels:labels,
        datasets:[{label:'Costo Total',data:data,backgroundColor:bgColors,borderRadius:6}]
      },
      options:{
        indexAxis:'y',
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{callbacks:{label:function(ctx){var v=ctx.parsed.x;return'Costo: $'+(v>=1000000?(v/1000000).toFixed(2)+'M':v>=1000?Math.round(v/1000)+'k':v.toLocaleString('es-CO'));}}}
        },
        scales:{
          x:{ticks:{callback:function(v){return v>=1000000?'$'+(v/1000000).toFixed(0)+'M':v>=1000?'$'+Math.round(v/1000)+'k':'$'+v;}},grid:{color:'rgba(0,0,0,.04)'}},
          y:{grid:{display:false},ticks:{font:{size:11,weight:600}}}
        }
      }
    });
  }
}

window.cpEliminarRegistro=async function(id){
  if(!confirm('¿Eliminar este período registrado?'))return;
  try{
    await deleteDoc(doc(db,'cuentas_costos',id));
    showToast('success','Período eliminado');
    await cpCargarRegistros();cpRenderTodo();
  }catch(e){showToast('error','Error: '+e.message);}
};

// ── Modal Tarifas ──
window.cpAbrirTarifas=function(){
  var c=document.getElementById('cp-tarifas-list');
  c.innerHTML='<div style="display:grid;grid-template-columns:60px 1fr 130px 80px;gap:10px;font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;padding:0 12px 8px"><div>Cat.</div><div>Tipo de Equipo</div><div>Tarifa Base (COP)</div><div>Unidad</div></div>';
  Object.keys(window._cpTarifas).sort().forEach(function(cat){
    var t=window._cpTarifas[cat];
    c.innerHTML+='<div class="cp-tariff-row" style="grid-template-columns:60px 1fr 130px 80px"><div><strong>'+cat+'</strong></div><div style="font-size:12px;color:var(--gray-600)">'+t.nombre+'</div><div><input class="cp-tariff-input" type="number" value="'+t.tarifa+'" data-cat="'+cat+'"></div><div style="font-size:11px;color:var(--gray-400)">'+t.unidad+'</div></div>';
  });
  document.getElementById('cp-tarifas-overlay').style.display='flex';
};

window.cpGuardarTarifas=async function(){
  try{
    var inputs=document.querySelectorAll('#cp-tarifas-list input[data-cat]');
    var batch=[];
    inputs.forEach(function(inp){
      var cat=inp.dataset.cat;
      var nueva=parseFloat(inp.value)||0;
      if(window._cpTarifas[cat]){
        window._cpTarifas[cat].tarifa=nueva;
        batch.push(setDoc(doc(db,'cuentas_tarifas',cat),window._cpTarifas[cat]));
      }
    });
    await Promise.all(batch);
    document.getElementById('cp-tarifas-overlay').style.display='none';
    showToast('success','Tarifas guardadas');
    cpRenderTodo();
  }catch(e){showToast('error','Error: '+e.message);}
};

// ── Modal Calcular Período ──
window.cpRegistrarPeriodo=function(){
  document.getElementById('cp-period-anio').value=document.getElementById('cp-anio').value;
  var mesAct=parseInt(document.getElementById('cp-mes').value);
  if(mesAct<0)mesAct=new Date().getMonth();
  document.getElementById('cp-period-mes').value=mesAct;
  // Default quincena: si día actual <= 15, primera quincena
  var hoy=new Date().getDate();
  document.querySelector('input[name="cp-quincena"][value="'+(hoy<=15?'1al15':'16alfin')+'"]').checked=true;
  document.getElementById('cp-periodo-overlay').style.display='flex';
};

// Cálculo automático: cuenta días/horas trabajadas a partir de preoperacionales del período
window.cpEjecutarCalculo=async function(){
  var anio=document.getElementById('cp-period-anio').value;
  var mesIdx=parseInt(document.getElementById('cp-period-mes').value);
  var quincena=document.querySelector('input[name="cp-quincena"]:checked').value;
  var MESES=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  var mesNombre=MESES[mesIdx];

  var diaInicio=quincena==='1al15'?1:16;
  var diaFin=quincena==='1al15'?15:new Date(parseInt(anio),mesIdx+1,0).getDate();
  var fechaIni=new Date(parseInt(anio),mesIdx,diaInicio);
  var fechaFin=new Date(parseInt(anio),mesIdx,diaFin,23,59,59);
  var periodoLabel=diaInicio+' AL '+diaFin;

  var btn=document.querySelector('#cp-periodo-overlay button[onclick*="cpEjecutarCalculo"]');
  btn.disabled=true;btn.innerHTML='<span style="display:inline-block;width:14px;height:14px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span> Calculando...';

  try{
    // 1. Cargar equipos operativos del proyecto
    var equiposSnap;
    if(window._proyectoActivo){
      try{
        equiposSnap=await getDocs(query(collection(db,'equipos'),where('proyecto','==',window._proyectoActivo.nombre)));
      }catch(e){equiposSnap=await getDocs(collection(db,'equipos'));}
    }else{
      equiposSnap=await getDocs(collection(db,'equipos'));
    }
    var equipos=equiposSnap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
    // Solo operativos
    equipos=equipos.filter(function(e){
      var est=(e.estado||'').toLowerCase();
      return !est.includes('varad')&&!est.includes('fuera')&&!est.includes('baja');
    });

    // 2. Cargar preoperacionales del período (ambas líneas)
    var preops=[];
    for(var col of ['inspecciones_linea_amarilla','inspecciones_linea_blanca']){
      try{
        var s=await getDocs(collection(db,col));
        s.docs.forEach(function(d){
          var dt=d.data();
          var f=dt.fecha?.toDate?.();
          if(!f||f<fechaIni||f>fechaFin)return;
          if(window._proyectoActivo){
            var pn=(dt.proyecto||dt.equipo?.ubicacion||'').toLowerCase();
            if(!pn.includes(window._proyectoActivo.nombre.toLowerCase()))return;
          }
          preops.push(dt);
        });
      }catch(e){window._handleError&&window._handleError('dashPreopsLoad',e);}
    }

    // 3. Agrupar por categoría
    // Mapear: cada equipo tiene una categoría que se deriva del prefijo del CEMA (ej: 9DD, 7EO1)
    function getCatFromCema(cema){
      var c=(cema||'').toUpperCase().trim();
      // Probar primero las de 4 chars (7EO1), luego 3 (9DD)
      var catsLargas=Object.keys(window._cpTarifas).filter(function(k){return k.length===4;}).sort();
      for(var k of catsLargas){if(c.indexOf(k)===0)return k;}
      var catsCortas=Object.keys(window._cpTarifas).filter(function(k){return k.length===3;}).sort();
      for(var k of catsCortas){if(c.indexOf(k)===0)return k;}
      return c.substring(0,3);
    }

    var detalles={};
    // 3a. Por cada equipo operativo, contar días/horas en preops
    equipos.forEach(function(eq){
      var cat=getCatFromCema(eq.nombre||eq.codigo||'');
      var tarifa=window._cpTarifas[cat];
      if(!tarifa)return; // categoría desconocida
      if(!detalles[cat]){
        detalles[cat]={categoria:cat,tipoEquipo:tarifa.nombre,linea:tarifa.linea,unidad:tarifa.unidad,tarifaBase:tarifa.tarifa,unidades:0,horas:0,dias:0,costoTotal:0,equiposCemas:[]};
      }
      detalles[cat].unidades++;
      detalles[cat].equiposCemas.push(eq.nombre);

      // Contar preops para este equipo en el período
      var preopsEq=preops.filter(function(p){
        var c=(p.equipo?.cema||p.cema||'').toUpperCase();
        return c===(eq.nombre||'').toUpperCase()||c===(eq.codigo||'').toUpperCase();
      });
      // Días = días únicos con preop (un preop por día = un día trabajado)
      var diasUnicos=new Set();
      var horasTotal=0;
      preopsEq.forEach(function(p){
        var f=p.fecha?.toDate?.();
        if(f)diasUnicos.add(f.toISOString().substring(0,10));
        // Horas: si la línea es horaria, podemos intentar leer horometro inicial vs final
        // Para simplificar, asumimos 8 horas por día trabajado en línea amarilla
        if(tarifa.unidad==='HORA')horasTotal+=8;
      });
      var diasTrab=diasUnicos.size;
      detalles[cat].dias+=diasTrab;
      detalles[cat].horas+=horasTotal;
      // Calcular costo
      if(tarifa.unidad==='DÍA')detalles[cat].costoTotal+=diasTrab*tarifa.tarifa;
      else if(tarifa.unidad==='HORA')detalles[cat].costoTotal+=horasTotal*tarifa.tarifa;
    });

    var detallesArr=Object.values(detalles);
    // Costo unitario promedio
    detallesArr.forEach(function(d){
      d.costoUnitario=d.unidades>0?Math.round(d.costoTotal/d.unidades):0;
      d.estado=d.costoTotal>0?'CON COSTO':'SIN COSTO';
    });

    // Guardar
    var docId=anio+'_'+mesNombre+'_'+periodoLabel.replace(/\s/g,'')+(window._proyectoActivo?'_'+window._proyectoActivo.id:'');
    await setDoc(doc(db,'cuentas_costos',docId),{
      anio:anio,
      mes:mesNombre,
      periodo:periodoLabel,
      proyecto:window._proyectoActivo?window._proyectoActivo.nombre:'Todos',
      detalles:detallesArr,
      totalEquiposOperativos:equipos.length,
      preopsAnalizados:preops.length,
      fecha:serverTimestamp(),
      calculadoPor:window.nombreOperador||'-'
    });

    document.getElementById('cp-periodo-overlay').style.display='none';
    var totalCalc=detallesArr.reduce(function(s,d){return s+d.costoTotal;},0);
    showToast('success','Período calculado: '+cpFmtFull(totalCalc)+' · '+detallesArr.length+' categorías');
    await cpCargarRegistros();cpRenderTodo();
  }catch(e){
    console.error('cpEjecutarCalculo:',e);
    showToast('error','Error: '+e.message);
  }finally{
    btn.disabled=false;btn.innerHTML='<i class="bi bi-play"></i> Calcular y Guardar';
  }
};

// ── Exportar a Excel (CSV) ──
window.cpExportar=function(){
  var regs=window._cpRegistros;
  if(!regs.length){showToast('error','Sin datos para exportar');return;}
  var rows=[['Año','Mes','Período','Proyecto','Categoría','Tipo Equipo','Línea','Unidades','Días','Horas','Costo Unitario','Costo Total','Estado']];
  regs.forEach(function(r){
    (r.detalles||[]).forEach(function(d){
      rows.push([r.anio,r.mes,r.periodo,r.proyecto||'',d.categoria,d.tipoEquipo,d.linea,d.unidades,d.dias||'',d.horas||'',d.costoUnitario,d.costoTotal,d.estado]);
    });
  });
  var csv='\ufeff'+rows.map(function(r){return r.map(function(c){return'"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;
  a.download='cuentas_'+(window._proyectoActivo?window._proyectoActivo.nombre:'todos')+'_'+document.getElementById('cp-anio').value+'.csv';
  a.click();URL.revokeObjectURL(url);
  showToast('success','Archivo descargado');
};

// ===== REPORTE DE DAÑO POR MALA OPERACIÓN =====
window._danoFotos=[]; // base64 array
window._danoTipoSel=null;
window._danoSeveridadSel=null;

window.selectDanoTipo=function(el){
  document.querySelectorAll('#danoTipoGrid .falla-tipo-opt').forEach(function(o){o.classList.remove('selected');});
  el.classList.add('selected');
  window._danoTipoSel=el.dataset.tipo;
};
window.selectDanoSeveridad=function(el){
  document.querySelectorAll('#danoSeveridad .falla-prio-btn').forEach(function(o){o.classList.remove('selected');});
  el.classList.add('selected');
  window._danoSeveridadSel=el.dataset.prio;
};

window.danoAgregarFotos=function(input){
  var files=Array.from(input.files||[]);
  files.forEach(function(file){
    if(file.size>3*1024*1024){showToast('error','Foto "'+file.name+'" excede 3MB');return;}
    var reader=new FileReader();
    reader.onload=function(e){
      // Compress to ~400KB
      var img=new Image();
      img.onload=function(){
        var canvas=document.createElement('canvas');
        var maxW=1024,maxH=768;
        var w=img.width,h=img.height;
        if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
        if(h>maxH){w=Math.round(w*maxH/h);h=maxH;}
        canvas.width=w;canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        var dataUrl=canvas.toDataURL('image/jpeg',0.8);
        window._danoFotos.push({nombre:file.name,foto:dataUrl});
        danoRenderPreviewFotos();
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
  input.value='';
};

function danoRenderPreviewFotos(){
  var c=document.getElementById('dano-fotos-preview');
  if(!c)return;
  c.innerHTML='';
  window._danoFotos.forEach(function(f,idx){
    var div=document.createElement('div');
    div.style.cssText='position:relative;width:90px;height:90px;border-radius:8px;overflow:hidden;border:1px solid var(--gray-200)';
    div.innerHTML='<img src="'+f.foto+'" style="width:100%;height:100%;object-fit:cover">';
    var btn=document.createElement('button');
    btn.innerHTML='✕';
    btn.style.cssText='position:absolute;top:3px;right:3px;background:rgba(229,57,53,.85);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center';
    btn.onclick=function(){window._danoFotos.splice(idx,1);danoRenderPreviewFotos();};
    div.appendChild(btn);
    c.appendChild(div);
  });
}

window.initDanoPage=function(){
  // Reset
  window._danoFotos=[];
  window._danoTipoSel=null;
  window._danoSeveridadSel=null;
  document.querySelectorAll('#danoTipoGrid .falla-tipo-opt').forEach(function(o){o.classList.remove('selected');});
  document.querySelectorAll('#danoSeveridad .falla-prio-btn').forEach(function(o){o.classList.remove('selected');});
  // Default fecha = hoy
  var today=new Date().toISOString().substring(0,10);
  var fechaInp=document.getElementById('dano-fecha-incidente');
  if(fechaInp&&!fechaInp.value)fechaInp.value=today;
  // Reportado por
  var rep=document.getElementById('dano-reportadopor');
  if(rep)rep.value=window.nombreOperador||'—';
  // Show form, hide success
  document.getElementById('danoForm').style.display='block';
  document.getElementById('danoSuccess').style.display='none';
  // Autocomplete CEMA reusing existing helper
  if(window.crearEquipoSuggest){
    crearEquipoSuggest('dano-cema','dano-cema-suggest',function(eq){
      var n=document.getElementById('dano-nombre');if(n)n.value=eq.codigo||'';
      var p=document.getElementById('dano-proyecto');
      if(p&&eq.proyecto){
        var found=Array.from(p.options).find(function(o){return o.text.toLowerCase()===eq.proyecto.toLowerCase();});
        if(found)p.value=found.value;
      }
    });
  }
  // QR autofill
  if(window._qrPendingCema){
    var c=document.getElementById('dano-cema');
    if(c){c.value=window._qrPendingCema;c.dispatchEvent(new Event('input',{bubbles:true}));}
    window._qrPendingCema=null;
  }
  // Pre-fill project from active project
  if(window._proyectoActivo){
    var p=document.getElementById('dano-proyecto');
    if(p){
      var found=Array.from(p.options).find(function(o){return o.text.toLowerCase()===window._proyectoActivo.nombre.toLowerCase();});
      if(found)p.value=found.value;
    }
  }
};

window.resetDanoForm=function(){
  ['dano-cema','dano-nombre','dano-operador','dano-operador-ipe','dano-descripcion','dano-operacion','dano-costo','dano-dias-fuera','dano-acciones','dano-email'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  window.initDanoPage();
};

window.enviarDano=async function(){
  var btn=document.getElementById('danoSubmitBtn');
  var cema=document.getElementById('dano-cema').value.trim();
  var operador=document.getElementById('dano-operador').value.trim();
  var proyecto=document.getElementById('dano-proyecto').value;
  var fechaInc=document.getElementById('dano-fecha-incidente').value;
  var descripcion=document.getElementById('dano-descripcion').value.trim();
  var operacion=document.getElementById('dano-operacion').value.trim();
  var acciones=document.getElementById('dano-acciones').value.trim();
  var costo=parseFloat(document.getElementById('dano-costo').value)||0;

  // Validaciones
  if(!cema){showToast('error','El CEMA es obligatorio');return;}
  if(!operador){showToast('error','El operador responsable es obligatorio');return;}
  if(!proyecto){showToast('error','Selecciona el proyecto');return;}
  if(!fechaInc){showToast('error','La fecha del incidente es obligatoria');return;}
  if(!window._danoTipoSel){showToast('error','Selecciona el tipo de daño');return;}
  if(!window._danoSeveridadSel){showToast('error','Selecciona la severidad');return;}
  if(!descripcion){showToast('error','La descripción del daño es obligatoria');return;}
  if(!operacion){showToast('error','Describe la operación incorrecta');return;}
  if(!acciones){showToast('error','Indica las acciones tomadas');return;}

  btn.disabled=true;
  btn.innerHTML='<span style="display:inline-block;width:14px;height:14px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span> Guardando...';

  try{
    var data={
      cema:cema.toUpperCase(),
      nombreEquipo:document.getElementById('dano-nombre').value.trim(),
      operador:operador,
      operadorIPE:document.getElementById('dano-operador-ipe').value.trim(),
      proyecto:proyecto,
      fechaIncidente:fechaInc,
      tipoDano:window._danoTipoSel,
      severidad:window._danoSeveridadSel,
      descripcion:descripcion,
      operacionIncorrecta:operacion,
      costoEstimado:costo,
      diasFuera:parseInt(document.getElementById('dano-dias-fuera').value)||0,
      accionesTomadas:acciones,
      fotos:window._danoFotos,
      cantidadFotos:window._danoFotos.length,
      reportadoPor:window.nombreOperador||'—',
      reportadoPorIPE:window.ipeActivo||'—',
      estado:'abierto',
      fecha:serverTimestamp()
    };
    await addDoc(collection(db,'reportes_danos'),data);

    document.getElementById('danoForm').style.display='none';
    document.getElementById('danoSuccess').style.display='block';
    showToast('success','Reporte de daño registrado');
  }catch(e){
    showToast('error','Error: '+e.message);
    btn.disabled=false;
    btn.innerHTML='<i class="bi bi-send"></i> Enviar Reporte de Daño';
  }
};

// ===== CÓDIGOS QR DE EQUIPOS =====
window._qrEquipoCema=null;
window._qrEquipoData=null;
window._qrEquipos=[];
window._qrPendingCema=null;

// Read ?cema=XXX from URL on page load
function qrGetCemaFromUrl(){
  try{
    var u=new URL(window.location.href);
    var c=u.searchParams.get('cema');
    return c?c.toUpperCase().trim():null;
  }catch(e){return null;}
}

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
  }catch(e){window._handleError&&window._handleError('galeriaLoad',e);}
  // 2. Fotos de Hoja de Vida
  try{
    var snapHV=await getDocs(collection(db,'hojas_vida'));
    snapHV.docs.forEach(function(d){
      var dat=d.data();
      if(dat.foto){
        fotos.push({id:'hv_'+d.id,cema:dat.placa||dat.cema||d.id,proyecto:dat.proyecto||'',foto:dat.foto,tipo:'hojavida',fecha:dat.actualizadoEn});
      }
    });
  }catch(e){window._handleError&&window._handleError('hvFotos',e);}
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
    html+='<div class="galeria-slide'+active+'" style="background-image:url('+f.foto+')">'
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
  var f=_galeriaFotos.find(function(x){return x.id===id;});
  if(!f)return;
  var lb=document.getElementById('galeria-lightbox');
  var img=document.getElementById('galeria-lightbox-img');
  if(lb&&img){img.src=f.foto;lb.style.display='flex';}
};

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
    }catch(e){window._handleError&&window._handleError('proxMttoLoad',e);}
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
  }catch(e){window._handleError&&window._handleError('cargarProyectos',e);return[];}
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
      }catch(e){if(window._handleError)window._handleError('proyectoQuery_'+v,e);}
    }
  }
  if(!result)result=await getDocs(collection(db,colName));
  _fsCache[ckey]=result;
  _fsCacheTs[ckey]=now;
  return result;
}

// Exponer a window para home.js
window.getDcsByProy=getDcsByProy;

const CSEG_URL='https://script.google.com/macros/s/AKfycbxVL9dvF5inJZa3bUtwXJZBccNmrmfUZjbqfXvNMZBQK9bOWraDvD5bMcT-BXGp6SEmVA/exec';
window.activeUrl=function(){return(window._proyectoActivo&&window._proyectoActivo.url)||CSEG_URL;};

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
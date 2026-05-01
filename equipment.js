// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== EQUIPOS: UN SOLO FLUJO LIMPIO =====
// onSnapshot escucha en tiempo real. Al subir Excel → writeBatch → Firestore → onSnapshot actualiza la tabla automáticamente.
let unsubEquipos=null; // Para desuscribirse al cambiar filtro
let proyectoActual='todos';

function cargarEquipos(proyecto){
  proyectoActual=proyecto;
  const container=document.getElementById('equipos-table-container');
  const countEl=document.getElementById('eqCount');
  const labelEl=document.getElementById('uploadProjectLabel');
  if(labelEl)labelEl.innerHTML=`Proyecto: <strong>${proyecto==='todos'?'Todos':proyecto}</strong>`;
  container.innerHTML='<div class="eq-loading"><i class="bi bi-arrow-repeat" class="u-spin"></i> Cargando equipos...</div>';

  // Desuscribir listener anterior
  if(unsubEquipos)unsubEquipos();

  let q;
  if(proyecto==='todos'){q=query(collection(db,"equipos"),orderBy("nombre","asc"))}
  else { q = query(collection(db, "equipos"), where("proyecto", "==", proyecto.toLowerCase())) }

  // onSnapshot: tiempo real
  unsubEquipos=onSnapshot(q,(snap)=>{
    if(snap.empty){
      container.innerHTML=`<div class="eq-empty"><i class="bi bi-inbox"></i><p>No hay equipos${proyecto!=='todos'?' en <strong>'+proyecto+'</strong>':''}.<br>Sube un Excel con la pestaña de arriba.</p></div>`;
      if(countEl)countEl.textContent='';
      return;
    }
    const equipos=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(countEl)countEl.textContent=`${equipos.length} equipo${equipos.length!==1?'s':''}`;
    const stMap={operativo:'active',mantenimiento:'maint',fuera_servicio:'down',stand_by:'standby'};
    const stLabel={operativo:'Operativo',mantenimiento:'En Mtto.',fuera_servicio:'Fuera Servicio',stand_by:'Stand By'};

    // Resumen por categoría — extraer prefijo (3-4 chars) del nombre/CEMA
    const TIPO_LABELS={
      '2DC':'Camionetas','9DD':'Volquetas','2BS':'Buses','9TS':'Turbos','9TC':'Tractocamiones',
      '9TT':'Carrotanques agua','3SD':'Carrotanques combustible','9TG1':'Camión grúa 13T','9TG2':'Camión grúa 20T',
      '7EO1':'Excavadoras PC200','7EO2':'Excavadoras PC300','7EO':'Excavadoras','7TO':'Bulldozers',
      '8CC':'Compactadores','8MN':'Motoniveladoras','6FC':'Hormigoneras','7CF':'Mini cargadores',
      '4MC':'Mezcladoras','4GE1':'Generadores planta','4GE2':'Generadores','4ES':'Equipos soldadura',
      '4CS':'Canguros','4CM':'Compactadores monorodillo'
    };
    function getTipoFromCema(c){
      var s=String(c||'').toUpperCase();
      // Probar prefijos de 4 chars primero
      for(var i=0;i<2;i++){
        var len=4-i;
        var pre=s.substring(0,len);
        if(TIPO_LABELS[pre])return{cat:pre,label:TIPO_LABELS[pre]};
      }
      return{cat:s.substring(0,3),label:'Otros'};
    }
    var resumen={};
    equipos.forEach(function(eq){
      var t=getTipoFromCema(eq.nombre||eq.codigo||'');
      if(!resumen[t.cat])resumen[t.cat]={cat:t.cat,label:t.label,total:0,operativos:0,mtto:0,fuera:0};
      resumen[t.cat].total++;
      var est=(eq.estado||'').toLowerCase();
      if(est.includes('mant'))resumen[t.cat].mtto++;
      else if(est.includes('fuera')||est.includes('varad')||est.includes('baja'))resumen[t.cat].fuera++;
      else resumen[t.cat].operativos++;
    });
    var resumenArr=Object.values(resumen).sort(function(a,b){return b.total-a.total;});

    var totalOp=equipos.filter(function(e){var s=(e.estado||'').toLowerCase();return !s.includes('mant')&&!s.includes('fuera')&&!s.includes('varad')&&!s.includes('baja');}).length;
    var totalMtto=equipos.filter(function(e){return (e.estado||'').toLowerCase().includes('mant');}).length;
    var totalFuera=equipos.length-totalOp-totalMtto;

    var resumenHTML='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">'
      +'<div style="background:linear-gradient(135deg,#1565C0,#1976D2);color:#fff;border-radius:12px;padding:16px"><div style="font-size:11px;opacity:.85;text-transform:uppercase;font-weight:600">Total Equipos</div><div style="font-family:\'Space Grotesk\',sans-serif;font-size:28px;font-weight:700;margin-top:4px">'+equipos.length+'</div></div>'
      +'<div style="background:linear-gradient(135deg,#2E7D32,#43A047);color:#fff;border-radius:12px;padding:16px"><div style="font-size:11px;opacity:.85;text-transform:uppercase;font-weight:600">Operativos</div><div style="font-family:\'Space Grotesk\',sans-serif;font-size:28px;font-weight:700;margin-top:4px">'+totalOp+'</div></div>'
      +'<div style="background:linear-gradient(135deg,#E65100,#FB8C00);color:#fff;border-radius:12px;padding:16px"><div style="font-size:11px;opacity:.85;text-transform:uppercase;font-weight:600">En Mtto.</div><div style="font-family:\'Space Grotesk\',sans-serif;font-size:28px;font-weight:700;margin-top:4px">'+totalMtto+'</div></div>'
      +'<div style="background:linear-gradient(135deg,#C62828,#E53935);color:#fff;border-radius:12px;padding:16px"><div style="font-size:11px;opacity:.85;text-transform:uppercase;font-weight:600">Fuera Servicio</div><div style="font-family:\'Space Grotesk\',sans-serif;font-size:28px;font-weight:700;margin-top:4px">'+totalFuera+'</div></div>'
      +'</div>';

    resumenHTML+='<div style="background:var(--white);border:1px solid var(--gray-200);border-radius:12px;padding:18px;margin-bottom:16px">'
      +'<h3 style="font-family:\'Space Grotesk\',sans-serif;color:var(--navy);font-size:13px;font-weight:700;text-transform:uppercase;margin-bottom:12px">📊 Resumen por Categoría</h3>'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">';
    resumenArr.forEach(function(r){
      resumenHTML+='<div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:10px;padding:12px 14px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><strong style="font-family:\'Space Grotesk\',sans-serif;color:var(--navy);font-size:13px">'+r.cat+'</strong><span style="font-family:\'Space Grotesk\',sans-serif;font-size:18px;font-weight:700;color:var(--navy)">'+r.total+'</span></div>'
        +'<div style="font-size:11px;color:var(--gray-500);margin-bottom:6px">'+r.label+'</div>'
        +'<div style="display:flex;gap:6px;font-size:10px">'
        +(r.operativos>0?'<span style="background:rgba(46,125,50,.12);color:#2E7D32;padding:2px 6px;border-radius:6px;font-weight:700">✓ '+r.operativos+'</span>':'')
        +(r.mtto>0?'<span style="background:rgba(230,81,0,.12);color:#E65100;padding:2px 6px;border-radius:6px;font-weight:700">🔧 '+r.mtto+'</span>':'')
        +(r.fuera>0?'<span style="background:rgba(198,40,40,.12);color:#C62828;padding:2px 6px;border-radius:6px;font-weight:700">⚠ '+r.fuera+'</span>':'')
        +'</div></div>';
    });
    resumenHTML+='</div></div>';

    container.innerHTML=resumenHTML+`<div class="card"><div class="card-body" style="padding:0;overflow-x:auto"><table class="eq-table"><thead><tr><th>Equipo</th><th>Código</th><th>Estado</th><th>Proyecto</th></tr></thead><tbody>`+equipos.map(function(eq){
      var st=stMap[eq.estado]||'active';var sl=stLabel[eq.estado]||eq.estado||'—';
      return'<tr><td class="eq-name">'+(eq.nombre||'—')+'</td><td>'+(eq.codigo||'—')+'</td><td><span class="eq-status '+st+'" class="u-pointer" onclick="window.cambiarEstadoEquipo(\''+eq.id+'\',\''+(eq.estado||'operativo')+'\')" title="Click para cambiar estado"><span class="eq-status-dot"></span>'+sl+' <i class="bi bi-chevron-down" style="font-size:10px;opacity:.6"></i></span></td><td style="text-transform:capitalize">'+(eq.proyecto||'—')+'</td></tr>';
    }).join('')+'</tbody></table></div></div>';
  },(error)=>{
    console.error("Error onSnapshot:",error);
    if(error.code==='failed-precondition'){container.innerHTML='<div class="eq-empty"><i class="bi bi-exclamation-triangle"></i><p>Se requiere un índice en Firebase Console.<br>Revisa la consola del navegador para el enlace.</p></div>'}
    else{container.innerHTML=`<div class="eq-empty"><i class="bi bi-exclamation-triangle"></i><p>Error: ${error.message}</p></div>`}
  });
}
window.cargarEquipos=cargarEquipos;

// ===== CAMBIAR ESTADO DE EQUIPO =====
window.cambiarEstadoEquipo = async function(eqId, estadoActual) {
  const estados = ['operativo','mantenimiento','fuera_servicio','stand_by'];
  const labels = {'operativo':'✅ Operativo','mantenimiento':'🟡 En Mantenimiento','fuera_servicio':'🔴 Fuera de Servicio','stand_by':'⏸️ Stand By'};
  const opciones = estados.filter(e => e !== estadoActual).map(e => `<div class="estado-opt" data-estado="${e}" style="padding:10px 16px;cursor:pointer;font-size:13px;font-weight:500;border-bottom:1px solid var(--gray-100);transition:background .15s" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''" onclick="window._confirmarEstado('${eqId}','${e}')">${labels[e]}</div>`).join('');
  // Crear popup
  const old = document.getElementById('estado-popup');
  if (old) old.remove();
  const popup = document.createElement('div');
  popup.id = 'estado-popup';
  popup.style.cssText = 'position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);backdrop-filter:blur(2px)';
  popup.innerHTML = `<div style="background:var(--white);border-radius:12px;min-width:280px;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden;animation:modalIn .2s ease">
    <div style="padding:16px 20px;border-bottom:1px solid var(--gray-200);font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;color:var(--navy)">Cambiar Estado</div>
    <div style="padding:4px 0">${opciones}</div>
    <div style="padding:10px 16px;text-align:right"><button onclick="document.getElementById('estado-popup').remove()" style="padding:8px 16px;border:1px solid var(--gray-200);border-radius:6px;background:var(--white);color:var(--gray-600);font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif">Cancelar</button></div>
  </div>`;
  popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
  document.body.appendChild(popup);
};

window._confirmarEstado = async function(eqId, nuevoEstado) {
  try {
    await setDoc(doc(db, "equipos", eqId), { estado: nuevoEstado, actualizado: serverTimestamp() }, { merge: true });
    const labels = {operativo:'Operativo',mantenimiento:'En Mantenimiento',fuera_servicio:'Fuera de Servicio',stand_by:'Stand By'};
    showToast('success', `Estado cambiado a: ${labels[nuevoEstado]}`);
  } catch(err) {
    showToast('error', 'Error: ' + err.message);
  }
  document.getElementById('estado-popup')?.remove();
};

// ===== SUBIR EXCEL: un solo handler, asigna proyecto automáticamente =====
document.getElementById('excelInput').addEventListener('change',async(event)=>{
  const file=event.target.files[0];
  if(!file)return;
  // El proyecto se toma del tab activo
  let proyecto=proyectoActual;
  if(proyecto==='todos'){
    showToast('error','Selecciona un proyecto específico (Rubiales, Scatec o Guajira) antes de importar.');
    event.target.value='';return;
  }
  showToast('info',`Importando equipos para ${proyecto}...`);

  const reader=new FileReader();
  reader.onload=async(e)=>{
    try{
      const data=new Uint8Array(e.target.result);
      const wb=XLSX.read(data,{type:'array'});
      const raw=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if(raw.length===0){showToast('error','El archivo está vacío');return}

      const batch=writeBatch(db);
      let count=0;
      raw.forEach(item=>{
        // Buscar campos flexibles
        const getVal=(keys)=>{const found=Object.keys(item).find(k=>keys.includes(k.toLowerCase().trim()));return found?String(item[found]).trim():null};
        const cod=getVal(['codigo','id','cod','comeq'])||'sin-codigo-'+count;
        const nom=getVal(['equipo','nombre','descripcion','cema'])||'N/A';
        const est=(getVal(['estado','condicion'])||'operativo').toLowerCase();
        // ID único basado en código para evitar duplicados
        const idDoc=cod.replace(/[^\w]/g,'_').toLowerCase();
        batch.set(doc(db,"equipos",idDoc),{nombre:nom,codigo:cod,estado:est,proyecto:proyecto.toLowerCase(),actualizado:serverTimestamp()},{merge:true});
        count++;
      });
      await batch.commit();
      showToast('success',`✅ ${count} equipos importados a ${proyecto}`);
      event.target.value=''; // Reset input
    }catch(err){console.error("Error Excel:",err);showToast('error','Error: '+err.message)}
  };
  reader.readAsArrayBuffer(file);
});


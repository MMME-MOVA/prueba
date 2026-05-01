// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,Timestamp=window.Timestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== REPORTAR FALLA =====
window._fallaTipo = '';
window._fallaPrio = '';

window.selectFallaTipo = function(el) {
  document.querySelectorAll('.falla-tipo-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  window._fallaTipo = el.dataset.tipo;
};

window.selectFallaPrio = function(el) {
  document.querySelectorAll('.falla-prio-btn').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  window._fallaPrio = el.dataset.prio;
};

window.enviarFalla = async function() {
  const cema = document.getElementById('falla-cema').value.trim();
  const nombre = document.getElementById('falla-nombre').value.trim();
  const proyecto = document.getElementById('falla-proyecto').value;
  const horometro = document.getElementById('falla-horometro').value.trim();
  const descripcion = document.getElementById('falla-descripcion').value.trim();
  const operable = document.querySelector('input[name="falla-operable"]:checked')?.value || 'SI';
  const email = document.getElementById('falla-email').value.trim();

  // Validaciones
  if (!cema) { showToast('error', 'Ingresa el código del equipo'); return; }
  if (!proyecto) { showToast('error', 'Selecciona el proyecto'); return; }
  if (!window._fallaTipo) { showToast('error', 'Selecciona el tipo de falla'); return; }
  if (!window._fallaPrio) { showToast('error', 'Selecciona la prioridad'); return; }
  if (!descripcion) { showToast('error', 'Describe la falla'); return; }

  const btn = document.getElementById('fallaSubmitBtn');
  btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span> Enviando...';
  btn.disabled = true;

  const data = {
    cema, nombre, proyecto, horometro,
    tipoFalla: window._fallaTipo,
    prioridad: window._fallaPrio,
    descripcion, operable, email,
    reportadoPor: window.nombreOperador||window.operadorActivo||'—',
    estado: 'abierta',
    fecha: serverTimestamp()
  };

  try {
    // 1. Guardar en Firestore
    await addDoc(collection(db, "reportes_fallas"), data);

          // 2. Enviar email via EmailJS (si está configurado)
try {
  if (typeof emailjs !== 'undefined' && window.EMAILJS_SERVICE_ID) {
    
    // Creamos la fecha limpia antes de enviarla
    const fechaLimpia = new Date().toLocaleDateString("es-CO").replace(/\//g, "-");

    await emailjs.send(window.EMAILJS_SERVICE_ID, window.EMAILJS_TEMPLATE_ID, {
      to_email: window.CORREOS_SUPERVISORES, 
      from_name: window.nombreOperador || 'Operador MOVA',
      equipo: `${cema} — ${nombre || 'Sin nombre'}`,
      proyecto: proyecto,
      tipo_falla: window._fallaTipo,
      prioridad: window._fallaPrio,
      descripcion: descripcion,
      operable: operable === 'SI' ? 'Sí, con restricciones' : 'No, equipo detenido',
      horometro: horometro || 'N/A',
      fecha: fechaLimpia // <--- Usamos la variable con guiones
    });

    showToast('success', '✅ Reporte guardado y correo enviado a supervisores');
  } else {
    showToast('success', '✅ Reporte guardado (configura EmailJS para enviar correo)');
  }
} catch(emailErr) {
  console.warn('Email no enviado:', emailErr);
  showToast('info', 'Reporte guardado. El correo no se pudo enviar.');
}

    // 3. Mostrar éxito
    document.getElementById('fallaForm').style.display = 'none';
    document.getElementById('fallaSuccess').style.display = 'block';

  } catch(err) {
    console.error('Error:', err);
    showToast('error', 'Error: ' + err.message);
    btn.innerHTML = '<i class="bi bi-send"></i> Enviar Reporte de Falla';
    btn.disabled = false;
  }
};

window.resetFallaForm = function() {
  document.getElementById('fallaForm').style.display = 'block';
  document.getElementById('fallaSuccess').style.display = 'none';
  document.getElementById('falla-cema').value = '';
  document.getElementById('falla-nombre').value = '';
  document.getElementById('falla-proyecto').value = '';
  document.getElementById('falla-horometro').value = '';
  document.getElementById('falla-descripcion').value = '';
  document.querySelectorAll('.falla-tipo-opt,.falla-prio-btn').forEach(o => o.classList.remove('selected'));
  window._fallaTipo = ''; window._fallaPrio = '';
  const btn = document.getElementById('fallaSubmitBtn');
  btn.innerHTML = '<i class="bi bi-send"></i> Enviar Reporte de Falla';
  btn.disabled = false;
};

// ── Autocomplete de equipos (CEMA + datos) ──
window.equiposCache=null;
async function cargarEquiposCache(){
  if(window.equiposCache)return window.equiposCache;
  try{
    const snap=await getDocs(collection(db,'equipos'));
    window.equiposCache=snap.docs.map(d=>({id:d.id,...d.data()}));
    return window.equiposCache;
  }catch(e){return[]}
}
function crearEquipoSuggest(inputId,suggestId,onSelect){
  const inp=document.getElementById(inputId);
  const sug=document.getElementById(suggestId);
  if(!inp||!sug)return;
  let _matches=[];
  inp.addEventListener('input',async()=>{
    const term=inp.value.trim().toLowerCase();
    if(term.length<2){sug.style.display='none';return;}
    const equipos=await cargarEquiposCache();
    _matches=equipos.filter(e=>{
      // En Firestore: nombre=CEMA (2DC3182), codigo=nombre equipo (DC|FKM700)
      const cema=(e.nombre||'').toLowerCase();
      const cod=(e.codigo||'').toLowerCase();
      const proy=(e.proyecto||'').toLowerCase();
      return cema.includes(term)||cod.includes(term)||proy.includes(term);
    }).slice(0,10);
    if(!_matches.length){sug.style.display='none';return;}
    sug.innerHTML=_matches.map((e,i)=>{
      const cema=e.nombre||'--';
      const equipo=e.codigo||'--';
      const proyecto=e.proyecto||'';
      return('<div class="hv-suggest-item" data-idx="'+i+'" style="cursor:pointer;padding:10px 14px;border-bottom:1px solid var(--gray-50)">'
        +'<strong style="color:var(--navy);font-size:13px">'+cema+'</strong>'
        +'<span style="color:var(--blue);margin-left:10px;font-size:12px;font-weight:600">'+equipo+'</span>'
        +'<span class="sg-meta" style="display:block;margin-top:2px;font-size:11px;color:var(--gray-400)">'+proyecto+'</span>'
        +'</div>');
    }).join('');
    sug.querySelectorAll('.hv-suggest-item').forEach(function(item){
      item.addEventListener('mousedown',function(ev){
        ev.preventDefault();
        const idx=parseInt(item.dataset.idx);
        if(!isNaN(idx)&&_matches[idx]){
          const eq=_matches[idx];
          inp.value=eq.nombre||''; // nombre = CEMA
          onSelect(eq);
          sug.style.display='none';
        }
      });
    });
    sug.style.display='block';
  });
  inp.addEventListener('blur',function(){setTimeout(function(){sug.style.display='none';},150);});
  inp.addEventListener('keydown',function(e){if(e.key==='Escape')sug.style.display='none';});
}

window._mttoTipo=null;
window.selectMttoTipo=function(el){document.querySelectorAll('#mttoTipoGrid .falla-tipo-opt').forEach(o=>o.classList.remove('selected'));el.classList.add('selected');window._mttoTipo=el.dataset.tipo;};
window.enviarMtto=async function(){
  const cema=document.getElementById('mtto-cema')?.value.trim();
  const nombre=document.getElementById('mtto-nombre')?.value.trim();
  const proyecto=document.getElementById('mtto-proyecto')?.value;
  const horometro=document.getElementById('mtto-horometro')?.value;
  const descripcion=document.getElementById('mtto-descripcion')?.value.trim();
  const urgencia=document.querySelector('input[name="mtto-urgencia"]:checked')?.value||'Programable';
  if(!cema){showToast('error','El CEMA es obligatorio');return}
  if(!proyecto){showToast('error','Selecciona el proyecto');return}
  if(!window._mttoTipo){showToast('error','Selecciona el tipo de mantenimiento');return}
  const btn=document.getElementById('mttoSubmitBtn');
  btn.innerHTML='<span style="display:inline-block;width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span> Enviando...';
  btn.disabled=true;
  try{
    const{addDoc,collection,serverTimestamp}=window._firestoreOps||{};
    if(addDoc&&collection){
      await addDoc(collection(window._db,'solicitudes_mtto'),{
        cema,nombre:nombre||'—',proyecto,horometro:horometro||'—',
        tipoMtto:window._mttoTipo,descripcion:descripcion||'Sin observaciones',
        urgencia,solicitadoPor:window.nombreOperador||window.operadorActivo||'—',
        estado:'pendiente',fecha:serverTimestamp()
      });
    }
    document.getElementById('mttoForm').style.display='none';
    document.getElementById('mttoSuccess').style.display='block';
    showToast('success','Solicitud enviada');
  }catch(e){
    showToast('error','Error: '+e.message);
    btn.innerHTML='<i class="bi bi-send"></i> Enviar Solicitud';
    btn.disabled=false;
  }
};
window.resetMttoForm=function(){
  document.getElementById('mttoForm').style.display='block';
  document.getElementById('mttoSuccess').style.display='none';
  document.getElementById('mtto-cema').value='';
  document.getElementById('mtto-nombre').value='';
  document.getElementById('mtto-proyecto').value='';
  document.getElementById('mtto-horometro').value='';
  document.getElementById('mtto-descripcion').value='';
  document.querySelectorAll('#mttoTipoGrid .falla-tipo-opt').forEach(o=>o.classList.remove('selected'));
  window._mttoTipo=null;
  const btn=document.getElementById('mttoSubmitBtn');
  if(btn){btn.innerHTML='<i class="bi bi-send"></i> Enviar Solicitud';btn.disabled=false;}
};
window.initOrdenesPage=function(){
  const sp=document.getElementById('mtto-solicitadopor');
  if(sp)sp.value=window.nombreOperador||window.operadorActivo||'';
  crearEquipoSuggest('mtto-cema','mtto-cema-suggest',function(e){
    var nom=document.getElementById('mtto-nombre');if(nom)nom.value=e.codigo||'';
    var proy=document.getElementById('mtto-proyecto');
    if(proy&&e.proyecto){var opt=Array.from(proy.options).find(function(o){return o.value.toLowerCase().includes(e.proyecto.toLowerCase())||e.proyecto.toLowerCase().includes(o.value.toLowerCase());});if(opt)proy.value=opt.value;}
  });
};
window.initFallaPage = function() {
  const rp = document.getElementById('falla-reportadopor');
  if (rp) rp.value = window.nombreOperador || window.operadorActivo || '';
  crearEquipoSuggest('falla-cema','falla-cema-suggest',function(e){
    var nom=document.getElementById('falla-nombre');if(nom)nom.value=e.codigo||'';
    var proy=document.getElementById('falla-proyecto');
    if(proy&&e.proyecto){var opt=Array.from(proy.options).find(function(o){return o.value.toLowerCase().includes(e.proyecto.toLowerCase())||e.proyecto.toLowerCase().includes(o.value.toLowerCase());});if(opt)proy.value=opt.value;}
  });
};

// ===== EMAILJS CONFIG =====
window.EMAILJS_SERVICE_ID = 'service_xlgjfgn'; // Reemplaza con tu Service ID
window.EMAILJS_TEMPLATE_ID = 'template_2f0v25h'; // Reemplaza con tu Template ID

// Agrega tu Public Key aquí (la que sacaste de Account -> API Keys)
const PUBLIC_KEY = 'kTZPLsFblwc5i8r4x'; 

// Inicializar EmailJS obligatoriamente
if (typeof emailjs !== 'undefined') {
    emailjs.init(PUBLIC_KEY);
}

// Lista de correos
window.CORREOS_SUPERVISORES = 'asistente.mtto.morenovargas@gmail.com, supervisor.mantenimiento@morenovargas.com, asistente.mantrb.morenovargas@gmail.com, supervisor3.morenovargas@gmail.com, supervisor.mantenimiento.maracana@morenovargas.com, asistente.mantenimiento2@morenovargas.com';


// ===== BIMENSUALES — MENU =====
window.mostrarMenuBimensual = function() {
  inspGenericMenu('bimensualContent', '🔍 Inspección Bimensual', 'Seleccione el tipo de línea', [
    { icon: '🏗️', label: 'Línea Amarilla', sub: 'Maquinaria pesada · A4-F-009', cls: 'amarilla', onclick: "window.iniciarBimensual('amarilla')" },
    { icon: '🚛', label: 'Línea Blanca', sub: 'Vehículos · A4-F-010', cls: 'blanca', onclick: "window.iniciarBimensual('blanca')" }
  ]);
};

window.iniciarBimensual = function(tipo) {
  const items = tipo === 'amarilla' ? bimAmarillaItems : bimBlancaItems;
  const titulo = tipo === 'amarilla' ? 'Inspección Bimensual — Línea Amarilla' : 'Inspección Operacional — Línea Blanca';
  const codigo = tipo === 'amarilla' ? 'Código: A4-F-009 · Revisión: 010' : 'Código: A4-F-010 · Versión: 12';
  const col = tipo === 'amarilla' ? 'insp_bimensual_amarilla' : 'insp_bimensual_blanca';
  const opts = [
    { v: 'B', l: 'B', icon: '<i class="bi bi-check-lg"></i>' },
    { v: 'D', l: 'D', icon: '<i class="bi bi-x-lg"></i>' },
    { v: 'NA', l: 'N/A', icon: '' }
  ];
  let extraFields;
  if (tipo === 'amarilla') {
    extraFields = `
      <div class="form-row" class="u-mb-12">
        <div class="form-group"><label class="form-label">CEMA ó COMEQ *</label><input class="form-input" id="insp-cema" placeholder="Código del equipo" required></div>
        <div class="form-group"><label class="form-label">Horómetro</label><input class="form-input" id="insp-horometro" type="number" placeholder="Ej: 3245"></div>
      </div>
      <div class="form-row" class="u-mb-12">
        <div class="form-group"><label class="form-label">Localización Actual o Destino</label><input class="form-input" id="insp-ubicacion" placeholder="Frente de obra, taller..."></div>
        <div class="form-group"><label class="form-label">Nombre del Operador</label><input class="form-input" id="insp-operador" value="${window.nombreOperador||''}" placeholder="Nombre completo"></div>
      </div>
      <div class="form-group" class="u-mb-12"><label class="form-label">Tipo de Inspección</label>
        <div style="display:flex;gap:12px;margin-top:4px">
          <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer"><input type="radio" name="insp-tipo-bim" value="Llegada" checked> Llegada</label>
          <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer"><input type="radio" name="insp-tipo-bim" value="Salida"> Salida</label>
          <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer"><input type="radio" name="insp-tipo-bim" value="Mensual"> Mensual</label>
        </div>
      </div>`;
  } else {
    extraFields = `
      <div class="form-row" class="u-mb-12">
        <div class="form-group"><label class="form-label">Placa *</label><input class="form-input" id="insp-cema" placeholder="Ej: ABC123" required></div>
        <div class="form-group"><label class="form-label">CEMA</label><input class="form-input" id="insp-cema2" placeholder="Código CEMA"></div>
      </div>
      <div class="form-row" class="u-mb-12">
        <div class="form-group"><label class="form-label">COMEQ</label><input class="form-input" id="insp-comeq" placeholder="Código COMEQ"></div>
        <div class="form-group"><label class="form-label">OBN (Obra)</label><input class="form-input" id="insp-ubicacion" placeholder="Número de obra"></div>
      </div>
      <div class="form-row" class="u-mb-12">
        <div class="form-group"><label class="form-label">Odómetro</label><input class="form-input" id="insp-odometro" type="number" placeholder="Km"></div>
        <div class="form-group"><label class="form-label">Tipo de Vehículo</label>
          <select class="form-select" id="insp-tipo-vehiculo"><option value="">Seleccionar...</option><option>Camión</option><option>Volqueta</option><option>Camioneta</option><option>Tracto Camión</option><option>Cama Baja</option><option>Carrotanque</option><option>Bus / Buseta</option><option>Automóvil</option><option>Motocicleta</option><option>Otro</option></select>
        </div>
      </div>
      <div class="form-row" class="u-mb-12">
        <div class="form-group"><label class="form-label">¿Vehículo Alquilado?</label>
          <div style="display:flex;gap:12px;margin-top:4px">
            <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer"><input type="radio" name="insp-alquilado" value="NO" checked> No</label>
            <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer"><input type="radio" name="insp-alquilado" value="SI"> Sí</label>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Propietario o Empresa</label><input class="form-input" id="insp-propietario" placeholder="Nombre del propietario"></div>
      </div>
      <div class="form-row" class="u-mb-12">
        <div class="form-group"><label class="form-label">Nombre del Conductor</label><input class="form-input" id="insp-conductor" value="${window.nombreOperador||''}" placeholder="Nombre completo"></div>
        <div class="form-group"><label class="form-label">Nombre del Inspector</label><input class="form-input" id="insp-inspector" value="${window.nombreOperador||''}" placeholder="Nombre del inspector"></div>
      </div>`;
  }
  inspGenericForm('bimensualContent', titulo, codigo, items, opts, col, "window.mostrarMenuBimensual()", extraFields);
};

window.initBimensualPage = function() { window.mostrarMenuBimensual(); };

// ===== LOCATIVAS — MENU =====
window.mostrarMenuLocativa = function() {
  inspGenericMenu('locativaContent', '🏢 Inspecciones Locativas', 'Seleccione el tipo de inspección', [
    { icon: '🏗️', label: 'Instalaciones', sub: 'A4-F-022 · Locativas', cls: '', onclick: "window.iniciarLocativa('instalaciones')" },
    { icon: '⚡', label: 'Redes Eléctricas', sub: 'A4-F-021 · Por área', cls: '', onclick: "window.iniciarLocativa('redes')" },
    { icon: '🔧', label: 'Talleres: Equipos', sub: 'A4-F-020 · Herramientas', cls: '', onclick: "window.iniciarLocativa('talleres_equipos')" },
    { icon: '🧹', label: 'Talleres: Áreas', sub: 'A4-F-023 · Verificación', cls: '', onclick: "window.iniciarLocativa('talleres_areas')" },
    { icon: '🏢', label: 'Oficinas', sub: 'A4-F-024 · Chequeo', cls: '', onclick: "window.iniciarLocativa('oficinas')" },
    { icon: '🛏️', label: 'Habitaciones y Baños', sub: 'A4-F-026 · Chequeo', cls: '', onclick: "window.iniciarLocativa('habitaciones')" }
  ]);
};

window.iniciarLocativa = function(tipo) {
  const backFn = "window.mostrarMenuLocativa()";
  const optsBI = [{v:'B',l:'B',icon:'<i class="bi bi-check-lg"></i>'},{v:'M',l:'M',icon:'<i class="bi bi-x-lg"></i>'}];
  const optsSINO = [{v:'SI',l:'SI',icon:'<i class="bi bi-check-lg"></i>'},{v:'NO',l:'NO',icon:'<i class="bi bi-x-lg"></i>'},{v:'NA',l:'N/A',icon:''}];
  const optsCheck = [{v:'OK',l:'✓',icon:''},{v:'NA',l:'N/A',icon:''}];
  const lugarFields = `<div class="form-row" class="u-mb-12"><div class="form-group"><label class="form-label">Lugar / Área / Inmueble *</label><input class="form-input" id="insp-cema" placeholder="Ej: PB 764, Suba, Taller..." required></div><div class="form-group"><label class="form-label">Obra / OBN</label><input class="form-input" id="insp-ubicacion" placeholder="Código de obra"></div></div>`;

  if (tipo === 'instalaciones') {
    const items = locInstalaciones.map(t => ({ text: t, required: false }));
    inspGenericForm('locativaContent', 'Inspección de Instalaciones Locativas', 'Código: A4-F-022', items, optsSINO, 'insp_loc_instalaciones', backFn, lugarFields);
  } else if (tipo === 'redes') {
    const items = [];
    locRedesAreas.forEach(area => { locRedesItems.forEach(it => { items.push({ text: it, cat: area, required: false }); }); });
    inspGenericForm('locativaContent', 'Inspección de Redes Eléctricas', 'Código: A4-F-021', items, optsBI, 'insp_loc_redes', backFn, lugarFields);
  } else if (tipo === 'talleres_equipos') {
    const items = locTalleresEquipos.map((t, i) => ({ text: t, cat: locTalleresEquiposCats[i], required: false }));
    inspGenericForm('locativaContent', 'Inspección de Equipos y Herramientas en Talleres', 'Código: A4-F-020', items, optsSINO, 'insp_loc_talleres_eq', backFn, lugarFields);
  } else if (tipo === 'talleres_areas') {
    const items = locTalleresAreas.map(t => ({ text: t, required: false }));
    inspGenericForm('locativaContent', 'Verificación de Áreas en Talleres de Mantenimiento', 'Código: A4-F-023', items, optsBI, 'insp_loc_talleres_areas', backFn, lugarFields);
  } else if (tipo === 'oficinas') {
    const items = locOficinas.map(o => ({ text: o.text, cat: o.area, freq: o.freq, required: false }));
    inspGenericForm('locativaContent', 'Lista de Chequeo de Oficinas', 'Código: A4-F-024', items, optsCheck, 'insp_loc_oficinas', backFn, lugarFields);
  } else if (tipo === 'habitaciones') {
    const items = locHabitaciones.map(o => ({ text: o.text, cat: o.area, freq: o.freq, required: false }));
    inspGenericForm('locativaContent', 'Chequeo de Habitaciones y Baños', 'Código: A4-F-026', items, optsCheck, 'insp_loc_habitaciones', backFn, lugarFields);
  }
};

window.initLocativaPage = function() { window.mostrarMenuLocativa(); };


// HISTORIAL UNIFICADO
const HIST_COLS=[
  {col:'inspecciones_linea_amarilla',label:'Preop Amarilla',pdf:'preop'},
  {col:'inspecciones_linea_blanca',label:'Preop Blanca',pdf:'preop'},
  {col:'insp_bimensual_amarilla',label:'Bimensual Amarilla',pdf:'insp'},
  {col:'insp_bimensual_blanca',label:'Bimensual Blanca',pdf:'insp'},
  {col:'insp_loc_instalaciones',label:'Loc. Instalaciones',pdf:'insp'},
  {col:'insp_loc_redes',label:'Loc. Redes Eléctricas',pdf:'insp'},
  {col:'insp_loc_talleres_eq',label:'Loc. Talleres Equipos',pdf:'insp'},
  {col:'insp_loc_talleres_areas',label:'Loc. Talleres Áreas',pdf:'insp'},
  {col:'insp_loc_oficinas',label:'Loc. Oficinas',pdf:'insp'},
  {col:'insp_loc_habitaciones',label:'Loc. Habitaciones',pdf:'insp'},
  {col:'reportes_fallas',label:'Reportes de Falla',pdf:'falla'},
  {col:'reportes_danos',label:'Daños Mala Operación',pdf:'dano'},
  {col:'solicitudes_mtto',label:'Solicitudes Mtto.',pdf:'mtto'}
];
window.histTab=function(tab){document.querySelectorAll('.hist-tab').forEach(t=>{const a=t.dataset.tab===tab;t.style.background=a?'var(--white)':'transparent';t.style.color=a?'var(--navy)':'var(--gray-500)';t.classList.toggle('active',a)});document.getElementById('hist-resumen').style.display=tab==='resumen'?'block':'none';document.getElementById('hist-busqueda').style.display=tab==='busqueda'?'block':'none'};
window.histCargarResumen=async function(){const mes=document.getElementById('hist-mes').value;if(!mes){showToast('error','Selecciona un mes');return}const[y,m]=mes.split('-').map(Number);const ini=Timestamp.fromDate(new Date(y,m-1,1)),fin=Timestamp.fromDate(new Date(y,m,1));const cont=document.getElementById('hist-cards');cont.innerHTML='<div class="eq-loading">Cargando...</div>';const counts=[];for(const c of HIST_COLS){try{const q2=query(collection(db,c.col),where("fecha",">=",ini),where("fecha","<",fin));const snap=await getDocs(q2);counts.push({...c,n:snap.size})}catch(e){counts.push({...c,n:0})}}cont.innerHTML=counts.map(c=>`<div class="nav-card" onclick="window.histVerTipo('${c.col}','${c.label}')"><div class="nav-icon all"><i class="bi bi-clipboard-check"></i></div><div class="nav-info"><span class="nav-label">${c.label}</span><h2 class="nav-value">${c.n}</h2></div></div>`).join('')};
window.histVerTipo=function(col,label){window.histTab('busqueda');document.getElementById('hist-tipo-filter').value=col;document.getElementById('hist-search').value='';window.histBuscar()};
window.histBuscar=async function(){const term=document.getElementById('hist-search').value.trim().toLowerCase();const tipoF=document.getElementById('hist-tipo-filter').value;const cont=document.getElementById('hist-resultados');cont.innerHTML='<div class="eq-loading">Buscando...</div>';const cols=tipoF?HIST_COLS.filter(c=>c.col===tipoF):HIST_COLS;const results=[];for(const c of cols){try{const snap=await getDocs(collection(db,c.col));snap.docs.forEach(d=>{const data=d.data();const id=(data.identificacion||data.equipo?.cema||data.cema||'').toString().toLowerCase();if(!term||id.includes(term))results.push({id:d.id,col:c.col,label:c.label,pdf:c.pdf,data})})}catch(e){window._handleError&&window._handleError("histBuscar_"+c.col,e);}}results.sort((a,b)=>(b.data.fecha?.toDate?.()||0)-(a.data.fecha?.toDate?.()||0));if(results.length===0){cont.innerHTML='<div class="eq-empty"><i class="bi bi-inbox"></i><p>Sin resultados</p></div>';return}cont.innerHTML=`<div class="card"><div class="card-body" style="padding:0;overflow-x:auto"><table class="eq-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Identificación</th><th>Inspector</th><th>PDF</th></tr></thead><tbody>${results.map(r=>{const f=r.data.fecha?.toDate?.()?.toLocaleDateString('es-CO')||'—';const id=r.data.identificacion||r.data.equipo?.cema||r.data.cema||'—';const ins=r.data.inspector||r.data.operador||'—';const esFalla=(r.col==='reportes_fallas');const esDano=(r.col==='reportes_danos');const cerrable=(esFalla||esDano);const estaAbierta=cerrable&&(r.data.estado==='abierta'||r.data.estado==='abierto'||!r.data.estado);const badge=cerrable?(estaAbierta?'<span style="background:rgba(229,57,53,.12);color:var(--red);padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">Abierto</span>':'<span style="background:rgba(76,175,80,.12);color:#2e7d32;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">Cerrado</span>'):'';return`<tr><td>${f}</td><td>${r.label} ${badge}</td><td class="eq-name">${id}</td><td>${ins}</td><td style="display:flex;gap:4px"><button class="btn btn-sm btn-primary" data-col="${r.col}" data-id="${r.id}" data-pdf="${r.pdf}" onclick="window.histPDF(this.dataset.col,this.dataset.id,this.dataset.pdf)"><i class="bi bi-download"></i></button>${estaAbierta?'<button data-id="'+r.id+'" data-col="'+r.col+'" onclick="window.abrirCierreGenerico(this.dataset.id,this.dataset.col)" style="padding:4px 10px;background:#2e7d32;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer"><i class="bi bi-check-lg"></i> Cerrar</button>':''}</td></tr>`}).join('')}</tbody></table></div></div><p style="margin-top:12px;color:var(--gray-400);font-size:12px">${results.length} resultado(s)</p>`};
window.histPDF=function(col,id,tipo){window._inspCol=col;if(tipo==='preop'){window.coleccion=col;window.exportarPDF(id,col)}else if(tipo==='insp'){window.inspExportarPDF(id)}else if(tipo==='falla'){window.fallaExportarPDF(col,id)}else if(tipo==='mtto'){window.mttoExportarPDF(col,id)}else{showToast('info','PDF no disponible')}};
window.initHistorialPage=function(){const t=document.getElementById('hist-tipo-filter');if(t&&t.options.length<2)HIST_COLS.forEach(c=>{const o=document.createElement('option');o.value=c.col;o.textContent=c.label;t.appendChild(o)});const m=document.getElementById('hist-mes');if(m&&!m.value){const d=new Date();m.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}};

// ── PDF Reporte de Falla ──


// ── PDF Solicitud de Mantenimiento ──


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



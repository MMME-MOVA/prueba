// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

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

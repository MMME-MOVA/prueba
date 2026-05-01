// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== GENERIC INSPECTION ENGINE =====
function inspGenericMenu(containerId, title, subtitle, cards) {
  const c = document.getElementById(containerId);
  c.innerHTML = `<button class="back-btn" onclick="window.navTo('inicio')"><i class="bi bi-arrow-left"></i> Inicio</button>
    <div style="text-align:center;margin-bottom:16px"><h2 style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--navy);font-size:22px">${title}</h2><p style="color:var(--gray-500);font-size:14px">${subtitle}</p></div>
    <div class="preop-menu" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));max-width:900px">${cards.map(cd => `<div class="preop-card ${cd.cls||''}" onclick="${cd.onclick}" class="u-pointer"><div class="preop-icon">${cd.icon}</div><h3 style="font-size:16px">${cd.label}</h3><p style="font-size:12px">${cd.sub}</p></div>`).join('')}</div>`;
}

function inspGenericForm(containerId, title, codigo, items, options, coleccion, backFn, extraFields) {
  const c = document.getElementById(containerId);
  window._inspItems = items;
  window._inspCol = coleccion;
  window._inspBackFn = backFn;
  window._inspOpts = options;
  window._inspContainerId = containerId;
  let catHtml = '';
  let lastCat = '';
  items.forEach((item, i) => {
    const n = 'insp_' + i;
    const cat = item.cat || item.area || '';
    if (cat && cat !== lastCat) {
      catHtml += `<div style="background:var(--navy);color:var(--white);padding:8px 14px;border-radius:6px;margin-top:14px;font-size:12px;font-weight:700;letter-spacing:.5px">${cat}</div>`;
      lastCat = cat;
    }
    const freq = item.freq ? `<span style="font-size:10px;color:var(--gray-400);margin-left:6px">(${item.freq})</span>` : '';
    catHtml += `<div class="checklist-row"><div class="checklist-text">${item.text}${freq}</div><div class="checklist-actions">${options.map(o => `<input type="radio" name="${n}" id="${n}_${o.v}" value="${o.v}"><label for="${n}_${o.v}">${o.icon||''} ${o.l}</label>`).join('')}</div></div>`;
  });

  const ef = extraFields || `<div class="form-row" class="u-mb-12"><div class="form-group"><label class="form-label">CEMA / Equipo *</label><input class="form-input" id="insp-cema" placeholder="Código CEMA o identificación" required></div><div class="form-group"><label class="form-label">Ubicación / Obra</label><input class="form-input" id="insp-ubicacion" placeholder="Localización actual"></div></div>`;

  c.innerHTML = `<button class="back-btn" onclick="${backFn}"><i class="bi bi-arrow-left"></i> Volver</button>
    <h2 style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--navy);font-size:20px;margin-bottom:6px">${title}</h2>
    <p style="font-size:11px;color:var(--gray-400);margin-bottom:16px">${codigo}</p>
    <div class="preop-status-bar"><div class="preop-status-item"><i class="bi bi-person-circle"></i><div><div class="ps-label">Inspector</div><div class="ps-value">${window.nombreOperador||'—'}</div></div></div></div>
    <div class="preop-form-section"><h4><i class="bi bi-info-circle"></i> Identificación</h4>${ef}</div>
    <div class="preop-form-section"><h4><i class="bi bi-list-check" style="color:var(--yellow)"></i> Checklist</h4><div style="max-height:500px;overflow-y:auto" id="insp-checklist">${catHtml}</div></div>
    <div class="preop-form-section"><h4><i class="bi bi-chat-text"></i> Observaciones</h4><textarea class="form-textarea" id="insp-obs" placeholder="Observaciones..."></textarea></div>
    <div id="insp-post-actions" class="u-hidden"><div class="preop-post-actions"><div class="preop-post-btn" onclick="window.inspExportarPDF()"><i class="bi bi-file-earmark-pdf"></i>Exportar PDF</div><div class="preop-post-btn" onclick="window.inspVerHistorial()"><i class="bi bi-clock-history"></i>Historial</div></div></div>
    <button class="preop-save-btn ready" id="insp-guardar" onclick="window.inspGuardar()"><i class="bi bi-save"></i> Guardar Inspección</button>`;
}

window.inspGuardar = async function() {
  const btn = document.getElementById('insp-guardar');
  btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span> Guardando...';
  btn.disabled = true;
  try {
    const cema = document.getElementById('insp-cema')?.value.trim() || '';
    if (!cema) { showToast('error', 'Complete el campo de identificación'); throw new Error('ID'); }
    const checklist = {};
    window._inspItems.forEach((item, i) => {
      const r = document.querySelector(`input[name="insp_${i}"]:checked`);
      checklist['item_' + i] = r ? r.value : '';
    });
    // Capture all extra fields dynamically
    const extras = {};
    const extraIds = ['insp-horometro','insp-operador','insp-cema2','insp-comeq','insp-odometro','insp-tipo-vehiculo','insp-propietario','insp-conductor','insp-inspector','insp-lugar'];
    extraIds.forEach(id => { const el = document.getElementById(id); if (el && el.value.trim()) extras[id.replace('insp-','').replace(/-/g,'')] = el.value.trim(); });
    // Radio buttons
    const tipoBim = document.querySelector('input[name="insp-tipo-bim"]:checked');
    if (tipoBim) extras.tipoInspeccion = tipoBim.value;
    const alquilado = document.querySelector('input[name="insp-alquilado"]:checked');
    if (alquilado) extras.alquilado = alquilado.value;

    const data = {
      identificacion: cema,
      ubicacion: document.getElementById('insp-ubicacion')?.value.trim() || '—',
      inspector: window.nombreOperador||window.operadorActivo,
      ipe: window.ipeActivo,
      checklist,
      ...extras,
      observaciones: document.getElementById('insp-obs')?.value.trim() || 'Sin observaciones',
      fecha: serverTimestamp(),
      totalItems: window._inspItems.length,
      completados: Object.values(checklist).filter(v => v).length
    };
    await addDoc(collection(db, window._inspCol), data);
    window._lastInspCema = cema;
    document.querySelectorAll('.preop-form-section').forEach(s => s.style.display = 'none');
    btn.style.display = 'none';
    document.getElementById('insp-post-actions').style.display = 'block';
    showToast('success', '✅ Inspección guardada');
  } catch(err) {
    if (err.message !== 'ID') console.error(err);
    showToast('error', 'Error: ' + err.message);
    btn.innerHTML = '<i class="bi bi-save"></i> Guardar Inspección';
    btn.disabled = false;
  }
};

// ===== PDF EXPORT para inspecciones genéricas =====


window.inspVerHistorial = async function() {
  const cema = window._lastInspCema || document.getElementById('insp-cema')?.value.trim();
  if (!cema) { showToast('error', 'No hay identificación'); return; }
  const containerId = window._inspContainerId || 'bimensualContent';
  const c = document.getElementById(containerId);
  c.innerHTML = `<button class="back-btn" onclick="${window._inspBackFn}"><i class="bi bi-arrow-left"></i> Volver</button><h2 style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--navy);font-size:20px;margin-bottom:20px">📚 Historial — ${cema}</h2><div id="insp-hist-lista">Cargando...</div>`;
  try {
    const q2 = query(collection(db, window._inspCol), where("identificacion", "==", cema));
    const snap = await getDocs(q2);
    const lista = document.getElementById('insp-hist-lista');
    if (snap.empty) { lista.innerHTML = '<p style="color:var(--gray-400);text-align:center;padding:40px">No hay inspecciones registradas para este equipo</p>'; return; }
    const insp = Array.from(snap.docs).map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.fecha?.toDate() || 0) - (a.fecha?.toDate() || 0));
    lista.innerHTML = `<div class="historial-grid">${insp.map(i => {
      const f = i.fecha?.toDate ? i.fecha.toDate().toLocaleDateString("es-CO") : "Sin fecha";
      const pct = i.totalItems ? Math.round((i.completados / i.totalItems) * 100) : 0;
      return `<div class="historial-card">
        <div class="h-date">${f}</div>
        <div class="h-type">${i.completados || 0}/${i.totalItems || 0} ítems (${pct}%) · ${i.ubicacion || '—'}</div>
        <button class="h-btn" onclick="window.inspExportarPDF('${i.id}')"><i class="bi bi-download"></i> Exportar PDF</button>
      </div>`;
    }).join('')}</div>`;
  } catch(err) { document.getElementById('insp-hist-lista').innerHTML = `<p class="u-color-red">Error: ${err.message}</p>`; }
};



const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,Timestamp=window.Timestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;

const CATEGORIAS = {
  procedimiento: { icon: '🔧', label: 'Procedimiento', color: '#0d47a1' },
  formato: { icon: '📋', label: 'Formato', color: '#1b5e20' },
  manual: { icon: '📘', label: 'Manual', color: '#e65100' },
  instructivo: { icon: '📑', label: 'Instructivo', color: '#4a148c' },
  otro: { icon: '📄', label: 'Otro', color: '#37474f' }
};

let _docsCache = null;
let _docsCacheTs = 0;

// ═══════════════════════════════════════════════
//  CARGAR DOCUMENTOS (Firestore)
// ═══════════════════════════════════════════════
window.cargarDocumentos = async function () {
  const cont = document.getElementById('documentos-grid');
  const filterCat = document.getElementById('docs-filter-cat')?.value || 'todos';
  const search = document.getElementById('docs-search')?.value.trim().toLowerCase() || '';

  if (!cont) return;
  cont.innerHTML = '<div class="eq-loading">Cargando documentos...</div>';

  try {
    // Query con paginación
    let q = query(collection(db, 'documentos'), orderBy('fechaSubida', 'desc'), limit(50));
    if (filterCat !== 'todos') {
      q = query(collection(db, 'documentos'), where('categoria', '==', filterCat), orderBy('fechaSubida', 'desc'), limit(50));
    }

    const snap = await getDocs(q);
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filtro de búsqueda en cliente
    if (search) {
      docs = docs.filter(d =>
        (d.nombre || '').toLowerCase().includes(search) ||
        (d.descripcion || '').toLowerCase().includes(search) ||
        (d.codigo || '').toLowerCase().includes(search)
      );
    }

    _docsCache = docs;

    if (docs.length === 0) {
      cont.innerHTML = '<div class="eq-empty"><i class="bi bi-folder-x" style="font-size:40px"></i><p>Sin documentos en esta categoría</p></div>';
      return;
    }

    cont.innerHTML = docs.map(function (d) {
      const cat = CATEGORIAS[d.categoria] || CATEGORIAS.otro;
      const fecha = d.fechaSubida?.toDate?.() || d.fechaSubida;
      const fechaStr = fecha ? new Date(fecha).toLocaleDateString('es-CO') : 'Sin fecha';
      const esAdmin = window.rolActivo === 'admin';

      return '<div class="doc-card" data-id="' + d.id + '">' +
        '<span class="doc-card-tag" style="background:' + cat.color + '20;color:' + cat.color + '">' + cat.label + '</span>' +
        '<div class="doc-card-icon" style="background:' + cat.color + '15;font-size:28px">' + cat.icon + '</div>' +
        '<div class="doc-card-title">' + (d.nombre || 'Sin nombre') + '</div>' +
        '<div class="doc-card-code">' + (d.codigo || '—') + (d.version ? ' · v' + d.version : '') + '</div>' +
        '<div style="font-size:11px;color:var(--gray-400);margin-top:4px">' + fechaStr + '</div>' +
        '<div style="display:flex;gap:6px;margin-top:10px">' +
        '<button class="btn btn-sm btn-primary" style="flex:1" onclick="window.descargarDocumento(\'' + d.id + '\')">' +
        '<i class="bi bi-download"></i> Descargar</button>' +
        (esAdmin ? '<button class="btn btn-sm" style="border:1px solid var(--gray-200);background:var(--white);flex:1" onclick="window.eliminarDocumento(\'' + d.id + '\')">' +
        '<i class="bi bi-trash"></i></button>' : '') +
        '</div></div>';
    }).join('');

  } catch (e) {
    window._handleError && window._handleError('cargarDocumentos', e);
    cont.innerHTML = '<div class="eq-empty"><i class="bi bi-exclamation-triangle"></i><p>Error al cargar documentos</p></div>';
  }
};

// ═══════════════════════════════════════════════
//  DESCARGAR DOCUMENTO
// ═══════════════════════════════════════════════
window.descargarDocumento = async function (id) {
  const btn = document.querySelector('.doc-card[data-id="' + id + '"] .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Cargando...'; }

  try {
    let docData = _docsCache?.find(d => d.id === id);
    if (!docData) {
      const s = await getDoc(doc(db, 'documentos', id));
      if (!s.exists()) { showToast('error', 'Documento no encontrado'); return; }
      docData = { id: s.id, ...s.data() };
    }

    if (!docData.url) {
      showToast('error', 'URL no disponible'); return;
    }

    // Abrir en nueva pestaña o descargar
    const a = document.createElement('a');
    a.href = docData.url;
    a.target = '_blank';
    a.download = (docData.nombre || 'documento') + '.pdf';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); }, 100);

    showToast('success', 'Descargando: ' + (docData.nombre || 'documento'));

  } catch (e) {
    window._handleError && window._handleError('descargarDocumento', e);
    showToast('error', 'Error al descargar');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-download"></i> Descargar'; }
  }
};

// ═══════════════════════════════════════════════
//  SUBIR DOCUMENTO (Admin)
// ═══════════════════════════════════════════════
window.mostrarModalSubirDoc = function () {
  if (window.rolActivo !== 'admin') { showToast('error', 'Solo admin puede subir documentos'); return; }

  const modal = document.getElementById('modal-subir-doc');
  if (modal) {
    modal.style.display = 'flex';
    return;
  }

  // Crear modal si no existe
  const m = document.createElement('div');
  m.id = 'modal-subir-doc';
  m.className = 'modal-overlay';
  m.innerHTML = '<div class="modal-card" style="max-width:500px">' +
    '<div class="modal-header"><h3>📤 Subir Documento</h3>' +
    '<button class="modal-close" onclick="document.getElementById(\'modal-subir-doc\').style.display=\'none\'">&#10005;</button></div>' +
    '<div class="modal-body">' +
    '<div class="form-group"><label class="form-label">Nombre *</label><input class="form-input" id="doc-nombre" placeholder="Ej: Programa de Mantenimiento"></div>' +
    '<div class="form-group"><label class="form-label">Código</label><input class="form-input" id="doc-codigo" placeholder="Ej: A4-PR-001"></div>' +
    '<div class="form-group"><label class="form-label">Versión</label><input class="form-input" id="doc-version" placeholder="Ej: 3.2"></div>' +
    '<div class="form-group"><label class="form-label">Categoría *</label><select class="form-select" id="doc-categoria">' +
    '<option value="">Seleccionar...</option>' +
    '<option value="procedimiento">Procedimiento</option>' +
    '<option value="formato">Formato</option>' +
    '<option value="manual">Manual</option>' +
    '<option value="instructivo">Instructivo</option>' +
    '<option value="otro">Otro</option></select></div>' +
    '<div class="form-group"><label class="form-label">Descripción</label><textarea class="form-textarea" id="doc-descripcion" rows="2"></textarea></div>' +
    '<div class="form-group"><label class="form-label">Archivo PDF *</label><input type="file" id="doc-file" accept=".pdf" style="padding:8px;border:1px dashed var(--gray-300);border-radius:8px;width:100%"></div>' +
    '<div id="doc-upload-progress" style="display:none;margin-top:8px"><div style="height:4px;background:var(--gray-200);border-radius:2px;overflow:hidden"><div id="doc-progress-bar" style="height:100%;background:var(--yellow);width:0%;transition:width .3s"></div></div></div>' +
    '</div>' +
    '<div class="modal-footer"><button class="btn btn-secondary" onclick="document.getElementById(\'modal-subir-doc\').style.display=\'none\'">Cancelar</button>' +
    '<button class="btn btn-primary" id="doc-btn-subir" onclick="window.subirDocumento()">Subir</button></div></div>';
  document.body.appendChild(m);
};

window.subirDocumento = async function () {
  const nombre = document.getElementById('doc-nombre')?.value.trim();
  const codigo = document.getElementById('doc-codigo')?.value.trim();
  const version = document.getElementById('doc-version')?.value.trim();
  const categoria = document.getElementById('doc-categoria')?.value;
  const descripcion = document.getElementById('doc-descripcion')?.value.trim();
  const fileInput = document.getElementById('doc-file');
  const btn = document.getElementById('doc-btn-subir');

  if (!nombre || !categoria) { showToast('error', 'Nombre y categoría son obligatorios'); return; }
  if (!fileInput || !fileInput.files || !fileInput.files[0]) { showToast('error', 'Selecciona un archivo PDF'); return; }

  const file = fileInput.files[0];
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    showToast('error', 'Solo archivos PDF'); return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Subiendo...';
  document.getElementById('doc-upload-progress').style.display = 'block';

  try {
    // Subir a Firebase Storage
    const safeName = nombre.replace(/[^a-zA-Z0-9\u00C0-\u017F\-_]/g, '_').substring(0, 50);
    const storagePath = 'documentos/' + categoria + '/' + Date.now() + '_' + safeName + '.pdf';
    const fileRef = ref(window.storage, storagePath);

    await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(fileRef);

    // Guardar metadatos en Firestore
    await addDoc(collection(db, 'documentos'), {
      nombre,
      codigo: codigo || null,
      version: version || null,
      categoria,
      descripcion: descripcion || null,
      url: downloadUrl,
      storagePath,
      fechaSubida: serverTimestamp(),
      subidoPor: window.nombreUsuario || 'Anónimo',
      proyecto: window._proyectoActivo?.id || null
    });

    showToast('success', 'Documento subido correctamente');
    document.getElementById('modal-subir-doc').style.display = 'none';

    // Limpiar formulario
    document.getElementById('doc-nombre').value = '';
    document.getElementById('doc-codigo').value = '';
    document.getElementById('doc-version').value = '';
    document.getElementById('doc-categoria').value = '';
    document.getElementById('doc-descripcion').value = '';
    document.getElementById('doc-file').value = '';

    // Recargar
    window.cargarDocumentos();

  } catch (e) {
    window._handleError && window._handleError('subirDocumento', e);
    showToast('error', 'Error al subir: ' + (e.message || 'desconocido'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Subir';
    document.getElementById('doc-upload-progress').style.display = 'none';
    document.getElementById('doc-progress-bar').style.width = '0%';
  }
};

// ═══════════════════════════════════════════════
//  ELIMINAR DOCUMENTO (Admin)
// ═══════════════════════════════════════════════
window.eliminarDocumento = async function (id) {
  if (window.rolActivo !== 'admin') { showToast('error', 'Solo admin puede eliminar'); return; }
  if (!confirm('¿Eliminar este documento permanentemente?')) return;

  try {
    const s = await getDoc(doc(db, 'documentos', id));
    if (!s.exists()) { showToast('error', 'Documento no encontrado'); return; }

    const data = s.data();

    // Eliminar de Storage
    if (data.storagePath) {
      try { await deleteObject(ref(window.storage, data.storagePath)); } catch (e) { console.warn('Storage delete:', e); }
    }

    // Eliminar de Firestore
    await deleteDoc(doc(db, 'documentos', id));
    showToast('success', 'Documento eliminado');
    window.cargarDocumentos();

  } catch (e) {
    window._handleError && window._handleError('eliminarDocumento', e);
    showToast('error', 'Error al eliminar');
  }
};

// ═══════════════════════════════════════════════
//  INIT DOCUMENTOS PAGE
// ═══════════════════════════════════════════════
window.initDocumentosPage = function () {
  window.cargarDocumentos();
};

// ═══════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('docs-search');
  const filterSelect = document.getElementById('docs-filter-cat');

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(window._docsSearchTimeout);
      window._docsSearchTimeout = setTimeout(window.cargarDocumentos, 300);
    });
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', window.cargarDocumentos);
  }
});

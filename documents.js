const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,Timestamp=window.Timestamp;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;

const CATEGORIAS={
  procedimiento:{icon:'🔧',label:'Procedimientos',color:'#0d47a1'},
  formato:{icon:'📋',label:'Formatos',color:'#1b5e20'},
  manual:{icon:'📘',label:'Manuales',color:'#e65100'},
  instructivo:{icon:'📑',label:'Instructivos',color:'#4a148c'},
  otro:{icon:'📄',label:'Otro',color:'#37474f'}
};

var _docsCache=[];
var _docsCatActiva='todos';

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
window.initDocumentosPage=function(){
  window.docsVolverMenu();
  // Mostrar botón subir si es admin
  if(window.rolActivo==='admin'){
    var b1=document.getElementById('doc-btn-subir-menu');
    var b2=document.getElementById('doc-btn-subir-lista');
    if(b1)b1.style.display='inline-flex';
    if(b2)b2.style.display='inline-flex';
  }
};

// ═══════════════════════════════════════════════
//  MENÚ ↔ LISTA
// ═══════════════════════════════════════════════
window.docsVerCategoria=function(cat){
  _docsCatActiva=cat;
  document.getElementById('docs-menu').style.display='none';
  document.getElementById('docs-lista').style.display='block';
  var titulo=cat==='todos'?'Todos los documentos':(CATEGORIAS[cat]?.label||cat);
  document.getElementById('docs-cat-titulo').textContent=titulo;
  window.cargarDocumentos(cat);
};

window.docsVolverMenu=function(){
  document.getElementById('docs-menu').style.display='block';
  document.getElementById('docs-lista').style.display='none';
  _docsCatActiva='todos';
};

// ═══════════════════════════════════════════════
//  CARGAR DOCUMENTOS
// ═══════════════════════════════════════════════
window.cargarDocumentos=async function(cat){
  var cont=document.getElementById('documentos-grid');
  if(!cont)return;
  cont.innerHTML='<div class="eq-loading">Cargando documentos...</div>';

  try{
    var q;
    if(cat&&cat!=='todos'){
      q=query(collection(db,'documentos'),where('categoria','==',cat),orderBy('fechaSubida','desc'),limit(50));
    }else{
      q=query(collection(db,'documentos'),orderBy('fechaSubida','desc'),limit(50));
    }
    var snap=await getDocs(q);
    var docs=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
    _docsCache=docs;

    if(docs.length===0){
      cont.innerHTML='<div class="eq-empty" style="grid-column:1/-1"><i class="bi bi-folder-x" style="font-size:40px;color:var(--gray-300)"></i><p>Sin documentos en esta categoría</p><p style="font-size:12px;color:var(--gray-400)">Los administradores pueden subir documentos desde el botón "Subir"</p></div>';
      return;
    }
    window.docsRenderizar(docs);
  }catch(e){
    window._handleError&&window._handleError('cargarDocumentos',e);
    cont.innerHTML='<div class="eq-empty" style="grid-column:1/-1"><i class="bi bi-exclamation-triangle" style="font-size:40px;color:var(--red)"></i><p>Error al cargar documentos</p></div>';
  }
};

window.docsRenderizar=function(docs){
  var cont=document.getElementById('documentos-grid');
  if(!cont)return;
  cont.innerHTML=docs.map(function(d){
    var cat=CATEGORIAS[d.categoria]||CATEGORIAS.otro;
    var fecha=d.fechaSubida?.toDate?.()||d.fechaSubida;
    var fechaStr=fecha?new Date(fecha).toLocaleDateString('es-CO'):'Sin fecha';
    var esAdmin=window.rolActivo==='admin';
    return '<div class="doc-card" data-id="'+d.id+'" style="background:var(--white);border:1px solid var(--gray-200);border-radius:12px;padding:20px;transition:all .2s;cursor:pointer;position:relative">'+
      '<span class="doc-card-tag" style="position:absolute;top:12px;right:12px;background:'+cat.color+'15;color:'+cat.color+';padding:3px 10px;border-radius:8px;font-size:10px;font-weight:700;text-transform:uppercase">'+cat.label+'</span>'+
      '<div style="width:48px;height:48px;border-radius:12px;background:'+cat.color+'10;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:12px">'+cat.icon+'</div>'+
      '<div style="font-family:Space Grotesk,sans-serif;font-weight:700;font-size:15px;color:var(--navy);margin-bottom:4px;line-height:1.3">'+(d.nombre||'Sin nombre')+'</div>'+
      '<div style="font-size:12px;color:var(--gray-400);font-weight:500">'+(d.codigo||'—')+(d.version?' · v'+d.version:'')+'</div>'+
      '<div style="font-size:11px;color:var(--gray-400);margin-top:8px;padding-top:10px;border-top:1px solid var(--gray-100);display:flex;justify-content:space-between;align-items:center">'+
        '<span>'+fechaStr+'</span>'+
        '<span style="display:flex;gap:6px">'+
          '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();window.descargarDocumento(\''+d.id+'\')" title="Descargar"><i class="bi bi-download"></i></button>'+
          (esAdmin?'<button class="btn btn-sm" style="border:1px solid var(--gray-200);background:var(--white);color:var(--red)" onclick="event.stopPropagation();window.eliminarDocumento(\''+d.id+'\')" title="Eliminar"><i class="bi bi-trash"></i></button>':'')+
        '</span></div></div>';
  }).join('');
};

// ═══════════════════════════════════════════════
//  BÚSQUEDA
// ═══════════════════════════════════════════════
window.docsBuscar=function(term){
  term=term.toLowerCase().trim();
  if(!term){window.docsRenderizar(_docsCache);return;}
  var filtered=_docsCache.filter(function(d){
    return (d.nombre||'').toLowerCase().includes(term)||
           (d.codigo||'').toLowerCase().includes(term)||
           (d.descripcion||'').toLowerCase().includes(term);
  });
  window.docsRenderizar(filtered);
};

// ═══════════════════════════════════════════════
//  DESCARGAR
// ═══════════════════════════════════════════════
window.descargarDocumento=async function(id){
  try{
    var docData=_docsCache.find(function(x){return x.id===id;});
    if(!docData){
      var s=await getDoc(doc(db,'documentos',id));
      if(!s.exists()){showToast('error','Documento no encontrado');return;}
      docData=Object.assign({id:s.id},s.data());
    }
    if(!docData.url){showToast('error','URL no disponible');return;}
    var a=document.createElement('a');
    a.href=docData.url;
    a.target='_blank';
    a.download=(docData.nombre||'documento')+'.pdf';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){a.remove();},100);
    showToast('success','Descargando: '+(docData.nombre||'documento'));
  }catch(e){
    window._handleError&&window._handleError('descargarDocumento',e);
    showToast('error','Error al descargar');
  }
};

// ═══════════════════════════════════════════════
//  SUBIR (Admin)
// ═══════════════════════════════════════════════
window.mostrarModalSubirDoc=function(){
  if(window.rolActivo!=='admin'){showToast('error','Solo admin puede subir documentos');return;}
  var modal=document.getElementById('modal-subir-doc');
  if(modal){modal.style.display='flex';return;}
  var m=document.createElement('div');
  m.id='modal-subir-doc';
  m.className='modal-overlay';
  m.innerHTML='<div class="modal-card" style="max-width:500px">'+
    '<div class="modal-header"><h3>📤 Subir Documento</h3>'+
    '<button class="modal-close" onclick="document.getElementById(\'modal-subir-doc\').style.display=\'none\'">&#10005;</button></div>'+
    '<div class="modal-body">'+
    '<div class="form-group"><label class="form-label">Nombre *</label><input class="form-input" id="doc-nombre" placeholder="Ej: Programa de Mantenimiento"></div>'+
    '<div class="form-group"><label class="form-label">Código</label><input class="form-input" id="doc-codigo" placeholder="Ej: A4-PR-001"></div>'+
    '<div class="form-group"><label class="form-label">Versión</label><input class="form-input" id="doc-version" placeholder="Ej: 3.2"></div>'+
    '<div class="form-group"><label class="form-label">Categoría *</label><select class="form-select" id="doc-categoria">'+
    '<option value="">Seleccionar...</option>'+
    '<option value="procedimiento">Procedimiento</option>'+
    '<option value="formato">Formato</option>'+
    '<option value="manual">Manual</option>'+
    '<option value="instructivo">Instructivo</option>'+
    '<option value="otro">Otro</option></select></div>'+
    '<div class="form-group"><label class="form-label">Descripción</label><textarea class="form-textarea" id="doc-descripcion" rows="2"></textarea></div>'+
    '<div class="form-group"><label class="form-label">Archivo PDF *</label><input type="file" id="doc-file" accept=".pdf" style="padding:8px;border:1px dashed var(--gray-300);border-radius:8px;width:100%"></div>'+
    '</div>'+
    '<div class="modal-footer"><button class="btn btn-secondary" onclick="document.getElementById(\'modal-subir-doc\').style.display=\'none\'">Cancelar</button>'+
    '<button class="btn btn-primary" id="doc-btn-subir" onclick="window.subirDocumento()">Subir</button></div></div>';
  document.body.appendChild(m);
};

window.subirDocumento=async function(){
  var nombre=document.getElementById('doc-nombre')?.value.trim();
  var codigo=document.getElementById('doc-codigo')?.value.trim();
  var version=document.getElementById('doc-version')?.value.trim();
  var categoria=document.getElementById('doc-categoria')?.value;
  var descripcion=document.getElementById('doc-descripcion')?.value.trim();
  var fileInput=document.getElementById('doc-file');
  var btn=document.getElementById('doc-btn-subir');

  if(!nombre||!categoria){showToast('error','Nombre y categoría son obligatorios');return;}
  if(!fileInput||!fileInput.files||!fileInput.files[0]){showToast('error','Selecciona un archivo PDF');return;}

  var file=fileInput.files[0];
  if(file.type!=='application/pdf'&&!file.name.endsWith('.pdf')){showToast('error','Solo archivos PDF');return;}

  btn.disabled=true;
  btn.innerHTML='<i class="bi bi-hourglass-split"></i> Subiendo...';

  try{
    var safeName=nombre.replace(/[^a-zA-Z0-9\u00C0-\u017F\-_]/g,'_').substring(0,50);
    var storagePath='documentos/'+categoria+'/'+Date.now()+'_'+safeName+'.pdf';
    var fileRef=ref(window.storage,storagePath);
    await uploadBytes(fileRef,file);
    var downloadUrl=await getDownloadURL(fileRef);

    await addDoc(collection(db,'documentos'),{
      nombre,codigo:codigo||null,version:version||null,categoria,
      descripcion:descripcion||null,url:downloadUrl,storagePath,
      fechaSubida:serverTimestamp(),
      subidoPor:window.nombreUsuario||'Anónimo',
      proyecto:window._proyectoActivo?.id||null
    });

    showToast('success','Documento subido correctamente');
    document.getElementById('modal-subir-doc').style.display='none';
    document.getElementById('doc-nombre').value='';
    document.getElementById('doc-codigo').value='';
    document.getElementById('doc-version').value='';
    document.getElementById('doc-categoria').value='';
    document.getElementById('doc-descripcion').value='';
    document.getElementById('doc-file').value='';

    // Recargar lista si estamos viendo una categoría
    if(_docsCatActiva!=='todos')window.cargarDocumentos(_docsCatActiva);
  }catch(e){
    window._handleError&&window._handleError('subirDocumento',e);
    showToast('error','Error al subir: '+(e.message||'desconocido'));
  }finally{
    btn.disabled=false;
    btn.innerHTML='Subir';
  }
};

// ═══════════════════════════════════════════════
//  ELIMINAR (Admin)
// ═══════════════════════════════════════════════
window.eliminarDocumento=async function(id){
  if(window.rolActivo!=='admin'){showToast('error','Solo admin puede eliminar');return;}
  if(!confirm('¿Eliminar este documento permanentemente?'))return;
  try{
    var s=await getDoc(doc(db,'documentos',id));
    if(!s.exists()){showToast('error','Documento no encontrado');return;}
    var data=s.data();
    if(data.storagePath){
      try{await deleteObject(ref(window.storage,data.storagePath));}catch(e){console.warn('Storage delete:',e);}
    }
    await deleteDoc(doc(db,'documentos',id));
    showToast('success','Documento eliminado');
    window.cargarDocumentos(_docsCatActiva);
  }catch(e){
    window._handleError&&window._handleError('eliminarDocumento',e);
    showToast('error','Error al eliminar');
  }
};

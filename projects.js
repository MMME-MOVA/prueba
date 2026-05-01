// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

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
      }catch(e){if(window._handleError)window._handleError("projQuery_"+v,e);}
    }
  }
  if(!result)result=await getDocs(collection(db,colName));
  _fsCache[ckey]=result;
  _fsCacheTs[ckey]=now;
  return result;
}
// Clear FS cache on project change
function clearFsCache(){_fsCache={};_fsCacheTs={};}


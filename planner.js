// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== PLANNER (Microsoft Planner Hub) =====
window._planes=[];

async function plCargar(){
  try{
    var snap=await getDocs(collection(db,'planner_planes'));
    window._planes=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
    window._planes.sort(function(a,b){
      var fa=a.creado&&a.creado.toDate?a.creado.toDate().getTime():0;
      var fb=b.creado&&b.creado.toDate?b.creado.toDate().getTime():0;
      return fb-fa;
    });
  }catch(e){console.warn('plCargar:',e);window._planes=[];}
}

window.initPlannerPage=async function(){
  // Render proj bar
  if(typeof renderProjBtns==='function')renderProjBtns('planner-proj-btns');
  await plCargar();
  plRender();
};

function plRender(){
  var grid=document.getElementById('planner-grid');if(!grid)return;
  var planes=window._planes;
  if(window._proyectoActivo){
    var pn=window._proyectoActivo.nombre;
    planes=planes.filter(function(p){return !p.proyecto||p.proyecto===pn;});
  }
  if(!planes.length){
    grid.innerHTML='<div class="pl-empty"><i class="bi bi-clipboard-x" style="font-size:48px;display:block;margin-bottom:14px;opacity:.4"></i><p style="font-size:13px;margin-bottom:14px">No hay planes registrados</p><button onclick="window.plNuevoPlan()" style="padding:9px 18px;background:#5b21b6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">Agregar primer plan</button></div>';
    return;
  }
  grid.innerHTML='';
  planes.forEach(function(p){
    var total=parseInt(p.total)||0;
    var compl=parseInt(p.completadas)||0;
    var curso=parseInt(p.curso)||0;
    var pct=total>0?Math.round(compl/total*100):0;
    var hht=parseFloat(p.hht)||0;
    var rep=parseFloat(p.repuestos)||0;
    var entrega=p.fechaEntrega||'';
    var diasRestantes=null;
    if(entrega){
      try{var fE=new Date(entrega);var hoy=new Date();diasRestantes=Math.floor((fE-hoy)/(1000*60*60*24));}catch(e){window._handleError&&window._handleError('plannerFecha',e);}
    }
    var alertaEntrega='';
    if(diasRestantes!==null){
      if(diasRestantes<0)alertaEntrega='<span style="color:#dc2626;font-weight:700">Atrasado '+Math.abs(diasRestantes)+'d</span>';
      else if(diasRestantes<=7)alertaEntrega='<span style="color:#ea580c;font-weight:700">'+diasRestantes+'d restantes</span>';
      else alertaEntrega='<span>'+diasRestantes+'d restantes</span>';
    }
    var card=document.createElement('div');
    card.className='pl-card';
    var inner=
      '<div class="pl-card-header">'
      +'<div class="pl-card-proj">'+(p.proyecto||'General')+'</div>'
      +'<div class="pl-card-title">'+(p.nombre||'Sin nombre')+'</div>'
      +'</div>'
      +'<div class="pl-card-body">'
      +(p.descripcion?'<div style="font-size:12px;color:var(--gray-500);margin-bottom:12px;line-height:1.45">'+p.descripcion+'</div>':'')
      +'<div class="pl-card-stats">'
      +'<div class="pl-stat"><div class="pl-stat-val">'+total+'</div><div class="pl-stat-lbl">Tareas</div></div>'
      +'<div class="pl-stat"><div class="pl-stat-val green">'+compl+'</div><div class="pl-stat-lbl">Hechas</div></div>'
      +'<div class="pl-stat"><div class="pl-stat-val orange">'+curso+'</div><div class="pl-stat-lbl">En Curso</div></div>'
      +'</div>'
      +'<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:var(--gray-500);margin-bottom:4px"><span>Progreso</span><span style="color:var(--navy);font-weight:700">'+pct+'%</span></div>'
      +'<div class="pl-progress-bar"><div class="pl-progress-fill" style="width:'+pct+'%"></div></div>'
      +'<div class="pl-card-meta">'
      +'<span>⚙️ HHT: <strong>'+hht.toFixed(1)+'h</strong></span>'
      +(rep>0?'<span>🔧 '+(rep>=1000000?'$'+(rep/1000000).toFixed(1)+'M':rep>=1000?'$'+Math.round(rep/1000)+'k':'$'+rep)+'</span>':'')
      +'</div>'
      +(alertaEntrega?'<div class="pl-card-meta" style="margin-top:6px"><span>📅 Entrega: '+entrega+'</span>'+alertaEntrega+'</div>':'')
      +'</div>'
      +'<div class="pl-card-actions">'
      +(p.url?'<a class="pl-btn-open" href="'+p.url+'" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i> Abrir en Planner</a>':'<button class="pl-btn-open" disabled style="opacity:.4;cursor:not-allowed">Sin URL</button>')
      +'<button class="pl-btn-edit" data-id="'+p.id+'" onclick="window.plEditar(this.dataset.id)" title="Editar"><i class="bi bi-pencil"></i></button>'
      +'<button class="pl-btn-del" data-id="'+p.id+'" onclick="window.plEliminar(this.dataset.id)" title="Eliminar"><i class="bi bi-trash"></i></button>'
      +'</div>';
    card.innerHTML=inner;
    grid.appendChild(card);
  });
}

window.plNuevoPlan=function(){
  document.getElementById('pl-modal-title').textContent='Nuevo Plan';
  document.getElementById('pl-nombre').value='';
  document.getElementById('pl-url').value='';
  document.getElementById('pl-descripcion').value='';
  document.getElementById('pl-total').value='';
  document.getElementById('pl-completadas').value='';
  document.getElementById('pl-curso').value='';
  document.getElementById('pl-hht').value='';
  document.getElementById('pl-repuestos').value='';
  document.getElementById('pl-fecha-entrega').value='';
  document.getElementById('pl-edit-id').value='';
  document.getElementById('pl-modal-overlay').style.display='flex';
};

window.plEditar=function(id){
  var p=window._planes.find(function(x){return x.id===id;});if(!p)return;
  document.getElementById('pl-modal-title').textContent='Editar Plan';
  document.getElementById('pl-nombre').value=p.nombre||'';
  document.getElementById('pl-url').value=p.url||'';
  document.getElementById('pl-descripcion').value=p.descripcion||'';
  document.getElementById('pl-total').value=p.total||'';
  document.getElementById('pl-completadas').value=p.completadas||'';
  document.getElementById('pl-curso').value=p.curso||'';
  document.getElementById('pl-hht').value=p.hht||'';
  document.getElementById('pl-repuestos').value=p.repuestos||'';
  document.getElementById('pl-fecha-entrega').value=p.fechaEntrega||'';
  document.getElementById('pl-edit-id').value=id;
  document.getElementById('pl-modal-overlay').style.display='flex';
};

window.plGuardar=async function(){
  var nombre=document.getElementById('pl-nombre').value.trim();
  var url=document.getElementById('pl-url').value.trim();
  var editId=document.getElementById('pl-edit-id').value;
  if(!nombre){showToast('error','El nombre es obligatorio');return;}
  if(!url){showToast('error','La URL de Planner es obligatoria');return;}
  try{
    var data={
      nombre:nombre,
      url:url,
      descripcion:document.getElementById('pl-descripcion').value.trim(),
      total:parseInt(document.getElementById('pl-total').value)||0,
      completadas:parseInt(document.getElementById('pl-completadas').value)||0,
      curso:parseInt(document.getElementById('pl-curso').value)||0,
      hht:parseFloat(document.getElementById('pl-hht').value)||0,
      repuestos:parseFloat(document.getElementById('pl-repuestos').value)||0,
      fechaEntrega:document.getElementById('pl-fecha-entrega').value,
      proyecto:window._proyectoActivo?window._proyectoActivo.nombre:'',
      actualizado:serverTimestamp(),
      actualizadoPor:window.nombreOperador||'-'
    };
    if(editId){
      await setDoc(doc(db,'planner_planes',editId),data,{merge:true});
    }else{
      data.creado=serverTimestamp();
      await addDoc(collection(db,'planner_planes'),data);
    }
    document.getElementById('pl-modal-overlay').style.display='none';
    showToast('success','Plan guardado');
    await plCargar();plRender();
  }catch(e){showToast('error','Error: '+e.message);}
};

window.plEliminar=async function(id){
  if(!confirm('¿Eliminar este plan?'))return;
  try{
    await deleteDoc(doc(db,'planner_planes',id));
    showToast('success','Plan eliminado');
    await plCargar();plRender();
  }catch(e){showToast('error','Error: '+e.message);}
};


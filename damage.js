// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

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


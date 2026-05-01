// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== NOVEDADES =====
window._novedades=[];
window._novFotoTemp=null;
window._novPdfTemp=null;
window._novFiltroCat='';
window._novCarouselIdx=0;
window._novCarouselTimer=null;

var NOV_LABELS={capacitaciones:'Capacitaciones',anuncios:'Anuncios',recordatorios:'Recordatorios',galeria:'Galería'};
var NOV_ICONS={capacitaciones:'🎓',anuncios:'📣',recordatorios:'⏰',galeria:'📷'};

async function novCargar(){
  try{
    var snap=await getDocs(query(collection(db,'novedades'),orderBy("fecha","desc"),limit(50)));
    window._novedades=snap.docs.map(function(d){return Object.assign({id:d.id},d.data());});
    window._novedades.sort(function(a,b){
      var fa=a.fecha&&a.fecha.toDate?a.fecha.toDate().getTime():0;
      var fb=b.fecha&&b.fecha.toDate?b.fecha.toDate().getTime():0;
      return fb-fa;
    });
  }catch(e){console.warn('novCargar:',e);window._novedades=[];}
}

window.initNovedadesPage=async function(){
  await novCargar();
  novRenderGrid();
};

window.novFiltrar=function(el,cat){
  document.querySelectorAll('.nov-categoria-pill').forEach(function(p){p.classList.remove('active');});
  el.classList.add('active');
  window._novFiltroCat=cat;
  novRenderGrid();
};

function novRenderGrid(){
  var grid=document.getElementById('nov-grid');if(!grid)return;
  var items=window._novedades;
  if(window._novFiltroCat)items=items.filter(function(n){return n.categoria===window._novFiltroCat;});
  var cnt=document.getElementById('nov-count');
  if(cnt)cnt.textContent=items.length+' novedad(es)';
  if(!items.length){
    grid.innerHTML='<div class="eq-empty" style="grid-column:1/-1;text-align:center;padding:60px"><i class="bi bi-megaphone" style="font-size:48px;color:var(--gray-300);display:block;margin-bottom:12px"></i><p class="u-color-gray-400">No hay novedades. Publica la primera.</p></div>';
    return;
  }
  grid.innerHTML='';
  items.forEach(function(n){
    var fecha=n.fecha&&n.fecha.toDate?n.fecha.toDate().toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}):'—';
    var bgImg=n.foto?'background-image:url('+n.foto+')':'background:linear-gradient(135deg,#1e1b4b,#312e81)';
    var iconCat=NOV_ICONS[n.categoria]||'📌';
    var tagColor={capacitaciones:'#22c55e',anuncios:'#f59e0b',recordatorios:'#3b82f6',galeria:'#a855f7'}[n.categoria]||'#6b7280';
    var card=document.createElement('div');
    card.className='nov-item';
    card.dataset.id=n.id;
    card.innerHTML=
      '<div class="nov-item-img" style="'+bgImg+';background-size:cover;background-position:center">'
      +'<span class="nov-item-tag" style="background:'+tagColor+'">'+iconCat+' '+(NOV_LABELS[n.categoria]||n.categoria)+'</span>'
      +'<button class="nov-item-edit" data-id="'+n.id+'" onclick="event.stopPropagation();window.novEditar(this.dataset.id)" title="Editar"><i class="bi bi-pencil"></i></button>'
      +'<button class="nov-item-del" data-id="'+n.id+'" onclick="event.stopPropagation();window.novEliminar(this.dataset.id)" title="Eliminar">✕</button>'
      +(n.foto?'':'<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.4);font-size:48px">'+iconCat+'</div>')
      +'</div>'
      +'<div class="nov-item-body">'
      +'<div class="nov-item-title">'+(n.titulo||'Sin título')+'</div>'
      +'<div class="nov-item-desc">'+(n.descripcion||'')+'</div>'
      +'<div class="nov-item-meta"><span>'+fecha+'</span><span>'+(n.autor||'—')+'</span></div>'
      +'</div>';
    card.onclick=function(){window.novVerDetalle(n.id);};
    grid.appendChild(card);
  });
}

window.novVerDetalle=function(id){
  var n=window._novedades.find(function(x){return x.id===id;});if(!n)return;
  var img=document.getElementById('nov-lightbox-img');
  if(n.foto){img.src=n.foto;img.style.display='block';}else{img.style.display='none';}
  var tag=document.getElementById('nov-lightbox-tag');
  tag.textContent=(NOV_ICONS[n.categoria]||'📌')+' '+(NOV_LABELS[n.categoria]||n.categoria);
  tag.className='nov-slide-tag '+(n.categoria||'');
  document.getElementById('nov-lightbox-title').textContent=n.titulo||'Sin título';
  document.getElementById('nov-lightbox-desc').textContent=n.descripcion||'';
  var pdfDiv=document.getElementById('nov-lightbox-pdf');
  if(n.pdfUrl&&pdfDiv){
    pdfDiv.style.display='block';
    var a=document.getElementById('nov-lightbox-pdf-link');
    if(a){a.href=n.pdfUrl;a.download=n.pdfNombre||'novedad.pdf';}
  }else if(pdfDiv){pdfDiv.style.display='none';}
  var fecha=n.fecha&&n.fecha.toDate?n.fecha.toDate().toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'}):'—';
  document.getElementById('nov-lightbox-meta').innerHTML='<strong>Publicado:</strong> '+fecha+' · <strong>Por:</strong> '+(n.autor||'—');
  document.getElementById('nov-lightbox').style.display='flex';
};

window.novNueva=function(){
  document.getElementById('nov-modal-title').textContent='Nueva Novedad';
  document.getElementById('nov-titulo').value='';
  document.getElementById('nov-descripcion').value='';
  document.getElementById('nov-categoria').value='capacitaciones';
  document.getElementById('nov-edit-id').value='';
  document.getElementById('nov-foto-preview').src='';
  document.getElementById('nov-foto-preview').style.display='none';
  window._novFotoTemp=null;window._novPdfTemp=null;
  var pdfLbl=document.getElementById('nov-pdf-label');if(pdfLbl)pdfLbl.textContent='Click para subir PDF';
  document.getElementById('nov-modal-overlay').style.display='flex';
};

window.novEditar=function(id){
  var n=window._novedades.find(function(x){return x.id===id;});if(!n)return;
  document.getElementById('nov-modal-title').textContent='Editar Novedad';
  document.getElementById('nov-titulo').value=n.titulo||'';
  document.getElementById('nov-descripcion').value=n.descripcion||'';
  document.getElementById('nov-categoria').value=n.categoria||'capacitaciones';
  document.getElementById('nov-edit-id').value=id;
  var prev=document.getElementById('nov-foto-preview');
  if(n.foto){prev.src=n.foto;prev.style.display='block';window._novFotoTemp=n.foto;}
  else{prev.src='';prev.style.display='none';window._novFotoTemp=null;}
  // PDF
  var pdfLbl=document.getElementById('nov-pdf-label');
  if(n.pdfUrl){window._novPdfTemp={url:n.pdfUrl,nombre:n.pdfNombre||'documento.pdf'};if(pdfLbl)pdfLbl.textContent='✓ '+(n.pdfNombre||'documento.pdf');}
  else{window._novPdfTemp=null;if(pdfLbl)pdfLbl.textContent='Click para subir PDF';}
  document.getElementById('nov-modal-overlay').style.display='flex';
};

window.novCargarPDF=function(input){
  var f=input.files[0];if(!f)return;
  if(f.size>4*1024*1024){showToast('error','PDF supera 4MB');input.value='';return;}
  var reader=new FileReader();
  reader.onload=function(e){
    window._novPdfTemp={url:e.target.result,nombre:f.name};
    var lbl=document.getElementById('nov-pdf-label');
    if(lbl)lbl.textContent='✓ '+f.name;
  };
  reader.readAsDataURL(f);
  input.value='';
};

window.novCargarFoto=function(input){
  var file=input.files[0];if(!file)return;
  if(file.size>3*1024*1024){showToast('error','Imagen supera 3MB');return;}
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      // Compress to ~500KB max
      var canvas=document.createElement('canvas');
      var maxW=1280,maxH=720;
      var w=img.width,h=img.height;
      if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
      if(h>maxH){w=Math.round(w*maxH/h);h=maxH;}
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      var dataUrl=canvas.toDataURL('image/jpeg',0.82);
      window._novFotoTemp=dataUrl;
      var prev=document.getElementById('nov-foto-preview');
      prev.src=dataUrl;prev.style.display='block';
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
  input.value='';
};

window.novGuardar=async function(){
  var titulo=document.getElementById('nov-titulo').value.trim();
  var descripcion=document.getElementById('nov-descripcion').value.trim();
  var categoria=document.getElementById('nov-categoria').value;
  var editId=document.getElementById('nov-edit-id').value;
  if(!titulo){showToast('error','El título es obligatorio');return;}
  if(!descripcion){showToast('error','La descripción es obligatoria');return;}
  try{
    var data={
      titulo:titulo,
      descripcion:descripcion,
      categoria:categoria,
      foto:window._novFotoTemp||'',
      pdfUrl:window._novPdfTemp?window._novPdfTemp.url:'',
      pdfNombre:window._novPdfTemp?window._novPdfTemp.nombre:'',
      autor:window.nombreOperador||'-',
      actualizado:serverTimestamp()
    };
    if(editId){
      await setDoc(doc(db,'novedades',editId),data,{merge:true});
    }else{
      data.fecha=serverTimestamp();
      await addDoc(collection(db,'novedades'),data);
    }
    document.getElementById('nov-modal-overlay').style.display='none';
    showToast('success','Novedad publicada');
    await novCargar();
    novRenderGrid();
    // Refrescar carrusel del inicio si existe
    if(window.initNovCarousel)window.initNovCarousel();
  }catch(e){showToast('error','Error: '+e.message);}
};

window.novEliminar=async function(id){
  if(!confirm('¿Eliminar esta novedad?'))return;
  try{
    await deleteDoc(doc(db,'novedades',id));
    showToast('success','Novedad eliminada');
    await novCargar();
    novRenderGrid();
    if(window.initNovCarousel)window.initNovCarousel();
  }catch(e){showToast('error','Error: '+e.message);}
};

// ── Carrusel del inicio ──
window.initNovCarousel=async function(){
  var c=document.getElementById('inicio-nov-carousel');if(!c)return;
  if(!window._novedades.length)await novCargar();
  // Usar las 6 más recientes
  var items=window._novedades.slice(0,6);
  if(!items.length){
    c.innerHTML='<div class="nov-empty"><i class="bi bi-megaphone" style="font-size:32px"></i><span style="font-size:12px">Aún no hay novedades publicadas</span></div>';
    return;
  }
  var html='';
  items.forEach(function(n,i){
    var fecha=n.fecha&&n.fecha.toDate?n.fecha.toDate().toLocaleDateString('es-CO',{day:'2-digit',month:'short'}):'';
    var bg=n.foto?'background-image:url('+n.foto+')':'background:linear-gradient(135deg,#7c3aed,#a855f7)';
    var iconCat=NOV_ICONS[n.categoria]||'📌';
    html+='<div class="nov-slide'+(i===0?' active':'')+'">'
      +'<div class="nov-slide-img" style="'+bg+'">'+(n.foto?'':'<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:48px;color:rgba(255,255,255,.7)">'+iconCat+'</div>')+'</div>'
      +'<div class="nov-slide-content">'
      +'<div>'
      +'<span class="nov-slide-tag '+(n.categoria||'')+'">'+iconCat+' '+(NOV_LABELS[n.categoria]||n.categoria)+'</span>'
      +'<div class="nov-slide-title">'+(n.titulo||'')+'</div>'
      +'<div class="nov-slide-desc">'+(n.descripcion||'')+'</div>'
      +'</div>'
      +'<div class="nov-slide-meta">'+fecha+(n.autor?' · '+n.autor:'')+'</div>'
      +'</div>'
      +'</div>';
  });
  // Dots
  html+='<div class="galeria-dots" style="bottom:6px">';
  for(var i=0;i<items.length;i++)html+='<div class="galeria-dot'+(i===0?' active':'')+'" onclick="novCarouselGo('+i+')"></div>';
  html+='</div>';
  // Click to open detail
  c.innerHTML=html;
  c.onclick=function(e){
    if(e.target.classList&&e.target.classList.contains('galeria-dot'))return;
    var idx=window._novCarouselIdx;
    if(items[idx])window.novVerDetalle(items[idx].id);
  };
  window._novCarouselIdx=0;
  if(window._novCarouselTimer)clearInterval(window._novCarouselTimer);
  window._novCarouselTimer=setInterval(function(){novCarouselNav(1,items.length);},5000);
};

function novCarouselNav(dir,total){
  var c=document.getElementById('inicio-nov-carousel');if(!c)return;
  var slides=c.querySelectorAll('.nov-slide');
  var dots=c.querySelectorAll('.galeria-dot');
  if(!slides.length)return;
  slides[window._novCarouselIdx].classList.remove('active');
  if(dots[window._novCarouselIdx])dots[window._novCarouselIdx].classList.remove('active');
  window._novCarouselIdx=(window._novCarouselIdx+dir+slides.length)%slides.length;
  slides[window._novCarouselIdx].classList.add('active');
  if(dots[window._novCarouselIdx])dots[window._novCarouselIdx].classList.add('active');
}
window.novCarouselGo=function(idx){
  var c=document.getElementById('inicio-nov-carousel');if(!c)return;
  var slides=c.querySelectorAll('.nov-slide');
  var dir=idx-window._novCarouselIdx;
  if(dir!==0)novCarouselNav(dir,slides.length);
};


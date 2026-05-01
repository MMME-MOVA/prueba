// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== QR DE EQUIPOS =====
window._qrEquipoCema=null;

function qrCheckURL(){
  var params=new URLSearchParams(window.location.search);
  var eq=params.get('eq');
  if(eq){window._qrEquipoCema=eq.toUpperCase().trim();return true;}
  return false;
}

async function qrMostrarMenu(cema){
  if(!cema)return;
  window._qrEquipoCema=cema;
  var info='';
  try{
    var snap=await getDocs(query(collection(db,'equipos'),where('nombre','==',cema)));
    if(!snap.empty){
      var d=snap.docs[0].data();
      info=(d.codigo||'')+' · '+(d.proyecto||'').toUpperCase();
    }else{
      var snap2=await getDocs(query(collection(db,'equipos'),where('codigo','==',cema)));
      if(!snap2.empty){
        var d2=snap2.docs[0].data();
        cema=d2.nombre||cema;
        info=(d2.codigo||'')+' · '+(d2.proyecto||'').toUpperCase();
      }
    }
  }catch(e){window._handleError&&window._handleError('qrInfo',e);}
  document.getElementById('qr-menu-cema').textContent=cema;
  document.getElementById('qr-menu-sub').textContent=info||'Selecciona una accion';
  document.getElementById('qr-menu-overlay').style.display='flex';
}

window.cerrarQRMenu=function(){
  document.getElementById('qr-menu-overlay').style.display='none';
};

window.qrAccion=function(page){
  var cema=window._qrEquipoCema;
  if(cema)sessionStorage.setItem('mova_prefill_cema',cema);
  document.getElementById('qr-menu-overlay').style.display='none';
  window.navTo(page);
  setTimeout(function(){
    var input=document.querySelector('#preop-cema, #falla-cema, #mtto-cema');
    if(input&&cema){
      input.value=cema;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      setTimeout(function(){
        if(typeof cargarEquiposCache==='function'){
          cargarEquiposCache().then(function(equipos){
            var eq=equipos.find(function(e){return (e.nombre||'').toUpperCase()===cema.toUpperCase();});
            if(eq){
              var comeqInput=document.querySelector('#preop-comeq, #falla-comeq, #mtto-nombre');
              if(comeqInput)comeqInput.value=eq.codigo||'';
              var tipoSelect=document.getElementById('preop-tipo');
              if(tipoSelect&&eq.tipo){
                var opt=Array.from(tipoSelect.options).find(function(o){return o.textContent.toLowerCase().includes((eq.tipo||'').toLowerCase());});
                if(opt)tipoSelect.value=opt.value;
              }
            }
          });
        }
      },300);
    }
  },500);
};

window.mostrarQREquipo=function(cema){
  if(!cema){showToast('error','CEMA requerido');return;}
  var modal=document.getElementById('qr-print-modal');
  var canvas=document.getElementById('qr-print-canvas');
  var label=document.getElementById('qr-print-cema');
  canvas.innerHTML='';
  label.textContent=cema;
  var baseUrl=window.location.origin+window.location.pathname;
  var qrUrl=baseUrl+'?eq='+encodeURIComponent(cema);
  if(typeof QRCode!=='undefined'){
    new QRCode(canvas,{text:qrUrl,width:220,height:220,colorDark:'#0f2137',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    modal.style.display='flex';
  }else{showToast('error','Libreria QR no disponible');}
};

window.qrDescargar=function(){
  var canvas=document.querySelector('#qr-print-canvas canvas');
  if(!canvas){showToast('error','Genera primero el QR');return;}
  var cema=document.getElementById('qr-print-cema').textContent;
  var link=document.createElement('a');
  link.download='QR_'+cema+'.png';
  link.href=canvas.toDataURL('image/png');
  link.click();
};

window.qrImprimir=function(){
  var canvas=document.querySelector('#qr-print-canvas canvas');
  if(!canvas){showToast('error','Genera primero el QR');return;}
  var cema=document.getElementById('qr-print-cema').textContent;
  var imgData=canvas.toDataURL('image/png');
  var w=window.open('','_blank');
  w.document.write('<html><head><title>QR '+cema+'</title><style>body{margin:0;padding:40px;text-align:center;font-family:Arial,sans-serif}.label{margin-top:18px;font-size:32px;font-weight:bold}.sub{font-size:14px;color:#666;margin-top:8px}img{width:300px;height:300px}</style></head><body><img src="'+imgData+'"><div class="label">'+cema+'</div><div class="sub">MOVA - Escanea para acciones rapidas</div></body></html>');
  w.document.close();
  setTimeout(function(){w.print();},300);
};

window._qrPendingMenu=function(){
  if(window._qrEquipoCema){
    qrMostrarMenu(window._qrEquipoCema);
    var url=new URL(window.location.href);
    url.searchParams.delete('eq');
    window.history.replaceState({},'',url.toString());
  }
};

qrCheckURL();


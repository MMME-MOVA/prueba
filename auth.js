// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== AUTH =====
onAuthStateChanged(auth, async user => {
  const as = document.getElementById('authScreen');
  if (user) {
    as.classList.add('hidden');
    window.operadorActivo = user.email;

    try {
      const ud = await getDoc(doc(db, "usuarios", user.uid));
      const udata = ud.exists() ? ud.data() : {};

      // Nombre: Firestore > displayName > derivar del correo (fallback)
      window.nombreOperador = udata.nombre || user.displayName
        || user.email.split("@")[0].replace(/\./g," ").replace(/\b\w/g,l=>l.toUpperCase());
      window.rolActivo = udata.rol || 'operador';

      document.getElementById('topbarUserName').textContent = window.nombreOperador;
      document.getElementById('menuUserName').textContent = window.nombreOperador;
      document.getElementById('avatarInitials').textContent = window.nombreOperador.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      aplicarPermisos();

      if (udata.ipe) {
        window.ipeActivo = udata.ipe;
        showToast('success', `Bienvenido, ${window.nombreOperador.split(' ')[0]}`);
      } else {
        window.ipeActivo = null;
        mostrarModalIPE(user.uid, !udata.nombre);
      }
    } catch (e) {
      window.nombreOperador = user.email.split("@")[0].replace(/\./g," ").replace(/\b\w/g,l=>l.toUpperCase());
      document.getElementById('topbarUserName').textContent = window.nombreOperador;
      document.getElementById('menuUserName').textContent = window.nombreOperador;
      document.getElementById('avatarInitials').textContent = window.nombreOperador.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      window.ipeActivo = null;
      mostrarModalIPE(user.uid, true);
    }

    if(window.cargarEquipos) window.cargarEquipos('todos');
    if(window.activarContadoresGlobales) window.activarContadoresGlobales();
    // Check if URL has ?cema= param → redirect to QR equipo screen
    setTimeout(function(){
      var qrCema=window.qrGetCemaFromUrl&&window.qrGetCemaFromUrl();
      if(qrCema){
        window._qrEquipoCema=qrCema;
        window.navTo('qr-equipo');
      }
    },400);
    setTimeout(function(){if(window.initProjBars)window.initProjBars();},800);
    setTimeout(function(){if(typeof window.inicioGaleriaCargar==='function')window.inicioGaleriaCargar();},2000);
    // Cargar KPIs del inicio en segundo plano
    setTimeout(()=>{if(window.loadInicioKPIs)window.loadInicioKPIs();if(window.cargarInicioProxMtto)window.cargarInicioProxMtto();if(window.cargarInicioActividad)window.cargarInicioActividad();},1500);
    setTimeout(()=>{if(window._qrPendingMenu)window._qrPendingMenu();},2000);

  } else {
    as.classList.remove('hidden');
    window.operadorActivo = null;
    window.ipeActivo = null;
  }
});

function mostrarModalIPE(uid, pedirNombre=false){
  const overlay=document.getElementById('ipeOverlay');
  const modal=overlay.querySelector('.ipe-modal');
  // Inyectar campo de nombre si hace falta
  const existing=document.getElementById('ipe-modal-nombre-wrap');
  if(pedirNombre&&!existing){
    const wrap=document.createElement('div');wrap.id='ipe-modal-nombre-wrap';wrap.style.cssText='margin-bottom:14px;text-align:left';
    wrap.innerHTML='<label style="display:block;font-size:12px;font-weight:600;color:var(--gray-500);margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px">Nombre y Apellido *</label><input id="ipe-modal-nombre" type="text" placeholder="Ej: Carlos Ramírez" style="width:100%;padding:12px 14px;border:1px solid var(--gray-200);border-radius:10px;font-size:14px;font-family:DM Sans,sans-serif;color:var(--gray-700);outline:none" autocomplete="off">';
    modal.insertBefore(wrap,document.getElementById('ipe-modal-select'));
  }else if(!pedirNombre&&existing){existing.remove()}
  overlay.classList.add('show');
  document.getElementById('ipeModalSave').onclick=async()=>{
    const ipe=document.getElementById('ipe-modal-select').value;
    if(!ipe){showToast('error','Selecciona un IPE');return}
    const nombreInput=document.getElementById('ipe-modal-nombre');
    const nombre=nombreInput?nombreInput.value.trim():'';
    if(pedirNombre&&!nombre){showToast('error','Ingresa tu nombre y apellido');return}
    try{
      const updates={ipe,updatedAt:serverTimestamp()};
      if(nombre)updates.nombre=nombre;
      await setDoc(doc(db,"usuarios",uid),updates,{merge:true});
      window.ipeActivo=ipe;
      if(nombre){
        window.nombreOperador=nombre;
        document.getElementById('topbarUserName').textContent=nombre;
        document.getElementById('menuUserName').textContent=nombre;
        document.getElementById('avatarInitials').textContent=nombre.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      }
      overlay.classList.remove('show');
      showToast('success','IPE asignado: '+ipe);
    }catch(e){showToast('error','Error: '+e.message)}
  };
}

document.getElementById('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const errEl=document.getElementById('loginError');
  errEl.textContent='';
  const email=document.getElementById('login-email').value.trim();
  const pass=document.getElementById('login-password').value;
  if(!email||!pass){errEl.textContent='Ingresa tu correo y contraseña';return;}
  const btn=e.target.querySelector('.auth-submit');
  if(btn){btn.disabled=true;btn.innerHTML='<span style="display:inline-block;width:14px;height:14px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span> Ingresando...';}
  try{
    await signInWithEmailAndPassword(auth,email,pass);
  }catch(err){
    const friendlyErrors={
      'auth/wrong-password':'Correo o contraseña inválida',
      'auth/user-not-found':'Correo o contraseña inválida',
      'auth/invalid-credential':'Correo o contraseña inválida',
      'auth/invalid-email':'El correo no es válido',
      'auth/user-disabled':'Esta cuenta ha sido desactivada',
      'auth/too-many-requests':'Demasiados intentos. Intenta más tarde',
      'auth/network-request-failed':'Error de conexión. Verifica tu red',
    };
    errEl.textContent=friendlyErrors[err.code]||'Correo o contraseña inválida';
    if(btn){btn.disabled=false;btn.innerHTML='<i class="bi bi-box-arrow-in-right"></i> Ingresar';}
  }
});
document.getElementById('registerForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const nombre=document.getElementById('reg-nombre').value.trim();
  const em=document.getElementById('reg-email').value.trim();
  const ipe=document.getElementById('reg-ipe').value.trim().toUpperCase();
  const codigo=document.getElementById('reg-codigo').value.trim();
  const re=document.getElementById('regError');
  re.textContent='';
  // Validaciones
  if(!nombre){re.textContent='El nombre y apellido son obligatorios';return;}
  if(!em||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){re.textContent='Ingresa un correo electrónico válido';return;}
  if(!ipe){re.textContent='El IPE es obligatorio';return;}
  if(ipe.length<4){re.textContent='El código IPE debe tener al menos 4 caracteres';return;}
  if(codigo&&codigo!=='MOVA2026ADMIN'){re.textContent='Código de administrador incorrecto';return;}
  const rol=codigo==='MOVA2026ADMIN'?'admin':'operador';
  const btn=e.target.querySelector('.auth-submit');
  if(btn){btn.disabled=true;btn.innerHTML='<span style="display:inline-block;width:14px;height:14px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span> Creando cuenta...';}
  try{
    const c=await createUserWithEmailAndPassword(auth,em,ipe);
    await setDoc(doc(db,'usuarios',c.user.uid),{email:em,nombre,ipe,rol,createdAt:serverTimestamp()});
    showToast('success','Cuenta creada. Bienvenido, '+nombre.split(' ')[0]);
  }catch(err){
    const friendlyErrors={
      'auth/email-already-in-use':'Este correo ya está registrado',
      'auth/invalid-email':'El correo no es válido',
      'auth/weak-password':'El IPE debe tener al menos 6 caracteres',
      'auth/network-request-failed':'Error de conexión. Verifica tu red',
    };
    re.textContent=friendlyErrors[err.code]||'No se pudo crear la cuenta. Intenta de nuevo';
    if(btn){btn.disabled=false;btn.innerHTML='<i class="bi bi-person-plus"></i> Crear Cuenta';}
  }
});
window.cerrarSesion=()=>signOut(auth);
// Exponer para módulos externos (formulario mtto, etc.)
window._db=db;
window._firestoreOps={addDoc,collection,serverTimestamp};

// ===== CI SEGUIMIENTO — persistencia en Firestore =====
window.ciGetOverrides=async function(sheetKey){
  try{const s=await getDoc(doc(db,'ci_seguimiento',sheetKey));return s.exists()?(s.data().overrides||{}):{}}catch(e){return{}}
};
window.ciSetOverride=async function(sheetKey,rowKey,estado){
  try{
    await setDoc(doc(db,'ci_seguimiento',sheetKey),
      {overrides:{[rowKey]:estado},updatedBy:window.nombreOperador||'',updatedAt:serverTimestamp()},
      {merge:true});
    return true;
  }catch(e){showToast('error','Error al guardar: '+e.message);return false}
};

// ===== PERMISOS =====
const PAGES_ADMIN=['dashboard','documentos','equipos','bimensuales','locativas','historial','hist-mtto','ctrl-seg','hojavida'];
function aplicarPermisos(){
  const esAdmin=window.rolActivo==='admin';
  document.body.classList.toggle('rol-operador',!esAdmin);
  // Badge de rol
  const badge=document.getElementById('menuUserRole');
  if(badge)badge.innerHTML=esAdmin
    ?'<span class="role-badge admin">⚙️ Administrador</span>'
    :'<span class="role-badge operador">🚜 Operador</span>';
  // Panel bienvenida operador en inicio
  const wp=document.getElementById('op-welcome-panel');
  if(wp){
    wp.style.display=esAdmin?'none':'flex';
    const wn=document.getElementById('op-welcome-nombre');
    if(wn)wn.textContent=(window.nombreOperador||'').split(' ')[0];
  }
}
window.aplicarPermisos=aplicarPermisos;


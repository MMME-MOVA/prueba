// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== PREOPERACIONAL =====
window.mostrarMenuPreop=function(){document.getElementById('preopContent').innerHTML=`<button class="back-btn" onclick="window.navTo('inicio')"><i class="bi bi-arrow-left"></i> Inicio</button><div style="text-align:center;margin-bottom:16px"><h2 style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--navy);font-size:22px">✅ Inspección Preoperacional</h2><p style="color:var(--gray-500);font-size:14px">Seleccione tipo de línea</p></div><div class="preop-menu"><div class="preop-card amarilla" onclick="window.iniciarPreop('amarilla')"><div class="preop-icon">🏗️</div><h3>Línea Amarilla</h3><p>Maquinaria pesada</p></div><div class="preop-card blanca" onclick="window.iniciarPreop('blanca')"><div class="preop-icon">🚛</div><h3>Línea Blanca</h3><p>Vehículos</p></div></div>`};
window.iniciarPreop=function(tipo){window.tipoLinea=tipo;window.coleccion=tipo==="amarilla"?"inspecciones_linea_amarilla":"inspecciones_linea_blanca";renderFormPreop(tipo,tipo==="amarilla"?checklistAmarilla:checklistBlanca)};

function renderFormPreop(tipo,items){
  window.itemsChecklist=items;const titulo=tipo==="amarilla"?"Línea Amarilla":"Línea Blanca";const c=document.getElementById('preopContent');
  let html=items.map(item=>{const n=nameFromText(item.text);return`<div class="checklist-row"><div class="checklist-text">${item.text}</div><div class="checklist-actions"><input type="radio" name="${n}" id="${n}_b" value="B"><label for="${n}_b"><i class="bi bi-check-lg"></i> B</label><input type="radio" name="${n}" id="${n}_m" value="M"><label for="${n}_m"><i class="bi bi-x-lg"></i> M</label><input type="radio" name="${n}" id="${n}_na" value="NA"><label for="${n}_na">N/A</label></div></div>`}).join('');
  c.innerHTML=`<button class="back-btn" onclick="window.mostrarMenuPreop()"><i class="bi bi-arrow-left"></i> Volver</button><h2 style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--navy);font-size:20px;margin-bottom:20px">✅ Preoperacional — ${titulo}</h2><div class="preop-status-bar"><div class="preop-status-item"><i class="bi bi-person-circle"></i><div><div class="ps-label">Operador</div><div class="ps-value">${window.nombreOperador||'—'}</div></div></div><div class="preop-status-item"><i class="bi bi-tools"></i><div><div class="ps-label">IPE</div><div class="ps-value">${window.ipeActivo||'—'}</div></div></div></div><div class="preop-form-section"><h4><i class="bi bi-info-circle"></i> Datos del Equipo</h4><div class="form-row" class="u-mb-12"><div class="form-group"><label class="form-label">CEMA *</label><div class="hv-search-wrap" style="position:relative"><input class="form-input" id="preop-cema" placeholder="Buscar CEMA o nombre equipo..." required autocomplete="off"><div id="preop-cema-suggest" class="hv-suggest"></div></div></div><div class="form-group"><label class="form-label">COMEQ</label><input class="form-input" id="preop-comeq" placeholder="Código COMEQ"></div></div><div class="form-row" class="u-mb-12"><div class="form-group"><label class="form-label">Tipo Equipo *</label><select class="form-select" id="preop-tipo"><option value="">Seleccionar...</option><option>Excavadora</option><option>Camión</option><option>Motoniveladora</option><option>Volqueta</option><option>Retroexcavadora</option><option>Compactador</option><option>Cargador</option><option>Grúa</option></select></div><div class="form-group"><label class="form-label">Horómetro</label><input class="form-input" id="preop-horometro" type="number" placeholder="Ej: 3245"></div></div><div class="form-group"><label class="form-label">Ubicación</label><input class="form-input" id="preop-ubicacion" placeholder="Frente de obra, taller..."></div></div><div class="preop-form-section"><h4><i class="bi bi-list-check" style="color:var(--yellow)"></i> Checklist — * Seg. Activa · ** Seg. Pasiva</h4><div style="max-height:500px;overflow-y:auto" id="preop-checklist">${html}</div></div><div class="preop-form-section"><h4><i class="bi bi-chat-text"></i> Observaciones</h4><textarea class="form-textarea" id="preop-obs" placeholder="Observaciones..."></textarea></div><div id="preop-post-actions" class="u-hidden"><div class="preop-post-actions"><div class="preop-post-btn" onclick="window.exportarPDF()"><i class="bi bi-file-earmark-pdf"></i>Exportar PDF</div><div class="preop-post-btn" onclick="window.verHistorial()"><i class="bi bi-clock-history"></i>Historial</div></div></div><button class="preop-save-btn disabled" id="preop-guardar" disabled onclick="window.guardarInspeccion()"><i class="bi bi-save"></i> Guardar Inspección</button>`;
  document.querySelectorAll('#preop-checklist input[type="radio"]').forEach(r=>r.addEventListener('change',validarChecklist));
  // Wire CEMA autocomplete — nombre=CEMA, codigo=COMEQ
  crearEquipoSuggest('preop-cema','preop-cema-suggest',function(eq){
    var cq=document.getElementById('preop-comeq');if(cq)cq.value=eq.codigo||'';
    var t=document.getElementById('preop-tipo');
    if(t&&eq.tipo){var o=Array.from(t.options).find(function(x){return x.textContent.toLowerCase().includes((eq.tipo||'').toLowerCase());});if(o)t.value=o.value;}
  });
}
// Pégalo así al final de tu script
window.filtrarProyecto = function(elemento, nombreProyecto) {
    console.log("Cambiando al proyecto:", nombreProyecto);

    // 1. Marcar visualmente la tarjeta como activa
    document.querySelectorAll('.nav-card').forEach(card => card.classList.remove('active'));
    elemento.classList.add('active');

    // 2. Actualizar la variable de control (importante para que el Excel sepa a qué proyecto subir)
    if (typeof proyectoActual !== 'undefined') {
        proyectoActual = nombreProyecto;
    }

    // 3. Actualizar el texto visual de la barra de carga
    const labelEl = document.getElementById('uploadProjectLabel');
    if (labelEl) {
        labelEl.innerHTML = `Proyecto: <strong>${nombreProyecto === 'todos' ? 'Todos' : nombreProyecto.toUpperCase()}</strong>`;
    }

    // 4. Llamar a la función que ya tienes y que carga los datos de Firebase
    if (typeof window.cargarEquipos === 'function') {
        window.cargarEquipos(nombreProyecto);
    } else {
        console.error("Error: La función cargarEquipos no se encontró. Verifica el nombre.");
    }
};
window.activarContadoresGlobales = function() {
    console.log("Iniciando conteo de flota...");
    
    // Escuchamos la colección completa de equipos
    onSnapshot(collection(db, "equipos"), (snap) => {
        // Inicializamos los contadores en cero
        let counts = {
            total: 0,
            rubiales: 0,
            scatec: 0,
            guajira: 0
        };

        snap.forEach(doc => {
            const data = doc.data();
            counts.total++; // Suma al total general

            // Verificamos a qué proyecto pertenece (en minúsculas para evitar errores)
            if (data.proyecto) {
                const proy = data.proyecto.toLowerCase().trim();
                if (counts.hasOwnProperty(proy)) {
                    counts[proy]++;
                }
            }
        });

        // Actualizamos los elementos HTML con los nuevos valores
        // Asegúrate de que los IDs coincidan con tu HTML
        if(document.getElementById('stat-total')) document.getElementById('stat-total').textContent = counts.total;
        if(document.getElementById('stat-rubiales')) document.getElementById('stat-rubiales').textContent = counts.rubiales;
        if(document.getElementById('stat-scatec')) document.getElementById('stat-scatec').textContent = counts.scatec;
        if(document.getElementById('stat-guajira')) document.getElementById('stat-guajira').textContent = counts.guajira;
        
        console.log("Contadores actualizados:", counts);
    }, (error) => {
        console.error("Error en contadores:", error);
    });
};


// No olvides llamar a la función cuando el usuario inicie sesión
// activarContadoresGlobales();
function validarChecklist(){const ch={};document.querySelectorAll('#preop-checklist input[type="radio"]:checked').forEach(r=>ch[r.name]=r.value);const f=window.itemsChecklist.filter(i=>i.required).map(i=>nameFromText(i.text)).filter(n=>!["B","M","NA"].includes(ch[n]));const btn=document.getElementById('preop-guardar');if(f.length===0){btn.disabled=false;btn.className='preop-save-btn ready'}else{btn.disabled=true;btn.className='preop-save-btn disabled';btn.title=`Faltan ${f.length} ítems`}}

window.guardarInspeccion=async function(){
  const btn=document.getElementById('preop-guardar');
  // ── Helpers de UI ──
  function markError(id,msg){
    const el=document.getElementById(id);
    if(el){el.style.borderColor='var(--red)';el.style.boxShadow='0 0 0 3px rgba(229,57,53,.15)';}
    showToast('error',msg);
  }
  function clearError(id){
    const el=document.getElementById(id);
    if(el){el.style.borderColor='';el.style.boxShadow='';}
  }
  ['preop-cema','preop-comeq','preop-tipo','preop-horometro','preop-ubicacion'].forEach(clearError);

  // ── Leer valores ──
  const cema     = document.getElementById('preop-cema').value.trim();
  const comeq    = document.getElementById('preop-comeq').value.trim();
  const tipo     = document.getElementById('preop-tipo').value;
  const horoRaw  = document.getElementById('preop-horometro').value.trim();
  const ubicacion= document.getElementById('preop-ubicacion').value.trim();
  const esAmarilla= window.tipoLinea==='amarilla';

  // ── Validaciones de campos obligatorios ──
  if(!cema)        {markError('preop-cema','CEMA es obligatorio');return}
  if(!comeq)       {markError('preop-comeq','COMEQ es obligatorio');return}
  if(!tipo)        {markError('preop-tipo','Seleccione el tipo de equipo');return}
  if(!horoRaw)     {markError('preop-horometro',esAmarilla?'Horómetro obligatorio':'Odómetro obligatorio');return}
  if(!ubicacion)   {markError('preop-ubicacion','Ubicación es obligatoria');return}
  if(!window.ipeActivo){showToast('error','IPE no definido');return}

  const horoActual=parseFloat(horoRaw);
  if(isNaN(horoActual)||horoActual<0){
    markError('preop-horometro','Ingresa un valor numérico válido');return;
  }

  // ── Validación especial horómetro/odómetro vs último registro ──
  btn.innerHTML='<span style="display:inline-block;width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span> Validando...';
  btn.disabled=true;
  try{
    // Buscar el último registro de este CEMA en la misma colección
    const q=query(
      collection(db,window.coleccion),
      where('equipo.cema','==',cema),
      orderBy('fecha','desc'),
      limit(1)
    );
    const snap=await getDocs(q);
    if(!snap.empty){
      const ultimo=snap.docs[0].data();
      const horoAnterior=parseFloat(ultimo.equipo?.horometro);
      if(!isNaN(horoAnterior)){
        const unidad=esAmarilla?'hrs':'km';
        const limite=esAmarilla?15:250;
        const diff=horoActual-horoAnterior;
        if(horoActual<horoAnterior){
          markError('preop-horometro',
            `El ${esAmarilla?'horómetro':'odómetro'} no puede ser menor al anterior (${horoAnterior} ${unidad})`);
          btn.innerHTML='<i class="bi bi-save"></i> Guardar Inspección';
          validarChecklist();return;
        }
        if(diff>limite){
          // Advertencia — requiere confirmación del supervisor
          const confirmar=confirm(
            `⚠️ Salto inusual detectado\n\nÚltimo registro: ${horoAnterior} ${unidad}\nActual: ${horoActual} ${unidad}\nDiferencia: ${diff.toFixed(1)} ${unidad} (límite: ${limite} ${unidad})\n\n¿Confirmas que el valor es correcto? Se registrará la advertencia.`
          );
          if(!confirmar){
            markError('preop-horometro',
              `Verifica el ${esAmarilla?'horómetro':'odómetro'}. Diferencia de ${diff.toFixed(1)} ${unidad} supera el límite de ${limite} ${unidad}`);
            btn.innerHTML='<i class="bi bi-save"></i> Guardar Inspección';
            validarChecklist();return;
          }
        }
      }
    }
  }catch(qErr){
    // Si falla la consulta (ej: índice faltante) continuamos sin validar
    console.warn('Validación horómetro omitida:',qErr.message);
  }

  // ── Guardar ──
  btn.innerHTML='<span style="display:inline-block;width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span> Guardando...';
  try{
    const cl={};
    document.querySelectorAll('#preop-checklist input[type="radio"]:checked').forEach(r=>cl[r.name]=r.value);
    const data={
      equipo:{cema,comeq,tipo,horometro:horoRaw,ubicacion},
      operador:window.nombreOperador||window.operadorActivo,
      ipe:window.ipeActivo,
      checklist:cl,
      observaciones:document.getElementById('preop-obs').value.trim()||'Sin observaciones',
      fecha:serverTimestamp(),
      tipoLinea:window.tipoLinea
    };
    const ref=await addDoc(collection(db,window.coleccion),data);
    window.inspeccionActualId=ref.id;
    window.inspeccionActualData=data;
    window._lastCema=cema;
    document.querySelectorAll('.preop-form-section').forEach(s=>s.style.display='none');
    btn.style.display='none';
    document.getElementById('preop-post-actions').style.display='block';
    showToast('success','✅ Inspección guardada');
  }catch(err){
    console.error(err);
    showToast('error','Error: '+err.message);
    btn.innerHTML='<i class="bi bi-save"></i> Guardar Inspección';
    validarChecklist();
  }
};

// PDF


// Historial
window.verHistorial=async function(){let cema=window._lastCema;const ci=document.getElementById('preop-cema');if(ci&&ci.value.trim())cema=ci.value.trim();if(!cema){showToast('error','No hay equipo');return}const c=document.getElementById('preopContent');c.innerHTML=`<button class="back-btn" onclick="window.mostrarMenuPreop()"><i class="bi bi-arrow-left"></i> Volver</button><h2 style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--navy);font-size:20px;margin-bottom:20px">📚 Historial — ${cema}</h2><div id="historial-lista">Cargando...</div>`;try{const q2=query(collection(db,window.coleccion),where("equipo.cema","==",cema));const snap=await getDocs(q2);const lista=document.getElementById('historial-lista');if(snap.empty){lista.innerHTML='<p style="color:var(--gray-400);text-align:center;padding:40px">No hay historial</p>';return}const insp=Array.from(snap.docs).map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.fecha?.toDate()||0)-(a.fecha?.toDate()||0));lista.innerHTML=`<div class="historial-grid">${insp.map(i=>{const f=i.fecha?.toDate?i.fecha.toDate().toLocaleDateString("es-CO"):"Sin fecha";return`<div class="historial-card"><div class="h-date">${f}</div><div class="h-type">${i.equipo?.tipo||'—'} · ${i.tipoLinea||'—'}</div><button class="h-btn" onclick="window.exportarPDF('${i.id}','${window.coleccion}')"><i class="bi bi-download"></i> PDF</button></div>`}).join('')}</div>`}catch(err){document.getElementById('historial-lista').innerHTML=`<p class="u-color-red">Error: ${err.message}</p>`}};

window.initPreopPage=function(){window.mostrarMenuPreop();};


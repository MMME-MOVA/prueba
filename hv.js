// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== HOJA DE VIDA =====
let hvEquipos=[],hvEquipoActual=null,hvUnsub=null,hvEditMode=false;
const HV_FIELD_MAP={'placa':'placa','matricula':'matricula','tipo/clase':'tipo','tipoclase':'tipo','tipo':'tipo','marca':'marca','linea':'linea','modelo (ano)':'modelo','modelo':'modelo','serial':'serial','color':'color','propietario':'propietario','capacidad':'capacidad','servicio':'servicio','cilindraje':'cilindraje','fecha adquisicion':'fechaAdquisicion','n° motor':'nMotor','n motor':'nMotor','n° chasis':'nChasis','n chasis':'nChasis','n° llantas':'nLlantas','n llantas':'nLlantas','n° velocidades':'nVelocidades','n velocidades':'nVelocidades','n° cinturones':'nCinturones','n cinturones':'nCinturones','n° airbag':'nAirbag','n airbag':'nAirbag','combustible':'combustible','aceite motor':'aceiteMotor','aceite hidraulico':'aceiteHidraulico','refrigerante':'refrigerante','manifiesto import.':'manifiesto','manifiesto import':'manifiesto','rev. tecnomecanica':'tecnomecanica','rev tecnomecanica':'tecnomecanica','licencia transito':'licencia','poliza':'poliza','soat':'soat','ficha tecnica':'fichaTecnica','manual':'manual','periodicidad mtto.':'periodicidad','periodicidad mtto':'periodicidad','estado':'estado','observaciones':'observaciones','foto':'foto','url foto':'foto','url_foto':'foto','imagen':'foto','photo':'foto','link foto':'foto','link_foto':'foto','enlace foto':'foto','fotos':'foto','fotografía':'foto','fotografia':'foto','image':'foto'};
function hvNormKey(s){return String(s||'').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function hvFormatFecha(f){if(!f)return '—';if(f.toDate)f=f.toDate();const d=new Date(f);if(isNaN(d))return String(f);return d.toLocaleDateString("es-CO",{year:'numeric',month:'short',day:'numeric'})}

function hvSubscribir(){
  if(hvUnsub)return;
  hvUnsub=onSnapshot(query(collection(db,"hojas_vida"),orderBy("placa","asc")),(snap)=>{
    hvEquipos=snap.docs.map(d=>({id:d.id,...d.data()}));
    console.log(`Hojas de vida: ${hvEquipos.length}`);
  },(err)=>console.error("Error hojas_vida:",err));
}

function hvSetupSearch(){
  const input=document.getElementById('hv-search'),sug=document.getElementById('hv-suggest');
  if(!input||input.dataset.bound)return;
  input.dataset.bound='1';
  input.addEventListener('input',()=>{
    const term=input.value.toLowerCase().trim();
    if(!term){sug.classList.remove('show');return}
    const matches=hvEquipos.filter(eq=>(eq.placa||'').toLowerCase().includes(term)||(eq.marca||'').toLowerCase().includes(term)||(eq.tipo||'').toLowerCase().includes(term)||(eq.linea||'').toLowerCase().includes(term)).slice(0,8);
    if(matches.length===0){sug.innerHTML='<div class="hv-suggest-item" style="color:var(--gray-400);text-align:center;">Sin resultados</div>'}
    else{
      sug.innerHTML=matches.map(eq=>`<div class="hv-suggest-item" data-placa="${eq.placa}"><strong>${eq.placa||'—'}</strong> ${eq.marca||''} ${eq.linea||''}<span class="sg-meta">${eq.tipo||''} · ${eq.propietario||''}</span></div>`).join('');
      sug.querySelectorAll('.hv-suggest-item').forEach(it=>{it.addEventListener('click',()=>{hvSeleccionar(it.dataset.placa);input.value=it.dataset.placa;sug.classList.remove('show')})});
    }
    sug.classList.add('show');
  });
  document.addEventListener('click',e=>{if(!e.target.closest('.hv-search-wrap'))sug.classList.remove('show')});
}

function hvSeleccionar(placa){
  const eq=hvEquipos.find(e=>e.placa===placa);
  if(!eq){showToast('error','Equipo no encontrado');return}
  hvEquipoActual=eq;hvEditMode=false;hvRender(eq);
}

function hvRender(eq){
  document.getElementById('hv-empty').style.display='none';
  document.getElementById('hv-cert').style.display='block';
  document.getElementById('hv-meta-placa').textContent=eq.placa||'—';
  document.getElementById('hv-meta-fecha').textContent=hvFormatFecha(eq.fechaAdquisicion);
  const estadoEl=document.getElementById('hv-meta-estado');
  const estado=(eq.estado||'').toLowerCase();
  estadoEl.innerHTML=`<span class="hv-estado ${estado==='activo'?'activo':estado==='inactivo'?'inactivo':'mantenimiento'}">${eq.estado||'—'}</span>`;
  document.querySelectorAll('#hv-cert [data-field]').forEach(el=>{
    const field=el.dataset.field;const val=eq[field];
    el.textContent=val||'—';el.classList.toggle('empty',!val);
  });
  const photoEl=document.getElementById('hv-photo');
  if(eq.foto&&String(eq.foto).startsWith('http')){photoEl.innerHTML=`<img src="${eq.foto}" alt="Foto" onerror="this.parentElement.innerHTML='📷 Sin foto'">`}
  else{photoEl.innerHTML='📷 Sin foto'}
  // Load tribologia summary
  if(window.tribResumenEquipo&&eq.placa){
    var trDiv=document.getElementById('hv-trib-content');
    if(trDiv){
      trDiv.innerHTML='<div style="text-align:center;padding:14px;font-size:12px;color:var(--gray-400)">Cargando análisis...</div>';
      window.tribResumenEquipo(eq.placa).then(function(res){
        if(!res){
          trDiv.innerHTML='<div style="text-align:center;padding:14px;font-size:12px;color:var(--gray-400)"><i class="bi bi-flask" style="font-size:24px;display:block;margin-bottom:6px;opacity:.4"></i>Sin análisis tribológicos para este equipo</div>';
          return;
        }
        var color=res.criticos>0?'#ef4444':res.precauciones>0?'#eab308':'#22c55e';
        var estado=res.criticos>0?'CRÍTICO':res.precauciones>0?'PRECAUCIÓN':'NORMAL';
        var iconE=res.criticos>0?'🚨':res.precauciones>0?'⚠️':'✅';
        var html='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">'
          +'<div style="background:var(--gray-50);padding:10px;border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--navy);font-family:\'Space Grotesk\',sans-serif">'+res.total+'</div><div style="font-size:9px;color:var(--gray-400);text-transform:uppercase;font-weight:700;margin-top:2px">Análisis</div></div>'
          +'<div style="background:rgba(34,197,94,.08);padding:10px;border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:#22c55e;font-family:\'Space Grotesk\',sans-serif">'+res.normales+'</div><div style="font-size:9px;color:var(--gray-400);text-transform:uppercase;font-weight:700;margin-top:2px">Normales</div></div>'
          +'<div style="background:rgba(234,179,8,.08);padding:10px;border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:#eab308;font-family:\'Space Grotesk\',sans-serif">'+res.precauciones+'</div><div style="font-size:9px;color:var(--gray-400);text-transform:uppercase;font-weight:700;margin-top:2px">Precaución</div></div>'
          +'<div style="background:rgba(239,68,68,.08);padding:10px;border-radius:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:#ef4444;font-family:\'Space Grotesk\',sans-serif">'+res.criticos+'</div><div style="font-size:9px;color:var(--gray-400);text-transform:uppercase;font-weight:700;margin-top:2px">Críticos</div></div>'
          +'</div>'
          +'<div style="background:rgba('+(res.criticos>0?'239,68,68':res.precauciones>0?'234,179,8':'34,197,94')+',.08);border-left:3px solid '+color+';border-radius:8px;padding:12px 14px">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
          +'<strong style="font-size:12px;color:var(--navy)">'+iconE+' Último análisis: '+(res.ultimo.fechaMuestra||'—')+'</strong>'
          +'<span style="background:'+color+';color:#fff;padding:2px 10px;border-radius:8px;font-size:10px;font-weight:700">'+estado+'</span>'
          +'</div>'
          +(res.ultimo.veredictoIA?'<div style="font-size:11px;color:var(--gray-600);line-height:1.5;white-space:pre-wrap">'+res.ultimo.veredictoIA.substring(0,400)+(res.ultimo.veredictoIA.length>400?'...':'')+'</div>':'<div style="font-size:11px;color:var(--gray-400);font-style:italic">Sin veredicto IA generado</div>')
          +'</div>';
        trDiv.innerHTML=html;
      }).catch(function(e){
        trDiv.innerHTML='<div style="text-align:center;padding:14px;font-size:12px;color:var(--gray-400)">Error cargando datos</div>';
      });
    }
  }
  hvToggleEditButtons(false);
}

function hvToggleEditButtons(editing){
  document.getElementById('hv-btn-edit').style.display=editing?'none':'inline-flex';
  document.getElementById('hv-btn-save').style.display=editing?'inline-flex':'none';
  document.getElementById('hv-btn-cancel').style.display=editing?'inline-flex':'none';
}

function hvToggleEdit(){
  hvEditMode=!hvEditMode;hvToggleEditButtons(hvEditMode);
  document.querySelectorAll('#hv-cert [data-field]').forEach(el=>{
    if(el.dataset.field==='fechaAdquisicion')return;
    if(hvEditMode){
      const val=hvEquipoActual[el.dataset.field]||'';
      el.innerHTML=`<input type="text" class="fv-edit" value="${String(val).replace(/"/g,'&quot;')}" data-edit="${el.dataset.field}">`;
    }else{
      const val=hvEquipoActual[el.dataset.field];
      el.textContent=val||'—';el.classList.toggle('empty',!val);
    }
  });
}

async function hvGuardarEdicion(){
  const updates={};
  document.querySelectorAll('#hv-cert input[data-edit]').forEach(inp=>{updates[inp.dataset.edit]=inp.value.trim()});
  try{
    const id=String(hvEquipoActual.placa).replace(/[^\w]/g,'_');
    await setDoc(doc(db,"hojas_vida",id),{...updates,actualizado:serverTimestamp()},{merge:true});
    Object.assign(hvEquipoActual,updates);hvEditMode=false;hvRender(hvEquipoActual);
    showToast('success','Hoja de vida actualizada');
  }catch(err){console.error(err);showToast('error','Error: '+err.message)}
}

function hvCancelarEdicion(){hvEditMode=false;hvRender(hvEquipoActual)}

function hvSetupImport(){
  const input=document.getElementById('hv-excel-input');
  if(!input||input.dataset.bound)return;
  input.dataset.bound='1';
  input.addEventListener('change',async(e)=>{
    const file=e.target.files[0];if(!file)return;
    showToast('info','Procesando archivo...');
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      try{
        const data=new Uint8Array(ev.target.result);
        const wb=XLSX.read(data,{type:'array',cellDates:true,cellHTML:false,cellStyles:false});
        const sheetName=wb.SheetNames.includes('BD')?'BD':wb.SheetNames[0];
        const ws=wb.Sheets[sheetName];
        const json=XLSX.utils.sheet_to_json(ws,{range:1,defval:''});
        if(!json.length){showToast('error','Sin datos');return}
        const batch=writeBatch(db);let count=0;
        json.forEach((row,rowIdx)=>{
          const eq={};
          Object.keys(row).forEach(k=>{
            const norm=hvNormKey(k);const target=HV_FIELD_MAP[norm];
            if(target){
              let val=row[k];
              if(val instanceof Date)val=val.toISOString().slice(0,10);
              if(typeof val==='number'&&target==='modelo')val=String(Math.floor(val));
              // Si es celda con hipervínculo (foto URL), SheetJS la expone como objeto con .h
              if(val&&typeof val==='object'&&val.h)val=val.h.replace(/<[^>]+>/g,'').trim();
              if(val&&typeof val==='object'&&val.v)val=String(val.v).trim();
              eq[target]=val!==''&&val!=null?String(val).trim():'';
            }
          });
          // Columna AH (índice 33, clave "__EMPTY_32" o similar en SheetJS)
          // Buscar foto por posición si no se mapeó por nombre
          if(!eq.foto){
            // SheetJS nombra columnas sin header como __EMPTY_N
            const ahKeys=Object.keys(row).filter(k=>k==='__EMPTY_32'||k==='AH'||k.toUpperCase()==='AH');
            for(const k of ahKeys){
              const v=String(row[k]||'').trim();
              if(v&&(v.startsWith('http')||v.startsWith('data:'))){eq.foto=v;break;}
            }
          }
          if(!eq.placa)return;
          const id=String(eq.placa).replace(/[^\w]/g,'_');
          batch.set(doc(db,"hojas_vida",id),{...eq,actualizado:serverTimestamp()},{merge:true});
          count++;
        });
        await batch.commit();
        showToast('success',`${count} hojas de vida importadas`);
        e.target.value='';
      }catch(err){console.error("Import:",err);showToast('error','Error: '+err.message)}
    };
    reader.readAsArrayBuffer(file);
  });
}





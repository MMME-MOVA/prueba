// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== DESCARGA DASHBOARD PDF =====
window.descargarDashboard=async function(){
  var btn=document.getElementById('dash-download-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="bi bi-hourglass-split"></i> Generando...';}
  try{
    var dashEl=document.getElementById('page-dashboard');
    if(!dashEl){showToast('error','Dashboard no encontrado');return;}

    // Prepare: hide scrollbars, fix fonts
    var anio=document.getElementById('dash-anio')?.value||new Date().getFullYear();
    var mes=document.getElementById('dash-mes')?.options[document.getElementById('dash-mes')?.selectedIndex]?.text||'Todos los meses';
    var proyecto=window._proyectoActivo?window._proyectoActivo.nombre:'Todos los proyectos';
    var fechaHoy=new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'});

    // Get active tab content
    var activeTab=dashEl.querySelector('.dash-tab-content[style*="block"]')||dashEl.querySelector('.dash-tab-content');
    var tabName=dashEl.querySelector('.dash-tab.active')?.textContent?.trim()||'Dashboard';

    // Capture with html2canvas
    var canvas=await html2canvas(dashEl,{
      scale:1.5,
      useCORS:true,
      allowTaint:true,
      backgroundColor:'#f0f4f8',
      scrollX:0,
      scrollY:-window.scrollY,
      windowWidth:dashEl.scrollWidth,
      windowHeight:dashEl.scrollHeight,
      ignoreElements:function(el){
        // Skip buttons and loading spinners
        return el.id==='dash-download-btn'||el.classList.contains('eq-loading');
      }
    });

    // Build PDF with jsPDF
    var{jsPDF}=window.jspdf;
    var imgW=canvas.width;
    var imgH=canvas.height;
    var pdfW=297; // A4 landscape width mm
    var pdfH=210; // A4 landscape height mm
    var ratio=pdfW/imgW;
    var scaledH=imgH*ratio;

    // If too tall, use portrait or multi-page
    var orientation=scaledH>pdfH?'p':'l';
    if(orientation==='p'){pdfW=210;pdfH=297;ratio=pdfW/imgW;scaledH=imgH*ratio;}

    var pdf=new jsPDF({orientation:orientation,unit:'mm',format:'a4'});

    // Header bar
    pdf.setFillColor(15,33,55); // navy
    pdf.rect(0,0,orientation==='l'?297:210,14,'F');
    pdf.setTextColor(255,255,255);
    pdf.setFont('helvetica','bold');
    pdf.setFontSize(11);
    pdf.text('MM&E MOVA — Dashboard KPIs',8,9.5);
    pdf.setFont('helvetica','normal');
    pdf.setFontSize(8);
    var rightTxt='Proyecto: '+proyecto+' | '+mes+' '+anio+' | '+fechaHoy;
    pdf.text(rightTxt,(orientation==='l'?289:202),9.5,{align:'right'});

    // Add captured image
    var imgData=canvas.toDataURL('image/jpeg',0.92);
    var pages=Math.ceil(scaledH/(pdfH-16));
    var pageContentH=pdfH-16; // 14 header + 2 margin

    for(var page=0;page<pages;page++){
      if(page>0)pdf.addPage();
      // Re-draw header on each page
      pdf.setFillColor(15,33,55);
      pdf.rect(0,0,orientation==='l'?297:210,14,'F');
      pdf.setTextColor(255,255,255);
      pdf.setFont('helvetica','bold');
      pdf.setFontSize(11);
      pdf.text('MM&E MOVA — Dashboard KPIs',8,9.5);
      pdf.setFont('helvetica','normal');
      pdf.setFontSize(8);
      pdf.text(rightTxt,(orientation==='l'?289:202),9.5,{align:'right'});
      // Slice of canvas for this page
      var srcY=page*(pageContentH/ratio);
      var srcH=Math.min(pageContentH/ratio, imgH-srcY);
      if(srcH<=0)break;
      // Create a slice canvas
      var slice=document.createElement('canvas');
      slice.width=imgW;
      slice.height=Math.ceil(srcH);
      var ctx=slice.getContext('2d');
      ctx.drawImage(canvas,0,srcY,imgW,srcH,0,0,imgW,srcH);
      var sliceData=slice.toDataURL('image/jpeg',0.92);
      pdf.addImage(sliceData,'JPEG',0,14,pdfW,Math.min(srcH*ratio,pageContentH));
    }

    // Footer
    var totalPages=pdf.internal.getNumberOfPages();
    for(var i=1;i<=totalPages;i++){
      pdf.setPage(i);
      pdf.setTextColor(150,150,150);
      pdf.setFontSize(7);
      pdf.text('Página '+i+' de '+totalPages,(orientation==='l'?297:210)/2,pdfH-2,{align:'center'});
    }

    var fname='MOVA_Dashboard_'+proyecto.replace(/\s/g,'_')+'_'+anio+'.pdf';
    pdf.save(fname);
    showToast('success','PDF descargado: '+fname);
  }catch(e){
    console.error('descargarDashboard:',e);
    showToast('error','Error al generar PDF: '+e.message);
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML='<i class="bi bi-download"></i> Descargar PDF';}
  }
};

window.initHojaVidaPage=function(){
  hvSubscribir();hvSetupSearch();hvSetupImport();
  document.getElementById('hv-btn-edit')?.addEventListener('click',hvToggleEdit);
  document.getElementById('hv-btn-save')?.addEventListener('click',hvGuardarEdicion);
  document.getElementById('hv-btn-cancel')?.addEventListener('click',hvCancelarEdicion);
  document.getElementById('hv-btn-pdf')?.addEventListener('click',hvExportarPDF);
  // Carga manual de foto
  const fotoInput=document.getElementById('hv-foto-input');
  if(fotoInput&&!fotoInput.dataset.bound){
    fotoInput.dataset.bound='1';
    fotoInput.addEventListener('change',async(e)=>{
      const file=e.target.files[0];if(!file||!hvEquipoActual)return;
      if(!file.type.startsWith('image/')){showToast('error','Solo se admiten imágenes');return;}
      showToast('info','Subiendo foto...');
      const reader=new FileReader();
      reader.onload=async(ev)=>{
        // Guardar como base64 en Firestore (para fotos pequeñas <500KB)
        if(file.size>600000){showToast('error','Foto muy grande (máx 600KB). Usa una URL externa.');return;}
        const b64=ev.target.result;
        const id=String(hvEquipoActual.placa).replace(/[^\w]/g,'_');
        try{
          const{setDoc,doc,serverTimestamp}=window._firestoreOps||{};
          if(setDoc&&doc){await setDoc(doc(window._db,'hojas_vida',id),{foto:b64,actualizado:serverTimestamp()},{merge:true});}
          hvEquipoActual.foto=b64;
          document.getElementById('hv-photo').innerHTML=`<img src="${b64}" alt="Foto" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
          showToast('success','Foto actualizada');
        }catch(err){showToast('error','Error: '+err.message);}
      };
      reader.readAsDataURL(file);
      e.target.value='';
    });
  }
};
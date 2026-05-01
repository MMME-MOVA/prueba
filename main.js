// ═══════════════════════════════════════════════════════════
//  MOVA v2.0 — Entry Point
//  Inicializa Firebase, carga módulos, motor PDF, helpers
// ═══════════════════════════════════════════════════════════

// ── 1. Firebase Imports ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, collection, query, where, orderBy, limit, startAfter, onSnapshot, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDlO-XhUuitM6QN6cpam3SkeqpGcktFbWw",
  authDomain: "fir-app-tuto-d20d5.firebaseapp.com",
  projectId: "fir-app-tuto-d20d5",
  storageBucket: "fir-app-tuto-d20d5.firebasestorage.app",
  messagingSenderId: "754290122904",
  appId: "1:754290122904:web:d543ae6297e15f9f0930ed"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Exponer globalmente
window.app = app;
window.auth = auth;
window.db = db;
window.storage = storage;

// Exponer funciones de Firebase
window.doc = doc;
window.getDoc = getDoc;
window.getDocs = getDocs;
window.setDoc = setDoc;
window.addDoc = addDoc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.collection = collection;
window.query = query;
window.where = where;
window.orderBy = orderBy;
window.limit = limit;
window.startAfter = startAfter;
window.onSnapshot = onSnapshot;
window.writeBatch = writeBatch;
window.serverTimestamp = serverTimestamp;
window.ref = ref;
window.uploadBytes = uploadBytes;
window.getDownloadURL = getDownloadURL;
window.deleteObject = deleteObject;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.onAuthStateChanged = onAuthStateChanged;
window.signOut = signOut;
window.GoogleAuthProvider = GoogleAuthProvider;
window.signInWithPopup = signInWithPopup;
window.sendPasswordResetEmail = sendPasswordResetEmail;

// EmailJS
window.emailjs = emailjs;
const PUBLIC_KEY = 'kTZPLsFblwc5i8r4x';
if (typeof emailjs !== 'undefined') {
  emailjs.init(PUBLIC_KEY);
}

// showToast global (usado por todos los módulos)
function showToast(type, msg) {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = '<div class="toast-icon">' + ({ success: '✅', error: '❌', info: 'ℹ️' }[type] || 'ℹ️') + '</div><span>' + msg + '</span>';
  c.appendChild(t);
  setTimeout(function () { t.remove(); }, 3200);
}
window.showToast = showToast;

// QR URL parser (core — needed before lazy modules load)
window.qrGetCemaFromUrl = function(){
  try{
    var u = new URL(window.location.href);
    var c = u.searchParams.get('eq') || u.searchParams.get('cema');
    return c ? c.toUpperCase().trim() : null;
  }catch(e){ return null; }
};

// ═══════════════════════════════════════════════════════════
//  CORE UI — Navegación, Auth tabs, Dropdowns, Layout
//  (Extraído del bloque inline del HTML original)
// ═══════════════════════════════════════════════════════════

window.switchAuthTab = function(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  if (tab === 'login') {
    document.querySelector('.auth-tab:first-child').classList.add('active');
    document.getElementById('loginForm').classList.add('active');
  } else {
    document.querySelector('.auth-tab:last-child').classList.add('active');
    document.getElementById('registerForm').classList.add('active');
  }
};

window.navTo = async function(page) {
  // Lazy load modules for this page
  await window.loadPageModule(page);
  
  // Bloqueo de acceso por rol
  if (window.rolActivo !== 'admin' && (typeof PAGES_ADMIN !== 'undefined') && PAGES_ADMIN.includes(page)) {
    showToast('error', 'No tienes permiso para acceder a este módulo'); return;
  }
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const t = document.getElementById('page-' + page);
  if (t) {
    t.classList.add('active');
    t.querySelectorAll('.fade-in').forEach(el => { el.style.animation = 'none'; el.offsetHeight; el.style.animation = ''; });
    // Agregar botón "Volver al inicio" en todas las páginas excepto inicio
    if (page !== 'inicio' && page !== 'preoperacionales' && page !== 'bimensuales' && page !== 'locativas') {
      let bb = t.querySelector('.auto-back-btn');
      if (!bb) {
        bb = document.createElement('a'); bb.className = 'auto-back-btn';
        bb.innerHTML = '<i class="bi bi-arrow-left"></i> Volver al Inicio';
        bb.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;margin:16px 0 0 48px;border-radius:8px;border:1px solid var(--gray-200);background:var(--white);color:var(--gray-600);font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;font-family:DM Sans,sans-serif;text-decoration:none';
        bb.onmouseover = function () { this.style.background = 'var(--gray-50)' };
        bb.onmouseout = function () { this.style.background = 'var(--white)' };
        bb.onclick = function () { window.navTo("inicio") };
        const ph = t.querySelector('.page-header,.preop-container,.falla-container,.hv-container');
        if (ph) t.insertBefore(bb, ph); else t.prepend(bb);
      }
    }
  }
  document.querySelectorAll('#topNav a').forEach(a => a.classList.remove('active'));
  const tl = document.querySelector('#topNav a[data-page="' + page + '"]');
  if (tl) tl.classList.add('active');
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
  const sl = document.querySelector('.sidebar-item[data-page="' + page + '"]');
  if (sl) sl.classList.add('active');
  if (page === 'fallas' && window.initFallaPage) window.initFallaPage();
  if (page === 'danos' && window.initDanoPage) window.initDanoPage();
  if (page === 'cuentas' && window.initCuentasPage) window.initCuentasPage();
  if (page === 'tribologia' && window.initTribologiaPage) window.initTribologiaPage();
  if (page === 'planner' && window.initPlannerPage) window.initPlannerPage();
  if (page === 'preoperacionales' && window.initPreopPage) window.initPreopPage();
  if (page === 'bimensuales' && window.initBimensualPage) window.initBimensualPage();
  if (page === 'locativas' && window.initLocativaPage) window.initLocativaPage();
  if (page === 'historial' && window.initHistorialPage) window.initHistorialPage();
  if (page === 'dashboard' && window.initDashboardPage) { initProjBars().then(function () { var b = document.getElementById('dash-proj-bar'); if (b && window.rolActivo === 'admin') b.style.display = 'flex'; }); window.initDashboardPage(); }
  if (page === 'hojavida' && window.initHojaVidaPage) window.initHojaVidaPage();
  if (page === 'novedades' && window.initNovedadesPage) window.initNovedadesPage();
  if (page === 'galeria' && window.initGaleriaPage) window.initGaleriaPage();
  if (page === 'qrgen' && window.initQrGenPage) window.initQrGenPage();
  if (page === 'qr-equipo' && window.initQrEquipoPage) window.initQrEquipoPage();
  if ((page === 'preoperacionales' || page === 'fallas' || page === 'ordenes') && window.qrAutofillCema) window.qrAutofillCema();
  if (page === 'galeria' && window.initGaleriaPage) window.initGaleriaPage();
  if (page === 'documentos' && window.initDocumentosPage) window.initDocumentosPage();
  if (page === 'proyectos' && window.initProyectosPage) window.initProyectosPage();
  if (page === 'ordenes' && window.initOrdenesPage) window.initOrdenesPage();
  if (page === 'hist-mtto' && window.initHistMttoPage) { initProjBars().then(function () { var b = document.getElementById('hmtto-proj-bar'); if (b && window.rolActivo === 'admin') b.style.display = 'flex'; }); window.initHistMttoPage(); }
  if (page === 'ctrl-seg' && window.initCtrlSegPage) { initProjBars().then(function () { var b = document.getElementById('cseg-proj-bar'); if (b && window.rolActivo === 'admin') b.style.display = 'flex'; }); window.initCtrlSegPage(); }
  if (page === 'equipos' && window.cargarEquipos) window.cargarEquipos(document.querySelector('.project-btn.active')?.dataset.project || 'todos');
  if (page === 'inicio') {
    if (window._initHeroCarousel) window._initHeroCarousel();
    setTimeout(() => { document.querySelectorAll('.progress-fill').forEach(b => { b.style.width = '0'; setTimeout(() => { b.style.width = b.dataset.target + '%' }, 100) }) }, 300);
    if (window.loadInicioKPIs) window.loadInicioKPIs();
    setTimeout(window.inicioCarouselInit, 600);
    if (window.initNovCarousel) setTimeout(window.initNovCarousel, 500);
    if (typeof inicioGaleriaCargar !== 'undefined') inicioGaleriaCargar();
    if (window.cargarInicioProxMtto) window.cargarInicioProxMtto();
    if (window.cargarInicioActividad) window.cargarInicioActividad();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebarOverlay')?.classList.remove('show');
};

window.toggleDrop = function (id) { event.stopPropagation(); document.getElementById(id).classList.toggle('show') };
document.addEventListener('click', () => { document.querySelectorAll('.dropdown,.user-menu').forEach(d => d.classList.remove('show')) });

// Sidebar mobile + overlay
document.getElementById('menuToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('mobile-open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
});
document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarOverlay').classList.remove('show');
});

// Búsqueda global
document.getElementById('globalSearch')?.addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  const ap = document.querySelector('.page-section.active');
  if (!term) { ap.querySelectorAll('.doc-card,tr').forEach(el => el.style.display = ''); return }
  if (ap.id === 'page-documentos') ap.querySelectorAll('.doc-card').forEach(c => { c.style.display = c.textContent.toLowerCase().includes(term) ? '' : 'none' });
  else if (ap.id === 'page-equipos') ap.querySelectorAll('.eq-table tbody tr').forEach(r => { r.style.display = r.textContent.toLowerCase().includes(term) ? '' : 'none' });
});

// Inicialización de layout al cargar
document.addEventListener('DOMContentLoaded', () => {
  const p = document.getElementById('progressBars');
  if (p) {
    [{ l: 'Mtto. Preventivo', v: 87, c: 'green' }, { l: 'Mtto. Instalaciones', v: 72, c: 'yellow' }, { l: 'Inspecciones', v: 95, c: 'green' }, { l: 'OT Cerradas', v: 63, c: 'red' }].forEach(x => {
      p.innerHTML += '<div class="progress-item"><div class="progress-header"><span class="progress-label">' + x.l + '</span><span class="progress-value">' + x.v + '%</span></div><div class="progress-bar"><div class="progress-fill ' + x.c + '" data-target="' + x.v + '" style="width:0"></div></div></div>';
    });
    setTimeout(() => { document.querySelectorAll('.progress-fill').forEach(b => { b.style.width = b.dataset.target + '%' }) }, 600);
  }
  // Project submenu
  document.querySelectorAll('.project-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.project-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const proj = btn.dataset.project;
      if (window.cargarEquipos) window.cargarEquipos(proj);
      // Recargar KPIs si estamos en dashboard o inicio
      const activePage = document.querySelector('.page-section.active')?.id;
      if (activePage === 'page-dashboard' && window.initDashboardPage) {
        console.log('[Proyecto] Recargando dashboard para:', proj);
        setTimeout(window.initDashboardPage, 300);
      }
      if (activePage === 'page-inicio' && window.loadInicioKPIs) {
        console.log('[Proyecto] Recargando inicio para:', proj);
        if (window.cargarInicioProxMtto) setTimeout(window.cargarInicioProxMtto, 200);
        if (window.cargarInicioActividad) setTimeout(window.cargarInicioActividad, 400);
      }
    });
  });
});

console.log('[MOVA v2] Core UI cargado');

console.log('[MOVA v2] Firebase inicializado');

// Lazy Loader — carga módulos bajo demanda
window._loadedModules = {};
window._pageModules = {
  'preoperacionales': ['./inspections-preop.js'],
  'bimensuales': ['./inspections-bimensuales.js', './inspections-engine.js', './menus.js'],
  'locativas': ['./inspections-locativas.js', './inspections-engine.js', './menus.js'],
  'fallas': ['./damage.js'],
  'danos': ['./damage.js'],
  'dashboard': ['./dashboard.js', './pdf-utils.js'],
  'hist-mtto': ['./maintenance.js'],
  'ctrl-seg': ['./maintenance.js'],
  'ordenes': ['./maintenance.js'],
  'historial': ['./maintenance.js'],
  'hojavida': ['./hv.js'],
  'planner': ['./planner.js'],
  'tribologia': ['./tribology.js'],
  'novedades': ['./news.js'],
  'galeria': ['./gallery.js'],
  'qrgen': ['./qr.js'],
  'qr-equipo': ['./qr-page.js'],
  'documentos': ['./documents.js'],
  'proyectos': ['./projects.js'],
};

window.loadPageModule = async function(page) {
  const modules = window._pageModules[page];
  if (!modules) return;
  for (const mod of modules) {
    if (!window._loadedModules[mod]) {
      try {
        await import(mod);
        window._loadedModules[mod] = true;
        console.log('[Lazy] Cargado:', mod);
      } catch (e) {
        window._handleError && window._handleError('lazyLoad_' + mod, e);
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════
//  MOTOR PDF UNIFICADO + HELPERS
// ═══════════════════════════════════════════════════════════

// ── Motor PDF ──
const _pdfEngine = {
  _defaults: { company: "MM&E MOVA", sub: "Moreno Vargas S.A.", font: "helvetica" },

  _header: function(pdf, title, code, opts) {
    opts = opts || {};
    var pageW = pdf.internal.pageSize.getWidth();
    var h = opts.orientation === "landscape" ? 22 : 28;
    var colors = { navy: [15, 33, 55], blue: [46, 117, 182] };
    var hc = colors[opts.headerColor] || colors.navy;
    pdf.setFillColor(hc[0], hc[1], hc[2]); pdf.rect(0, 0, pageW, h, "F");
    pdf.setFillColor(244, 180, 0); pdf.rect(0, h, pageW, 2, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont(this._defaults.font, "bold");
    pdf.setFontSize(opts.orientation === "landscape" ? 16 : 14); pdf.text(title, 14, h / 2 + 3);
    pdf.setFontSize(8); pdf.setTextColor(244, 180, 0);
    pdf.text(this._defaults.company + " - " + this._defaults.sub, 14, h - 4);
    if (code) { pdf.setTextColor(180, 180, 180); pdf.setFontSize(7); pdf.setFont(this._defaults.font, "normal"); pdf.text("Codigo: " + code + " | Vigencia: 01/01/2026", pageW - 6, 6, { align: "right" }); }
  },

  _footer: function(pdf, opts) {
    opts = opts || {};
    var pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();
    var pages = pdf.internal.getNumberOfPages();
    var fechaGen = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
    for (var i = 1; i <= pages; i++) { pdf.setPage(i); pdf.setDrawColor(220, 220, 220); pdf.line(14, pageH - 12, pageW - 14, pageH - 12); pdf.setFont(this._defaults.font, "normal"); pdf.setFontSize(7); pdf.setTextColor(120, 120, 120); pdf.text("Generado: " + fechaGen, 14, pageH - 7); pdf.text(this._defaults.company + " - Mantenimiento, Maquinaria & Equipos", pageW / 2, pageH - 7, { align: "center" }); pdf.text("Pagina " + i + " de " + pages, pageW - 14, pageH - 7, { align: "right" }); }
  },

  _fmtDate: function(f) { if (!f) return "-"; if (f.toDate) f = f.toDate(); var d = new Date(f); return isNaN(d) ? String(f) : d.toLocaleDateString("es-CO"); },

  _filename: function(type, data) {
    var id = (data.cema || data.placa || data.identificacion || "doc").toString().replace(/[^\w]/g, "_");
    var fecha = new Date().toLocaleDateString("es-CO").replace(/\//g, "-");
    var p = { preop: "Preop", hojavida: "HojaVida", falla: "Falla", mtto: "Mtto", insp: "Inspeccion" };
    return "MOVA_" + (p[type] || "Doc") + "_" + id + "_" + fecha + ".pdf";
  },

  _infoLine: function(pdf, x, baseY, label, val, offsetY) { pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(9); pdf.setTextColor(80, 80, 80); pdf.text(label + ":", x, baseY + offsetY); pdf.setFont(this._defaults.font, "normal"); pdf.text(String(val || "-"), x + 30, baseY + offsetY); },

  async generar(type, data) {
    data = data || {}; var { jsPDF } = window.jspdf; if (!jsPDF) throw new Error("jsPDF no cargado");
    var templates = { preop: { orientation: "landscape", title: "INSPECCION PREOPERACIONAL", code: null }, hojavida: { orientation: "portrait", title: "HOJA DE VIDA", code: null, showPhoto: true }, falla: { orientation: "portrait", title: "REPORTE DE FALLA", code: "A4-F-XXX", showBadges: true }, mtto: { orientation: "portrait", title: "SOLICITUD DE MANTENIMIENTO PREVENTIVO", code: "A4-F-XXX", headerColor: "blue", showBadges: true }, insp: { orientation: "portrait", title: "INSPECCION", code: null, checklistMode: true } };
    var tpl = templates[type] || templates.insp;
    var pdf = new jsPDF(tpl.orientation || "portrait", "mm", "a4");
    var pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight(), marginX = 14;
    this._header(pdf, tpl.title, tpl.code, tpl); var y = 32;
    if (type === "preop") y = await this._bodyPreop(pdf, data, y, marginX, pageW, pageH);
    else if (type === "hojavida") y = await this._bodyHojaVida(pdf, data, y, marginX, pageW, pageH);
    else if (type === "falla") y = this._bodyFalla(pdf, data, y, marginX, pageW);
    else if (type === "mtto") y = this._bodyMtto(pdf, data, y, marginX, pageW);
    else if (type === "insp") y = this._bodyInsp(pdf, data, y, marginX, pageW);
    this._footer(pdf, tpl); pdf.save(this._filename(type, data));
    return { success: true, pages: pdf.internal.getNumberOfPages() };
  },

  async _bodyPreop(pdf, data, y, mx, pw, ph) {
    var cema = data.equipo && data.equipo.cema ? data.equipo.cema : (data.cema || "-");
    var tipoLinea = (data.tipoLinea || "DESCONOCIDA").toUpperCase();
    pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(18); pdf.setTextColor(15, 33, 55);
    pdf.text("EQUIPO: " + cema, pw / 2, y, { align: "center" }); pdf.setFontSize(12); pdf.text(tipoLinea, pw / 2, y + 7, { align: "center" });
    var eq = data.equipo || {};
    pdf.autoTable({ startY: y + 12, theme: "grid", head: [[{ content: "DATOS DEL EQUIPO", colSpan: 4, styles: { halign: "center", fillColor: [15, 33, 55], textColor: 255 } }]], body: [["CEMA", cema, "Tipo", eq.tipo || "-"], ["COMEQ", eq.comeq || "-", "Horometro", eq.horometro || "-"], ["Operador", data.operador || "-", "IPE", data.ipe || "-"], ["Ubicacion", eq.ubicacion || "-", "Fecha", this._fmtDate(data.fecha)]], styles: { fontSize: 10, cellPadding: 4 }, headStyles: { fillColor: [15, 33, 55], textColor: 255, fontSize: 13 } });
    if (data.items && data.checklist) {
      var head2 = [["Semana/Dia", "Item", "B", "D", "NA"]]; var body2 = []; var lastCat = "";
      data.items.forEach(function(item, i) { var cat = item.cat || ""; if (cat && cat !== lastCat) { body2.push([{ content: cat, colSpan: 5, styles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: "bold", fontSize: 8, halign: "center" } }]); lastCat = cat; } var val = data.checklist["item_" + i] || ""; var r = [item.semana || "-", i + 1]; r.push(val === "B" ? { content: "X", styles: { fillColor: [39, 174, 96], textColor: 255, halign: "center" } } : ""); r.push(val === "D" ? { content: "X", styles: { fillColor: [192, 57, 43], textColor: 255, halign: "center" } } : ""); r.push(val === "NA" ? { content: "X", styles: { fillColor: [189, 195, 199], textColor: 255, halign: "center" } } : ""); body2.push(r); });
      pdf.autoTable({ startY: pdf.lastAutoTable.finalY + 6, head: head2, body: body2, styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" }, columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 10, halign: "center" }, 2: { cellWidth: 15, halign: "center" }, 3: { cellWidth: 15, halign: "center" }, 4: { cellWidth: 15, halign: "center" } } });
    }
    return pdf.lastAutoTable ? pdf.lastAutoTable.finalY : y + 50;
  },

  async _bodyHojaVida(pdf, eq, y, mx, pw, ph) {
    var cema = eq.placa || eq.cema || eq.nombre || "";
    pdf.setFillColor(244, 180, 0); pdf.roundedRect(pw - 65, 8, 50, 16, 2, 2, "F"); pdf.setTextColor(15, 33, 55); pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(9); pdf.text("CEMA", pw - 40, 14, { align: "center" }); pdf.setFontSize(13); pdf.text(String(cema), pw - 40, 21, { align: "center" });
    var photoSize = 36; if (eq.foto) { try { pdf.addImage(eq.foto, "JPEG", mx, y, photoSize, photoSize, "", "FAST"); } catch (e) { } } pdf.setDrawColor(220, 220, 220); pdf.rect(mx, y, photoSize, photoSize);
    var infoX = mx + photoSize + 6; pdf.setTextColor(15, 33, 55); pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(13); pdf.text(String(eq.tipo || "Equipo"), infoX, y + 5);
    this._infoLine(pdf, infoX, y, "Marca", eq.marca, 11); this._infoLine(pdf, infoX, y, "Modelo", eq.modelo, 16); this._infoLine(pdf, infoX, y, "Serial", eq.serial, 21); this._infoLine(pdf, infoX, y, "Matricula", eq.matricula, 26); this._infoLine(pdf, infoX, y, "Adquirido", this._fmtDate(eq.fechaAdquisicion), 31);
    var estado = String(eq.estado || "OPERATIVO").toUpperCase(); var estColor = estado.includes("OPERAT") ? [34, 197, 94] : estado.includes("MANT") ? [245, 158, 11] : [239, 68, 68];
    pdf.setFillColor(estColor[0], estColor[1], estColor[2]); pdf.roundedRect(pw - mx - 32, y + 1, 32, 7, 1.5, 1.5, "F"); pdf.setTextColor(255, 255, 255); pdf.setFontSize(8); pdf.text(estado, pw - mx - 16, y + 5.5, { align: "center" });
    y += 42; var colW = (pw - mx * 2 - 3) / 2;
    pdf.autoTable({ startY: y, theme: "plain", head: [[{ content: "CARACTERISTICAS GENERALES", colSpan: 2, styles: { fillColor: [15, 33, 55], textColor: 255, fontSize: 8 } }]], body: [["Tipo/Clase", eq.tipo || "-"], ["Linea", eq.linea || "-"], ["Color", eq.color || "-"], ["Capacidad", eq.capacidad || "-"], ["Servicio", eq.servicio || "-"], ["Cilindraje", eq.cilindraje || "-"], ["Propietario", eq.propietario || "-"]], styles: { fontSize: 7.5, cellPadding: 1.5 }, columnStyles: { 0: { cellWidth: 25, fontStyle: "bold", fillColor: [248, 250, 252] }, 1: { cellWidth: colW - 25 } }, margin: { left: mx }, tableWidth: colW });
    var leftEnd = pdf.lastAutoTable.finalY;
    pdf.autoTable({ startY: y, theme: "plain", head: [[{ content: "CARACTERISTICAS TECNICAS", colSpan: 2, styles: { fillColor: [15, 33, 55], textColor: 255, fontSize: 8 } }]], body: [["N Motor", eq.nMotor || "-"], ["N Chasis", eq.nChasis || "-"], ["N Llantas", eq.nLlantas || "-"], ["N Velocid.", eq.nVelocidades || "-"], ["N Cinturones", eq.nCinturones || "-"], ["N Airbag", eq.nAirbag || "-"]], styles: { fontSize: 7.5, cellPadding: 1.5 }, columnStyles: { 0: { cellWidth: 25, fontStyle: "bold", fillColor: [248, 250, 252] }, 1: { cellWidth: colW - 25 } }, margin: { left: mx + colW + 3 }, tableWidth: colW });
    y = Math.max(leftEnd, pdf.lastAutoTable.finalY) + 4;
    pdf.autoTable({ startY: y, theme: "plain", head: [[{ content: "ELEMENTOS DE CONSUMO", colSpan: 2, styles: { fillColor: [46, 117, 182], textColor: 255, fontSize: 8 } }]], body: [["Combustible", eq.combustible || "-"], ["Aceite Motor", eq.aceiteMotor || "-"], ["Aceite Hidr.", eq.aceiteHidraulico || "-"], ["Refrigerante", eq.refrigerante || "-"]], styles: { fontSize: 7.5, cellPadding: 1.5 }, columnStyles: { 0: { cellWidth: 28, fontStyle: "bold", fillColor: [248, 250, 252] }, 1: { cellWidth: colW - 28 } }, margin: { left: mx }, tableWidth: colW });
    leftEnd = pdf.lastAutoTable.finalY;
    pdf.autoTable({ startY: y, theme: "plain", head: [[{ content: "DOCUMENTACION", colSpan: 2, styles: { fillColor: [46, 117, 182], textColor: 255, fontSize: 8 } }]], body: [["Tecnomecanica", eq.tecnomecanica || "-"], ["Lic. Transito", eq.licencia || "-"], ["Poliza", eq.poliza || "-"], ["SOAT", eq.soat || "-"]], styles: { fontSize: 7.5, cellPadding: 1.5 }, columnStyles: { 0: { cellWidth: 28, fontStyle: "bold", fillColor: [248, 250, 252] }, 1: { cellWidth: colW - 28 } }, margin: { left: mx + colW + 3 }, tableWidth: colW });
    y = Math.max(leftEnd, pdf.lastAutoTable.finalY) + 5;
    var maint = eq.maintenance || {};
    if (y > 250) { pdf.addPage(); y = 14; } y = this._mttoTable(pdf, y, mx, pw, "ULTIMOS 4 MANTENIMIENTOS PREVENTIVOS", (maint.prevs || []), [34, 197, 94], [230, 242, 235]);
    if (y > 250) { pdf.addPage(); y = 14; } y = this._mttoTable(pdf, y, mx, pw, "ULTIMOS 4 MANTENIMIENTOS CORRECTIVOS", (maint.corrs || []), [239, 68, 68], [252, 232, 232]);
    return y;
  },

  _mttoTable: function(pdf, y, mx, pw, title, rows, colorHeader, colorSub) {
    pdf.autoTable({ startY: y, theme: "plain", head: [[{ content: title, colSpan: 5, styles: { fillColor: colorHeader, textColor: 255, fontStyle: "bold", fontSize: 9 } }], ["#", "Fecha", "Horometro/Km", "Descripcion", "OT"].map(function(h) { return { content: h, styles: { fillColor: colorSub, textColor: [15, 33, 55], fontStyle: "bold", fontSize: 7.5 } }; })], body: (rows.length ? rows : [{}]).map(function(r, i) { return [String(i + 1), r.fecha || "-", r.horometro || "-", r.descripcion || (rows.length ? "-" : "Sin registros"), r.ot || "-"]; }), styles: { fontSize: 7.5, cellPadding: 1.8, valign: "middle" }, columnStyles: { 0: { cellWidth: 8, halign: "center" }, 1: { cellWidth: 22 }, 2: { cellWidth: 25 }, 3: { cellWidth: "auto" }, 4: { cellWidth: 25 } }, margin: { left: mx, right: mx } });
    return pdf.lastAutoTable.finalY + 4;
  },

  _bodyFalla: function(pdf, d, y, mx, pw) {
    var fecha = this._fmtDate(d.fecha); var hora = d.fecha && d.fecha.toDate ? d.fecha.toDate().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "";
    var row = function(lbl, val, x, off) { off = off || 14; pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(8); pdf.setTextColor(100, 100, 100); pdf.text(lbl.toUpperCase(), x, y); pdf.setFont(this._defaults.font, "normal"); pdf.setFontSize(10); pdf.setTextColor(0, 0, 0); pdf.text(String(val || "-"), x, y + 5); return y + off; };
    y = row.call(this, "Fecha de Reporte", fecha + " " + hora, 14, 14); row.call(this, "Reportado por", d.reportadoPor || "-", 110, 0); y = row.call(this, "CEMA", d.cema || "-", 14, 14); row.call(this, "Nombre", d.nombre || "-", 110, 0); y = row.call(this, "Proyecto", d.proyecto || "-", 14, 14); row.call(this, "Horometro", d.horometro || "-", 110, 0); y += 4;
    pdf.setFillColor(229, 57, 53); pdf.roundedRect(14, y, 55, 10, 2, 2, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(9); pdf.text("FALLA: " + (d.tipoFalla || "-").toUpperCase(), 41.5, y + 7, { align: "center" });
    var prioColor = { Alta: [229, 57, 53], Media: [255, 152, 0], Baja: [76, 175, 80] }; var pc = prioColor[d.prioridad] || [100, 100, 100];
    pdf.setFillColor(pc[0], pc[1], pc[2]); pdf.roundedRect(75, y, 40, 10, 2, 2, "F"); pdf.text((d.prioridad || "-").toUpperCase(), 95, y + 7, { align: "center" });
    var operable = d.operable === "SI" ? "Si, con restricciones" : "No, equipo detenido";
    pdf.setFillColor(240, 240, 240); pdf.roundedRect(122, y, 74, 10, 2, 2, "F"); pdf.setTextColor(60, 60, 60); pdf.text("Operable: " + operable, 159, y + 7, { align: "center" }); y += 18;
    pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(8); pdf.setTextColor(100, 100, 100); pdf.text("DESCRIPCION DE LA FALLA", 14, y); y += 5; pdf.setFillColor(248, 250, 252); pdf.rect(14, y, 182, 35, "F"); pdf.setDrawColor(200, 200, 200); pdf.rect(14, y, 182, 35, "S"); pdf.setFont(this._defaults.font, "normal"); pdf.setFontSize(9); pdf.setTextColor(0, 0, 0); var desc = pdf.splitTextToSize(d.descripcion || "Sin descripcion", 174); pdf.text(desc, 18, y + 5); y += 42;
    var ec = d.estado === "abierta" ? [229, 57, 53] : [76, 175, 80]; pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(9); pdf.setTextColor(ec[0], ec[1], ec[2]); pdf.text("Estado: " + (d.estado || "ABIERTA").toUpperCase(), 14, y); y += 12;
    pdf.setDrawColor(180, 180, 180); pdf.line(14, y + 15, 80, y + 15); pdf.line(120, y + 15, 196, y + 15); pdf.setFont(this._defaults.font, "normal"); pdf.setFontSize(8); pdf.setTextColor(120, 120, 120); pdf.text("Firma Operador", 14, y + 20); pdf.text("Firma Supervisor", 120, y + 20);
    return y + 25;
  },

  _bodyMtto: function(pdf, d, y, mx, pw) {
    var fecha = this._fmtDate(d.fecha);
    var row = function(lbl, val, x) { pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(8); pdf.setTextColor(100, 100, 100); pdf.text(lbl.toUpperCase(), x, y); pdf.setFont(this._defaults.font, "normal"); pdf.setFontSize(10); pdf.setTextColor(0, 0, 0); pdf.text(String(val || "-"), x, y + 5); };
    row.call(this, "Fecha", fecha, 14); row.call(this, "Solicitado por", d.solicitadoPor || "-", 110); y += 14; row.call(this, "CEMA", d.cema || "-", 14); row.call(this, "Nombre", d.nombre || "-", 110); y += 14; row.call(this, "Proyecto", d.proyecto || "-", 14); row.call(this, "Horometro", d.horometro || "-", 110); y += 14;
    pdf.setFillColor(46, 117, 182); pdf.roundedRect(14, y, 182, 12, 2, 2, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(10); pdf.text("TIPO: " + (d.tipoMtto || "-").toUpperCase(), 105, y + 8, { align: "center" }); y += 18;
    var urgColor = { Urgente: [229, 57, 53], "Esta semana": [255, 152, 0], Programable: [76, 175, 80] }; var uc = urgColor[d.urgencia] || [100, 100, 100];
    pdf.setFillColor(uc[0], uc[1], uc[2]); pdf.roundedRect(14, y, 60, 10, 2, 2, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(9); pdf.text("Urgencia: " + (d.urgencia || "Programable"), 44, y + 7, { align: "center" });
    pdf.setFillColor(240, 240, 240); pdf.roundedRect(82, y, 60, 10, 2, 2, "F"); pdf.setTextColor(60, 60, 60); pdf.text("Estado: " + (d.estado || "PENDIENTE").toUpperCase(), 112, y + 7, { align: "center" }); y += 18;
    pdf.setFont(this._defaults.font, "bold"); pdf.setFontSize(8); pdf.setTextColor(100, 100, 100); pdf.text("DESCRIPCION", 14, y); y += 5; pdf.setFillColor(248, 250, 252); pdf.rect(14, y, 182, 35, "F"); pdf.setDrawColor(200, 200, 200); pdf.rect(14, y, 182, 35, "S"); pdf.setFont(this._defaults.font, "normal"); pdf.setFontSize(9); pdf.setTextColor(0, 0, 0); var obs = pdf.splitTextToSize(d.descripcion || "Sin observaciones", 174); pdf.text(obs, 18, y + 5); y += 42;
    pdf.setDrawColor(180, 180, 180); pdf.line(14, y + 15, 80, y + 15); pdf.line(120, y + 15, 196, y + 15); pdf.setFont(this._defaults.font, "normal"); pdf.setFontSize(8); pdf.setTextColor(120, 120, 120); pdf.text("Firma Solicitante", 14, y + 20); pdf.text("Firma Responsable", 120, y + 20);
    return y + 25;
  },

  _bodyInsp: function(pdf, data, y, mx, pw) {
    var cema = data.identificacion || "-"; var fecha = this._fmtDate(data.fecha);
    pdf.setFont(this._defaults.font, "normal"); pdf.setFontSize(10); pdf.setTextColor(0, 0, 0); pdf.text("Fecha: " + fecha, 14, y); pdf.text("Inspector: " + (data.inspector || "-"), 110, y); y += 6; pdf.text("Identificacion: " + cema, 14, y); pdf.text("Ubicacion: " + (data.ubicacion || "-"), 110, y); y += 6;
    if (data.horometro) { pdf.text("Horometro: " + data.horometro, 14, y); y += 6; } if (data.odometro) { pdf.text("Odometro: " + data.odometro, 14, y); y += 6; } if (data.tipoInspeccion) { pdf.text("Tipo: " + data.tipoInspeccion, 14, y); y += 6; } y += 4;
    var items = data._items || []; var opts = data._opts || [{ v: "B" }, { v: "D" }, { v: "NA" }]; var optLabels = opts.map(function(o) { return o.v; });
    var head = [["#", "DESCRIPCION"].concat(optLabels)]; var body = []; var lastCat = "";
    var ES = { B: [39, 174, 96], D: [192, 57, 43], M: [192, 57, 43], SI: [39, 174, 96], NO: [192, 57, 43], NA: [189, 195, 199], OK: [39, 174, 96] };
    items.forEach(function(item, i) { var cat = item.cat || item.area || ""; if (cat && cat !== lastCat) { body.push([{ content: cat, colSpan: 2 + optLabels.length, styles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: "bold", fontSize: 8, halign: "center" } }]); lastCat = cat; } var val = data.checklist ? data.checklist["item_" + i] : ""; var row = [i + 1, item.text]; optLabels.forEach(function(o) { if (val === o) { row.push({ content: "X", styles: { fillColor: ES[o] || [200, 200, 200], textColor: 255, fontStyle: "bold", halign: "center" } }); } else { row.push(""); } }); body.push(row); });
    pdf.autoTable({ startY: y, head: head, body: body, theme: "grid", styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" }, headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold", fontSize: 8 }, columnStyles: { 0: { cellWidth: 10, halign: "center" }, 1: { cellWidth: 80 } } });
    y = pdf.lastAutoTable.finalY + 8; if (y > 270) { pdf.addPage(); y = 14; } pdf.setFontSize(9); pdf.setFont(this._defaults.font, "bold"); pdf.text("OBSERVACIONES:", 14, y); pdf.setFont(this._defaults.font, "normal"); pdf.text(data.observaciones || "-", 14, y + 5, { maxWidth: 180 });
    return y + 20;
  },

  _recogerInspActual: function() {
    var cema = window._lastInspCema || "-"; var checklist = {};
    (window._inspItems || []).forEach(function(item, i) { var r = document.querySelector("input[name=\"insp_" + i + "\"]:checked"); checklist["item_" + i] = r ? r.value : ""; });
    return { identificacion: cema, checklist: checklist, totalItems: window._inspItems ? window._inspItems.length : 0, observaciones: document.getElementById("insp-obs") ? document.getElementById("insp-obs").value : "-" };
  }
};

// ── Wrappers PDF (compatibilidad) ──
window.exportarPDF = async function(id, colEx) { var col = colEx || window.coleccion; if (!col) { showToast("error", "Coleccion no determinada"); return; } try { var db2; if (id) { var s = await getDoc(doc(db, col, id)); db2 = s.data(); } else { db2 = window.inspeccionActualData; } if (!db2 || !db2.equipo || !db2.equipo.cema) { showToast("error", "Datos no validos"); return; } await _pdfEngine.generar("preop", db2); showToast("success", "PDF generado"); } catch (e) { _handleError("exportarPDF", e); } };
window.hvExportarPDF = async function() { if (!window.hvEquipoActual) { showToast("error", "Selecciona un equipo"); return; } var btn = document.getElementById("hv-btn-pdf"); try { if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Generando...'; } await _pdfEngine.generar("hojavida", Object.assign({}, window.hvEquipoActual, { maintenance: { prevs: window._hvPrevs || [], corrs: window._hvCorrs || [] } })); showToast("success", "PDF generado"); } catch (e) { _handleError("hvExportarPDF", e); } finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-download"></i> Descargar PDF'; } } };
window.fallaExportarPDF = async function(col, id) { try { var s = await getDoc(doc(db, col, id)); if (!s.exists()) { showToast("error", "Registro no encontrado"); return; } await _pdfEngine.generar("falla", s.data()); showToast("success", "PDF generado"); } catch (e) { _handleError("fallaExportarPDF", e); } };
window.mttoExportarPDF = async function(col, id) { try { var s = await getDoc(doc(db, col, id)); if (!s.exists()) { showToast("error", "Registro no encontrado"); return; } await _pdfEngine.generar("mtto", s.data()); showToast("success", "PDF generado"); } catch (e) { _handleError("mttoExportarPDF", e); } };
window.inspExportarPDF = async function(docId) { try { var data; if (docId) { var s = await getDoc(doc(window._inspCol || "inspecciones", docId)); if (!s.exists()) { showToast("error", "Documento no encontrado"); return; } data = s.data(); } else { data = _pdfEngine._recogerInspActual(); } data._items = window._inspItems; data._opts = window._inspOpts; await _pdfEngine.generar("insp", data); showToast("success", "PDF generado"); } catch (e) { _handleError("inspExportarPDF", e); } };

// ── Helpers ──
function _handleError(ctx, err) { console.error('[' + ctx + ']', err); var msg = err && err.message ? err.message : String(err); var friendly = { 'permission-denied': 'No tienes permiso para esta accion. Contacta al administrador.', 'not-found': 'Documento no encontrado.', 'already-exists': 'El registro ya existe.', 'resource-exhausted': 'Cuota excedida. Contacta soporte.', 'failed-precondition': 'Operacion no permitida - revisa indices.', 'unauthenticated': 'Sesion expirada. Vuelve a ingresar.', 'invalid-argument': 'Datos invalidos.', 'deadline-exceeded': 'Tiempo agotado. Reintentando...', 'unavailable': 'Servicio temporalmente no disponible.', 'auth/wrong-password': 'Correo o contrasena incorrecta.', 'auth/user-not-found': 'Usuario no encontrado.', 'auth/invalid-email': 'El correo no es valido.', 'auth/too-many-requests': 'Demasiados intentos. Intenta mas tarde.', 'auth/network-request-failed': 'Error de conexion. Verifica tu red.' }; var code = err && err.code ? err.code : ''; showToast('error', '[' + ctx + '] ' + (friendly[code] || msg)); }
window._handleError = _handleError;

async function _safeAsync(fn, ctx) { try { var r = await fn(); return { ok: true, data: r }; } catch (e) { _handleError(ctx, e); return { ok: false, error: e }; } }
window._safeAsync = _safeAsync;

async function _withLoading(btnId, fn, opts) { opts = opts || {}; var txt = opts.text || 'Cargando...'; var btn = typeof btnId === 'string' ? document.getElementById(btnId) : btnId; var orig = btn ? btn.innerHTML : ''; if (btn) { btn.disabled = true; btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px"></span>' + txt; } try { var r = await fn(); return { ok: true, data: r }; } catch (e) { _handleError(opts.ctx || 'op', e); return { ok: false, error: e }; } finally { if (btn) { btn.disabled = false; btn.innerHTML = opts.restoreHtml || orig; } } }
window._withLoading = _withLoading;

var _cache = { d: {}, t: {} };
function _cacheGet(key, ttlMs) { ttlMs = ttlMs || 180000; var now = Date.now(); if (_cache.d[key] && _cache.t[key] && (now - _cache.t[key]) < ttlMs) return _cache.d[key]; return null; }
function _cacheSet(key, val) { _cache.d[key] = val; _cache.t[key] = Date.now(); }
function _cacheClear() { _cache.d = {}; _cache.t = {}; }
window._cacheGet = _cacheGet; window._cacheSet = _cacheSet; window._cacheClear = _cacheClear;

function _confirmModal(opts) { return new Promise(function(resolve) { opts = opts || {}; var overlay = document.createElement('div'); overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,33,55,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center'; overlay.innerHTML = '<div style="background:#fff;border-radius:16px;width:92%;max-width:420px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:modalIn .2s ease"><h3 style="font-family:Space Grotesk,sans-serif;color:var(--navy);font-size:18px;font-weight:700;margin-bottom:12px">' + (opts.title || 'Confirmar') + '</h3><p style="font-size:14px;color:var(--gray-600);line-height:1.5;margin-bottom:20px">' + (opts.message || 'Estas seguro?') + '</p><div style="display:flex;gap:10px;justify-content:flex-end"><button id="_cm-no" style="padding:10px 20px;border-radius:8px;border:1px solid var(--gray-200);background:#fff;font-size:13px;cursor:pointer;color:var(--gray-600)">' + (opts.no || 'Cancelar') + '</button><button id="_cm-yes" style="padding:10px 24px;border-radius:8px;border:none;background:' + (opts.danger ? '#C62828' : 'var(--navy)') + ';color:#fff;font-size:13px;font-weight:600;cursor:pointer">' + (opts.yes || 'Confirmar') + '</button></div></div>'; document.body.appendChild(overlay); document.getElementById('_cm-no').onclick = function() { overlay.remove(); resolve(false); }; document.getElementById('_cm-yes').onclick = function() { overlay.remove(); resolve(true); }; overlay.addEventListener('click', function(e) { if (e.target === overlay) { overlay.remove(); resolve(false); } }); }); }
window._confirmModal = _confirmModal;

async function _paginatedQuery(db, col, opts) { opts = opts || {}; var cons = []; if (window._proyectoActivo && window._proyectoActivo.nombre) cons.push(where('proyecto', '==', window._proyectoActivo.nombre)); (opts.filters || []).forEach(function(f) { cons.push(where(f.field, f.op, f.value)); }); cons.push(orderBy(opts.orderBy || 'fecha', opts.orderDir || 'desc')); cons.push(limit(opts.limit || 100)); var q1 = query(collection(db, col), ...cons); var snap = await getDocs(q1); return { docs: snap.docs.map(function(d) { var o = d.data(); o.id = d.id; return o; }), size: snap.size, empty: snap.empty }; }
window._paginatedQuery = _paginatedQuery;

console.log('[MOVA v2] Motor PDF + helpers cargados');

// ═══════════════════════════════════════════════════════════
//  CARGA DE MÓDULOS — Esenciales al inicio, resto bajo demanda
// ═══════════════════════════════════════════════════════════

await import('./auth.js');
await import('./accounts.js');
await import('./equipment.js');
await import('./home.js');
await import('./inspections-preop.js');
await import('./inspections-engine.js');
await import('./inspections-bimensuales.js');
await import('./inspections-locativas.js');
await import('./menus.js');
await import('./damage.js');
await import('./maintenance.js');

console.log('[MOVA v2] Core cargado — lazy loading activo');

// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== INSPECCIONES BIMENSUALES =====
const bimAmarillaItems = [
  // DISPOSITIVOS DE SEGURIDAD
  {text:"Kit ambiental",cat:"DISPOSITIVOS DE SEGURIDAD"},
  {text:"Extintor con soporte",cat:"DISPOSITIVOS DE SEGURIDAD"},
  {text:"Orden y aseo",cat:"DISPOSITIVOS DE SEGURIDAD"},
  {text:"Botiquín",cat:"DISPOSITIVOS DE SEGURIDAD"},
  // LLANTAS
  {text:"Delanteras",cat:"LLANTAS"},
  {text:"Traseras",cat:"LLANTAS"},
  // LUCES
  {text:"Posición Delanteras y Traseras",cat:"LUCES"},
  {text:"De Emergencia y de Retroceso",cat:"LUCES"},
  {text:"Interior de la cabina y tablero",cat:"LUCES"},
  // MECANISMOS DE CONTROL
  {text:"Alarma de Retroceso - Pito",cat:"MECANISMOS DE CONTROL"},
  {text:"Indicadores de Tablero",cat:"MECANISMOS DE CONTROL"},
  {text:"Seguro - manijas puertas",cat:"MECANISMOS DE CONTROL"},
  {text:"Cinta reflectiva",cat:"MECANISMOS DE CONTROL"},
  {text:"Fugas de aceite",cat:"MECANISMOS DE CONTROL"},
  {text:"Fugas de combustible",cat:"MECANISMOS DE CONTROL"},
  {text:"Control salida humo - Exosto",cat:"MECANISMOS DE CONTROL"},
  {text:"Caja de cambios - palanca",cat:"MECANISMOS DE CONTROL"},
  {text:"Corona de tornamesa",cat:"MECANISMOS DE CONTROL"},
  // MANDOS
  {text:"Avance - Traslación",cat:"MANDOS"},
  {text:"Desplazamiento del Brazo y Balde",cat:"MANDOS"},
  {text:"Giro de la Tornamesa",cat:"MANDOS"},
  {text:"Desplazamiento de la Cuchilla o Pala",cat:"MANDOS"},
  {text:"Estacionamiento y/o freno",cat:"MANDOS"},
  {text:"Ajuste General de Mandos",cat:"MANDOS"},
  {text:"Etiquetado, letreros, rótulos legibles",cat:"MANDOS"},
  {text:"Interruptores",cat:"MANDOS"},
  // EQUIPAMIENTO DE TRABAJO
  {text:"Bases - Refuerzos del balde o Pala",cat:"EQUIPAMIENTO DE TRABAJO"},
  {text:"Cuchillas de la pala",cat:"EQUIPAMIENTO DE TRABAJO"},
  {text:"Dientes o uñas del balde",cat:"EQUIPAMIENTO DE TRABAJO"},
  {text:"Esquineras de la Pala o el balde",cat:"EQUIPAMIENTO DE TRABAJO"},
  {text:"\"U\" de la pala",cat:"EQUIPAMIENTO DE TRABAJO"},
  {text:"Brazos de la pala",cat:"EQUIPAMIENTO DE TRABAJO"},
  {text:"Sistema Ripper",cat:"EQUIPAMIENTO DE TRABAJO"},
  {text:"Gato Ripper",cat:"EQUIPAMIENTO DE TRABAJO"},
  {text:"Cilindro para Vibro compactador",cat:"EQUIPAMIENTO DE TRABAJO"},
  {text:"Ajuste general Equipamiento de Trabajo",cat:"EQUIPAMIENTO DE TRABAJO"},
  // EQUIPAMIENTO DE TRASLACION
  {text:"Bastidor",cat:"EQUIPAMIENTO DE TRASLACIÓN"},
  {text:"Carriles",cat:"EQUIPAMIENTO DE TRASLACIÓN"},
  {text:"Tensoras",cat:"EQUIPAMIENTO DE TRASLACIÓN"},
  {text:"Zapatas",cat:"EQUIPAMIENTO DE TRASLACIÓN"},
  {text:"Cadena",cat:"EQUIPAMIENTO DE TRASLACIÓN"},
  {text:"Segmentos o Splocker",cat:"EQUIPAMIENTO DE TRASLACIÓN"},
  {text:"Ajuste general Equipamiento de Traslación",cat:"EQUIPAMIENTO DE TRASLACIÓN"},
  {text:"Estado terminales",cat:"EQUIPAMIENTO DE TRASLACIÓN"},
  // GATOS HIDRAULICOS
  {text:"Alce equipo",cat:"GATOS HIDRÁULICOS"},
  {text:"Dirección",cat:"GATOS HIDRÁULICOS"},
  {text:"Mangueras y acoples",cat:"GATOS HIDRÁULICOS"},
  {text:"Ajuste General de Bujes y Pasadores",cat:"GATOS HIDRÁULICOS"},
  {text:"Sistema de Pesaje",cat:"GATOS HIDRÁULICOS"},
  // TOLVA
  {text:"Estado tolva",cat:"TOLVA"},
  {text:"Compuerta",cat:"TOLVA"},
  // BANDA TRANSPORTADORA
  {text:"Banda (Centrada, tensionada y en buen estado)",cat:"BANDA TRANSPORTADORA"},
  // CHASIS
  {text:"Estado del chasis",cat:"CHASIS"},
  {text:"Latonería y Pintura",cat:"CHASIS"},
  // CABINA
  {text:"Ventanas",cat:"CABINA"},
  {text:"Aire Acondicionado",cat:"CABINA"},
  {text:"Puerta de Acceso",cat:"CABINA"},
  {text:"Cubierta",cat:"CABINA"},
  {text:"Silla - cojinería",cat:"CABINA"}
].map(i=>({...i,required:false}));

const bimBlancaItems = [
  // ESTADO MECÁNICO
  {text:"*Niveles de fluidos",cat:"ESTADO MECÁNICO"},
  {text:"*Estado y sujeción de las mangueras",cat:"ESTADO MECÁNICO"},
  {text:"*Freno de servicio",cat:"ESTADO MECÁNICO"},
  {text:"*Freno de emergencia",cat:"ESTADO MECÁNICO"},
  {text:"*Freno del motor (Acelerador y embrague)",cat:"ESTADO MECÁNICO"},
  {text:"Freno de pivote",cat:"ESTADO MECÁNICO"},
  {text:"Fuga de los fluidos",cat:"ESTADO MECÁNICO"},
  {text:"Estado y tensión de correas",cat:"ESTADO MECÁNICO"},
  {text:"Estado y sujeción de la batería (bornes y cables)",cat:"ESTADO MECÁNICO"},
  {text:"Estado de la dirección",cat:"ESTADO MECÁNICO"},
  {text:"Fugas de aire en acoples o mangueras",cat:"ESTADO MECÁNICO"},
  {text:"Estado de suspensión",cat:"ESTADO MECÁNICO"},
  {text:"Mecanismo de encendido",cat:"ESTADO MECÁNICO"},
  {text:"Estado Bujía",cat:"ESTADO MECÁNICO"},
  {text:"Estado Acelerador",cat:"ESTADO MECÁNICO"},
  {text:"Estado Embrague",cat:"ESTADO MECÁNICO"},
  {text:"Estado Kit de arrastre",cat:"ESTADO MECÁNICO"},
  // CARROCERÍA
  {text:"Soportes y grapas",cat:"CARROCERÍA"},
  {text:"Ajuste y envarillado",cat:"CARROCERÍA"},
  {text:"Barra antivolco con malla de seguridad",cat:"CARROCERÍA"},
  {text:"Corrosión y fisuras",cat:"CARROCERÍA"},
  {text:"Ajuste del sistema de cierre para la Compuerta",cat:"CARROCERÍA"},
  {text:"Fugas y funcionamiento sistema de levante del Volco",cat:"CARROCERÍA"},
  {text:"Estado de mangueras sistema de levante Volco",cat:"CARROCERÍA"},
  {text:"Estado de Plataforma",cat:"CARROCERÍA"},
  {text:"Estribo o Escalerilla sin partiduras",cat:"CARROCERÍA"},
  {text:"Bastidor sin fisuras",cat:"CARROCERÍA"},
  {text:"Funcionamiento del sistema de Carpado",cat:"CARROCERÍA"},
  {text:"Estado Chasis",cat:"CARROCERÍA"},
  {text:"Guardapolvos en buenas condiciones",cat:"CARROCERÍA"},
  {text:"Estribos y pasamanos (Sujeción y estado)",cat:"CARROCERÍA"},
  // PARTE EXTERNA
  {text:"Estado general de latonería y pintura",cat:"PARTE EXTERNA"},
  {text:"Vidrio parabrisas / ventanas (Sin roturas, no polarizados)",cat:"PARTE EXTERNA"},
  {text:"Puertas en buen estado (cierre y bloqueo)",cat:"PARTE EXTERNA"},
  {text:"Espejo retrovisor (izq/der) sin roturas, bien ajustado",cat:"PARTE EXTERNA"},
  {text:"Tanque de combustible (Sujeción y estado)",cat:"PARTE EXTERNA"},
  {text:"Cardan (crucetas en buen estado, cadena de seguridad)",cat:"PARTE EXTERNA"},
  {text:"Placas (Ubicadas, fijadas, fácil identificación)",cat:"PARTE EXTERNA"},
  {text:"Estado del Exosto sin resonadores y bien ajustados",cat:"PARTE EXTERNA"},
  // PARTE INTERNA
  {text:"*Cinturón de seguridad en todos los asientos",cat:"PARTE INTERNA"},
  {text:"Parasoles sujeción y estado",cat:"PARTE INTERNA"},
  {text:"Plumillas limpiavidrios / motor lavaparabrisa",cat:"PARTE INTERNA"},
  {text:"Estado de Tapicería",cat:"PARTE INTERNA"},
  {text:"Estado, ajuste y funcionamiento de Sillas",cat:"PARTE INTERNA"},
  {text:"Luz de techo",cat:"PARTE INTERNA"},
  {text:"Pedales y mandos",cat:"PARTE INTERNA"},
  {text:"Funcionamiento de Indicadores de tablero",cat:"PARTE INTERNA"},
  {text:"Funcionamiento del Aire Acondicionado",cat:"PARTE INTERNA"},
  {text:"Pito Sonoro (No corneta)",cat:"PARTE INTERNA"},
  {text:"Pito de Reversa",cat:"PARTE INTERNA"},
  // LUCES
  {text:"*Frontales (Lentes sin roturas / funcionando)",cat:"LUCES"},
  {text:"*Direccionales delanteras y de parqueo",cat:"LUCES"},
  {text:"*Direccionales trasera y de parqueo",cat:"LUCES"},
  {text:"*De Stop y señal trasera o frenado",cat:"LUCES"},
  {text:"Luz y alarma de reversa",cat:"LUCES"},
  {text:"Luces laterales",cat:"LUCES"},
  {text:"Luz Rutilante de cabina",cat:"LUCES"},
  // LLANTAS
  {text:"*Sin cortaduras profundas y sin abultamientos",cat:"LLANTAS"},
  {text:"*Labrado tipo A/T (más de 5 mm)",cat:"LLANTAS"},
  {text:"*Rines, pernos completos y ajustados",cat:"LLANTAS"},
  {text:"*Llanta de repuesto / Rin (Buen estado e inflada)",cat:"LLANTAS"},
  // EQUIPO DE PREVENCIÓN
  {text:"*Gato, Cruceta, señales de carretera, tacos para bloqueo",cat:"EQUIPO DE PREVENCIÓN"},
  {text:"Linterna en funcionamiento",cat:"EQUIPO DE PREVENCIÓN"},
  {text:"Caja de herramienta completa",cat:"EQUIPO DE PREVENCIÓN"}
].map(i=>({...i,required:i.text.startsWith('*')}));


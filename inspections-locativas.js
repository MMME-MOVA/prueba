// Firebase refs (expuestas por main.js)
const db=window.db,auth=window.auth,storage=window.storage,app=window.app;
const doc=window.doc,getDoc=window.getDoc,getDocs=window.getDocs,setDoc=window.setDoc,addDoc=window.addDoc,updateDoc=window.updateDoc,deleteDoc=window.deleteDoc,collection=window.collection,query=window.query,where=window.where,orderBy=window.orderBy,limit=window.limit,onSnapshot=window.onSnapshot,serverTimestamp=window.serverTimestamp,writeBatch=window.writeBatch;
const ref=window.ref,uploadBytes=window.uploadBytes,getDownloadURL=window.getDownloadURL,deleteObject=window.deleteObject;
const signInWithEmailAndPassword=window.signInWithEmailAndPassword,createUserWithEmailAndPassword=window.createUserWithEmailAndPassword,onAuthStateChanged=window.onAuthStateChanged,signOut=window.signOut,GoogleAuthProvider=window.GoogleAuthProvider,signInWithPopup=window.signInWithPopup,sendPasswordResetEmail=window.sendPasswordResetEmail;

// ===== LOCATIVAS — 6 FORMATOS =====
const locInstalaciones = [
  "Zonas de parqueadero señalizadas e iluminadas","Parqueaderos separados de zonas de cargue","Parqueaderos por tipo de vehículo","Señalización rutas de desplazamiento peatones","Zonas demarcadas e iluminadas para peatones","Zonas de peatones separadas de vehículos","Velocidades máximas definidas y socializadas","Control de velocidad en vía","Zonas de cargue y descargue delimitadas y demarcadas","Acceso controlado a zonas de cargue y descargue","Espacio para ubicación segura de vehículos","Disposición de materiales y elementos en estantes","Pisos sin grietas, perforaciones, desniveles o roturas","Paredes sin grietas, perforaciones o desniveles","Ventanas en buen estado (marcos, vidrios y pintura)","Puertas en buen estado (marcos, cerraduras, pintura)","Pasillos libres de cables, equipos, materiales","Cielo raso sin grietas, perforaciones o roturas","Escalera de acceso con barandas, debidamente anclada","Escaleras limpias y secas","Pasamanos se extiende al menos hasta el último escalón","Escalones y peldaños con tamaño uniforme","Cinta antideslizante en escaleras","Sustancias químicas identificadas y rotuladas","Estado de sistemas de ventilación y/o extracción","Tomas, interruptores, cableado eléctrico protegidos","Cables de computadoras atados y ordenados","Estado de tableros, tacos, fusibles","Estado de llaves y tubos de agua (sin fugas)","Piso seco, libre de agua en los baños","Vías de acceso despejadas y seguras",
  "Rutas de evacuación y salidas de emergencia señalizadas","Avisos de peligro","Demarcación de vías de evacuación con flechas","Mapa de evacuación","Escaleras señalizadas","Señalización de extintores y botiquines",
  "Suficiente número de luminarias","Luminarias perpendiculares al plano de trabajo","Luminarias limpias y en buen estado","Persianas o cortinas para controlar luz natural",
  "Pisos, paredes y techos lisos y de fácil limpieza","Iluminación, ventilación y temperatura adecuada","Elementos limpios, suficientes y en buen estado","Se usan elementos de protección personal",
  "Escritorios estables sin moverse","Sillas con apoyos en los brazos","Espacio debajo del escritorio suficiente","Diseño del asiento permite libertad de movimiento","Altura de la silla regulable","Respaldo reclinable y regulable",
  "Pisos libres de desperdicios y regueros","Salidas de emergencia y vías de circulación libres","Estantes en condiciones seguras de almacenamiento","Recipientes para disposición de residuos según clasificación","Alrededores libres de maleza, basuras y aguas estancadas","Tanque de almacenamiento de agua cuenta con tapa"
];

const locRedesItems = ["Estado y funcionamiento de luminarias","Estado y Señalización Tableros","Estado y señalización de Tomacorrientes","Estado y señalización de Interruptor Termomagnético","Estado y señalización de Interruptores","Puesto a Tierra","Estado de Cableado"];
const locRedesAreas = ["RECEPCIÓN","SALA DE JUNTAS","GERENCIA","ADMINISTRATIVO","SERVIDOR"];

const locTalleresEquipos = [
  "El Motosoldador cuenta con bandeja para contención","Perilla de intensidad de corriente en buenas condiciones","Cables de alimentación eléctrica sin añadiduras ni enmiendas","Motosoldador protegido con puesta a tierra","Pinzas portaelectrodo y masa en buenas condiciones","Cables de soldadura sin remiendos y con terminales ajustados","Careta para soldar en buenas condiciones, visor sin rayones","Equipo de soldadura en buenas condiciones de operación",
  "Cuerpo del cilindro de oxígeno y acetileno sin abolladuras","Cilindros asegurados a la carretilla vertical para transporte","Cilindros rotulados de acuerdo al sistema de manejo de sustancias","Carretillas verticales en buen estado con llantas en buen estado","Manómetros y reguladores en buen estado de funcionamiento","Válvulas antiretroceso de llama instaladas y sin alteraciones","Válvulas de los cilindros en buen estado y sin fugas de gases","Soplete en buenas condiciones y válvulas de regulación funcionando","Boquilla del soplete sin fisuras ni agrietamientos","Chispero y limpiaboquillas en buen estado, sin roturas","Equipo de oxicorte en buenas condiciones de operación",
  "Tronzadora anclada, sin vibraciones durante corte","Guardas de protección adecuada","Cables de alimentación eléctrica sin añadiduras y enchufes en buen estado","Equipos con mango de seguridad, buenas condiciones y aislamiento","Equipo de corte/esmerilado en buenas condiciones de operación",
  "Tanque de almacenamiento de aire sin abolladuras ni fisuras","Tanque rotulado indicando capacidad de carga en PSI","Guardas de protección en compresor","Termómetro del tanque en buen estado de funcionamiento","Manómetros funcionando, vidrios sin rayones ni quebraduras","Válvulas de seguridad del equipo en buen funcionamiento","Válvula de vaciado de agua en buen estado","Válvula de cierre de aire comprimido en buen estado","Tubería principal de distribución de aire señalizada","Válvula antiretorno en buen estado y funciona","Guayas antilatigo en válvula de salida y terminales de pistolas","Compresor en buenas condiciones de operación",
  "Cuerpo del gato y base de estabilidad en buenas condiciones","El gato presenta fugas de aceite","Cabeza maquinada en buen estado","Tornillo de extensión ajustable en buenas condiciones","Niveles de hidráulico y funcionamiento correcto","Vástago completo sin fisura ni soldaduras","Gato rotulado indicando capacidad de carga","Gato en buenas condiciones de operación",
  "Herramientas manuales sin fallas o cortaduras","Herramientas con puntos de contacto sin roturas ni desgaste","Llaves de boca ajustable con bocas fijas","Herramientas libres de suciedad, grasa o material","Mangos de herramientas en buen estado, no retirados ni modificados","Se identifican herramientas adaptadas o acondicionadas","Herramientas almacenadas en cajas destinadas para ello","Cajas sin elementos personales ni comida","Caja de herramientas con tres asas y de material resistente","Martillos, mazos y macetas bien encabados, sin fisuras","Herramientas en buenas condiciones de operación",
  "Jaula de contención de llantas en buen estado","Rodachines de la carevaca funcionando correctamente","Palanca de fuerza sin fisuras ni enmendaduras","Ganchos de la carevaca sin enmendados ni fisuras","Plancha neumática o vulcanizadora en buen funcionamiento","Planchas superior e inferior sin añadiduras ni cables en mal estado","Switch, fusible o regulador de temperatura en buen estado","Bombaso o petardo sin fisuras ni abolladuras, manómetro funcionando","Válvulas de seguridad y de llenado en buenas condiciones","Tubo de salida del bombaso sin abolladuras ni fisuras","Barras, barretas y palancas en buen estado, sin fisuras"
];
const locTalleresEquiposCats = ["EQUIPOS PARA SOLDADURA","EQUIPOS PARA SOLDADURA","EQUIPOS PARA SOLDADURA","EQUIPOS PARA SOLDADURA","EQUIPOS PARA SOLDADURA","EQUIPOS PARA SOLDADURA","EQUIPOS PARA SOLDADURA","EQUIPOS PARA SOLDADURA",
  "EQUIPOS OXICORTE","EQUIPOS OXICORTE","EQUIPOS OXICORTE","EQUIPOS OXICORTE","EQUIPOS OXICORTE","EQUIPOS OXICORTE","EQUIPOS OXICORTE","EQUIPOS OXICORTE","EQUIPOS OXICORTE","EQUIPOS OXICORTE","EQUIPOS OXICORTE",
  "EQUIPOS DE CORTE Y ESMERILADO","EQUIPOS DE CORTE Y ESMERILADO","EQUIPOS DE CORTE Y ESMERILADO","EQUIPOS DE CORTE Y ESMERILADO","EQUIPOS DE CORTE Y ESMERILADO",
  "COMPRESORES DE AIRE","COMPRESORES DE AIRE","COMPRESORES DE AIRE","COMPRESORES DE AIRE","COMPRESORES DE AIRE","COMPRESORES DE AIRE","COMPRESORES DE AIRE","COMPRESORES DE AIRE","COMPRESORES DE AIRE","COMPRESORES DE AIRE","COMPRESORES DE AIRE","COMPRESORES DE AIRE",
  "GATOS HIDRÁULICOS","GATOS HIDRÁULICOS","GATOS HIDRÁULICOS","GATOS HIDRÁULICOS","GATOS HIDRÁULICOS","GATOS HIDRÁULICOS","GATOS HIDRÁULICOS","GATOS HIDRÁULICOS",
  "HERRAMIENTAS MANUALES","HERRAMIENTAS MANUALES","HERRAMIENTAS MANUALES","HERRAMIENTAS MANUALES","HERRAMIENTAS MANUALES","HERRAMIENTAS MANUALES","HERRAMIENTAS MANUALES","HERRAMIENTAS MANUALES","HERRAMIENTAS MANUALES","HERRAMIENTAS MANUALES","HERRAMIENTAS MANUALES",
  "MONTAJE DE LLANTAS","MONTAJE DE LLANTAS","MONTAJE DE LLANTAS","MONTAJE DE LLANTAS","MONTAJE DE LLANTAS","MONTAJE DE LLANTAS","MONTAJE DE LLANTAS","MONTAJE DE LLANTAS","MONTAJE DE LLANTAS","MONTAJE DE LLANTAS","MONTAJE DE LLANTAS"];

const locTalleresAreas = ["Limpieza de pisos","Limpieza de Herramienta y Equipos","Almacenar Herramientas y Equipos en el sitio indicado","Disposición de Residuos","Lavado y limpieza de Carpas","Lavado y Limpieza de EPP","Lavado y Limpieza de pisos","Organizar sustancias y Materiales en el sitio indicado","Ordenar y limpiar el área de Aceites contaminados","Ordenar y limpiar el área de baterías","Ordenar el área de chatarra","Entregar o disponer Elementos que no se requieren","Ubicación de Extintores","Ubicación de Camillas","Ubicación de puntos ecológicos (Kit para residuos)","Zonas de Parqueo","Ruta de evacuación","Lavamanos con jabón y toallas de papel","Trabajos con maquinaria","Senderos peatonales / vías acceso peatonal","Tomas y tableros eléctricos","Zona para almacenamiento de filtros y aceites","Carpas aterrizadas","Estado Alarma de emergencia","Estado de Botiquín, Camilla e Inmovilizadores","Estado de Extintores","Estado Kit Ambiental","Estado de Dique para contención de productos químicos","Fichas de datos de seguridad de productos químicos","Pisos libres de desperdicios y regueros","Salidas de emergencia libres de obstáculos","Estantes en condiciones seguras de almacenamiento","Recipientes para residuos según clasificación","Alrededores libres de maleza y aguas estancadas","Suficiente número de luminarias","Luminarias perpendiculares al plano de trabajo","Luminarias limpias y en buen estado","Uso de persianas o cortinas para controlar luz natural"];

const locOficinas = [
  {text:"Pisos, cestas",freq:"Diaria",area:"OFICINAS"},
  {text:"Puertas, Ventanas, Persianas y vidrios",freq:"Semanal",area:"OFICINAS"},
  {text:"Muebles, sillas, divisiones y mesas",freq:"Diaria",area:"OFICINAS"},
  {text:"Dispensadores de agua",freq:"Quincenal",area:"OFICINAS"},
  {text:"Desinfección de área",freq:"Diaria",area:"OFICINAS"},
  {text:"Techo",freq:"Semanal",area:"OFICINAS"},
  {text:"Pisos, cestas",freq:"Diaria",area:"RECEPCIÓN"},
  {text:"Puertas, Ventanas, Persianas y vidrios",freq:"Semanal",area:"RECEPCIÓN"},
  {text:"Muebles, sillas, divisiones y mesas",freq:"Diaria",area:"RECEPCIÓN"},
  {text:"Dispensadores de agua",freq:"Quincenal",area:"RECEPCIÓN"},
  {text:"Desinfección de área",freq:"Diaria",area:"RECEPCIÓN"},
  {text:"Techo",freq:"Semanal",area:"RECEPCIÓN"},
  {text:"Pisos, cestas",freq:"Diaria",area:"CAFETERÍA"},
  {text:"Puertas, Ventanas, Persianas y vidrios",freq:"Semanal",area:"CAFETERÍA"},
  {text:"Muebles, sillas, divisiones y mesas",freq:"Diaria",area:"CAFETERÍA"},
  {text:"Dispensadores de agua",freq:"Quincenal",area:"CAFETERÍA"},
  {text:"Desinfección de área",freq:"Diaria",area:"CAFETERÍA"},
  {text:"Techo",freq:"Semanal",area:"CAFETERÍA"}
];

const locHabitaciones = [
  {text:"Tendido de camas",freq:"Diaria",area:"HABITACIÓN"},
  {text:"Cambio de tendidos",freq:"Según necesidad",area:"HABITACIÓN"},
  {text:"Limpieza de pisos, cestas y puertas",freq:"Diaria",area:"HABITACIÓN"},
  {text:"Limpieza de polvo en muebles y equipos",freq:"Diaria",area:"HABITACIÓN"},
  {text:"Entrega ropa a la habitación",freq:"Diaria",area:"HABITACIÓN"},
  {text:"Inventario de tapetes",freq:"Diaria",area:"HABITACIÓN"},
  {text:"Verificación de cajas eléctricas (A/C, tarjetas, etiquetado)",freq:"Diaria",area:"HABITACIÓN"},
  {text:"Limpieza de paredes, techos y ventanas",freq:"Semanal",area:"HABITACIÓN"},
  {text:"Lavado de tapetes",freq:"Según necesidad",area:"HABITACIÓN"},
  {text:"Lavado de cobijas y edredones",freq:"Según necesidad",area:"HABITACIÓN"},
  {text:"Desinfección de área y superficies",freq:"Diaria",area:"HABITACIÓN"},
  {text:"Revisar / Dotar de jabón",freq:"Según necesidad",area:"BAÑOS"},
  {text:"Revisar / Dotar papel higiénico",freq:"Según necesidad",area:"BAÑOS"},
  {text:"Limpieza de puertas, paredes y pisos",freq:"Diaria",area:"BAÑOS"},
  {text:"Limpieza de Espejos y lavamanos",freq:"Diaria",area:"BAÑOS"},
  {text:"Limpieza de Duchas",freq:"Diaria",area:"BAÑOS"},
  {text:"Limpieza de Inodoros y/o orinales",freq:"Diaria",area:"BAÑOS"},
  {text:"Lavado General de baños",freq:"Semanal",area:"BAÑOS"},
  {text:"Desinfección de área y superficies",freq:"Diaria",area:"BAÑOS"}
];


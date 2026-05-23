export const AGRICULTURAL_DICTIONARY = [
  {
    id: "weed_control",
    type: "Operación",
    severity: "media",
    title: "Control de maleza detectado",
    keywords: [
      "chap", "chapi", "chape", "maleza", "monte", "guadaña", "guadana",
      "desbroce", "deshierb", "limpiar lote", "cortar zacate", "zacate",
      "ronda", "orilla", "limpieza de terreno"
    ],
    modules: ["Finanzas", "Tareas", "Operación"],
    costSignals: ["fuel", "oil", "labor", "machine_wear"],
    questions: [
      "¿Cuánto tiempo duró la chapea o limpieza?",
      "¿Cuánta gasolina se utilizó?",
      "¿Se usó aceite, hilo de nylon o cuchilla?",
      "¿La actividad la hizo usted o un trabajador?",
      "¿Desea estimar el costo y enviarlo a Finanzas?",
    ],
  },
  {
    id: "planting",
    type: "Proceso",
    severity: "media",
    title: "Siembra detectada",
    keywords: [
      "sembr", "siembra", "plante", "planté", "semilla", "almacigo",
      "almácigo", "surco", "cama", "germinador"
    ],
    modules: ["Procesos", "Tareas"],
    costSignals: ["seed", "labor", "substrate"],
    questions: [
      "¿Qué cultivo se sembró?",
      "¿Cuántas semillas o plantas se sembraron?",
      "¿En qué zona se realizó?",
      "¿Desea crear seguimiento de germinación?",
    ],
  },
  {
    id: "germination",
    type: "Proceso",
    severity: "media",
    title: "Germinación detectada",
    keywords: [
      "germin", "brot", "nacieron", "salieron", "plantulas", "plántulas",
      "nacidas", "emergieron", "germinadas"
    ],
    modules: ["Procesos", "Tareas"],
    costSignals: [],
    questions: [
      "¿Cuántas plántulas salieron?",
      "¿De qué cultivo son?",
      "¿Desea registrar este avance en un proceso?",
      "¿Desea crear una tarea de revisión?",
    ],
  },
  {
    id: "transplant",
    type: "Proceso",
    severity: "media",
    title: "Trasplante detectado",
    keywords: [
      "trasplant", "pasar a bolsa", "pase a bolsa", "pasé a bolsa",
      "pasar al campo", "pase al campo", "pasé al campo", "repique"
    ],
    modules: ["Procesos", "Tareas", "Finanzas"],
    costSignals: ["labor", "bags", "substrate"],
    questions: [
      "¿Cuántas plantas fueron trasplantadas?",
      "¿A qué zona fueron movidas?",
      "¿Hubo pérdida de plantas?",
      "¿Desea actualizar la etapa del proceso?",
    ],
  },
  {
    id: "pest",
    type: "Sanidad",
    severity: "alta",
    title: "Plaga detectada",
    keywords: [
      "plaga", "gusano", "hormiga", "acaro", "ácaro", "mosca blanca",
      "pulgon", "pulgón", "cochinilla", "insecto", "larva", "trips",
      "babosa", "caracol", "comejen", "zompopa"
    ],
    modules: ["Tareas", "Sanidad", "Finanzas"],
    costSignals: ["product", "labor"],
    questions: [
      "¿Qué cultivo o zona está afectada?",
      "¿Qué tan grave es el daño?",
      "¿Aplicó algún producto?",
      "¿Desea crear una tarea urgente de seguimiento?",
    ],
  },
  {
    id: "disease",
    type: "Sanidad",
    severity: "alta",
    title: "Enfermedad u hongo detectado",
    keywords: [
      "hongo", "mancha", "pudricion", "pudrición", "hojas amarillas",
      "marchitez", "enfermedad", "roya", "mildiu", "antracnosis",
      "moho", "raiz podrida", "raíz podrida"
    ],
    modules: ["Tareas", "Clima", "Sanidad"],
    costSignals: ["product", "labor", "loss"],
    questions: [
      "¿En qué cultivo apareció el problema?",
      "¿Cuántas plantas están afectadas?",
      "¿Hubo exceso de humedad o lluvia reciente?",
      "¿Desea crear una alerta de revisión?",
    ],
  },
  {
    id: "irrigation",
    type: "Clima/Tareas",
    severity: "media",
    title: "Riego detectado",
    keywords: [
      "riego", "regar", "regue", "regué", "agua", "manguera", "bomba",
      "tanque", "aspersor", "goteo", "microaspersor", "hidratar"
    ],
    modules: ["Tareas", "Clima", "Operación"],
    costSignals: ["electricity", "fuel", "labor"],
    questions: [
      "¿Cuánto tiempo se regó?",
      "¿Qué zona recibió riego?",
      "¿Se usó bomba eléctrica o gasolina?",
      "¿Desea marcarlo como rutina?",
    ],
  },
  {
    id: "fertilization",
    type: "Suelo/Nutrición",
    severity: "media",
    title: "Abonado o fertilización detectada",
    keywords: [
      "abono", "abone", "aboné", "fertilizante", "fertilice", "fertilicé",
      "urea", "cal", "compost", "bocashi", "lombricompost", "foliar",
      "npk", "nutriente", "melaza", "biol"
    ],
    modules: ["Finanzas", "Procesos", "Tareas"],
    costSignals: ["product", "labor"],
    questions: [
      "¿Qué producto aplicó?",
      "¿Qué cantidad utilizó?",
      "¿En qué cultivo o zona?",
      "¿Desea registrar el costo en Finanzas?",
    ],
  },
  {
    id: "harvest",
    type: "Cosecha",
    severity: "media",
    title: "Cosecha detectada",
    keywords: [
      "cosech", "recolect", "recogi", "recogí", "produccion", "producción",
      "kilos", "kg", "sacos", "cajas", "canastas", "fruta", "verdura"
    ],
    modules: ["Producción", "Finanzas", "Inventario"],
    costSignals: ["labor", "transport"],
    questions: [
      "¿Qué producto se cosechó?",
      "¿Cuánta cantidad se obtuvo?",
      "¿Fue para venta, consumo o semilla?",
      "¿Desea registrar ingreso o inventario?",
    ],
  },
  {
    id: "infrastructure",
    type: "Infraestructura",
    severity: "media",
    title: "Reparación o infraestructura detectada",
    keywords: [
      "repar", "arregl", "cerca", "porton", "portón", "malla", "tuberia",
      "tubería", "techo", "bodega", "vivero", "invernadero", "portillo",
      "camino", "drenaje", "zanja", "poste", "alambre"
    ],
    modules: ["Finanzas", "Tareas", "Infraestructura"],
    costSignals: ["materials", "labor"],
    questions: [
      "¿Qué se reparó o construyó?",
      "¿Qué materiales se usaron?",
      "¿Cuánto tiempo tomó?",
      "¿Desea registrar el gasto?",
    ],
  },
  {
    id: "purchase",
    type: "Finanzas",
    severity: "media",
    title: "Compra o gasto detectado",
    keywords: [
      "compr", "pague", "pagué", "factura", "recibo", "insumo", "material",
      "gasolina", "aceite", "herramienta", "jornal", "transporte",
      "flete", "alquiler", "repuesto"
    ],
    modules: ["Finanzas"],
    costSignals: ["money"],
    questions: [
      "¿Cuál fue el monto exacto?",
      "¿Fue gasto operativo, inversión o mantenimiento?",
      "¿Desea registrarlo ahora en Finanzas?",
    ],
  },
  {
    id: "pending_task",
    type: "Tareas",
    severity: "media",
    title: "Tarea pendiente detectada",
    keywords: [
      "pendiente", "falto", "faltó", "falta", "mañana", "revisar",
      "recordar", "seguimiento", "queda por hacer", "hay que", "debo"
    ],
    modules: ["Tareas"],
    costSignals: [],
    questions: [
      "¿Para qué fecha desea programar esta tarea?",
      "¿Tiene prioridad alta, media o baja?",
      "¿Desea asociarla a una zona específica?",
    ],
  },
  {
    id: "loss",
    type: "Riesgo/Pérdida",
    severity: "alta",
    title: "Pérdida productiva detectada",
    keywords: [
      "murieron", "se murieron", "perdi", "perdí", "pérdida", "perdida",
      "dañado", "dañadas", "seco", "secas", "quemado", "quemadas"
    ],
    modules: ["Finanzas", "Procesos", "Tareas"],
    costSignals: ["loss"],
    questions: [
      "¿Cuántas plantas o productos se perdieron?",
      "¿Cuál fue la causa probable?",
      "¿Desea registrar una pérdida en el proceso?",
      "¿Desea crear una tarea correctiva?",
    ],
  },
];

export const KNOWN_CROPS = [
  "pitanga", "pintanga", "tomate", "chile", "lechuga", "culantro", "maíz",
  "maiz", "frijol", "yuca", "plátano", "platano", "banano", "café", "cafe",
  "limón", "limon", "naranja", "aguacate", "mango", "papaya", "piña", "pina",
  "cacao", "maracuyá", "maracuya", "pepino", "ayote", "zanahoria", "repollo",
  "brócoli", "brocoli", "cebolla", "vainica", "berenjena", "arroz", "camote",
  "ñame", "name", "malanga", "guanábana", "guanabana", "guayaba", "fresa",
  "mora", "ornamental", "palmera", "suculenta", "orquídea", "orquidea"
];

export const KNOWN_ZONES = [
  "vivero", "invernadero", "huerta", "potrero", "bodega", "cerca", "entrada",
  "camino", "río", "rio", "lote", "parcela", "terraza", "almácigo", "almacigo",
  "zona alta", "zona baja", "quebrada", "corral", "gallinero", "compostera",
  "semillero", "banco de plantas", "área de ventas", "area de ventas"
];

export const COST_DEFAULTS = {
  fuelLiterCRC: 950,
  oilLiterCRC: 2500,
  laborHourCRC: 2000,
  machineWearHourCRC: 300,
};
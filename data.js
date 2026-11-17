/* Validex prototype: sample data. Everything here is fictional. */
(function (root) {
  "use strict";

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Evaluated instrument: 20 items in two dimensions, rated by 10 judges.
  var ITEMS = [
    "Reviso mis apuntes el mismo día en que tomo la clase.",
    "Dejo escrito en una agenda las fechas de mis entregas.",
    "Empiezo los trabajos grupales sin esperar a último momento.",
    "Dedico un horario fijo a estudiar cada semana.",
    "Calculo cuánto tiempo necesito antes de empezar una tarea.",
    "Reservo tiempo para repasar antes de cada examen.",
    "Divido los trabajos largos en partes pequeñas.",
    "Termino mis tareas antes de la fecha límite.",
    "Ordeno mis pendientes por urgencia e importancia.",
    "Reviso al final de la semana qué logré y qué quedó pendiente.",
    "Puedo leer treinta minutos seguidos sin distraerme.",
    "Silencio el teléfono cuando estudio.",
    "Me cuesta volver al tema cuando me interrumpen.",
    "Estudio en un lugar donde puedo concentrarme.",
    "Entiendo lo que leo en una sola lectura.",
    "Me doy cuenta cuando mi mente se va a otro tema.",
    "Cierro las redes sociales mientras hago una tarea.",
    "Mantengo la atención durante las clases virtuales.",
    "Tomo notas para no perder el hilo de lo que explican.",
    "Logro terminar lo que empiezo en una misma sesión de estudio.",
  ];
  var DIMENSIONS = [
    { name: "Organización del tiempo", from: 0, to: 10 },
    { name: "Concentración", from: 10, to: 20 },
  ];

  var JUDGES = [
    { id: 1, name: "Juez 1", email: "juez1@ejemplo.pe" },
    { id: 2, name: "Juez 2", email: "juez2@ejemplo.pe" },
    { id: 3, name: "Juez 3", email: "juez3@ejemplo.pe" },
    { id: 4, name: "Juez 4", email: "juez4@ejemplo.pe" },
    { id: 5, name: "Juez 5", email: "juez5@ejemplo.pe" },
    { id: 6, name: "Juez 6", email: "juez6@ejemplo.pe" },
    { id: 7, name: "Juez 7", email: "juez7@ejemplo.pe" },
    { id: 8, name: "Juez 8", email: "juez8@ejemplo.pe" },
    { id: 9, name: "Juez 9", email: "juez9@ejemplo.pe" },
    { id: 10, name: "Juez 10", email: "juez10@ejemplo.pe" },
  ];

  // ratings[criterion][item][judge] on a 1-4 scale
  var rnd = mulberry32(2026);
  function draw() {
    var r = rnd();
    return r < 0.86 ? 4 : r < 0.96 ? 3 : r < 0.99 ? 2 : 1;
  }
  var RATINGS = { rel: [], cla: [] };
  ["rel", "cla"].forEach(function (c) {
    for (var i = 0; i < 20; i++) {
      var row = [];
      for (var j = 0; j < 10; j++) row.push(draw());
      RATINGS[c].push(row);
    }
  });
  // Fixed rows so the screens always show the cases the report talks about.
  RATINGS.rel[0] = [4, 4, 3, 4, 4, 4, 4, 4, 4, 4];
  RATINGS.rel[4] = [2, 1, 3, 2, 2, 3, 2, 1, 2, 3]; // poorly rated item
  RATINGS.rel[6] = [4, 4, 4, 3, 4, 4, 4, 4, 4, 4]; // item 7
  RATINGS.rel[11] = [4, 2, 3, 2, 3, 4, 3, 2, 3, 3];
  RATINGS.cla[6] = [3, 4, 2, 4, 3, 4, 3, 4, 4, 2];

  var OBS_TYPES = ["Claridad", "Pertinencia", "Redacción", "Otro"];
  var OBSERVATIONS = {
    3: [
      { judge: 2, type: "Redacción", text: "Sugiero cambiar «sin esperar a último momento» por «con anticipación»." },
      { judge: 6, type: "Claridad", text: "No queda claro si se refiere a trabajos con nota o a cualquier tarea." },
    ],
    5: [
      { judge: 1, type: "Pertinencia", text: "Calcular el tiempo no es lo mismo que organizarlo; podría ir en otra dimensión." },
      { judge: 2, type: "Claridad", text: "«Calculo» es ambiguo: ¿en horas, en días?" },
      { judge: 4, type: "Redacción", text: "Propongo: «Estimo cuánto tiempo necesito antes de empezar una tarea»." },
    ],
    7: [
      { judge: 1, type: "Claridad", text: "«Partes pequeñas» es impreciso; conviene dar un ejemplo." },
      { judge: 3, type: "Redacción", text: "Cambiaría «largos» por «extensos»." },
      { judge: 4, type: "Pertinencia", text: "El ítem es pertinente, pero se parece al ítem 5." },
      { judge: 8, type: "Claridad", text: "Un estudiante de primer ciclo podría no entender «dividir»." },
    ],
    12: [
      { judge: 2, type: "Pertinencia", text: "Silenciar el teléfono es una conducta, no una dificultad de concentración." },
      { judge: 4, type: "Otro", text: "Faltan ítems sobre el ruido del entorno." },
      { judge: 9, type: "Claridad", text: "Falta decir si se refiere a notificaciones o a llamadas." },
    ],
  };

  // Draft instrument for HU01 to HU05 (panel of 5 judges).
  var DRAFT = {
    name: "Escala de autoeficacia académica",
    description: "Borrador para estudiantes de primer ciclo.",
    dims: [
      { name: "Confianza para rendir", items: [
        "Me siento capaz de aprobar mis cursos.",
        "Creo que puedo resolver problemas nuevos.",
        "Confío en lo que respondo en un examen.",
        "Sé que puedo mejorar si me esfuerzo.",
        "Me siento preparado para exponer en clase."] },
      { name: "Gestión del esfuerzo", items: [
        "Sigo estudiando cuando un tema se me hace difícil.",
        "Pido ayuda cuando no entiendo algo.",
        "Me propongo metas para cada semana.",
        "Me recupero rápido de una mala nota.",
        "Mantengo el ritmo de estudio durante el ciclo."] },
    ],
  };
  var DRAFT_PANEL = [
    { name: "Juez 1", email: "juez1@ejemplo.pe", status: "enviada" },
    { name: "Juez 2", email: "juez2@ejemplo.pe", status: "enviada" },
    { name: "Juez 3", email: "juez3@ejemplo.pe", status: "en curso" },
    { name: "Juez 4", email: "juez4@ejemplo.pe", status: "sin abrir" },
    { name: "Juez 5", email: "juez5@ejemplo.pe", status: "sin abrir" },
  ];

  var IMPORT_PREVIEW = (function () {
    var rows = [];
    for (var i = 1; i <= 30; i++) {
      var bad = i === 9 || i === 22;
      rows.push({ n: i, dim: bad ? "" : i <= 15 ? "Confianza para rendir" : "Gestión del esfuerzo", text: "Ítem de ejemplo " + i, error: bad ? "Falta la dimensión" : "" });
    }
    return rows;
  })();

  root.DATA = {
    ITEMS: ITEMS,
    DIMENSIONS: DIMENSIONS,
    JUDGES: JUDGES,
    RATINGS: RATINGS,
    OBS_TYPES: OBS_TYPES,
    OBSERVATIONS: OBSERVATIONS,
    DRAFT: DRAFT,
    DRAFT_PANEL: DRAFT_PANEL,
    IMPORT_PREVIEW: IMPORT_PREVIEW,
    mulberry32: mulberry32,
  };
})(window);

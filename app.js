/* Validex prototype: hash-routed screens, one per user story (IU01 = HU01, and so on). */
(function () {
  "use strict";
  var C = window.Calc, D = window.DATA;
  var fmt = C.fmt;

  // ---------------------------------------------------------------- helpers
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function toast(msg) {
    var host = document.getElementById("toast-host");
    var t = el('<div class="toast">' + esc(msg) + "</div>");
    host.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function token() {
    var a = "abcdefghijkmnpqrstuvwxyz23456789", s = "";
    for (var i = 0; i < 22; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------------------------------------------------------------- state
  var S = {
    draft: copy(D.DRAFT), sent: false, errors: {}, saved: false,
    imp: "none",
    scale: { type: "ord", cats: 4, crit: { Relevancia: true, Claridad: true, Coherencia: false, Suficiencia: false } }, viewSent: false,
    panel: D.DRAFT_PANEL.map(function (j) { return { name: j.name, email: j.email, status: j.status, link: "" }; }), panelErr: {},
    crit: "rel", thr: 0.8, conf: 0.95, calcRatings: "4, 4, 3, 4", calcMin: 1, calcMax: 4, rvcN: 10, rvcNe: 9,
    sel: 7, hideNames: false, decisions: {}, reportObs: true,
    tab: "login", authErr: {}, authMsg: "", resetExpired: false,
    link: "valid", ref: null, tests: { cross: false, link: false },
    perf: null, perfRun: 0,
  };
  var J = { answers: {}, obs: {}, cur: 8, sent: false, offline: false, code: "" };
  for (var i = 0; i < 8; i++) J.answers[i] = { rel: [4, 4, 3, 4, 4, 3, 4, 4][i], cla: [3, 4, 4, 3, 4, 4, 3, 4][i] };

  var BASE = D.ITEMS.length;
  var ZS = { 0.9: 1.644854, 0.95: 1.959964, 0.99: 2.575829 };

  function itemStat(crit, i) {
    var r = D.RATINGS[crit][i];
    var v = C.aikenV(r, 1, 4);
    var ci = C.scoreInterval(v, r.length, 3, ZS[S.conf]);
    var ne = r.filter(function (x) { return x === 4; }).length;
    return { v: v, lo: ci.lower, hi: ci.upper, ne: ne };
  }
  function plot(v, lo, hi, thr) {
    var pass = lo >= thr;
    return '<div class="plot' + (pass ? " pass" : "") + '" role="img" aria-label="V ' + fmt(v) + ', intervalo de ' + fmt(lo) + " a " + fmt(hi) + '">' +
      '<div class="axis"></div><div class="tick" style="left:0"></div><div class="tick" style="left:50%"></div><div class="tick" style="left:calc(100% - 1px)"></div>' +
      '<div class="span" style="left:' + (lo * 100).toFixed(1) + "%;width:" + ((hi - lo) * 100).toFixed(1) + '%"></div>' +
      '<div class="thr" style="left:' + (thr * 100).toFixed(1) + '%"></div>' +
      '<div class="dot" style="left:' + (v * 100).toFixed(1) + '%"></div></div>';
  }
  function chip(t, k) { return '<span class="chip ' + (k || "") + '">' + esc(t) + "</span>"; }

  // ---------------------------------------------------------------- shells
  var RAIL = [
    { h: "Cuenta", items: [{ hu: 16, t: "Cuenta e inicio de sesión" }, { hu: 18, t: "Privacidad y acceso" }] },
    { h: "Preparar el instrumento", items: [{ hu: 1, t: "Instrumento", n: 1 }, { hu: 2, t: "Importar ítems", n: 2 }, { hu: 3, t: "Escala y criterios", n: 3 }, { hu: 4, t: "Panel de jueces", n: 4 }] },
    { h: "Seguir y analizar", items: [{ hu: 5, t: "Seguimiento", n: 5 }, { hu: 11, t: "V de Aiken", n: 6 }, { hu: 12, t: "RVC de Lawshe", n: 7 }, { hu: 13, t: "Observaciones", n: 8 }, { hu: 14, t: "Decisión por ítem", n: 9 }, { hu: 15, t: "Reporte", n: 10 }] },
    { h: "Calidad", items: [{ hu: 17, t: "Exactitud de coeficientes" }, { hu: 19, t: "Rendimiento" }] },
    { h: "Vista del juez", items: [{ hu: 6, t: "Abrir el enlace (móvil)" }] },
  ];
  function route(hu) { return "#/hu" + pad(hu); }
  function shell(hu, title, sub, actions, body, crumb) {
    var rail = RAIL.map(function (g) {
      return "<h4>" + esc(g.h) + "</h4>" + g.items.map(function (it) {
        return '<a href="' + route(it.hu) + '"' + (it.hu === hu ? ' aria-current="page"' : "") + ">" +
          (it.n ? '<span class="n">' + it.n + "</span>" : '<span class="n" aria-hidden="true">·</span>') + esc(it.t) + "</a>";
      }).join("");
    }).join("");
    return '<div class="app"><nav class="rail" aria-label="Secciones"><div class="brand">Validex<small>Validez de contenido</small></div>' + rail +
      '</nav><main class="main"><div class="crumbs">' + esc(crumb || "Mis instrumentos") + '</div><div class="pagehead"><div><h1>' + esc(title) + "</h1>" +
      (sub ? "<p>" + sub + "</p>" : "") + "</div><div>" + (actions || "") + "</div></div>" + body + "</main></div>";
  }
  function phone(head, sub, body, foot, opt) {
    opt = opt || {};
    return '<div class="stage"><div class="phone' + (opt.narrow ? " narrow" : "") + '">' + (opt.offline ? '<div class="offline">Sin conexión. Tus calificaciones están guardadas.</div>' : "") +
      '<div class="ph-head"><b>' + esc(head) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + '</div><div class="ph-body">' + body + "</div>" + (foot ? '<div class="ph-foot">' + foot + "</div>" : "") + "</div></div>";
  }
  var INSTR = "Cuestionario de hábitos de estudio";

  // ---------------------------------------------------------------- IU01 instrumento
  function hu01() {
    var d = S.draft, locked = S.sent;
    var nErr = Object.keys(S.errors).length;
    var dims = d.dims.map(function (dim, di) {
      var items = dim.items.map(function (t, ii) {
        var k = di + "-" + ii, e = S.errors[k];
        return '<div class="field"><label class="sr-only" for="it-' + k + '">Ítem ' + (ii + 1) + "</label>" +
          '<div class="row" style="align-items:center"><div style="flex:1"><input type="text" id="it-' + k + '" data-on="item" data-d="' + di + '" data-i="' + ii + '" value="' + esc(t) + '"' + (e ? ' class="invalid"' : "") + (locked ? " disabled" : "") + ">" +
          (e ? '<div class="err">' + esc(e) + "</div>" : "") + '</div><button class="btn ghost small" data-act="delItem" data-d="' + di + '" data-i="' + ii + '"' + (locked ? " disabled" : "") + ' aria-label="Quitar ítem ' + (ii + 1) + '">Quitar</button></div></div>';
      }).join("");
      return '<div class="panel"><div class="field"><label for="dn-' + di + '">Dimensión ' + (di + 1) + '</label><input type="text" id="dn-' + di + '" data-on="dim" data-d="' + di + '" value="' + esc(dim.name) + '"' + (locked ? " disabled" : "") + "></div>" + items +
        '<button class="btn ghost small" data-act="addItem" data-d="' + di + '"' + (locked ? " disabled" : "") + ">Agregar ítem</button></div>";
    }).join("");
    var total = d.dims.reduce(function (a, x) { return a + x.items.length; }, 0);
    var msg = locked ? '<div class="note bad">Este instrumento ya se envió a sus jueces. Sus ítems no se pueden editar.</div>' :
      nErr ? '<div class="note bad">Hay ' + nErr + (nErr === 1 ? " ítem" : " ítems") + " con error. Corrígelos para guardar.</div>" :
      S.saved ? '<div class="note ok">Instrumento guardado. Puedes editarlo mientras no lo envíes.</div>' : "";
    return shell(1, "Crear instrumento", "Define el nombre, las dimensiones y los ítems que van a calificar los jueces.",
      '<button class="btn" data-act="saveDraft"' + (locked ? " disabled" : "") + ">Guardar instrumento</button>",
      msg + '<div class="panel"><div class="cols"><div class="field"><label for="in-name">Nombre del instrumento</label><input type="text" id="in-name" data-on="name" value="' + esc(d.name) + '"' + (locked ? " disabled" : "") + '></div>' +
      '<div class="field"><label for="in-desc">Descripción</label><input type="text" id="in-desc" data-on="desc" value="' + esc(d.description) + '"' + (locked ? " disabled" : "") + "></div></div>" +
      '<p class="muted">' + d.dims.length + " dimensiones y " + total + " ítems.</p></div>" + dims +
      '<button class="btn ghost" data-act="addDim"' + (locked ? " disabled" : "") + ">Agregar dimensión</button>");
  }

  // ---------------------------------------------------------------- IU02 importar
  function hu02() {
    var rows = D.IMPORT_PREVIEW, bad = rows.filter(function (r) { return r.error; });
    var body;
    if (S.imp === "none") body = '<div class="panel"><h3>Archivo de ítems</h3><p class="muted">Sube una hoja de cálculo con las columnas «Dimensión» y «Texto del ítem».</p><div class="row"><button class="btn" data-act="imp" data-v="ok">Cargar archivo de ejemplo (30 filas)</button><button class="btn ghost" data-act="imp" data-v="missing">Cargar archivo sin la columna «Texto del ítem»</button></div></div>';
    else if (S.imp === "missing") body = '<div class="note bad">Al archivo le falta la columna «Texto del ítem». No se importó ningún ítem. Agrega la columna y vuelve a cargarlo.</div><button class="btn ghost" data-act="imp" data-v="none">Elegir otro archivo</button>';
    else body = '<div class="note warn">Se importarán ' + (rows.length - bad.length) + " ítems. " + bad.length + " filas tienen errores y se omitirán.</div>" +
      '<div class="panel"><h3>Vista previa</h3><p class="muted">Se muestran las primeras 8 filas y las filas con error (10 de 30).</p><div class="tablewrap"><table><thead><tr><th>Fila</th><th>Dimensión</th><th>Texto del ítem</th><th>Estado</th></tr></thead><tbody>' +
      rows.filter(function (r) { return r.n <= 8 || r.error; }).map(function (r) { return "<tr><td>" + r.n + "</td><td>" + (r.dim ? esc(r.dim) : "<em>vacía</em>") + "</td><td>" + esc(r.text) + "</td><td>" + (r.error ? chip(r.error, "bad") : chip("Lista", "ok")) + "</td></tr>"; }).join("") +
      '</tbody></table></div></div><div class="row"><button class="btn" data-act="impOk">Importar ' + (rows.length - bad.length) + ' ítems</button><button class="btn ghost" data-act="imp" data-v="none">Cancelar</button></div>';
    return shell(2, "Importar ítems", "Carga los ítems desde una hoja de cálculo en lugar de escribirlos uno por uno.", "", body);
  }

  // ---------------------------------------------------------------- IU03 escala
  function hu03() {
    var s = S.scale, locked = S.sent || S.viewSent, k = s.type === "lawshe" ? 3 : s.cats;
    var crit = Object.keys(s.crit).map(function (c) { return '<label style="font-weight:400"><input type="checkbox" data-on="crit" data-c="' + c + '"' + (s.crit[c] ? " checked" : "") + (locked ? " disabled" : "") + "> " + c + "</label>"; }).join("");
    var opts = s.type === "lawshe" ? ["Esencial", "Útil pero no esencial", "No necesaria"] : Array.apply(null, Array(s.cats)).map(function (_, i) { return String(i + 1); });
    var prev = '<div class="stack">' + Object.keys(s.crit).filter(function (c) { return s.crit[c]; }).map(function (c) {
      return "<div><b>" + c + '</b><div class="row" style="margin-top:4px">' + opts.map(function (o) { return '<span class="chip gray" style="padding:6px 14px">' + esc(o) + "</span>"; }).join("") + "</div></div>";
    }).join("") + "</div>";
    return shell(3, "Escala y criterios", "Elige cómo van a calificar los jueces. No se puede cambiar después de enviar el instrumento.", "",
      (locked ? '<div class="note bad">Este instrumento ya se envió. La escala no se puede cambiar.</div>' : "") +
      '<div class="cols"><div class="panel"><h3>Escala</h3><div class="field"><label for="sc-type">Tipo de escala</label><select id="sc-type" data-on="scType"' + (locked ? " disabled" : "") + '><option value="ord"' + (s.type === "ord" ? " selected" : "") + '>Ordinal</option><option value="lawshe"' + (s.type === "lawshe" ? " selected" : "") + ">Tres opciones de Lawshe</option></select></div>" +
      (s.type === "ord" ? '<div class="field"><label for="sc-cats">Número de categorías</label><select id="sc-cats" data-on="scCats"' + (locked ? " disabled" : "") + ">" + [2, 3, 4, 5, 6, 7].map(function (n) { return '<option value="' + n + '"' + (n === s.cats ? " selected" : "") + ">" + n + (n === 4 ? " (de 1 a 4)" : "") + "</option>"; }).join("") + "</select></div>" : "") +
      '<div class="field"><label>Criterios que evalúa cada juez</label><div class="stack">' + crit + '</div></div><label style="font-weight:400"><input type="checkbox" data-on="viewSent"' + (S.viewSent ? " checked" : "") + "> Ver como instrumento ya enviado</label></div>" +
      '<div class="panel"><h3>Así lo verá el juez</h3>' + prev + '<p class="hint" style="margin-top:12px">' + (s.type === "lawshe" ? "La razón de validez de contenido usa esta escala." : "Escala de 1 a " + k + ". La V de Aiken usa " + k + " categorías.") + "</p></div></div>");
  }

  // ---------------------------------------------------------------- IU04 panel
  function hu04() {
    var rows = S.panel.map(function (j, i) {
      return "<tr><td>" + esc(j.name) + "</td><td>" + esc(j.email) + "</td><td>" + (j.link ? '<code style="word-break:break-all">validex.example/e/' + esc(j.link.slice(0, 6)) + "…</code>" : '<span class="muted">Sin enviar</span>') + "</td><td>" +
        (S.sent ? '<button class="btn ghost small" data-act="resend" data-i="' + i + '">Reenviar enlace</button>' : '<button class="btn ghost small" data-act="delJudge" data-i="' + i + '">Quitar</button>') + "</td></tr>";
    }).join("");
    var e = S.panelErr;
    return shell(4, "Panel de jueces", "Registra a los jueces y envíales un enlace único. Cada enlace abre solo su propia evaluación.", '<button class="btn" data-act="sendPanel"' + (S.sent || !S.panel.length ? " disabled" : "") + ">Enviar instrumento a " + S.panel.length + " jueces</button>",
      (S.sent ? '<div class="note ok">Instrumento enviado. Cada juez recibió un enlace distinto.</div>' : "") +
      '<div class="panel"><h3>Jueces (' + S.panel.length + ')</h3><div class="tablewrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Enlace</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div></div>" +
      (S.sent ? "" : '<div class="panel"><h3>Agregar juez</h3><div class="row"><div style="flex:1;min-width:180px"><label for="j-name">Nombre</label><input type="text" id="j-name"' + (e.name ? ' class="invalid"' : "") + ">" + (e.name ? '<div class="err">' + e.name + "</div>" : "") + '</div><div style="flex:1;min-width:200px"><label for="j-mail">Correo</label><input type="email" id="j-mail"' + (e.email ? ' class="invalid"' : "") + ">" + (e.email ? '<div class="err">' + e.email + "</div>" : "") + '</div><button class="btn" data-act="addJudge">Agregar</button></div></div>'),
      "Instrumento: " + S.draft.name);
  }

  // ---------------------------------------------------------------- IU05 seguimiento
  function hu05() {
    var cnt = { "enviada": 0, "en curso": 0, "sin abrir": 0 };
    D.DRAFT_PANEL.forEach(function (j) { cnt[j.status]++; });
    var k = { "enviada": "ok", "en curso": "warn", "sin abrir": "gray" };
    return shell(5, "Seguimiento del avance", "Mira quién ya respondió y a quién recordarle.", "",
      '<div class="cols" style="grid-template-columns:repeat(3,1fr)">' + ["enviada", "en curso", "sin abrir"].map(function (s) { return '<div class="panel"><div style="font-size:2rem;font-weight:700">' + cnt[s] + "</div>" + (s === "enviada" ? "enviadas" : s === "en curso" ? "en curso" : "sin abrir") + "</div>"; }).join("") + "</div>" +
      '<div class="panel"><div class="tablewrap"><table><thead><tr><th>Juez</th><th>Estado</th><th></th></tr></thead><tbody>' + D.DRAFT_PANEL.map(function (j, i) {
        return "<tr><td>" + esc(j.name) + '<div class="muted">' + esc(j.email) + "</div></td><td>" + chip(j.status === "enviada" ? "Enviada" : j.status === "en curso" ? "En curso" : "Sin abrir", k[j.status]) + "</td><td>" + (j.status === "enviada" ? "" : '<button class="btn ghost small" data-act="remind" data-i="' + i + '">Enviar recordatorio</button>') + "</td></tr>";
      }).join("") + "</tbody></table></div></div>", "Instrumento: " + S.draft.name);
  }

  // ---------------------------------------------------------------- judge screens
  function answered(i) { var a = J.answers[i]; return a && a.rel && a.cla; }
  function nAnswered() { var n = 0; for (var i = 0; i < BASE; i++) if (answered(i)) n++; return n; }
  function missingList() { var m = []; for (var i = 0; i < BASE; i++) if (!answered(i)) m.push(i + 1); return m; }

  function hu06() {
    var tests = '<div class="noprint" style="text-align:center;margin-top:16px"><b>Probar con:</b> ' + [["valid", "Enlace válido"], ["altered", "Enlace alterado"], ["expired", "Enlace vencido"]].map(function (x) { return '<button class="btn ' + (S.link === x[0] ? "" : "ghost ") + 'small" data-act="link" data-v="' + x[0] + '">' + x[1] + "</button> "; }).join("") + "</div>";
    var body, foot = "";
    if (S.link === "valid") {
      body = '<h2 style="margin-top:6px">Hola, te invitaron a evaluar un instrumento</h2><p>«' + INSTR + '»</p><div class="panel" style="margin:0"><b>Qué vas a hacer</b><p class="muted" style="margin:6px 0 0">Calificarás ' + BASE + " ítems con 2 criterios: relevancia y claridad. Puedes dejar una observación en cualquier ítem y retomar más tarde desde este mismo enlace.</p></div>" +
        '<p class="hint">No necesitas crear una cuenta.</p>';
      foot = '<a class="btn" href="' + route(7) + '">Empezar a evaluar</a>';
    } else if (S.link === "altered") body = '<div class="note bad" style="margin-top:12px"><b>Este enlace no es válido.</b><br>Revisa que lo copiaste completo o pide uno nuevo a quien te invitó.</div>';
    else body = '<div class="note warn" style="margin-top:12px"><b>Este enlace venció.</b><br>Pide a quien te invitó que te envíe uno nuevo. El instrumento no se muestra hasta entonces.</div>';
    return phone("Validex", "Evaluación por jueces", body, foot) + tests;
  }

  function scaleRow(label, crit, val, lo, hi) {
    return '<div><label>' + label + '</label><div class="scale" role="group" aria-label="' + label + '">' + [1, 2, 3, 4].map(function (n) {
      return '<button data-act="rate" data-c="' + crit + '" data-v="' + n + '" aria-pressed="' + (val === n) + '">' + n + "</button>";
    }).join("") + '</div><div class="scalelab"><span>' + lo + "</span><span>" + hi + "</span></div></div>";
  }
  function hu07() {
    var i = J.cur, a = J.answers[i] || {}, left = missingList().length;
    var dim = i < 10 ? D.DIMENSIONS[0].name : D.DIMENSIONS[1].name;
    var dots = Array.apply(null, Array(BASE)).map(function (_, k) { return '<i class="' + (answered(k) ? "done " : "") + (k === i ? "cur" : "") + '" title="Ítem ' + (k + 1) + '"></i>'; }).join("");
    var body = '<div><div class="row" style="justify-content:space-between;align-items:center"><b>Ítem ' + (i + 1) + " de " + BASE + "</b>" + chip(dim) + '</div><div class="progress" style="margin-top:6px"><i style="width:' + (nAnswered() / BASE * 100) + '%"></i></div><p class="hint">' + (left ? "Te faltan " + left + " ítems." : "Calificaste todos los ítems.") + "</p></div>" +
      '<div class="itemcard">' + esc(D.ITEMS[i]) + "</div>" + scaleRow("Relevancia", "rel", a.rel, "Nada relevante", "Muy relevante") + scaleRow("Claridad", "cla", a.cla, "Nada claro", "Muy claro") +
      '<a href="' + route(8) + '" class="btn ghost small" style="align-self:flex-start">' + (J.obs[i] ? "Ver mi observación" : "Agregar observación") + '</a><div class="dots" aria-label="Avance">' + dots + '</div><p class="hint">Se guarda solo después de cada calificación.</p>';
    var foot = '<button class="btn ghost" data-act="nav" data-d="-1"' + (i === 0 ? " disabled" : "") + '>Anterior</button>' + (i < BASE - 1 ? '<button class="btn" data-act="nav" data-d="1">Siguiente</button>' : '<a class="btn" href="' + route(10) + '">Revisar y enviar</a>');
    return phone("Validex", INSTR, body, foot, { narrow: true });
  }

  function hu08() {
    var i = J.cur, o = J.obs[i] || { type: "Claridad", text: "" }, e = J.obsErr;
    var body = '<div class="itemcard" style="font-size:15px"><b>Ítem ' + (i + 1) + ".</b> " + esc(D.ITEMS[i]) + "</div>" +
      '<div class="field"><label for="o-type">Tipo de observación</label><select id="o-type" data-on="obsType">' + D.OBS_TYPES.map(function (t) { return "<option" + (t === o.type ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="o-text">Tu observación</label><textarea id="o-text" data-on="obsText" maxlength="1000"' + (e ? ' class="invalid"' : "") + ">" + esc(o.text) + "</textarea>" + (e ? '<div class="err">' + e + "</div>" : '<div class="hint">Se guarda junto con tus calificaciones de este ítem.</div>') + "</div>" +
      (J.obsOk ? '<div class="note ok">Observación guardada con tus calificaciones del ítem ' + (i + 1) + ".</div>" : "");
    return phone("Observación", "Ítem " + (i + 1) + " de " + BASE, body, '<a class="btn ghost" href="' + route(7) + '">Volver al ítem</a><button class="btn" data-act="saveObs">Guardar observación</button>', { narrow: true });
  }

  function hu09() {
    var n = nAnswered(), first = missingList()[0] || BASE;
    var body = '<h2 style="margin-top:6px">Te damos la bienvenida de nuevo</h2><div class="panel" style="margin:0"><b>' + n + " de " + BASE + " ítems calificados</b><div class=\"progress\" style=\"margin:8px 0\"><i style=\"width:" + (n / BASE * 100) + '%"></i></div><p class="muted" style="margin:0">Tu avance se guardó automáticamente. Sigues desde el ítem ' + first + ".</p></div>" +
      (J.offline ? '<div class="note warn">Se cortó la conexión. Lo que ya calificaste está guardado. Cuando vuelva, seguirás desde el ítem ' + first + ".</div>" : "") +
      '<button class="btn ghost small noprint" data-act="offline" style="align-self:flex-start">' + (J.offline ? "Restablecer conexión" : "Simular un corte de conexión") + "</button>";
    return phone("Validex", INSTR, body, '<a class="btn" href="' + route(7) + '" data-act="resume">Continuar desde el ítem ' + first + "</a>", { offline: J.offline, narrow: true });
  }

  function hu10() {
    var miss = missingList(), n = nAnswered();
    var body;
    if (J.sent) body = '<div class="note ok" style="margin-top:12px"><b>Evaluación enviada.</b><br>Código de constancia: ' + esc(J.code) + '</div><p class="muted">Ya no puedes modificarla. Si intentas enviarla otra vez desde este enlace, no se crea una segunda evaluación.</p>' + (J.again ? '<div class="note info">Ya enviaste tu evaluación. No se registró otra.</div>' : "");
    else body = '<h2 style="margin-top:6px">Revisa y envía</h2><div class="panel" style="margin:0"><b>' + n + " de " + BASE + " ítems calificados</b>" + (miss.length ? '<p class="err">Faltan los ítems: ' + miss.join(", ") + ".</p>" : '<p style="color:var(--ok);font-weight:600;margin:6px 0 0">Todo listo para enviar.</p>') + "</div>" +
      (J.sendErr ? '<div class="note bad">No se envió. Califica los ítems ' + miss.join(", ") + " y vuelve a intentarlo.</div>" : "") +
      (miss.length ? '<button class="btn ghost small noprint" data-act="fillRest" style="align-self:flex-start">Completar los faltantes con valores de ejemplo</button>' : "") + '<p class="hint">Después de enviar no podrás modificar tus respuestas.</p>';
    var foot = J.sent ? '<button class="btn" data-act="sendEval">Enviar otra vez</button>' : '<a class="btn ghost" href="' + route(7) + '">Volver</a><button class="btn" data-act="sendEval">Enviar evaluación</button>';
    return phone("Enviar evaluación", INSTR, body, foot, { narrow: true });
  }

  // ---------------------------------------------------------------- IU11 V de Aiken
  function hu11() {
    var crit = S.crit, thr = S.thr, nm = crit === "rel" ? "Relevancia" : "Claridad";
    var rows = D.ITEMS.map(function (t, i) {
      var st = itemStat(crit, i);
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(t) + '</td><td class="num">' + fmt(st.v) + "</td><td>" + plot(st.v, st.lo, st.hi, thr) + '</td><td class="num">' + fmt(st.lo) + " a " + fmt(st.hi) + "</td><td>" + (st.lo >= thr ? chip("Con validez", "ok") : st.v >= thr ? chip("Intervalo cruza el umbral", "warn") : chip("Por debajo del umbral", "bad")) + "</td></tr>";
    }).join("");
    var dimRows = D.DIMENSIONS.map(function (d) {
      var vs = []; for (var i = d.from; i < d.to; i++) vs.push(itemStat(crit, i).v);
      return "<tr><td>" + esc(d.name) + '</td><td class="num">' + fmt(vs.reduce(function (a, b) { return a + b; }, 0) / vs.length) + "</td></tr>";
    }).join("");
    var cr = S.calcRatings.split(/[\s,;]+/).filter(Boolean).map(Number), mn = +S.calcMin, mx = +S.calcMax, calc = "";
    if (cr.length && cr.every(function (x) { return isFinite(x) && x >= mn && x <= mx; }) && mx > mn) {
      var v = C.aikenV(cr, mn, mx), ci = C.scoreInterval(v, cr.length, mx - mn, ZS[S.conf]);
      calc = '<div class="note ok"><b>V = ' + fmt(v) + "</b>. Intervalo Score al " + Math.round(S.conf * 100) + " %: de " + fmt(ci.lower) + " a " + fmt(ci.upper) + ".</div>";
    } else calc = '<div class="note bad">Escribe las calificaciones separadas por comas, dentro de la escala elegida.</div>';
    return shell(11, "V de Aiken por ítem", "Instrumento «" + INSTR + "», calificado por 10 jueces.", "",
      '<div class="panel"><div class="row"><div><label for="c-crit">Criterio</label><select id="c-crit" data-on="crit"><option value="rel"' + (crit === "rel" ? " selected" : "") + '>Relevancia</option><option value="cla"' + (crit === "cla" ? " selected" : "") + '>Claridad</option></select></div>' +
      '<div><label for="c-conf">Nivel de confianza</label><select id="c-conf" data-on="conf">' + [0.9, 0.95, 0.99].map(function (c) { return '<option value="' + c + '"' + (S.conf === c ? " selected" : "") + ">" + Math.round(c * 100) + " %</option>"; }).join("") + '</select></div>' +
      '<div><label for="c-thr">Umbral de aceptación</label><input type="number" id="c-thr" data-on="thr" min="0" max="1" step="0.05" value="' + thr + '" style="width:100px"><div class="hint">Lo defines tú.</div></div></div>' +
      '<div class="legend"><span><i class="l-dot"></i>V</span><span><i class="l-span"></i>Intervalo Score</span><span><i class="l-thr"></i>Umbral</span></div>' +
      '<div class="tablewrap"><table><caption class="sr-only">V de Aiken de ' + nm + '</caption><thead><tr><th>Ítem</th><th>Enunciado</th><th class="num">V</th><th>0 a 1</th><th class="num">Intervalo</th><th>Estado</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>" +
      '<div class="cols"><div class="panel"><h3>Por dimensión (' + nm + ')</h3><table><thead><tr><th>Dimensión</th><th class="num">V promedio</th></tr></thead><tbody>' + dimRows + "</tbody></table></div>" +
      '<div class="panel"><h3>Calculadora</h3><div class="field"><label for="k-r">Calificaciones de los jueces</label><input type="text" id="k-r" data-on="calcR" value="' + esc(S.calcRatings) + '"></div><div class="row"><div><label for="k-min">Mínimo</label><input type="number" id="k-min" data-on="calcMin" value="' + S.calcMin + '" style="width:90px"></div><div><label for="k-max">Máximo</label><input type="number" id="k-max" data-on="calcMax" value="' + S.calcMax + '" style="width:90px"></div></div><div style="margin-top:12px" id="calc-out">' + calc + "</div></div></div>");
  }

  // ---------------------------------------------------------------- IU12 RVC
  function hu12() {
    var N = 10, crit = C.criticalCvr(N), cvis = [];
    var rows = D.ITEMS.map(function (t, i) {
      var ne = itemStat("rel", i).ne, r = C.cvr(ne, N), ok = r >= crit - 1e-9; cvis.push(r);
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(t) + '</td><td class="num">' + ne + " de " + N + '</td><td class="num">' + fmt(r) + "</td><td>" + (ok ? chip("Aprobado", "ok") : chip("No aprobado", "bad")) + "</td></tr>";
    }).join("");
    var cvi = cvis.reduce(function (a, b) { return a + b; }, 0) / cvis.length;
    var n = Math.max(3, Math.min(40, +S.rvcN || 3)), ne = Math.min(+S.rvcNe || 0, n), cr = C.criticalCvr(n), r = C.cvr(ne, n);
    return shell(12, "RVC e índice de validez de contenido", "Razón de validez de contenido de Lawshe por ítem, contra el valor crítico del panel.", "",
      '<div class="note info">Valor crítico para un panel de ' + N + " jueces: <b>" + fmt(crit) + "</b> (binomial exacta, nivel de significación de 0,05). En este prototipo, la calificación 4 cuenta como «esencial».</div>" +
      '<div class="panel"><div class="tablewrap"><table><thead><tr><th>Ítem</th><th>Enunciado</th><th class="num">Esenciales</th><th class="num">RVC</th><th>Resultado</th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr><th colspan="3" class="num">Índice de validez de contenido (promedio de las RVC)</th><th class="num">' + fmt(cvi) + "</th><th></th></tr></tfoot></table></div></div>" +
      '<div class="panel" style="max-width:520px"><h3>Calculadora</h3><div class="row"><div><label for="r-n">Jueces del panel</label><input type="number" id="r-n" data-on="rvcN" min="3" max="40" value="' + n + '" style="width:110px"></div><div><label for="r-ne">Jueces que marcan «esencial»</label><input type="number" id="r-ne" data-on="rvcNe" min="0" max="' + n + '" value="' + ne + '" style="width:110px"></div></div><div id="rvc-out" style="margin-top:12px"><div class="note ' + (r >= cr - 1e-9 ? "ok" : "bad") + '"><b>RVC = ' + fmt(r) + "</b>. Valor crítico: " + fmt(cr) + ". " + (r >= cr - 1e-9 ? "El ítem queda aprobado." : "El ítem no se aprueba.") + "</div></div></div>");
  }

  // ---------------------------------------------------------------- IU13 observaciones
  function hu13() {
    var sel = S.sel, obs = D.OBSERVATIONS[sel] || [];
    var list = D.ITEMS.map(function (t, i) {
      var n = (D.OBSERVATIONS[i + 1] || []).length;
      return '<button class="btn ' + (sel === i + 1 ? "" : "ghost ") + 'small" data-act="selItem" data-i="' + (i + 1) + '" style="margin:0 6px 6px 0">' + (i + 1) + (n ? " · " + n : "") + "</button>";
    }).join("");
    var name = function (j) { return S.hideNames ? "Juez anónimo" : "Juez " + j; };
    var grp = {};
    obs.forEach(function (o) { (grp[o.type] = grp[o.type] || []).push(o); });
    var ratings = D.JUDGES.map(function (j, k) { return "<tr><td>" + (S.hideNames ? "●" : esc(j.name)) + '</td><td class="num">' + D.RATINGS.rel[sel - 1][k] + '</td><td class="num">' + D.RATINGS.cla[sel - 1][k] + "</td></tr>"; }).join("");
    var cm = obs.length ? Object.keys(grp).map(function (t) {
      return "<h3 style='margin-top:10px'>" + chip(t) + "</h3>" + grp[t].map(function (o) { return '<div class="panel" style="padding:10px 12px;margin-bottom:8px"><b>' + name(o.judge) + "</b><br>" + esc(o.text) + "</div>"; }).join("");
    }).join("") : '<div class="note info">Ningún juez comentó este ítem. Mira las calificaciones de la derecha.</div>';
    return shell(13, "Observaciones de los jueces", "Todos los comentarios reunidos bajo cada ítem, junto con la calificación de cada juez.", '<label style="font-weight:400"><input type="checkbox" data-on="hide"' + (S.hideNames ? " checked" : "") + "> Ocultar identidad de los jueces</label>",
      '<div class="panel"><b>Ítem</b> <span class="muted">(el número a la derecha es la cantidad de comentarios)</span><div style="margin-top:8px">' + list + "</div></div>" +
      '<div class="cols"><div><div class="panel"><h2>Ítem ' + sel + "</h2><p>" + esc(D.ITEMS[sel - 1]) + "</p></div>" + cm + '</div><div class="panel"><h3>Calificación de cada juez</h3><table><thead><tr><th>Juez</th><th class="num">Relevancia</th><th class="num">Claridad</th></tr></thead><tbody>' + ratings + "</tbody></table></div></div>");
  }

  // ---------------------------------------------------------------- IU14 decisión
  function hu14() {
    var cnt = { mantener: 0, ajustar: 0, eliminar: 0, none: 0 };
    var rows = D.ITEMS.map(function (t, i) {
      var st = itemStat("rel", i), dec = S.decisions[i + 1] || { d: "", note: "" };
      cnt[dec.d || "none"]++;
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(t) + '</td><td class="num">' + fmt(st.v) + '</td><td class="num">' + fmt(st.lo) + " a " + fmt(st.hi) + '</td><td><label class="sr-only" for="d-' + i + '">Decisión del ítem ' + (i + 1) + '</label><select id="d-' + i + '" data-on="dec" data-i="' + (i + 1) + '"><option value="">Sin decidir</option>' + ["mantener", "ajustar", "eliminar"].map(function (o) { return "<option" + (dec.d === o ? " selected" : "") + ' value="' + o + '">' + o[0].toUpperCase() + o.slice(1) + "</option>"; }).join("") + '</select></td><td><label class="sr-only" for="n-' + i + '">Nota del ítem ' + (i + 1) + '</label><input type="text" id="n-' + i + '" data-on="decNote" data-i="' + (i + 1) + '" value="' + esc(dec.note) + '" placeholder="Nota"></td></tr>';
    }).join("");
    return shell(14, "Decisión por ítem", "Marca cada ítem como mantener, ajustar o eliminar y deja el motivo. Los coeficientes de la relevancia están a la vista.", "",
      '<div class="row" style="margin-bottom:12px">' + chip("Mantener " + cnt.mantener, "ok") + chip("Ajustar " + cnt.ajustar, "warn") + chip("Eliminar " + cnt.eliminar, "bad") + chip("Sin decidir " + cnt.none, "gray") + '</div><div class="panel"><div class="tablewrap"><table><thead><tr><th>Ítem</th><th>Enunciado</th><th class="num">V</th><th class="num">Intervalo</th><th>Decisión</th><th>Nota</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>");
  }

  // ---------------------------------------------------------------- IU15 reporte
  function hu15() {
    var rows = D.ITEMS.map(function (t, i) {
      var st = itemStat("rel", i), dec = S.decisions[i + 1] || { d: "", note: "" }, no = (D.OBSERVATIONS[i + 1] || []).length;
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(t) + '</td><td class="num">' + fmt(st.v) + '</td><td class="num">' + fmt(st.lo) + " a " + fmt(st.hi) + '</td><td class="num">' + fmt(C.cvr(st.ne, 10)) + "</td><td>" + esc(dec.d || "Sin decidir") + "</td>" + (S.reportObs ? '<td class="num">' + no + "</td>" : "") + "</tr>";
    }).join("");
    return shell(15, "Reporte del instrumento", "Descarga los resultados para anexarlos a tu trabajo.", '<button class="btn" data-act="csv">Descargar Excel (.csv)</button> <button class="btn ghost" data-act="print">Descargar PDF</button>',
      '<div class="panel"><label style="font-weight:400"><input type="checkbox" data-on="repObs"' + (S.reportObs ? " checked" : "") + "> Incluir observaciones de los jueces</label></div>" +
      '<div class="panel"><h2>' + INSTR + '</h2><p class="muted">20 ítems · 10 jueces · escala de 1 a 4 · criterio: relevancia</p><div class="tablewrap"><table><thead><tr><th>Ítem</th><th>Enunciado</th><th class="num">V</th><th class="num">Intervalo Score 95 %</th><th class="num">RVC</th><th>Decisión</th>' + (S.reportObs ? '<th class="num">Observaciones</th>' : "") + "</tr></thead><tbody>" + rows + "</tbody></table></div></div>");
  }

  // ---------------------------------------------------------------- IU16 cuenta
  function hu16() {
    var t = S.tab, e = S.authErr;
    var f = function (id, label, type, ph) { return '<div class="field"><label for="' + id + '">' + label + '</label><input type="' + type + '" id="' + id + '"' + (e[id] ? ' class="invalid"' : "") + (ph ? ' placeholder="' + ph + '"' : "") + ">" + (e[id] ? '<div class="err">' + e[id] + "</div>" : "") + "</div>"; };
    var form;
    if (t === "login") form = f("a-mail", "Correo", "email") + f("a-pass", "Contraseña", "password") + '<button class="btn" data-act="login">Iniciar sesión</button> <button class="btn ghost" data-act="tab" data-v="reset">Olvidé mi contraseña</button>';
    else if (t === "register") form = f("a-name", "Nombre completo", "text") + f("a-mail", "Correo", "email") + f("a-pass", "Contraseña", "password", "Mínimo 8 caracteres") + f("a-pass2", "Repite la contraseña", "password") + '<button class="btn" data-act="register">Crear cuenta</button>';
    else form = (S.resetExpired ? '<div class="note bad">Este enlace de recuperación venció. Pide otro para fijar una contraseña nueva.</div>' : '<p class="muted">Te enviaremos un enlace para fijar una contraseña nueva.</p>') + f("a-mail", "Correo", "email") + '<div class="row"><button class="btn" data-act="reset">Enviar enlace</button><button class="btn ghost small" data-act="expired">Probar un enlace vencido</button></div>';
    return '<div class="stage" style="padding-top:40px"><div class="panel" style="width:440px;max-width:100%"><h1 style="color:var(--blue)">Validex</h1><p class="muted">Valida el contenido de tus instrumentos con jueces expertos.</p><div class="tabs" role="tablist">' +
      [["login", "Iniciar sesión"], ["register", "Crear cuenta"], ["reset", "Recuperar"]].map(function (x) { return '<button role="tab" aria-selected="' + (t === x[0]) + '" data-act="tab" data-v="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>" + (S.authMsg ? '<div class="note ok">' + S.authMsg + "</div>" : "") + form + '<p class="hint" style="margin-top:12px"><a href="' + route(1) + '">Entrar al prototipo sin iniciar sesión</a></p></div></div>';
  }

  // ---------------------------------------------------------------- IU17 exactitud
  function hu17() {
    var cases = [
      { n: "V, desacuerdo leve", inp: "4, 4, 3, 4 en escala 1 a 4", ex: "V 0,92 · IC 0,65 a 0,99", run: function () { var v = C.aikenV([4, 4, 3, 4], 1, 4), c = C.scoreInterval(v, 4, 3); return { got: "V " + fmt(v) + " · IC " + fmt(c.lower) + " a " + fmt(c.upper), ok: C.r2(v) === 0.92 && C.r2(c.lower) === 0.65 && C.r2(c.upper) === 0.99 }; } },
      { n: "V, más desacuerdo", inp: "3, 3, 4, 4 en escala 1 a 4", ex: "V 0,83 · IC 0,55 a 0,95", run: function () { var v = C.aikenV([3, 3, 4, 4], 1, 4), c = C.scoreInterval(v, 4, 3); return { got: "V " + fmt(v) + " · IC " + fmt(c.lower) + " a " + fmt(c.upper), ok: C.r2(v) === 0.83 && C.r2(c.lower) === 0.55 && C.r2(c.upper) === 0.95 }; } },
      { n: "V, acuerdo total", inp: "4, 4, 4, 4 en escala 1 a 4", ex: "V 1,00", run: function () { var v = C.aikenV([4, 4, 4, 4], 1, 4); return { got: "V " + fmt(v), ok: v === 1 }; } },
      { n: "RVC aprobada", inp: "9 esenciales de 10", ex: "RVC 0,80 · aprobado", run: function () { var r = C.cvr(9, 10); return { got: "RVC " + fmt(r) + " · " + (r >= C.criticalCvr(10) - 1e-9 ? "aprobado" : "no aprobado"), ok: C.r2(r) === 0.8 && r >= C.criticalCvr(10) - 1e-9 }; } },
      { n: "RVC no aprobada", inp: "8 esenciales de 10", ex: "RVC 0,60 · no aprobado", run: function () { var r = C.cvr(8, 10); return { got: "RVC " + fmt(r) + " · " + (r >= C.criticalCvr(10) - 1e-9 ? "aprobado" : "no aprobado"), ok: C.r2(r) === 0.6 && r < C.criticalCvr(10) }; } },
      { n: "RVC, panel pequeño", inp: "4 esenciales de 5", ex: "RVC 0,60 · no aprobado", run: function () { var r = C.cvr(4, 5); return { got: "RVC " + fmt(r) + " · " + (r >= C.criticalCvr(5) - 1e-9 ? "aprobado" : "no aprobado"), ok: C.r2(r) === 0.6 && r < C.criticalCvr(5) }; } },
      { n: "RVC, acuerdo total", inp: "5 esenciales de 5", ex: "RVC 1,00 · aprobado", run: function () { var r = C.cvr(5, 5); return { got: "RVC " + fmt(r) + " · " + (r >= C.criticalCvr(5) - 1e-9 ? "aprobado" : "no aprobado"), ok: C.r2(r) === 1 && r >= C.criticalCvr(5) - 1e-9 }; } },
    ];
    var res = S.ref ? cases.map(function (c) { return c.run(); }) : null, pass = res ? res.filter(function (r) { return r.ok; }).length : 0;
    var rows = cases.map(function (c, i) { return "<tr><td>" + c.n + "</td><td>" + c.inp + "</td><td>" + c.ex + "</td><td>" + (res ? res[i].got : "-") + "</td><td>" + (res ? (res[i].ok ? chip("Coincide", "ok") : chip("Difiere", "bad")) : chip("Sin ejecutar", "gray")) + "</td></tr>"; }).join("");
    return shell(17, "Exactitud de los coeficientes", "Compara lo que calcula la plataforma con los valores de referencia, a dos decimales.", '<button class="btn" data-act="runRef">Ejecutar casos de referencia</button>',
      (res ? '<div class="note ' + (pass === cases.length ? "ok" : "bad") + '"><b>' + pass + " de " + cases.length + " casos coinciden</b> a dos decimales.</div>" : '<div class="note info">Ejecuta los casos para ver el resultado.</div>') +
      '<div class="panel"><div class="tablewrap"><table><thead><tr><th>Caso</th><th>Entrada</th><th>Esperado</th><th>Obtenido</th><th>Resultado</th></tr></thead><tbody>' + rows + '</tbody></table></div></div><p class="muted">Estos siete casos salen de los criterios de aceptación. El conjunto completo de 30 casos se arma en el sprint 3.</p>', "Calidad");
  }

  // ---------------------------------------------------------------- IU18 privacidad
  function hu18() {
    var t = S.tests;
    return shell(18, "Privacidad y acceso", "Cada investigador ve solo sus instrumentos, y cada juez solo su evaluación.", "",
      '<div class="cols"><div class="panel"><h3>Instrumento de otra cuenta</h3><p class="muted">Un investigador intenta abrir el instrumento de otro.</p><button class="btn ghost small" data-act="t18" data-v="cross">Probar el acceso</button>' + (t.cross ? '<div class="note bad" style="margin-top:12px"><b>No tienes acceso a este instrumento.</b><br>Pertenece a otra cuenta. <a href="' + route(1) + '">Volver a mis instrumentos</a></div>' : "") + "</div>" +
      '<div class="panel"><h3>Enlace de juez alterado</h3><p class="muted">Se cambia un carácter del enlace de evaluación.</p><button class="btn ghost small" data-act="t18" data-v="link">Probar el enlace</button>' + (t.link ? '<div class="note bad" style="margin-top:12px"><b>Este enlace no es válido.</b><br>El mensaje no dice si existe un enlace parecido.</div>' : "") + "</div>" +
      '<div class="panel"><h3>Conexión cifrada</h3><p class="muted">Toda la plataforma se sirve por HTTPS. Una dirección sin cifrar redirige a la versión cifrada.</p><div class="note ok"><code>http://</code> redirige a <code>https://</code></div></div></div>', "Calidad");
  }

  // ---------------------------------------------------------------- IU19 rendimiento
  function measure() {
    var items = 50, judges = 10, t0 = performance.now(), acc = 0;
    for (var rep = 0; rep < 5; rep++) for (var i = 0; i < items; i++) {
      var r = []; for (var j = 0; j < judges; j++) r.push(1 + ((i * 7 + j * 3 + rep) % 4));
      var v = C.aikenV(r, 1, 4), c = C.scoreInterval(v, judges, 3); acc += v + c.lower + c.upper;
    }
    return (performance.now() - t0) / 5 + (acc < 0 ? 1 : 0);
  }
  function hu19() {
    if (S.perf === null) S.perf = measure();
    var ms = S.perf, ok = ms < 2000;
    var skel = '<div class="phone narrow mini" style="min-height:420px"><div class="ph-head"><b>Cargando…</b></div><div class="ph-body"><div class="skeleton" style="height:18px;width:60%"></div><div class="skeleton" style="height:90px"></div><div class="skeleton" style="height:48px"></div><div class="skeleton" style="height:48px"></div></div></div>';
    var off = '<div class="phone narrow mini" style="min-height:420px"><div class="offline">Sin conexión. Tus calificaciones están guardadas.</div><div class="ph-head"><b>Ítem 9 de 20</b></div><div class="ph-body"><div class="itemcard">' + esc(D.ITEMS[8]) + '</div><div class="note warn">Cuando vuelva la conexión se envía lo que falte.</div></div></div>';
    return shell(19, "Rendimiento y uso en el teléfono", "El formulario y el cálculo deben responder en menos de 2 segundos, y verse bien en una pantalla de 360 px.", '<button class="btn" data-act="measure">Medir de nuevo</button>',
      '<div class="note ' + (ok ? "ok" : "bad") + '"><b>Calcular un instrumento de 50 ítems y 10 jueces tardó ' + (ms < 1 ? "menos de 1" : ms.toFixed(1).replace(".", ",")) + " ms</b> en este equipo. Límite: 2000 ms.</div>" +
      '<div class="cols"><div><h3>Mientras carga</h3>' + skel + "</div><div><h3>Sin conexión</h3>" + off + '</div></div><p class="muted">La medición del cálculo es real. El tiempo de respuesta con datos móviles se mide con k6 en el entorno de calidad, no en este prototipo.</p>', "Calidad");
  }

  // ---------------------------------------------------------------- map
  var SCREENS = [
    { hu: 1, t: "Crear instrumento", a: "inv", f: hu01 }, { hu: 2, t: "Importar ítems", a: "inv", f: hu02 }, { hu: 3, t: "Escala y criterios", a: "inv", f: hu03 },
    { hu: 4, t: "Panel de jueces y enlace único", a: "inv", f: hu04 }, { hu: 5, t: "Seguimiento del avance", a: "inv", f: hu05 }, { hu: 6, t: "Acceso del juez sin cuenta", a: "jue", f: hu06 },
    { hu: 7, t: "Calificación rápida", a: "jue", f: hu07 }, { hu: 8, t: "Observación por ítem", a: "jue", f: hu08 }, { hu: 9, t: "Guardado y reanudación", a: "jue", f: hu09 },
    { hu: 10, t: "Envío de la evaluación", a: "jue", f: hu10 }, { hu: 11, t: "V de Aiken con intervalo Score", a: "inv", f: hu11 }, { hu: 12, t: "RVC e índice de Lawshe", a: "inv", f: hu12 },
    { hu: 13, t: "Observaciones por ítem", a: "inv", f: hu13 }, { hu: 14, t: "Decisión por ítem", a: "inv", f: hu14 }, { hu: 15, t: "Reporte en PDF y Excel", a: "inv", f: hu15 },
    { hu: 16, t: "Cuenta e inicio de sesión", a: "inv", f: hu16 }, { hu: 17, t: "Exactitud de los coeficientes", a: "rnf", f: hu17 }, { hu: 18, t: "Privacidad y acceso", a: "rnf", f: hu18 },
    { hu: 19, t: "Rendimiento y uso en el teléfono", a: "rnf", f: hu19 },
  ];
  function map() {
    var grp = function (a, h, sub) {
      return "<h2>" + h + '</h2><p class="muted">' + sub + '</p><div class="mapgrid">' + SCREENS.filter(function (s) { return s.a === a; }).map(function (s) { return '<a class="mapcard" href="' + route(s.hu) + '"><b>IU' + pad(s.hu) + "</b>" + esc(s.t) + "<br><span>Historia HU" + pad(s.hu) + "</span></a>"; }).join("") + "</div>";
    };
    return '<div class="mapwrap"><h1>Validex: prototipo de interfaces</h1><p style="max-width:70ch">Plataforma web para el investigador y formulario móvil para el juez, con las 19 interfaces del proyecto. Cada una corresponde a una historia de usuario (IU07 es la historia HU07). Los datos son de ejemplo y la V de Aiken, el intervalo Score y la RVC se calculan de verdad.</p>' +
      grp("inv", "Investigador (web)", "Crea el instrumento, invita a los jueces y analiza los resultados.") + grp("jue", "Juez evaluador (móvil)", "Califica los ítems desde el teléfono. Abre las pantallas en un celular para verlas a pantalla completa.") + grp("rnf", "Requisitos no funcionales", "Exactitud, privacidad y rendimiento.") + "</div>";
  }

  // ---------------------------------------------------------------- router
  function current() { var m = /^#\/hu(\d\d)$/.exec(location.hash); return m ? +m[1] : 0; }
  function render() {
    var hu = current(), root = document.getElementById("root"), s = SCREENS.filter(function (x) { return x.hu === hu; })[0];
    root.innerHTML = s ? s.f() : map();
    Array.prototype.forEach.call(root.querySelectorAll(".tablewrap"), function (w) { w.tabIndex = 0; w.setAttribute("role", "region"); w.setAttribute("aria-label", "Tabla desplazable"); });
    document.getElementById("strip-tag").textContent = s ? "IU" + pad(hu) + " · " + s.t : "Prototipo";
    document.title = (s ? "IU" + pad(hu) + " " + s.t + " · " : "") + "Validex";
  }
  window.addEventListener("hashchange", function () { J.obsOk = false; J.sendErr = false; window.scrollTo(0, 0); render(); });

  // ---------------------------------------------------------------- actions
  var ACT = {
    saveDraft: function () {
      S.errors = {}; S.draft.dims.forEach(function (d, di) {
        var seen = {}; d.items.forEach(function (t, ii) {
          var k = t.trim().toLowerCase();
          if (!k) S.errors[di + "-" + ii] = "El ítem está vacío.";
          else if (seen[k]) S.errors[di + "-" + ii] = "Este ítem se repite en la dimensión.";
          seen[k] = true;
        });
      });
      S.saved = !Object.keys(S.errors).length; render();
    },
    addItem: function (a) { S.draft.dims[+a.dataset.d].items.push(""); S.saved = false; render(); },
    delItem: function (a) { S.draft.dims[+a.dataset.d].items.splice(+a.dataset.i, 1); S.errors = {}; S.saved = false; render(); },
    addDim: function () { S.draft.dims.push({ name: "Nueva dimensión", items: [""] }); S.saved = false; render(); },
    imp: function (a) { S.imp = a.dataset.v; render(); },
    impOk: function () { toast("Se importaron 28 ítems. Se omitieron 2 filas con error."); S.imp = "none"; render(); },
    sendPanel: function () { S.panel.forEach(function (j) { j.link = token(); }); S.sent = true; render(); },
    resend: function (a) { S.panel[+a.dataset.i].link = token(); toast("Enlace reenviado. El anterior ya no funciona."); render(); },
    delJudge: function (a) { S.panel.splice(+a.dataset.i, 1); render(); },
    addJudge: function () {
      var n = document.getElementById("j-name").value.trim(), m = document.getElementById("j-mail").value.trim(); S.panelErr = {};
      if (!n) S.panelErr.name = "Escribe el nombre del juez.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) S.panelErr.email = "Escribe un correo válido, por ejemplo juez@correo.pe.";
      else if (S.panel.some(function (j) { return j.email.toLowerCase() === m.toLowerCase(); })) S.panelErr.email = "Este correo ya está en el panel.";
      if (!Object.keys(S.panelErr).length) S.panel.push({ name: n, email: m, status: "sin abrir", link: "" });
      render();
    },
    remind: function (a) { toast("Recordatorio enviado a " + D.DRAFT_PANEL[+a.dataset.i].name + "."); },
    link: function (a) { S.link = a.dataset.v; render(); },
    rate: function (a) { var i = J.cur; J.answers[i] = J.answers[i] || {}; J.answers[i][a.dataset.c] = +a.dataset.v; render(); },
    nav: function (a) { J.cur = Math.max(0, Math.min(BASE - 1, J.cur + +a.dataset.d)); render(); },
    saveObs: function () {
      var ty = document.getElementById("o-type").value, tx = document.getElementById("o-text").value.trim();
      if (!tx) { J.obsErr = "Escribe tu observación antes de guardarla."; J.obsOk = false; } else { J.obs[J.cur] = { type: ty, text: tx }; J.obsErr = ""; J.obsOk = true; }
      render();
    },
    offline: function () { J.offline = !J.offline; render(); },
    resume: function () { var m = missingList(); J.cur = m.length ? m[0] - 1 : BASE - 1; },
    fillRest: function () { for (var i = 0; i < BASE; i++) if (!answered(i)) J.answers[i] = { rel: 4, cla: 3 }; J.sendErr = false; render(); },
    sendEval: function () {
      if (J.sent) { J.again = true; render(); return; }
      if (missingList().length) { J.sendErr = true; render(); return; }
      J.sent = true; J.code = "VX-" + token().slice(0, 6).toUpperCase(); render();
    },
    selItem: function (a) { S.sel = +a.dataset.i; render(); },
    csv: function () {
      var head = ["Ítem", "Enunciado", "V", "IC inferior", "IC superior", "RVC", "Decisión"].concat(S.reportObs ? ["Observaciones"] : []);
      var lines = [head.join(";")];
      D.ITEMS.forEach(function (t, i) {
        var st = itemStat("rel", i), dec = S.decisions[i + 1] || { d: "Sin decidir" };
        var r = [i + 1, '"' + t.replace(/"/g, '""') + '"', fmt(st.v), fmt(st.lo), fmt(st.hi), fmt(C.cvr(st.ne, 10)), dec.d || "Sin decidir"];
        if (S.reportObs) r.push('"' + (D.OBSERVATIONS[i + 1] || []).map(function (o) { return o.type + ": " + o.text; }).join(" | ").replace(/"/g, '""') + '"');
        lines.push(r.join(";"));
      });
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })); a.download = "validex-reporte.csv"; a.click(); toast("Reporte descargado.");
    },
    print: function () { window.print(); },
    tab: function (a) { S.tab = a.dataset.v; S.authErr = {}; S.authMsg = ""; S.resetExpired = false; render(); },
    login: function () {
      var m = document.getElementById("a-mail").value.trim(), p = document.getElementById("a-pass").value; S.authErr = {}; S.authMsg = "";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) S.authErr["a-mail"] = "Escribe un correo válido.";
      if (!p) S.authErr["a-pass"] = "Escribe tu contraseña.";
      if (!Object.keys(S.authErr).length) S.authMsg = 'Sesión iniciada. <a href="' + route(1) + '">Ir a mis instrumentos</a>';
      render();
    },
    register: function () {
      var n = document.getElementById("a-name").value.trim(), m = document.getElementById("a-mail").value.trim(), p = document.getElementById("a-pass").value, p2 = document.getElementById("a-pass2").value; S.authErr = {}; S.authMsg = "";
      if (!n) S.authErr["a-name"] = "Escribe tu nombre.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) S.authErr["a-mail"] = "Escribe un correo válido.";
      if (p.length < 8) S.authErr["a-pass"] = "La contraseña debe tener al menos 8 caracteres.";
      else if (p !== p2) S.authErr["a-pass2"] = "Las contraseñas no coinciden.";
      if (!Object.keys(S.authErr).length) S.authMsg = "Cuenta creada. Ya puedes iniciar sesión.";
      render();
    },
    reset: function () {
      var m = document.getElementById("a-mail").value.trim(); S.authErr = {}; S.authMsg = ""; S.resetExpired = false;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) S.authErr["a-mail"] = "Escribe un correo válido.";
      else S.authMsg = "Si el correo está registrado, te enviamos un enlace que vence en 60 minutos.";
      render();
    },
    expired: function () { S.resetExpired = true; S.authMsg = ""; render(); },
    runRef: function () { S.ref = true; render(); },
    t18: function (a) { S.tests[a.dataset.v] = true; render(); },
    measure: function () { S.perf = measure(); render(); },
  };

  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-act]");
    if (a && ACT[a.dataset.act]) { if (a.tagName === "A" && a.dataset.act !== "resume") e.preventDefault(); ACT[a.dataset.act](a); }
  });
  document.addEventListener("input", function (e) {
    var t = e.target, k = t.dataset && t.dataset.on; if (!k) return;
    var d = +t.dataset.d, i = +t.dataset.i;
    if (k === "item") { S.draft.dims[d].items[i] = t.value; S.saved = false; delete S.errors[d + "-" + i]; }
    else if (k === "dim") S.draft.dims[d].name = t.value;
    else if (k === "name") S.draft.name = t.value;
    else if (k === "desc") S.draft.description = t.value;
    else if (k === "calcR" || k === "calcMin" || k === "calcMax") { S[k === "calcR" ? "calcRatings" : k] = t.value; var keep = [t.id, t.selectionStart]; render(); var n = document.getElementById(keep[0]); if (n) { n.focus(); try { n.setSelectionRange(keep[1], keep[1]); } catch (x) {} } }
    else if (k === "rvcN" || k === "rvcNe") { S[k] = Math.max(0, Math.round(+t.value || 0)); var kp = [t.id, t.selectionStart]; render(); var m = document.getElementById(kp[0]); if (m) { m.focus(); try { m.setSelectionRange(kp[1], kp[1]); } catch (x) {} } }
    else if (k === "decNote") { S.decisions[i] = S.decisions[i] || { d: "", note: "" }; S.decisions[i].note = t.value; }
  });
  document.addEventListener("change", function (e) {
    var t = e.target, k = t.dataset && t.dataset.on; if (!k) return;
    if (k === "scType") { S.scale.type = t.value; render(); }
    else if (k === "scCats") { S.scale.cats = +t.value; render(); }
    else if (k === "crit") { if (t.dataset.c) { S.scale.crit[t.dataset.c] = t.checked; render(); } else { S.crit = t.value; render(); } }
    else if (k === "viewSent") { S.viewSent = t.checked; render(); }
    else if (k === "conf") { S.conf = +t.value; render(); }
    else if (k === "thr") { S.thr = Math.min(1, Math.max(0, +t.value || 0)); render(); }
    else if (k === "hide") { S.hideNames = t.checked; render(); }
    else if (k === "dec") { var i = +t.dataset.i; S.decisions[i] = S.decisions[i] || { d: "", note: "" }; S.decisions[i].d = t.value; render(); }
    else if (k === "repObs") { S.reportObs = t.checked; render(); }
  });

  render();
})();

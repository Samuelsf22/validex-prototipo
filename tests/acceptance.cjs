/* Acceptance tests for HU01, HU04, HU07 and HU11, run against the prototype in a real browser.
 *
 * Usage (from pa3/prototipo):
 *   npm install            (installs playwright-core)
 *   python -m http.server 8765        (in another terminal)
 *   CHROME_PATH="<path to chrome.exe>" node tests/acceptance.cjs
 * Optional: BASE_URL=https://... to test the published prototype.
 */
const { chromium } = require("playwright-core");
const BASE = process.env.BASE_URL || "http://127.0.0.1:8765/index.html";
const results = [];

function check(id, name, cond, detail) {
  results.push({ id, name, ok: !!cond, detail: detail || "" });
  console.log((cond ? "PASS " : "FAIL ") + id + " " + name + (detail ? "  [" + detail + "]" : ""));
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  const fresh = async (hash) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + hash);
    return page;
  };
  const text = (page, sel) => page.locator(sel).first().innerText();

  // ---- HU01 -----------------------------------------------------------
  let p = await fresh("#/hu01");
  await p.click('[data-act="saveDraft"]');
  let t = await text(p, ".main");
  check("HU01-E1", "Instrumento de 2 dimensiones y 10 ítems se guarda y queda editable",
    /2 dimensiones y 10 ítems/.test(t) && /Instrumento guardado\. Puedes editarlo mientras no lo envíes\./.test(t));

  p = await fresh("#/hu01");
  await p.fill("#it-0-1", "");
  await p.fill("#it-1-1", "Me siento capaz de aprobar mis cursos.".replace("capaz", "capaz")); // different dimension: allowed
  await p.fill("#it-0-2", "Me siento capaz de aprobar mis cursos."); // duplicates item 1 of dimension 1
  await p.click('[data-act="saveDraft"]');
  t = await text(p, ".main");
  check("HU01-E2", "Un ítem vacío y uno repetido se rechazan y no se guarda",
    /El ítem está vacío\./.test(t) && /Este ítem se repite en la dimensión\./.test(t) && !/Instrumento guardado/.test(t),
    (t.match(/Hay \d+ ítems? con error/) || [""])[0]);

  // ---- HU04 -----------------------------------------------------------
  p = await fresh("#/hu04");
  await p.click('[data-act="sendPanel"]');
  const links = await p.locator("tbody code").allInnerTexts();
  check("HU04-E1", "Al enviar a 5 jueces, cada uno recibe un enlace distinto",
    links.length === 5 && new Set(links).size === 5, links.length + " enlaces, " + new Set(links).size + " distintos");

  const before = await p.locator("tbody code").first().innerText();
  await p.locator('[data-act="resend"]').first().click();
  const after = await p.locator("tbody code").first().innerText();
  check("HU04-E2", "El reenvío genera un enlace nuevo", before !== after);
  const j = await fresh("#/hu06");
  await j.click('[data-act="link"][data-v="expired"]');
  t = await text(j, ".phone");
  check("HU04-E2b", "Un enlace vencido muestra el aviso y no muestra el instrumento",
    /Este enlace venció/.test(t) && !/Empezar a evaluar/.test(t));

  // ---- HU07 -----------------------------------------------------------
  p = await fresh("#/hu07");
  t = await text(p, ".phone");
  const m0 = t.match(/Te faltan (\d+) ítems/);
  await p.locator('[data-act="rate"][data-c="rel"][data-v="4"]').click();
  await p.locator('[data-act="rate"][data-c="cla"][data-v="3"]').click();
  t = await text(p, ".phone");
  const m1 = t.match(/Te faltan (\d+) ítems/);
  const noText = (await p.locator(".phone textarea, .phone input[type=text]").count()) === 0;
  check("HU07-E1", "Califico un ítem con toques, sin escribir texto, y veo cuántos faltan",
    m0 && m1 && +m1[1] === +m0[1] - 1 && noText, "faltaban " + (m0 && m0[1]) + ", ahora " + (m1 && m1[1]));

  await p.click('[data-act="nav"][data-d="1"]');
  await p.click('[data-act="nav"][data-d="-1"]');
  const pressed = await p.locator('[data-act="rate"][data-c="rel"][aria-pressed="true"]').innerText();
  check("HU07-E2", "Al volver a un ítem anterior veo mi calificación y puedo cambiarla", pressed.trim() === "4");
  await p.locator('[data-act="rate"][data-c="rel"][data-v="2"]').click();
  check("HU07-E2b", "La calificación anterior se puede cambiar",
    (await p.locator('[data-act="rate"][data-c="rel"][aria-pressed="true"]').innerText()).trim() === "2");

  // 360 px: no horizontal scroll
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const m = await ctx.newPage();
  await m.goto(BASE + "#/hu07");
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check("HU07-E3", "En 360 px de ancho el formulario se ve completo, sin desplazamiento horizontal", !overflow);

  // ---- HU11 -----------------------------------------------------------
  p = await fresh("#/hu11");
  await p.fill("#k-r", "4, 4, 3, 4");
  t = await text(p, "#calc-out");
  check("HU11-E1", "4, 4, 3, 4 en escala 1 a 4: V = 0,92 e intervalo Score de 0,65 a 0,99",
    /V = 0,92/.test(t) && /0,65 a 0,99/.test(t), t.replace(/\s+/g, " ").trim());

  await p.fill("#k-r", "3, 3, 4, 4");
  t = await text(p, "#calc-out");
  check("HU11-E2", "3, 3, 4, 4: V = 0,83 e intervalo de 0,55 a 0,95",
    /V = 0,83/.test(t) && /0,55 a 0,95/.test(t), t.replace(/\s+/g, " ").trim());

  await p.fill("#k-r", "4, 4, 4, 4");
  t = await text(p, "#calc-out");
  check("HU11-E3", "Acuerdo total: V = 1,00", /V = 1,00/.test(t));

  await browser.close();
  const bad = results.filter((r) => !r.ok).length;
  console.log("\n" + (results.length - bad) + " de " + results.length + " comprobaciones pasan");
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(2); });

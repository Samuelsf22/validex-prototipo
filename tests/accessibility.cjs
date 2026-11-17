/* Accessibility audit (axe-core, WCAG 2.0 A/AA, 2.1 AA and 2.2 AA rules) over the 19 screens,
 * on a 1280 px desktop viewport and on a 360 px phone viewport.
 *
 * Usage (from pa3/prototipo, with the server running on port 8765):
 *   npm install
 *   CHROME_PATH="<path to chrome.exe>" node tests/accessibility.cjs
 * Optional: BASE_URL=https://... to audit the published prototype.
 */
const { chromium } = require("playwright-core");
const axeSrc = require("fs").readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const exe = process.env.CHROME_PATH;
const URL = process.env.BASE_URL || "http://127.0.0.1:8765/index.html";
const pre = {
  2: async (p) => p.click('[data-v="ok"]'),
  8: async (p) => { await p.fill("#o-text", "x"); await p.click('[data-act="saveObs"]'); },
  10: async (p) => { await p.click('[data-act="sendEval"]'); },
  16: async (p) => { await p.click('[data-v="register"]'); await p.click('[data-act="register"]'); },
  17: async (p) => p.click('[data-act="runRef"]'),
  18: async (p) => { await p.click('[data-v="cross"]'); await p.click('[data-v="link"]'); },
};
(async () => {
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  let total = 0;
  for (const vp of [{ w: 1280, h: 900, n: "escritorio" }, { w: 360, h: 780, n: "movil" }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    console.log("== " + vp.n);
    for (let n = 1; n <= 19; n++) {
      const id = String(n).padStart(2, "0");
      await page.goto(URL + "#/hu" + id); await page.reload(); await page.waitForTimeout(80);
      if (pre[n]) { await pre[n](page); await page.waitForTimeout(60); }
      await page.evaluate(axeSrc);
      const r = await page.evaluate(() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } }));
      const v = r.violations.map((x) => x.id + "(" + x.impact + ", " + x.nodes.length + ")");
      total += r.violations.length;
      console.log("IU" + id, r.violations.length ? v.join("; ") : "sin violaciones", "| reglas OK:", r.passes.length);
      for (const x of r.violations) for (const nd of x.nodes.slice(0, 2)) console.log("    ", x.id, "->", nd.html.slice(0, 110).replace(/\s+/g, " "), "|", (nd.any[0] || nd.all[0] || nd.none[0] || {}).message);
    }
  }
  console.log("TOTAL violaciones:", total);
  await browser.close();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });

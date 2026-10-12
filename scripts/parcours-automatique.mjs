// Parcourt automatiquement une séance dans un navigateur (micro simulé) et prend une capture par activité.
// Usage : npm run build && npx vite preview (dans apps/app), puis
//   node scripts/parcours-automatique.mjs U07 0 6ans essai
// (unité, séances déjà faites, profil, préfixe des captures). Variables : BASE_URL, CHROMIUM_PATH, CAPTURES.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const out = process.env.CAPTURES ?? "captures";
import { mkdirSync } from "node:fs";
mkdirSync(out, { recursive: true });
const traces = JSON.parse(readFileSync(new URL("../content/traces-capitales.json", import.meta.url), "utf8")).lettres;
const [unite, seanceFaites, profil, prefixe] = process.argv.slice(2);
const TEXTES = new Map();
for (let k = 0; k <= 14; k++) {
  const f = JSON.parse(readFileSync(new URL(`../content/unites/U${String(k).padStart(2, "0")}.json`, import.meta.url), "utf8"));
  for (const it of f.items) TEXTES.set(it.id, it.texte);
}
const texteItem = (id) => TEXTES.get(id) ?? null;
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream",  "--autoplay-policy=no-user-gesture-required"],
});
const ctx = await b.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: "block", permissions: ["microphone"] });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const base = process.env.BASE_URL ?? "http://localhost:4173/";
if (process.env.IMAGES_FACTICES) {
  // illustrations factices pour tester l'activité C1 avant la production des vraies images
  await p.route("**/images/*.webp", (r) => {
    const teinte = [...r.request().url()].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
    r.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="hsl(${teinte},60%,75%)"/></svg>` });
  });
}
await p.goto(base);
const ordre = ["U00","U01","U02","U03","U04","U05","U06","U07","U08","U09","U10","U11","U12","U13","U14"];
const avant = ordre.slice(0, ordre.indexOf(unite));
// REVISIONS=U03-M-LAMA,U05-S-SO : items déjà vus, à revoir aujourd'hui (teste l'étape de révision)
const items = Object.fromEntries((process.env.REVISIONS ?? "").split(",").filter(Boolean).map((id) => [id, { boite: 1, prochaine: "2000-01-01", essais: 1, reussites: 1, unite: id.slice(0, 3) }]));
await p.evaluate(([t, u, s, pr, it, voix]) => {
  const id = "00000000-0000-4000-8000-000000000001";
  localStorage.setItem("syllakids:appareil:v1", JSON.stringify({ id: "appareil-test", mode: "maison", profils: [{ id, prenom: "", avatar: "soleil", origine: "appareil", version: 0, sale: false, ...(voix ? { accords: { voixAppareil: true, voixPartage: false } } : {}) }] }));
  localStorage.setItem(`syllakids:progression:${id}`, JSON.stringify({ terminees: t, seances: { [u]: Number(s) }, items: it, reglages: { profil: pr, dys: false } }));
}, [avant, unite, seanceFaites, profil, items, !!process.env.VOIX]);
await p.reload();
await p.goto(base + "#/unite/" + unite);
await p.waitForTimeout(600);
const vu = new Set();
const t0 = Date.now();
const has = async (sel) => (await p.$(sel)) !== null;
const clic = async (sel) => { const e = await p.$(sel); if (e) await e.click().catch(() => {}); };
let codes = [];
while (Date.now() - t0 < Number(process.env.DUREE_MAX ?? 420) * 1000) {
  if (await has(".fin")) { await p.screenshot({ path: `${out}/${prefixe}-fin.png` }); break; }
  const etape = await p.$$eval(".avancement span", (s) => s.findIndex((x) => x.classList.contains("encours")));
  if (!vu.has(etape)) {
    vu.add(etape);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/${prefixe}-${String(etape).padStart(2, "0")}.png` });
  }
  const dernier = await p.evaluate(() => document.documentElement.dataset.dernierSon ?? "");
  if (await has('[aria-label$="mots lus"]')) { await clic('[aria-label="Continuer"]'); }
  else if (await has('[aria-label="Commencer la minute"]')) { await clic('[aria-label="Commencer la minute"]'); }
  else if (await has(".chrono")) { if (!vu.has("chrono")) { vu.add("chrono"); await p.screenshot({ path: `${out}/${prefixe}-chrono.png` }); } const ms = await p.$$(".chrono button:not(.lu)"); if (ms.length) await ms[0].click(); await p.waitForTimeout(800); }
  else if (await has('[aria-label="J\'avais bien lu"]')) { await clic('[aria-label="J\'avais bien lu"]'); }
  else if (await has(".images-choix button")) { const bs = await p.$$(".images-choix button"); await bs[Math.floor(Math.random() * bs.length)].click(); }
  else if (await has(".emplacement")) {
    const cible = texteItem(dernier);
    const libres = await p.$$eval(".emplacement", (es) => es.map((e) => e.getAttribute("aria-label") ?? ""));
    const k = libres.findIndex((l) => l.startsWith("Place"));
    const lettre = cible ? [...cible][k] : null;
    const tuile = lettre ? await p.$(`[aria-label="Étiquette ${lettre}"]`) : await p.$(".reserve .tuile");
    if (tuile) await tuile.click(); else { const t = await p.$(".reserve .tuile"); if (t) await t.click(); }
  }
  else if (await has("canvas.case-ecriture")) {
    const cible = texteItem(dernier);
    const cases = await p.$$("canvas.case-ecriture");
    for (let k = 0; k < cases.length; k++) {
      const lettre = cible ? [...cible][k] : "A";
      const box = await cases[k].boundingBox();
      const w = box.width, h = box.height, cap = Math.min(h * 0.6, w * 0.62), s = cap / 100, x0 = (w - 100 * s) / 2, y0 = h * 0.27;
      for (const t of (traces[lettre] ?? traces.A).traits) {
        const [sx, sy] = t[0]; await p.mouse.move(box.x + x0 + sx * s, box.y + y0 + sy * s); await p.mouse.down();
        for (const [x, y] of t.slice(1)) await p.mouse.move(box.x + x0 + x * s, box.y + y0 + y * s, { steps: 2 });
        await p.mouse.up();
      }
    }
    await clic('[aria-label="J\'ai fini"]');
    await p.waitForTimeout(1500);
  }
  else if (await has('[aria-label="Passer cette activité"]')) { codes.push(`${etape}:sans-micro`); await clic('[aria-label="Passer cette activité"]'); }
  else if (await has('[aria-label="Écouter le son"]')) { await clic('[aria-label="Écouter le son"]'); await p.waitForSelector('[aria-label="Continuer"]:not([disabled])', { timeout: 30000 }); await clic('[aria-label="Continuer"]'); }
  else if (await has('.tuile[aria-label^="Voyelle"]')) { for (const e of await p.$$('.tuile[aria-label^="Voyelle"]')) await e.click(); await p.waitForTimeout(300); await clic('[aria-label="Continuer"]'); }
  else if (await has('[aria-label="J\'entends le son"]')) { await clic(Math.random() < 0.5 ? '[aria-label="J\'entends le son"]' : '[aria-label="Je n\'entends pas le son"]'); }
  else if (await has(".case")) { const cs = await p.$$(".case"); await cs[Math.floor(Math.random() * cs.length)].click().catch(() => {}); }
  else if (await has(".carte")) { for (const c of await p.$$(".carte")) { await c.click().catch(() => {}); await p.waitForTimeout(100); } await p.waitForSelector('[aria-label="Valider"]:not([disabled])', { timeout: 30000 }).catch(() => {}); await clic('[aria-label="Valider"]'); }
  else if (await has('[aria-label="C\'était pareil"]')) { await clic('[aria-label="C\'était pareil"]'); }
  else if (await has('[aria-label="Parler dans le micro"]:not([disabled])')) { await clic('[aria-label="Parler dans le micro"]'); }
  else if (await has(".jauge")) { if (await has('.jauge ~ .actions [aria-label="Continuer"]')) { codes.push(`${etape}:R2-passé`); await clic('[aria-label="Continuer"]'); } }
  else if (await has(".etiquette")) { const es = await p.$$(".etiquette:not(.faux)"); if (es.length) await es[Math.floor(Math.random() * es.length)].click().catch(() => {}); }
  else if (await has('[aria-label="C\'est un vrai mot"]')) { await clic(Math.random() < 0.5 ? '[aria-label="C\'est un vrai mot"]' : '[aria-label="C\'est un mot inventé"]'); }
  else if (await has('[aria-label="Vérifier en écoutant"]')) { await clic('[aria-label="Vérifier en écoutant"]'); await p.waitForSelector('[aria-label="Mot suivant"]:not([disabled])', { timeout: 30000 }).catch(() => {}); await clic('[aria-label="Mot suivant"]'); }
  else if (await has('[aria-label="Écouter la phrase"]')) { await clic('[aria-label="Écouter la phrase"]'); await p.waitForSelector('[aria-label="Phrase suivante"]:not([disabled])', { timeout: 30000 }).catch(() => {}); await clic('[aria-label="Phrase suivante"]'); }
  else if (await has(".tuile.mobile")) {
    const a = await (await p.$(".tuile.mobile")).boundingBox(); const v = await (await p.$(".piste .tuile:not(.mobile)")).boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(v.x + 10, v.y + v.height / 2, { steps: 10 }); await p.mouse.up();
  }
  else if (await has('[aria-current="true"]')) { await clic('[aria-current="true"]'); }
  else if (await has("canvas.zone-trace")) {
    const lettre = (await p.getAttribute("canvas.zone-trace", "aria-label")).at(-1);
    const msg = await p.textContent(".message");
    if (!msg.includes("Regarde")) {
      const box = await (await p.$("canvas.zone-trace")).boundingBox();
      const w = box.width, h = box.height, cap = Math.min(h * 0.6, w * 0.62), s = cap / 100, x0 = (w - 100 * s) / 2, y0 = h * 0.27;
      for (const t of traces[lettre].traits) {
        const [sx, sy] = t[0]; await p.mouse.move(box.x + x0 + sx * s, box.y + y0 + sy * s); await p.mouse.down();
        for (const [x, y] of t.slice(1)) await p.mouse.move(box.x + x0 + x * s, box.y + y0 + y * s, { steps: 3 });
        await p.mouse.up();
      }
      await p.waitForTimeout(2500);
    }
  }
  await p.waitForTimeout(400);
}
if (!(await has(".fin"))) await p.screenshot({ path: `${out}/${prefixe}-arret.png` });
console.log(`${prefixe}: étapes vues ${[...vu].join(",")} ; fin=${await has(".fin")} ; ${codes.join(" ")} ; ${Math.round((Date.now() - t0) / 1000)} s`);
const etat = await p.evaluate(() => JSON.parse(localStorage.getItem("syllakids:progression:00000000-0000-4000-8000-000000000001") ?? "{}"));
const notes = Object.entries(etat.items ?? {});
console.log(`items notés : ${notes.length} ; ` + notes.map(([id, e]) => `${id}:${e.reussites}/${e.essais} b${e.boite}`).join(" "));
if (etat.fluence) console.log("fluence", JSON.stringify(etat.fluence));
if (process.env.VOIX) {
  // VOIX=1 : l'accord « voix et tracés sur l'appareil » est donné ; on compte ce qui a été gardé
  const gardes = await p.evaluate(() => new Promise((ok) => {
    const r = indexedDB.open("syllakids", 1);
    r.onsuccess = () => { const g = r.result.transaction("productions").objectStore("productions").getAll(); g.onsuccess = () => ok(g.result.map((x) => `${x.type}:${x.item}`)); };
    r.onerror = () => ok([]);
  }));
  console.log(`voix et tracés gardés : ${gardes.length} ${gardes.join(" ")}`);
}
console.log(errors.slice(0, 5).join("\n") || "aucune erreur");
await b.close();

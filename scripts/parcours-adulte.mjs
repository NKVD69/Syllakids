// Parcours automatique des comptes : une tablette de classe (enseignante) et un téléphone (parent).
// Prérequis : npm run serveur:local, puis VITE_SERVEUR_LOCAL=http://localhost:54330 npm run build
// et npx vite preview --port 4173 (dans apps/app). Usage : node scripts/parcours-adulte.mjs
// Variables : BASE_URL, CHROMIUM_PATH, CAPTURES.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const out = process.env.CAPTURES ?? "captures";
mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL ?? "http://localhost:4173/";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const erreurs = [];
const etapes = [];
const suffixe = Date.now().toString(36);

async function appareil(nom, viewport) {
  const ctx = await b.newContext({ viewport, serviceWorkers: "block", acceptDownloads: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => erreurs.push(`${nom}: ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error") erreurs.push(`${nom}: ${m.text()}`); });
  p.on("dialog", (d) => d.accept());
  await p.goto(base);
  return p;
}
const capture = (p, nom) => p.screenshot({ path: `${out}/adulte-${nom}.png`, fullPage: true });
const etape = (t) => { etapes.push(t); console.log("✓", t); };

async function deverrouiller(p) {
  await p.goto(base + "#/adulte");
  const texte = await p.textContent(".verrou p");
  const m = texte.match(/(\d+) \+ (\d+)/);
  await p.fill('input[aria-label="Réponse"]', String(Number(m[1]) + Number(m[2])));
  await p.click('button:has-text("Ouvrir")');
}

async function inscrire(p, role, nom, email) {
  await p.click('button:has-text("Créer un compte")');
  await p.check(role === "enseignant" ? 'input[name="role"] >> nth=1' : 'input[name="role"] >> nth=0');
  if (nom) await p.getByLabel(/Nom affiché|Votre prénom/).fill(nom);
  await p.getByLabel("Adresse e-mail").fill(email);
  await p.getByLabel(/Mot de passe/).fill("motdepasse-solide");
  await p.click('button:has-text("Créer le compte")');
  await p.waitForSelector(`text=${role === "enseignant" ? "Compte enseignant" : "Compte parent"}`);
}

// ---------------------------------------------------------------- compte enseignant non vérifié
const inconnu = await appareil("inconnu", { width: 1024, height: 768 });
await deverrouiller(inconnu);
await inscrire(inconnu, "enseignant", "M. Inconnu", `inconnu-${suffixe}@gmail.com`);
await inconnu.waitForSelector("text=Compte enseignant en attente de vérification");
if (await inconnu.$('button:has-text("Créer la classe")')) throw new Error("un compte non vérifié peut créer une classe");
etape("un compte enseignant sans adresse académique attend la vérification");
await capture(inconnu, "00-enseignant-en-attente");

// ---------------------------------------------------------------- tablette de la classe
const classe = await appareil("classe", { width: 1024, height: 768 });
await deverrouiller(classe);
await inscrire(classe, "enseignant", "Mme Durand", `durand-${suffixe}@ac-lyon.fr`);
etape("compte enseignant créé");
await classe.getByLabel("Nom de la classe").fill("GS Les Lilas");
await classe.click('button:has-text("Créer la classe")');
await classe.waitForSelector("text=Code de la classe");
for (const prenom of ["Léo", "Inès", "Sami"]) {
  await classe.getByLabel(/Prénom \(ou prénom et initiale\)/).fill(prenom);
  await classe.click('button:has-text("Ajouter") >> nth=-1');
  await classe.waitForSelector(`table >> text=${prenom}`);
}
etape("classe et 3 élèves créés");
await capture(classe, "01-tableau-classe");
await classe.click('button:has-text("Codes pour les familles")');
await classe.waitForSelector(".coupon");
await capture(classe, "02-codes-familles");
const codeLeo = (await classe.textContent('.coupon:has-text("Léo") .code')).replace(/\s/g, "");
etape(`code famille de Léo : ${codeLeo}`);
await classe.click('a:has-text("Revenir à la classe")');
await classe.click('button:has-text("Utiliser cette tablette pour la classe")');
await classe.waitForSelector("text=Cette tablette sert à cette classe");
etape("tablette passée en mode classe");

await classe.goto(base + "#/");
await classe.waitForSelector(".choix-profils");
await capture(classe, "03-qui-es-tu");
const app = await classe.evaluate(() => JSON.parse(localStorage.getItem("syllakids:appareil:v1")));
const leo = app.profils.find((x) => x.prenom === "Léo");
await classe.click('.choix-profils button[aria-label="Léo"]');
await classe.waitForSelector(".grille-secrete");
// mauvaises images d'abord
const faux = leo.codeImages.split("-").map((k) => (Number(k) + 1) % 9);
for (const k of faux) await classe.click(`.grille-secrete button >> nth=${k}`);
await classe.waitForTimeout(900);
if (!(await classe.$(".grille-secrete"))) throw new Error("des images fausses ont ouvert le profil");
await capture(classe, "04-images-secretes");
for (const k of leo.codeImages.split("-")) await classe.click(`.grille-secrete button >> nth=${Number(k)}`);
await classe.waitForSelector(".chemin");
etape("Léo entre avec ses images secrètes (les fausses sont refusées)");
await capture(classe, "05-chemin-leo");

// Léo travaille en classe : on simule deux unités terminées et un peu de temps de lecture
await classe.evaluate((id) => {
  const cle = `syllakids:progression:${id}`;
  const p = JSON.parse(localStorage.getItem(cle));
  const auj = new Date().toISOString().slice(0, 10);
  p.terminees = ["U00", "U01"];
  p.seances = { U00: 2, U01: 2, U02: 1 };
  p.items = { "U02-S-MA": { boite: 1, prochaine: auj, essais: 3, reussites: 1, unite: "U02", vu: new Date().toISOString() } };
  p.temps = { "tablette-classe": { [auj]: 720 } };
  localStorage.setItem(cle, JSON.stringify(p));
  const a = JSON.parse(localStorage.getItem("syllakids:appareil:v1"));
  a.profils = a.profils.map((x) => (x.id === id ? { ...x, sale: true } : x));
  localStorage.setItem("syllakids:appareil:v1", JSON.stringify(a));
}, leo.id);
await classe.goto(base + "#/adulte");
await classe.reload();
// sur la tablette de la classe, l'espace adulte demande le mot de passe du compte
await classe.waitForSelector("text=Tablette de la classe");
await classe.getByLabel("Mot de passe").fill("motdepasse-solide");
await classe.click('button:has-text("Ouvrir")');
await classe.click('button:has-text("Synchroniser maintenant")');
await classe.waitForSelector("text=Progrès enregistrés sur le compte");
etape("espace adulte de la classe ouvert avec le mot de passe ; progrès de Léo envoyés");

// accord papier : voix et tracés gardés sur la tablette et partagés avec l'enseignante
await classe.click('a:has-text("GS Les Lilas")');
await classe.click('table a:has-text("Léo")');
await classe.check("text=Voix et lettres tracées conservées sur la tablette");
await classe.check("text=Partagées avec l'enseignant");
await classe.click('button:has-text("Enregistrer l\'accord papier")');
await classe.waitForSelector("text=Accord papier enregistré");
const accords = await classe.evaluate((id) => JSON.parse(localStorage.getItem("syllakids:appareil:v1")).profils.find((x) => x.id === id).accords, leo.id);
if (!accords?.voixPartage) throw new Error("la tablette n'a pas reçu l'accord papier");
etape("accord papier saisi ; la tablette le reçoit");
// une lettre tracée par Léo (même format que celles gardées par les activités E1/E2)
await classe.evaluate((id) => new Promise((ok) => {
  const r = indexedDB.open("syllakids", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("productions", { keyPath: "id" }).createIndex("enfant", "enfant");
  r.onsuccess = () => {
    const tx = r.result.transaction("productions", "readwrite");
    tx.objectStore("productions").put({ id: crypto.randomUUID(), enfant: id, type: "trace", item: "lettre:M", le: new Date().toISOString(),
      traits: [[[[5, 100], [5, 0], [50, 60], [95, 0], [95, 100]]]], envoye: false });
    tx.oncomplete = () => ok();
  };
}), leo.id);
await classe.goto(base + "#/adulte");
await classe.click('button:has-text("Synchroniser maintenant")');
await classe.waitForSelector("text=Progrès enregistrés sur le compte");
await classe.click('a:has-text("GS Les Lilas")');
await classe.click('table a:has-text("Léo")');
await classe.click('button:has-text("Afficher ce qui est sur le serveur")');
await classe.waitForSelector(".productions li:has-text('la lettre M') svg");
etape("la lettre tracée par Léo est partagée avec l'enseignante");
await capture(classe, "05b-voix-et-traces");

// ---------------------------------------------------------------- téléphone du parent
const tel = await appareil("parent", { width: 390, height: 844 });
await deverrouiller(tel);
await inscrire(tel, "parent", "Nadia", `nadia-${suffixe}@famille.fr`);
etape("compte parent créé");
await tel.click('button:has-text("J\'ai un code donné par l\'enseignant")');
await tel.getByLabel("Code famille").fill(codeLeo.toLowerCase());
await tel.click('button:has-text("Continuer")');
await capture(tel, "06-consentement");
// le bouton reste désactivé tant que l'utilisation n'est pas acceptée
if (!(await tel.isDisabled('button:has-text("Rattacher le profil")'))) throw new Error("rattachement possible sans accord");
await tel.check("text=J'accepte que votre enfant utilise Syllakids");
await tel.check("text=participe aux tests");
await tel.check("text=soient conservées sur la tablette");
await tel.check("text=partagées avec son enseignant");
await tel.click('button:has-text("Rattacher le profil")');
await tel.waitForSelector(".titre-fiche:has-text('Léo')");
await tel.waitForSelector("text=Sons validés");
const sons = await tel.textContent('.chiffres div:has-text("Sons validés") dd');
if (!sons.startsWith("2 ")) throw new Error(`progression de la classe absente à la maison : ${sons}`);
etape(`le parent retrouve Léo et sa progression de classe (${sons})`);
await capture(tel, "07-fiche-parent");

await tel.getByLabel("Temps de lecture maximal par jour").selectOption("10");
await tel.click('button:has-text("Enregistrer") >> nth=0');
await tel.waitForSelector("text=Réglages enregistrés");
etape("durée maximale réglée à 10 minutes depuis le téléphone");

const [telechargement] = await Promise.all([tel.waitForEvent("download"), tel.click('button:has-text("Télécharger ses données")')]);
etape(`export des données : ${telechargement.suggestedFilename()}`);
await tel.click('button:has-text("Qui a consulté ses données ?")');
await tel.waitForSelector(".journal li");
const journal = await tel.textContent(".journal");
if (!/Mme Durand/.test(journal)) throw new Error("le journal ne montre pas la consultation de l'enseignante");
etape("le journal des accès montre la consultation de l'enseignante");
await capture(tel, "08-journal");

// l'enfant lit à la maison : choix du profil (il y a aussi le profil créé au premier lancement)
await tel.goto(base + "#/");
await tel.click(".avatar-barre");
await tel.waitForSelector(".choix-profils");
await tel.click('.choix-profils button[aria-label="Léo"]');
await tel.waitForSelector(".chemin");
const fait = await tel.$$eval(".chemin .badge", (x) => x.length);
etape(`à la maison, Léo voit son chemin (${fait} badges)`);
await capture(tel, "09-chemin-maison");

// retour en classe : la tablette récupère les réglages faits à la maison
await classe.goto(base + "#/adulte");
await classe.click('button:has-text("Synchroniser maintenant")');
await classe.waitForSelector("text=Progrès enregistrés sur le compte");
const reglage = await classe.evaluate((id) => JSON.parse(localStorage.getItem(`syllakids:progression:${id}`)).reglages.dureeMax, leo.id);
if (reglage !== 10) throw new Error(`réglage de la maison non reçu en classe : ${reglage}`);
etape("la tablette de la classe a reçu le réglage fait à la maison");
await classe.click('a:has-text("GS Les Lilas")');
await classe.click('button:has-text("Actualiser")');
await classe.waitForSelector('td:has-text("rattachée")');
await capture(classe, "10-tableau-apres");
await classe.click('table a:has-text("Léo")');
await classe.waitForSelector("text=En classe");
await capture(classe, "11-fiche-eleve");
etape("fiche élève côté enseignante");

console.log(`\n${etapes.length} étapes réussies`);
console.log(erreurs.length ? erreurs.slice(0, 8).join("\n") : "aucune erreur");
await b.close();

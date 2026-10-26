// Vérifie que chaque correction passe ses tests et ses contraintes, et que chaque code de départ se lit.
const A = require("../js/lang.js");
const T = require("../js/tests.js");
const { chapters } = require("../js/content.js");

let bad = 0, n = 0, nrec = 0;
for (const ch of chapters) {
  if (ch.demo) {
    try { const it = new A.Interp(A.parse(ch.demo), { trace: true }); it.runMain(); }
    catch (e) { bad++; console.log(`✗ démo ${ch.id} : ${e.message}`); }
  }
  for (const ex of ch.exercices) {
    if (ex.type) continue;
    n++;
    const r = T.run(ex.correction, ex);
    const fails = r.parseError ? [r.parseError] : r.results.filter((x) => !x.ok).map((x) => `${x.args.join(" ; ")} → attendu ${x.expected}, obtenu ${x.got ?? "-"} ${x.error || ""}`);
    if (r.constraints?.length) fails.push(...r.constraints);
    if (ex.recursive) {
      const rr = T.run(ex.recursive, ex);
      if (rr.parseError) fails.push("version récursive : " + rr.parseError);
      else {
        rr.results.filter((x) => !x.ok).forEach((x) => fails.push(`version récursive : ${x.args.join(" ; ")} → attendu ${x.expected}, obtenu ${x.got ?? "-"} ${x.error || ""}`));
        rr.constraints.forEach((m) => fails.push("version récursive : " + m));
        if (!A.analyse(rr.prog, rr.fonction).recursive) fails.push("version récursive : la fonction ne s'appelle pas elle-même");
      }
      nrec++;
    }
    try { A.parse(ex.depart); } catch (e) { fails.push("départ illisible : " + e.message); }
    const d = T.run(ex.depart, ex);
    if (!d.parseError && d.results.every((x) => x.ok) && !d.constraints.length) fails.push("le code de départ passe déjà tous les tests");
    if (fails.length) { bad++; console.log(`✗ ${ex.id} ${ex.titre}\n   ${fails.join("\n   ")}`); }
  }
}
console.log(bad ? `${bad} problème(s) sur ${n} exercices` : `✓ ${n} exercices (dont ${nrec} avec une version récursive) : toutes les corrections passent leurs tests`);
process.exit(bad ? 1 : 0);

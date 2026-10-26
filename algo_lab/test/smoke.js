const A = require("../js/lang.js");
const run = (src, name, args, opts) => {
  const prog = A.parse(src); const it = new A.Interp(prog, opts || {});
  const vals = args.map((a) => a());
  const r = it.callWith(name, vals);
  return { r, it };
};
const B = A.build, R = A.read;
// 1. longueur itérative (style cours)
let src = `
fonction avec retour entier longueur(Liste L)
début
    entier n;
    n ← 0;
    tant que (L ≠ vide) faire
        n ← n + 1;
        L ← L->suivant;
    fintantque
    retourner n;
fin`;
console.log("longueur", run(src, "longueur", [() => B.liste([4, 5, 6])]).r.result);
// 2. somme des pairs positifs (notes), si imbriqué avec sinon à la ligne
src = `
fonction avec retour entier paire(Arbre A)
début
    si (A = arbre_vide) alors
        retourner 0;
    sinon
        si (A->val mod 2 = 0 et A->val > 0) alors
            retourner A->val + paire(A->g) + paire(A->d);
        sinon
            retourner paire(A->g) + paire(A->d);
        finsi
    finsi
fin`;
console.log("paire", run(src, "paire", [() => B.arbre([4, [3, 2, -6], [8, null, 5]])]).r.result);
// 3. ajouter_feuille avec var (notes)
src = `
fonction sans retour ajouter_feuille(x : entier; var A : Arbre)
début
    si A = vide alors
        new(A); A->val ← x; A->g ← vide; A->d ← vide;
    sinon si x < A->val alors
        ajouter_feuille(x, A->g);
    sinon
        ajouter_feuille(x, A->d);
    finsi
fin`;
let o = run(src, "ajouter_feuille", [() => 7, () => B.abr([5, 3, 9])]);
console.log("ajouter_feuille", JSON.stringify(R.arbre(o.r.after[1])));
// 4. pile parenthèses + pour
src = `
fonction avec retour booleen equilibre(chaine ch)
début
    Pile P;
    entier i;
    pour i allant de 0 à longueur(ch) - 1 faire
        si ch[i] = '(' alors
            empiler(P, ch[i]);
        sinon si ch[i] = ')' alors
            si estvide(P) alors retourner faux; finsi
            P ← dépiler(P);
        finsi
    finpour
    retourner estvide(P);
fin`;
for (const s of ["((()))()", "(()", ")("]) console.log("equilibre", s, run(src, "equilibre", [() => s]).r.result);
// 5. erreur pédagogique
try { run(`fonction avec retour entier f(Liste L)\ndébut\n  retourner L->valeur;\nfin`, "f", [() => null]); } catch (e) { console.log("ERR:", e.message); }
try { A.parse(`fonction sans retour f()\ndébut\n si x alors\n  y ← 1\nfin`); } catch (e) { console.log("ERR:", e.message); }
// 6. trace
o = run(src, "equilibre", [() => "(())"], { trace: true });
console.log("trace steps", o.it.trace.length, JSON.stringify(o.it.trace[5]).slice(0, 200));
// 7. main program + écrire
const prog = A.parse(`début\n Liste L, p;\n new(L); L->valeur ← 1; new(L->suivant); L->suivant->valeur ← 2;\n p ← L;\n tant que p ≠ vide faire écrire(p->valeur); p ← p->suivant; fintantque\nfin`);
const it = new A.Interp(prog); it.runMain(); console.log("main out:", JSON.stringify(it.out));

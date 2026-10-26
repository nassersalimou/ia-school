/* Contenu statique : chapitres, fiches de cours, exercices (tests, indices, corrections, complexité) et annales.
   Arguments des tests : ["liste", [..]] ["listeD", [..]] ["pile", [bas..sommet]] ["file", [tête..queue]]
   ["arbre", [v, g, d]] ["abr", [clés insérées dans l'ordre]] ou une valeur simple. */
(function (root) {
  "use strict";
  const C = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"];
  const cx = (bonne, pourquoi, choix = C) => ({ bonne, pourquoi, choix });

  const chapters = [
    // ------------------------------------------------------------------ Bases
    {
      id: "bases", titre: "Prise en main du pseudo-code", icone: "✏️",
      fiche: `
<p>Un algorithme s'écrit comme dans le cours : un en-tête, les déclarations, puis <code>début … fin</code>.</p>
<pre>fonction avec retour entier maximum(entier a, entier b)
début
    si (a > b) alors
        retourner a;
    sinon
        retourner b;
    finsi
fin</pre>
<ul>
<li><b>Affectation</b> : <code>x ← 3;</code> (on peut taper <code>&lt;-</code>). <code>=</code> sert à <b>comparer</b>.</li>
<li><b>Conditions</b> : <code>si (…) alors … sinon … finsi</code> · opérateurs <code>et</code>, <code>ou</code>, <code>non</code>, <code>≠</code> (ou <code>!=</code>), <code>mod</code>, <code>div</code>.</li>
<li><b>Boucles</b> : <code>tant que (…) faire … fintantque</code> · <code>pour i allant de 1 à n faire … finpour</code>.</li>
<li><b>Fonctions</b> : <code>fonction avec retour type nom(type p, …)</code> ou <code>fonction sans retour nom(…)</code>, et <code>retourner valeur;</code>.</li>
<li><b>Affichage</b> : <code>écrire(x);</code>.</li>
</ul>`,
      demo: `fonction avec retour entier carre(entier x)
début
    entier c;
    c ← x * x;
    retourner c;
fin

début
    entier i;
    pour i allant de 1 à 4 faire
        écrire(i, carre(i));
    finpour
fin`,
      exercices: [
        {
          id: "B1", titre: "Somme des entiers de 1 à n", fonction: "somme_entiers",
          enonce: `Écrire une fonction <code>somme_entiers(entier n)</code> qui retourne 1 + 2 + … + n (et 0 si n = 0), avec une boucle <code>pour</code>.`,
          depart: `fonction avec retour entier somme_entiers(entier n)
début
    entier s, i;
    s ← 0;

    retourner s;
fin`,
          tests: [{ args: [0], attendu: 0 }, { args: [1], attendu: 1 }, { args: [5], attendu: 15 }, { args: [10], attendu: 55 }],
          check: "valeur",
          indices: ["Il faut ajouter chaque entier i entre 1 et n à s.", "pour i allant de 1 à n faire … finpour", "Dans la boucle : s ← s + i;"],
          correction: `fonction avec retour entier somme_entiers(entier n)
début
    entier s, i;
    s ← 0;
    pour i allant de 1 à n faire
        s ← s + i;
    finpour
    retourner s;
fin`,
          recursive: `fonction avec retour entier somme_entiers(entier n)
début
    si (n = 0) alors
        retourner 0;
    finsi
    retourner n + somme_entiers(n - 1);
fin`,
          complexite: cx("O(n)", "La boucle fait n tours, chacun en temps constant."),
        },
        {
          id: "B2", titre: "Factorielle récursive", fonction: "factorielle",
          enonce: `Écrire une fonction <b>récursive</b> <code>factorielle(entier n)</code> qui retourne n! (avec 0! = 1).`,
          depart: `fonction avec retour entier factorielle(entier n)
début

fin`,
          tests: [{ args: [0], attendu: 1 }, { args: [1], attendu: 1 }, { args: [5], attendu: 120 }, { args: [7], attendu: 5040 }],
          check: "valeur", contraintes: { recursif: true },
          indices: ["Quel est le cas de base, celui qu'on sait faire sans appel récursif ?", "Cas de base : si n = 0, retourner 1.", "Sinon : retourner n * factorielle(n - 1);"],
          correction: `fonction avec retour entier factorielle(entier n)
début
    si (n = 0) alors
        retourner 1;
    sinon
        retourner n * factorielle(n - 1);
    finsi
fin`,
          complexite: cx("O(n)", "n appels récursifs, chacun fait une multiplication."),
        },
        {
          id: "B3", titre: "Suite de Fibonacci", fonction: "fib",
          enonce: `On définit F<sub>0</sub> = 0, F<sub>1</sub> = 1 et F<sub>n</sub> = F<sub>n−1</sub> + F<sub>n−2</sub> pour n ≥ 2.<br>Écrire une fonction <b>récursive</b> <code>fib(entier n)</code> qui retourne F<sub>n</sub>. (Elle servira pour les arbres de Fibonacci.)`,
          depart: `fonction avec retour entier fib(entier n)
début

fin`,
          tests: [{ args: [0], attendu: 0 }, { args: [1], attendu: 1 }, { args: [2], attendu: 1 }, { args: [7], attendu: 13 }, { args: [10], attendu: 55 }],
          check: "valeur", contraintes: { recursif: true },
          indices: ["Il y a deux cas de base : n = 0 et n = 1.", "si (n ≤ 1) alors retourner n;", "Sinon : retourner fib(n - 1) + fib(n - 2);"],
          correction: `fonction avec retour entier fib(entier n)
début
    si (n <= 1) alors
        retourner n;
    sinon
        retourner fib(n - 1) + fib(n - 2);
    finsi
fin`,
          complexite: cx("O(2ⁿ)", "Chaque appel en relance deux : le nombre d'appels croît comme Fₙ, donc de façon exponentielle (≈ 1,618ⁿ)."),
        },
      ],
    },

    // ------------------------------------------------------------------ Listes chaînées
    {
      id: "listes", titre: "Listes chaînées", icone: "🔗",
      fiche: `
<p>Une <b>liste chaînée</b> est un pointeur vers une première cellule ; chaque cellule contient une <code>valeur</code> et un pointeur <code>suivant</code>. La liste vide vaut <code>vide</code>.</p>
<pre>TYPE Liste = vide ou pointeur sur enregistrement
    valeur : entier
    suivant : Liste
fin enregistrement</pre>
<ul>
<li><b>Lire</b> : <code>L->valeur</code>, <code>L->suivant</code> (seulement si <code>L ≠ vide</code> !).</li>
<li><b>Parcourir</b> : <code>tant que (p ≠ vide) faire … p ← p->suivant; fintantque</code>.</li>
<li><b>Créer une cellule</b> : <code>new(p); p->valeur ← x; p->suivant ← vide;</code></li>
<li><b>Raccourci</b> : <code>creerListe(x, L)</code> crée une cellule de valeur x dont le suivant est L, et la renvoie. Elle ajoute toujours <b>en tête</b> et ne modifie pas L : il faut récupérer le résultat, <code>L ← creerListe(x, L);</code></li>
<li>Une fonction reçoit une <b>copie du pointeur</b> : changer <code>L</code> dans la fonction ne change pas la liste de l'appelant, mais changer <code>L->suivant</code> modifie bien la liste.</li>
</ul>`,
      demo: `fonction avec retour Liste ajout_tete(Liste L, entier x)
début
    Liste p;
    new(p);
    p->valeur ← x;
    p->suivant ← L;
    retourner p;
fin

début
    Liste L, p;
    L ← vide;
    L ← ajout_tete(L, 30);
    L ← ajout_tete(L, 20);
    L ← ajout_tete(L, 10);
    p ← L;
    tant que (p ≠ vide) faire
        écrire(p->valeur);
        p ← p->suivant;
    fintantque
fin`,
      exercices: [
        {
          id: "L1", titre: "Longueur d'une liste", fonction: "longueur",
          enonce: `Écrire une fonction <code>longueur(Liste L)</code> qui retourne le nombre d'éléments de la liste L.`,
          depart: `fonction avec retour entier longueur(Liste L)
début
    entier n;
    n ← 0;

    retourner n;
fin`,
          tests: [{ args: [["liste", [12, 45, 7]]], attendu: 3 }, { args: [["liste", []]], attendu: 0 }, { args: [["liste", [5]]], attendu: 1 }, { args: [["liste", [1, 2, 3, 4, 5, 6]]], attendu: 6 }],
          check: "valeur",
          indices: ["Parcours la liste cellule par cellule en comptant.", "tant que (L ≠ vide) faire … fintantque", "Dans la boucle : n ← n + 1; L ← L->suivant;"],
          correction: `fonction avec retour entier longueur(Liste L)
début
    entier n;
    n ← 0;
    tant que (L ≠ vide) faire
        n ← n + 1;
        L ← L->suivant;
    fintantque
    retourner n;
fin`,
          recursive: `fonction avec retour entier longueur(Liste L)
début
    si (L = vide) alors
        retourner 0;
    finsi
    retourner 1 + longueur(L->suivant);
fin`,
          complexite: cx("O(n)", "On visite chaque cellule une fois."),
        },
        {
          id: "L2", titre: "Afficher une liste (récursif)", fonction: "afficher_liste",
          enonce: `Écrire une fonction <b>récursive</b> sans retour <code>afficher_liste(Liste L)</code> qui affiche les valeurs de L dans l'ordre, avec <code>écrire</code>.`,
          depart: `fonction sans retour afficher_liste(Liste L)
début

fin`,
          tests: [{ args: [["liste", [10, 20, 30]]], attendu: "10 20 30" }, { args: [["liste", []]], attendu: "" }, { args: [["liste", [7]]], attendu: "7" }],
          check: "sortie", contraintes: { recursif: true },
          indices: ["Si la liste est vide, il n'y a rien à faire.", "Sinon : on affiche la première valeur, puis le reste de la liste.", "écrire(L->valeur); afficher_liste(L->suivant);"],
          correction: `fonction sans retour afficher_liste(Liste L)
début
    si (L ≠ vide) alors
        écrire(L->valeur);
        afficher_liste(L->suivant);
    finsi
fin`,
          complexite: cx("O(n)", "Un appel par cellule."),
        },
        {
          id: "L3", titre: "Somme des éléments", fonction: "somme",
          enonce: `Écrire une fonction <code>somme(Liste L)</code> qui retourne la somme des valeurs de la liste (0 si elle est vide).`,
          depart: `fonction avec retour entier somme(Liste L)
début

fin`,
          tests: [{ args: [["liste", [12, 45, 7]]], attendu: 64 }, { args: [["liste", []]], attendu: 0 }, { args: [["liste", [-3, 3, 10]]], attendu: 10 }],
          check: "valeur",
          indices: ["Même parcours que pour la longueur.", "Il faut une variable s initialisée à 0.", "s ← s + L->valeur; puis avancer L."],
          correction: `fonction avec retour entier somme(Liste L)
début
    entier s;
    s ← 0;
    tant que (L ≠ vide) faire
        s ← s + L->valeur;
        L ← L->suivant;
    fintantque
    retourner s;
fin`,
          recursive: `fonction avec retour entier somme(Liste L)
début
    si (L = vide) alors
        retourner 0;
    finsi
    retourner L->valeur + somme(L->suivant);
fin`,
          complexite: cx("O(n)", "Un passage sur chaque cellule."),
        },
        {
          id: "L4", titre: "Appartenance", fonction: "appartient",
          enonce: `Écrire une fonction <code>appartient(Liste L, entier x)</code> qui retourne <code>vrai</code> si x est dans la liste, <code>faux</code> sinon.`,
          depart: `fonction avec retour booleen appartient(Liste L, entier x)
début

fin`,
          tests: [{ args: [["liste", [12, 45, 7]], 45], attendu: true }, { args: [["liste", [12, 45, 7]], 8], attendu: false }, { args: [["liste", []], 1], attendu: false }, { args: [["liste", [3]], 3], attendu: true }],
          check: "valeur",
          indices: ["On parcourt la liste et on s'arrête dès qu'on trouve x.", "Dans la boucle : si (L->valeur = x) alors retourner vrai; finsi", "Si la boucle se termine sans trouver : retourner faux;"],
          correction: `fonction avec retour booleen appartient(Liste L, entier x)
début
    tant que (L ≠ vide) faire
        si (L->valeur = x) alors
            retourner vrai;
        finsi
        L ← L->suivant;
    fintantque
    retourner faux;
fin`,
          recursive: `fonction avec retour booleen appartient(Liste L, entier x)
début
    si (L = vide) alors
        retourner faux;
    finsi
    si (L->valeur = x) alors
        retourner vrai;
    finsi
    retourner appartient(L->suivant, x);
fin`,
          complexite: cx("O(n)", "Dans le pire cas (x absent) on parcourt toute la liste."),
        },
        {
          id: "L5", titre: "Ajout en tête", fonction: "ajout_tete",
          enonce: `Écrire une fonction <code>ajout_tete(Liste L, entier x)</code> qui ajoute x <b>au début</b> de la liste et retourne la nouvelle liste.`,
          depart: `fonction avec retour Liste ajout_tete(Liste L, entier x)
début
    Liste p;

fin`,
          tests: [{ args: [["liste", [20, 30]], 10], attendu: [10, 20, 30] }, { args: [["liste", []], 5], attendu: [5] }],
          check: "liste",
          indices: ["Il faut créer une nouvelle cellule avec new(p).", "p->valeur ← x; puis la nouvelle cellule doit pointer vers l'ancienne tête.", "p->suivant ← L; retourner p;"],
          correction: `fonction avec retour Liste ajout_tete(Liste L, entier x)
début
    Liste p;
    new(p);
    p->valeur ← x;
    p->suivant ← L;
    retourner p;
fin`,
          complexite: cx("O(1)", "Quelques affectations, quelle que soit la taille de la liste."),
        },
        {
          id: "L6", titre: "Ajout en queue", fonction: "ajout_queue",
          enonce: `Écrire une fonction <code>ajout_queue(Liste L, entier x)</code> qui ajoute x <b>à la fin</b> de la liste et retourne la liste (attention au cas de la liste vide).`,
          depart: `fonction avec retour Liste ajout_queue(Liste L, entier x)
début
    Liste p, q;

fin`,
          tests: [{ args: [["liste", [10, 20]], 30], attendu: [10, 20, 30] }, { args: [["liste", []], 5], attendu: [5] }, { args: [["liste", [1]], 2], attendu: [1, 2] }],
          check: "liste",
          indices: ["Crée la cellule p (valeur x, suivant vide). Si L est vide, c'est elle la liste.", "Sinon, avance un pointeur q jusqu'à la dernière cellule : tant que (q->suivant ≠ vide).", "Puis q->suivant ← p; et retourner L;"],
          correction: `fonction avec retour Liste ajout_queue(Liste L, entier x)
début
    Liste p, q;
    new(p);
    p->valeur ← x;
    p->suivant ← vide;
    si (L = vide) alors
        retourner p;
    finsi
    q ← L;
    tant que (q->suivant ≠ vide) faire
        q ← q->suivant;
    fintantque
    q->suivant ← p;
    retourner L;
fin`,
          recursive: `fonction avec retour Liste ajout_queue(Liste L, entier x)
début
    Liste p;
    si (L = vide) alors
        new(p);
        p->valeur ← x;
        p->suivant ← vide;
        retourner p;
    finsi
    L->suivant ← ajout_queue(L->suivant, x);
    retourner L;
fin`,
          complexite: cx("O(n)", "Il faut parcourir toute la liste pour trouver la dernière cellule."),
        },
        {
          id: "L7", titre: "Insérer à une position donnée", fonction: "inserer_position", source: ["Examen 2017 · Ex. 3", "Contrôle 2020 · Ex. 2", "Examen 2022 · Ex. 2"],
          enonce: `Écrire un algorithme permettant d'<b>insérer un élément x à une position donnée pos</b> dans une liste. Complexité ?<br><small>Convention : les positions commencent à 1 (pos = 1 : en tête). Si pos dépasse la longueur + 1, on insère en queue.</small>`,
          depart: `fonction avec retour Liste inserer_position(Liste L, entier x, entier pos)
début
    Liste p, q;
    entier i;

fin`,
          tests: [
            { args: [["liste", [1, 2, 3]], 9, 1], attendu: [9, 1, 2, 3] }, { args: [["liste", [1, 2, 3]], 9, 2], attendu: [1, 9, 2, 3] },
            { args: [["liste", [1, 2, 3]], 9, 4], attendu: [1, 2, 3, 9] }, { args: [["liste", []], 9, 1], attendu: [9] }, { args: [["liste", [1, 2]], 9, 10], attendu: [1, 2, 9] },
          ],
          check: "liste",
          indices: ["Deux cas : insertion en tête (pos = 1 ou liste vide) et insertion après une cellule.", "Pour insérer en position pos, il faut s'arrêter sur la cellule numéro pos − 1 (sans dépasser la dernière).", "p->suivant ← q->suivant; puis q->suivant ← p; (dans cet ordre !)"],
          correction: `fonction avec retour Liste inserer_position(Liste L, entier x, entier pos)
début
    Liste p, q;
    entier i;
    new(p);
    p->valeur ← x;
    si (pos <= 1 ou L = vide) alors
        p->suivant ← L;
        retourner p;
    finsi
    q ← L;
    i ← 1;
    tant que (i < pos - 1 et q->suivant ≠ vide) faire
        q ← q->suivant;
        i ← i + 1;
    fintantque
    p->suivant ← q->suivant;
    q->suivant ← p;
    retourner L;
fin`,
          recursive: `fonction avec retour Liste inserer_position(Liste L, entier x, entier pos)
début
    Liste p;
    si (pos <= 1 ou L = vide) alors
        new(p);
        p->valeur ← x;
        p->suivant ← L;
        retourner p;
    finsi
    L->suivant ← inserer_position(L->suivant, x, pos - 1);
    retourner L;
fin`,
          complexite: cx("O(n)", "Dans le pire cas on avance jusqu'à la fin de la liste (pos ≥ n)."),
        },
        {
          id: "L8", titre: "Supprimer un élément", fonction: "supprimer",
          enonce: `Écrire une fonction <code>supprimer(Liste L, entier x)</code> qui supprime la <b>première occurrence</b> de x dans L (si elle existe) et retourne la liste. C'est la « suppression d'un élément au milieu d'une liste chaînée ».`,
          depart: `fonction avec retour Liste supprimer(Liste L, entier x)
début
    Liste prec, p;

fin`,
          tests: [
            { args: [["liste", [1, 2, 3]], 2], attendu: [1, 3] }, { args: [["liste", [1, 2, 3]], 1], attendu: [2, 3] },
            { args: [["liste", [1, 2, 3]], 3], attendu: [1, 2] }, { args: [["liste", [1, 2, 3]], 7], attendu: [1, 2, 3] }, { args: [["liste", [4, 4]], 4], attendu: [4] }, { args: [["liste", []], 4], attendu: [] },
          ],
          check: "liste",
          indices: ["Cas particulier : x est dans la première cellule → la liste commence à L->suivant.", "Sinon, garde un pointeur prec sur la cellule précédant p.", "Quand p->valeur = x : prec->suivant ← p->suivant; (la cellule p est « sautée »)."],
          correction: `fonction avec retour Liste supprimer(Liste L, entier x)
début
    Liste prec, p;
    si (L = vide) alors
        retourner L;
    finsi
    si (L->valeur = x) alors
        retourner L->suivant;
    finsi
    prec ← L;
    p ← L->suivant;
    tant que (p ≠ vide) faire
        si (p->valeur = x) alors
            prec->suivant ← p->suivant;
            retourner L;
        finsi
        prec ← p;
        p ← p->suivant;
    fintantque
    retourner L;
fin`,
          recursive: `fonction avec retour Liste supprimer(Liste L, entier x)
début
    si (L = vide) alors
        retourner vide;
    finsi
    si (L->valeur = x) alors
        retourner L->suivant;
    finsi
    L->suivant ← supprimer(L->suivant, x);
    retourner L;
fin`,
          complexite: cx("O(n)", "On peut devoir parcourir toute la liste."),
        },
        {
          id: "L9", titre: "Somme terme à terme de deux listes", fonction: "somme_listes", source: ["Examen 2017 · Ex. 1"],
          enonce: `Écrire un algorithme qui, étant donné deux listes L1 = [x<sub>1</sub>, …, x<sub>n</sub>] et L2 = [y<sub>1</sub>, …, y<sub>n</sub>] (de même longueur), crée la liste L3 = [x<sub>1</sub>+y<sub>1</sub>, x<sub>2</sub>+y<sub>2</sub>, …, x<sub>n</sub>+y<sub>n</sub>]. Complexité ?`,
          depart: `fonction avec retour Liste somme_listes(Liste L1, Liste L2)
début
    Liste L3, dernier, p;

fin`,
          tests: [{ args: [["liste", [1, 2, 3]], ["liste", [10, 20, 30]]], attendu: [11, 22, 33] }, { args: [["liste", []], ["liste", []]], attendu: [] }, { args: [["liste", [5]], ["liste", [-5]]], attendu: [0] }],
          check: "liste",
          indices: ["Parcours L1 et L2 en même temps, et crée une cellule par couple.", "Pour garder l'ordre, ajoute chaque nouvelle cellule en queue : garde un pointeur dernier sur la dernière cellule de L3.", "Si L3 = vide : L3 ← p; sinon dernier->suivant ← p; puis dernier ← p;"],
          correction: `fonction avec retour Liste somme_listes(Liste L1, Liste L2)
début
    Liste L3, dernier, p;
    L3 ← vide;
    dernier ← vide;
    tant que (L1 ≠ vide et L2 ≠ vide) faire
        new(p);
        p->valeur ← L1->valeur + L2->valeur;
        p->suivant ← vide;
        si (L3 = vide) alors
            L3 ← p;
        sinon
            dernier->suivant ← p;
        finsi
        dernier ← p;
        L1 ← L1->suivant;
        L2 ← L2->suivant;
    fintantque
    retourner L3;
fin`,
          recursive: `fonction avec retour Liste somme_listes(Liste L1, Liste L2)
début
    Liste p;
    si (L1 = vide ou L2 = vide) alors
        retourner vide;
    finsi
    new(p);
    p->valeur ← L1->valeur + L2->valeur;
    p->suivant ← somme_listes(L1->suivant, L2->suivant);
    retourner p;
fin`,
          complexite: cx("O(n)", "Un seul parcours simultané des deux listes, avec ajout en queue en O(1) grâce au pointeur dernier."),
        },
        {
          id: "L10", titre: "Éléments de L1 absents de L2", fonction: "difference", source: ["Examen 2023 · Ex. 1", "Examen 2024 · Ex. 1", "Contrôle n°1 · Ex. 2"],
          enonce: `Soient L1 et L2 deux listes. Écrire un algorithme permettant de créer la liste L contenant <b>tous les éléments de L1 qui ne sont pas présents dans L2</b> (dans l'ordre de L1). Complexité ?`,
          depart: `fonction avec retour Liste difference(Liste L1, Liste L2)
début
    Liste L, dernier, p, q;
    booleen trouve;

fin`,
          tests: [
            { args: [["liste", [1, 2, 3, 4]], ["liste", [2, 4]]], attendu: [1, 3] }, { args: [["liste", [1, 2]], ["liste", []]], attendu: [1, 2] },
            { args: [["liste", []], ["liste", [1]]], attendu: [] }, { args: [["liste", [5, 6]], ["liste", [6, 5]]], attendu: [] }, { args: [["liste", [7, 3, 7]], ["liste", [3]]], attendu: [7, 7] },
          ],
          check: "liste",
          indices: ["Pour chaque élément de L1, cherche-le dans L2 (un deuxième parcours, dans une boucle).", "Utilise un booléen trouve, remis à faux avant de parcourir L2.", "Si non trouve : crée une cellule et ajoute-la en queue de L (pointeur dernier)."],
          correction: `fonction avec retour Liste difference(Liste L1, Liste L2)
début
    Liste L, dernier, p, q;
    booleen trouve;
    L ← vide;
    dernier ← vide;
    tant que (L1 ≠ vide) faire
        trouve ← faux;
        q ← L2;
        tant que (q ≠ vide et non trouve) faire
            si (q->valeur = L1->valeur) alors
                trouve ← vrai;
            finsi
            q ← q->suivant;
        fintantque
        si (non trouve) alors
            new(p);
            p->valeur ← L1->valeur;
            p->suivant ← vide;
            si (L = vide) alors
                L ← p;
            sinon
                dernier->suivant ← p;
            finsi
            dernier ← p;
        finsi
        L1 ← L1->suivant;
    fintantque
    retourner L;
fin`,
          recursive: `fonction avec retour booleen appartient(Liste L, entier x)
début
    si (L = vide) alors
        retourner faux;
    finsi
    si (L->valeur = x) alors
        retourner vrai;
    finsi
    retourner appartient(L->suivant, x);
fin

fonction avec retour Liste difference(Liste L1, Liste L2)
début
    Liste p;
    si (L1 = vide) alors
        retourner vide;
    finsi
    si (appartient(L2, L1->valeur)) alors
        retourner difference(L1->suivant, L2);
    finsi
    new(p);
    p->valeur ← L1->valeur;
    p->suivant ← difference(L1->suivant, L2);
    retourner p;
fin`,
          complexite: cx("O(n²)", "Pour chacun des n éléments de L1 on parcourt L2 (m éléments) : O(n·m), soit O(n²) si les listes ont la même taille."),
        },
        {
          id: "L11", titre: "Renverser une liste sans pile", fonction: "renverser", source: ["Examen 2017 · Ex. 4", "Examen 2024 · Ex. 2"],
          enonce: `Écrire un algorithme qui renverse une liste L1 pour obtenir une liste L2 <b>sans utiliser de pile ou de file</b>. Complexité ?<br><small>Deux façons : renverser les liens des cellules, ou construire L2 en ajoutant chaque valeur devant avec <code>L2 ← creerListe(L1->valeur, L2);</code></small>`,
          depart: `fonction avec retour Liste renverser(Liste L)
début
    Liste prec, suiv;

fin`,
          tests: [{ args: [["liste", [1, 2, 3, 4]]], attendu: [4, 3, 2, 1] }, { args: [["liste", []]], attendu: [] }, { args: [["liste", [8]]], attendu: [8] }],
          check: "liste", contraintes: { interdits: ["pile", "file"] },
          indices: ["Garde trois pointeurs : prec (déjà renversé), L (cellule courante), suiv (la suite).", "À chaque tour : suiv ← L->suivant; L->suivant ← prec;", "Puis prec ← L; L ← suiv; À la fin, la nouvelle tête est prec."],
          correction: `fonction avec retour Liste renverser(Liste L)
début
    Liste prec, suiv;
    prec ← vide;
    tant que (L ≠ vide) faire
        suiv ← L->suivant;
        L->suivant ← prec;
        prec ← L;
        L ← suiv;
    fintantque
    retourner prec;
fin`,
          recursive: `fonction avec retour Liste renverser(Liste L)
début
    Liste reste;
    si (L = vide ou L->suivant = vide) alors
        retourner L;
    finsi
    reste ← renverser(L->suivant);
    L->suivant->suivant ← L;
    L->suivant ← vide;
    retourner reste;
fin`,
          complexite: cx("O(n)", "Un seul parcours, chaque lien est retourné une fois."),
        },
        {
          id: "L12", titre: "Renverser une liste (récursif)", fonction: "renverser_rec", source: ["Contrôle n°1 · Ex. 1"],
          enonce: `Écrire un algorithme <b>récursif</b> qui renverse une liste L1 pour obtenir une liste L2 sans utiliser de pile ou de file. Complexité ?`,
          depart: `fonction avec retour Liste renverser_rec(Liste L)
début
    Liste reste;

fin`,
          tests: [{ args: [["liste", [1, 2, 3, 4]]], attendu: [4, 3, 2, 1] }, { args: [["liste", []]], attendu: [] }, { args: [["liste", [8]]], attendu: [8] }],
          check: "liste", contraintes: { recursif: true, interdits: ["pile", "file"] },
          indices: ["Cas de base : une liste vide ou d'un seul élément est déjà renversée.", "Renverse d'abord la suite : reste ← renverser_rec(L->suivant); L->suivant est alors la DERNIÈRE cellule de reste.", "L->suivant->suivant ← L; L->suivant ← vide; retourner reste;"],
          correction: `fonction avec retour Liste renverser_rec(Liste L)
début
    Liste reste;
    si (L = vide ou L->suivant = vide) alors
        retourner L;
    finsi
    reste ← renverser_rec(L->suivant);
    L->suivant->suivant ← L;
    L->suivant ← vide;
    retourner reste;
fin`,
          complexite: cx("O(n)", "Un appel récursif par cellule, chacun en O(1)."),
        },
        {
          id: "L13", titre: "Fusion de deux listes triées", fonction: "fusion", source: ["Examen 2023 (session 2) · Ex. 1"],
          enonce: `Écrire un algorithme qui <b>fusionne deux listes non vides L1 et L2 triées</b> (ordre croissant) pour obtenir une nouvelle liste triée L3. Complexité ?`,
          depart: `fonction avec retour Liste fusion(Liste L1, Liste L2)
début
    Liste L3, dernier, p;
    entier x;

fin`,
          tests: [
            { args: [["liste", [1, 4, 6]], ["liste", [2, 3, 7, 8]]], attendu: [1, 2, 3, 4, 6, 7, 8] }, { args: [["liste", [5]], ["liste", [1]]], attendu: [1, 5] },
            { args: [["liste", [1, 2]], ["liste", [3, 4]]], attendu: [1, 2, 3, 4] }, { args: [["liste", [2, 2]], ["liste", [2]]], attendu: [2, 2, 2] },
          ],
          check: "liste",
          indices: ["Tant que les deux listes ont des éléments, prends le plus petit des deux en tête.", "Ajoute-le en queue de L3 (pointeur dernier) et avance dans la liste d'où il vient.", "Quand l'une est finie, recopie le reste de l'autre."],
          correction: `fonction avec retour Liste fusion(Liste L1, Liste L2)
début
    Liste L3, dernier, p;
    entier x;
    L3 ← vide;
    dernier ← vide;
    tant que (L1 ≠ vide ou L2 ≠ vide) faire
        si (L2 = vide) alors
            x ← L1->valeur;
            L1 ← L1->suivant;
        sinon si (L1 = vide) alors
            x ← L2->valeur;
            L2 ← L2->suivant;
        sinon si (L1->valeur <= L2->valeur) alors
            x ← L1->valeur;
            L1 ← L1->suivant;
        sinon
            x ← L2->valeur;
            L2 ← L2->suivant;
        finsi
        new(p);
        p->valeur ← x;
        p->suivant ← vide;
        si (L3 = vide) alors
            L3 ← p;
        sinon
            dernier->suivant ← p;
        finsi
        dernier ← p;
    fintantque
    retourner L3;
fin`,
          recursive: `fonction avec retour Liste fusion(Liste L1, Liste L2)
début
    Liste p;
    si (L1 = vide et L2 = vide) alors
        retourner vide;
    finsi
    new(p);
    si (L2 = vide ou (L1 ≠ vide et L1->valeur <= L2->valeur)) alors
        p->valeur ← L1->valeur;
        p->suivant ← fusion(L1->suivant, L2);
    sinon
        p->valeur ← L2->valeur;
        p->suivant ← fusion(L1, L2->suivant);
    finsi
    retourner p;
fin`,
          complexite: cx("O(n)", "Chaque élément de L1 et de L2 est traité une seule fois : O(n + m)."),
        },
        {
          id: "L14", titre: "Supprimer les doublons", fonction: "sans_doublons",
          enonce: `Écrire une fonction <code>sans_doublons(Liste L)</code> qui supprime de L les valeurs déjà vues plus tôt dans la liste (on garde la première occurrence) et retourne la liste.`,
          depart: `fonction avec retour Liste sans_doublons(Liste L)
début
    Liste p, prec, q;

fin`,
          tests: [{ args: [["liste", [1, 2, 1, 3, 2]]], attendu: [1, 2, 3] }, { args: [["liste", [4, 4, 4]]], attendu: [4] }, { args: [["liste", []]], attendu: [] }, { args: [["liste", [1, 2, 3]]], attendu: [1, 2, 3] }],
          check: "liste",
          indices: ["Pour chaque cellule p, supprime plus loin toutes les cellules de même valeur.", "Pour supprimer après p, utilise prec (cellule précédente) et q (cellule testée).", "si (q->valeur = p->valeur) alors prec->suivant ← q->suivant; sinon prec ← q; finsi"],
          correction: `fonction avec retour Liste sans_doublons(Liste L)
début
    Liste p, prec, q;
    p ← L;
    tant que (p ≠ vide) faire
        prec ← p;
        q ← p->suivant;
        tant que (q ≠ vide) faire
            si (q->valeur = p->valeur) alors
                prec->suivant ← q->suivant;
            sinon
                prec ← q;
            finsi
            q ← q->suivant;
        fintantque
        p ← p->suivant;
    fintantque
    retourner L;
fin`,
          recursive: `fonction avec retour Liste supprimer_tout(Liste L, entier x)
début
    si (L = vide) alors
        retourner vide;
    finsi
    si (L->valeur = x) alors
        retourner supprimer_tout(L->suivant, x);
    finsi
    L->suivant ← supprimer_tout(L->suivant, x);
    retourner L;
fin

fonction avec retour Liste sans_doublons(Liste L)
début
    si (L = vide) alors
        retourner vide;
    finsi
    L->suivant ← sans_doublons(supprimer_tout(L->suivant, L->valeur));
    retourner L;
fin`,
          complexite: cx("O(n²)", "Pour chaque cellule on parcourt la fin de la liste."),
        },
      ],
    },

    // ------------------------------------------------------------------ Listes doublement chaînées
    {
      id: "doubles", titre: "Listes doublement chaînées", icone: "⛓️",
      fiche: `
<p>Chaque cellule a aussi un pointeur <code>precedent</code> vers la cellule d'avant (vide pour la première).</p>
<pre>TYPE Liste = vide ou pointeur sur enregistrement
    valeur : entier
    precedent : Liste
    suivant : Liste
fin enregistrement</pre>
<p>Toute modification doit mettre à jour <b>les deux</b> sens : si on relie a → b, il faut aussi b->precedent ← a.</p>`,
      demo: `début
    Liste L, p;
    new(L);
    L->valeur ← 10;
    L->precedent ← vide;
    new(p);
    p->valeur ← 20;
    p->precedent ← L;
    p->suivant ← vide;
    L->suivant ← p;
    écrire(L->suivant->precedent->valeur);
fin`,
      exercices: [
        {
          id: "D1", titre: "Ajout en tête (double)", fonction: "ajout_tete_double",
          enonce: `Écrire <code>ajout_tete_double(Liste L, entier x)</code> qui ajoute x au début d'une liste <b>doublement chaînée</b> et retourne la nouvelle liste.`,
          depart: `fonction avec retour Liste ajout_tete_double(Liste L, entier x)
début
    Liste p;

fin`,
          tests: [{ args: [["listeD", [20, 30]], 10], attendu: [10, 20, 30] }, { args: [["listeD", []], 5], attendu: [5] }],
          check: "listeD",
          indices: ["Comme pour une liste simple, plus le pointeur precedent.", "La nouvelle cellule n'a pas de précédent : p->precedent ← vide;", "Si L ≠ vide, l'ancienne tête doit pointer en arrière vers p : L->precedent ← p;"],
          correction: `fonction avec retour Liste ajout_tete_double(Liste L, entier x)
début
    Liste p;
    new(p);
    p->valeur ← x;
    p->precedent ← vide;
    p->suivant ← L;
    si (L ≠ vide) alors
        L->precedent ← p;
    finsi
    retourner p;
fin`,
          complexite: cx("O(1)", "Nombre constant d'affectations."),
        },
        {
          id: "D2", titre: "Supprimer dans une liste double", fonction: "supprimer_double",
          enonce: `Écrire <code>supprimer_double(Liste L, entier x)</code> qui supprime la première occurrence de x d'une liste doublement chaînée et retourne la liste (les liens <code>precedent</code> doivent rester corrects).`,
          depart: `fonction avec retour Liste supprimer_double(Liste L, entier x)
début
    Liste p;

fin`,
          tests: [{ args: [["listeD", [1, 2, 3]], 2], attendu: [1, 3] }, { args: [["listeD", [1, 2, 3]], 1], attendu: [2, 3] }, { args: [["listeD", [1, 2, 3]], 3], attendu: [1, 2] }, { args: [["listeD", [1]], 1], attendu: [] }, { args: [["listeD", [1, 2]], 9], attendu: [1, 2] }],
          check: "listeD",
          indices: ["Cherche d'abord la cellule p qui contient x.", "Avec la liste double, pas besoin de prec : p->precedent le donne.", "Relie p->precedent et p->suivant entre eux (en testant s'ils sont vides) ; si p était la tête, la tête devient p->suivant."],
          correction: `fonction avec retour Liste supprimer_double(Liste L, entier x)
début
    Liste p;
    p ← L;
    tant que (p ≠ vide et p->valeur ≠ x) faire
        p ← p->suivant;
    fintantque
    si (p = vide) alors
        retourner L;
    finsi
    si (p->suivant ≠ vide) alors
        p->suivant->precedent ← p->precedent;
    finsi
    si (p->precedent ≠ vide) alors
        p->precedent->suivant ← p->suivant;
    sinon
        L ← p->suivant;
    finsi
    retourner L;
fin`,
          complexite: cx("O(n)", "La recherche est en O(n) ; la suppression elle-même est en O(1)."),
        },
      ],
    },

    // ------------------------------------------------------------------ Piles
    {
      id: "piles", titre: "Piles (LIFO)", icone: "📚",
      fiche: `
<p>Le dernier élément ajouté est le premier retiré. On n'utilise <b>que</b> les opérations :</p>
<ul>
<li><code>Pile P;</code> déclare une pile vide.</li>
<li><code>empiler(P, x);</code> ajoute x au sommet.</li>
<li><code>P ← dépiler(P);</code> retire le sommet (interdit si la pile est vide).</li>
<li><code>sommet(P)</code> donne la valeur du sommet sans la retirer.</li>
<li><code>estvide(P)</code> vaut vrai si la pile est vide.</li>
</ul>
<p>Pour lire et retirer : <code>x ← sommet(P); P ← dépiler(P);</code></p>`,
      demo: `début
    Pile P;
    empiler(P, 10);
    empiler(P, 20);
    empiler(P, 30);
    tant que (non estvide(P)) faire
        écrire(sommet(P));
        P ← dépiler(P);
    fintantque
fin`,
      exercices: [
        {
          id: "P1", titre: "Hauteur d'une pile", fonction: "hauteur_pile",
          enonce: `Écrire <code>hauteur_pile(Pile P)</code> qui retourne le nombre d'éléments de P en n'utilisant que les opérations sur les piles (la pile peut être vidée).`,
          depart: `fonction avec retour entier hauteur_pile(Pile P)
début
    entier n;

fin`,
          tests: [{ args: [["pile", [10, 20, 30]]], attendu: 3 }, { args: [["pile", []]], attendu: 0 }, { args: [["pile", [4]]], attendu: 1 }],
          check: "valeur",
          indices: ["Dépile jusqu'à ce que la pile soit vide en comptant.", "tant que (non estvide(P)) faire … fintantque", "n ← n + 1; P ← dépiler(P);"],
          correction: `fonction avec retour entier hauteur_pile(Pile P)
début
    entier n;
    n ← 0;
    tant que (non estvide(P)) faire
        n ← n + 1;
        P ← dépiler(P);
    fintantque
    retourner n;
fin`,
          recursive: `fonction avec retour entier hauteur_pile(Pile P)
début
    si (estvide(P)) alors
        retourner 0;
    finsi
    P ← dépiler(P);
    retourner 1 + hauteur_pile(P);
fin`,
          complexite: cx("O(n)", "On dépile les n éléments."),
        },
        {
          id: "P2", titre: "Parenthèses bien équilibrées", fonction: "bien_parenthesee", source: ["Examen 2023 (session 2) · Ex. 2a", "Contrôle n°1 · Ex. 6"],
          enonce: `Un problème fréquent est de déterminer si les parenthèses d'une chaîne de caractères sont équilibrées. Par exemple, la chaîne <code>((( ))( ))( )</code> est bien équilibrée et proprement écrite, mais les chaînes <code>)( )(</code> ou <code>( ))</code> ne le sont pas.<br>Écrire un algorithme qui retourne VRAI si une chaîne de caractères est proprement écrite et bien balancée, et FAUX sinon. <b>Utiliser pour cela une PILE.</b><br><small>Les caractères de <code>ch</code> sont <code>ch[0]</code> … <code>ch[longueur(ch) − 1]</code> ; les autres caractères que ( et ) sont ignorés.</small>`,
          depart: `fonction avec retour booleen bien_parenthesee(chaine ch)
début
    Pile P;
    entier i;

fin`,
          tests: [{ args: ["((( ))( ))( )"], attendu: true }, { args: [")( )("], attendu: false }, { args: ["( ))"], attendu: false }, { args: ["(()"], attendu: false }, { args: [""], attendu: true }, { args: ["(a+b)*(c)"], attendu: true }],
          check: "valeur", contraintes: { requis: ["pile"] },
          indices: ["Chaque « ( » est empilée ; chaque « ) » doit refermer la dernière « ( » ouverte, donc dépiler.", "Si on rencontre « ) » alors que la pile est vide : c'est mal écrit, retourner faux.", "À la fin, la chaîne est bien équilibrée seulement si la pile est vide : retourner estvide(P);"],
          correction: `fonction avec retour booleen bien_parenthesee(chaine ch)
début
    Pile P;
    entier i;
    pour i allant de 0 à longueur(ch) - 1 faire
        si (ch[i] = '(') alors
            empiler(P, '(');
        sinon si (ch[i] = ')') alors
            si (estvide(P)) alors
                retourner faux;
            finsi
            P ← dépiler(P);
        finsi
    finpour
    retourner estvide(P);
fin`,
          complexite: cx("O(n)", "Chaque caractère est lu une fois, et chaque opération sur la pile est en O(1)."),
        },
        {
          id: "P3", titre: "Position de la première parenthèse fautive", fonction: "position_erreur", source: ["Examen 2023 (session 2) · Ex. 2b"],
          enonce: `Écrire un algorithme qui retourne la <b>position de la première parenthèse qui déroge à la règle</b> si la chaîne n'est pas bien écrite et bien équilibrée, et −1 si elle l'est. <b>Utiliser une PILE.</b><br><small>Une « ) » sans « ( » correspondante est fautive. Si des « ( » restent ouvertes à la fin, la fautive est la première d'entre elles. Positions à partir de 0.</small>`,
          depart: `fonction avec retour entier position_erreur(chaine ch)
début
    Pile P;
    entier i, pos;

fin`,
          tests: [{ args: ["(()"], attendu: 0 }, { args: ["())"], attendu: 2 }, { args: ["()"], attendu: -1 }, { args: [")("], attendu: 0 }, { args: ["()(()"], attendu: 2 }, { args: ["((( ))( ))( )"], attendu: -1 }],
          check: "valeur", contraintes: { requis: ["pile"] },
          indices: ["Empile les POSITIONS des « ( » (pas les caractères) pour savoir où elles sont.", "Une « ) » quand la pile est vide : retourner sa position i.", "À la fin, s'il reste des positions, la première « ( » non fermée est au FOND de la pile : dépile jusqu'au dernier élément."],
          correction: `fonction avec retour entier position_erreur(chaine ch)
début
    Pile P;
    entier i, pos;
    pour i allant de 0 à longueur(ch) - 1 faire
        si (ch[i] = '(') alors
            empiler(P, i);
        sinon si (ch[i] = ')') alors
            si (estvide(P)) alors
                retourner i;
            finsi
            P ← dépiler(P);
        finsi
    finpour
    pos ← -1;
    tant que (non estvide(P)) faire
        pos ← sommet(P);
        P ← dépiler(P);
    fintantque
    retourner pos;
fin`,
          complexite: cx("O(n)", "Un parcours de la chaîne, puis au plus n dépilements."),
        },
        {
          id: "P4", titre: "Insérer dans une pile à une position", fonction: "inserer_pile", source: ["Contrôle n°1 · Ex. 4"],
          enonce: `Écrire un algorithme permettant d'<b>insérer un élément x à une position donnée pos dans une pile</b> (avec seulement les opérations sur les piles). Complexité ?<br><small>Position 1 = sommet. Si pos dépasse la hauteur + 1, x est placé au fond. La fonction retourne la pile.</small>`,
          depart: `fonction avec retour Pile inserer_pile(Pile P, entier x, entier pos)
début
    Pile Aux;
    entier i;

fin`,
          tests: [
            { args: [["pile", [1, 2, 3]], 9, 1], attendu: [1, 2, 3, 9] }, { args: [["pile", [1, 2, 3]], 9, 2], attendu: [1, 2, 9, 3] },
            { args: [["pile", [1, 2, 3]], 9, 4], attendu: [9, 1, 2, 3] }, { args: [["pile", [1, 2, 3]], 9, 10], attendu: [9, 1, 2, 3] }, { args: [["pile", []], 9, 1], attendu: [9] },
          ],
          check: "pile",
          indices: ["Pour atteindre la position pos, il faut d'abord retirer les pos − 1 éléments du dessus.", "Range-les dans une pile auxiliaire Aux (ils s'y retrouvent à l'envers), empile x, puis remets-les.", "Remettre : tant que (non estvide(Aux)) : empiler(P, sommet(Aux)); Aux ← dépiler(Aux);"],
          correction: `fonction avec retour Pile inserer_pile(Pile P, entier x, entier pos)
début
    Pile Aux;
    entier i;
    i ← 1;
    tant que (i < pos et non estvide(P)) faire
        empiler(Aux, sommet(P));
        P ← dépiler(P);
        i ← i + 1;
    fintantque
    empiler(P, x);
    tant que (non estvide(Aux)) faire
        empiler(P, sommet(Aux));
        Aux ← dépiler(Aux);
    fintantque
    retourner P;
fin`,
          recursive: `fonction avec retour Pile inserer_pile(Pile P, entier x, entier pos)
début
    entier s;
    si (pos <= 1 ou estvide(P)) alors
        empiler(P, x);
        retourner P;
    finsi
    s ← sommet(P);
    P ← dépiler(P);
    P ← inserer_pile(P, x, pos - 1);
    empiler(P, s);
    retourner P;
fin`,
          complexite: cx("O(n)", "Au plus n éléments sont déplacés deux fois."),
        },
        {
          id: "P5", titre: "Trier une pile (sélection du minimum)", fonction: "trier_pile", source: ["Examen 2017 · Ex. 2", "Contrôle 2020 · Ex. 1", "Examen 2022 · Ex. 1"],
          enonce: `Écrire un algorithme réalisant le <b>tri des éléments d'une pile</b> utilisant le principe du tri par <b>sélection du minimum</b>, en n'utilisant <b>que des piles et des entiers</b>. Complexité ?<br><small>La pile retournée a le plus petit élément au fond et le plus grand au sommet.</small>`,
          depart: `fonction avec retour Pile trier_pile(Pile P)
début
    Pile R, Aux;
    entier m;

fin`,
          tests: [{ args: [["pile", [3, 1, 2]]], attendu: [1, 2, 3] }, { args: [["pile", [5, 9, 1, 7, 1]]], attendu: [1, 1, 5, 7, 9] }, { args: [["pile", []]], attendu: [] }, { args: [["pile", [4]]], attendu: [4] }],
          check: "pile", contraintes: { interdits: ["file", "list", "tree", "array"] },
          indices: ["À chaque étape : trouve le minimum m de P, retire UNE occurrence de m, et empile m dans la pile résultat R.", "Pour trouver m, vide P dans Aux en gardant le minimum ; puis remets tout dans P sauf une occurrence de m.", "Recommence tant que P n'est pas vide : R se remplit du plus petit au plus grand."],
          correction: `fonction avec retour Pile trier_pile(Pile P)
début
    Pile R, Aux;
    entier m;
    booleen retire;
    tant que (non estvide(P)) faire
        m ← sommet(P);
        tant que (non estvide(P)) faire
            si (sommet(P) < m) alors
                m ← sommet(P);
            finsi
            empiler(Aux, sommet(P));
            P ← dépiler(P);
        fintantque
        retire ← faux;
        tant que (non estvide(Aux)) faire
            si (sommet(Aux) = m et non retire) alors
                retire ← vrai;
            sinon
                empiler(P, sommet(Aux));
            finsi
            Aux ← dépiler(Aux);
        fintantque
        empiler(R, m);
    fintantque
    retourner R;
fin`,
          complexite: cx("O(n²)", "n sélections, et chaque sélection vide et remplit la pile restante (au plus n éléments)."),
        },
        {
          id: "P6", titre: "Évaluer une expression postfixée", fonction: "evaluer_postfixe",
          enonce: `Une expression <b>postfixée</b> écrit l'opérateur après ses deux opérandes : <code>34+2*</code> signifie (3 + 4) × 2. Écrire <code>evaluer_postfixe(chaine ch)</code> qui calcule sa valeur avec une pile. Les nombres sont des chiffres seuls, les opérateurs sont + − *, les espaces sont ignorés.<br><small>Utiles : <code>estchiffre(c)</code> et <code>atoi(c)</code> (valeur du chiffre c).</small>`,
          depart: `fonction avec retour entier evaluer_postfixe(chaine ch)
début
    Pile P;
    entier i, a, b;

fin`,
          tests: [{ args: ["34+2*"], attendu: 14 }, { args: ["52-"], attendu: 3 }, { args: ["234*+"], attendu: 14 }, { args: ["9"], attendu: 9 }, { args: ["1 2 + 3 4 + *"], attendu: 21 }],
          check: "valeur", contraintes: { requis: ["pile"] },
          indices: ["Un chiffre : on l'empile (sa valeur atoi(ch[i])).", "Un opérateur : on dépile b (sommet), puis a, et on empile a op b — attention à l'ordre pour « − ».", "À la fin, le résultat est le sommet de la pile."],
          correction: `fonction avec retour entier evaluer_postfixe(chaine ch)
début
    Pile P;
    entier i, a, b;
    pour i allant de 0 à longueur(ch) - 1 faire
        si (estchiffre(ch[i])) alors
            empiler(P, atoi(ch[i]));
        sinon si (ch[i] = '+' ou ch[i] = '-' ou ch[i] = '*') alors
            b ← sommet(P);
            P ← dépiler(P);
            a ← sommet(P);
            P ← dépiler(P);
            si (ch[i] = '+') alors
                empiler(P, a + b);
            sinon si (ch[i] = '-') alors
                empiler(P, a - b);
            sinon
                empiler(P, a * b);
            finsi
        finsi
    finpour
    retourner sommet(P);
fin`,
          complexite: cx("O(n)", "Chaque caractère est traité une fois."),
        },
      ],
    },

    // ------------------------------------------------------------------ Files
    {
      id: "files", titre: "Files (FIFO)", icone: "🚶",
      fiche: `
<p>Le premier élément ajouté est le premier retiré (comme une file d'attente).</p>
<ul>
<li><code>File F;</code> déclare une file vide.</li>
<li><code>enfiler(F, x);</code> ajoute x en queue.</li>
<li><code>F ← défiler(F);</code> retire la tête.</li>
<li><code>tête(F)</code> donne la valeur de la tête sans la retirer.</li>
<li><code>estvide(F)</code>.</li>
</ul>`,
      demo: `début
    File F;
    enfiler(F, 10);
    enfiler(F, 20);
    enfiler(F, 30);
    tant que (non estvide(F)) faire
        écrire(tête(F));
        F ← défiler(F);
    fintantque
fin`,
      exercices: [
        {
          id: "F1", titre: "Somme des éléments d'une file", fonction: "somme_file",
          enonce: `Écrire <code>somme_file(File F)</code> qui retourne la somme des éléments de F (la file peut être vidée).`,
          depart: `fonction avec retour entier somme_file(File F)
début
    entier s;

fin`,
          tests: [{ args: [["file", [10, 20, 30]]], attendu: 60 }, { args: [["file", []]], attendu: 0 }],
          check: "valeur",
          indices: ["Défile jusqu'à ce que la file soit vide.", "s ← s + tête(F); puis F ← défiler(F);", "N'oublie pas s ← 0; au début."],
          correction: `fonction avec retour entier somme_file(File F)
début
    entier s;
    s ← 0;
    tant que (non estvide(F)) faire
        s ← s + tête(F);
        F ← défiler(F);
    fintantque
    retourner s;
fin`,
          recursive: `fonction avec retour entier somme_file(File F)
début
    entier x;
    si (estvide(F)) alors
        retourner 0;
    finsi
    x ← tête(F);
    F ← défiler(F);
    retourner x + somme_file(F);
fin`,
          complexite: cx("O(n)", "On défile les n éléments."),
        },
        {
          id: "F2", titre: "Renverser une file avec une pile", fonction: "renverser_file", source: ["Examen 2023 · Ex. 2", "Examen 2024 · Ex. 2 et 3", "Contrôle n°1 · Ex. 5"],
          enonce: `Soient Q et P une file et une pile. En utilisant <b>une seule variable</b> et les opérations sur les Piles et Files, écrire un algorithme qui <b>renverse l'ordre des éléments de Q</b>. Complexité ?`,
          depart: `fonction avec retour File renverser_file(File Q, Pile P)
début
    entier x;

fin`,
          tests: [{ args: [["file", [1, 2, 3]], ["pile", []]], attendu: [3, 2, 1] }, { args: [["file", []], ["pile", []]], attendu: [] }, { args: [["file", [5]], ["pile", []]], attendu: [5] }],
          check: "file", contraintes: { maxVariables: 1 },
          indices: ["Une pile inverse l'ordre : ce qui entre en premier sort en dernier.", "Vide Q dans P (x ← tête(Q); Q ← défiler(Q); empiler(P, x);).", "Puis vide P dans Q : les éléments reviennent dans l'ordre inverse."],
          correction: `fonction avec retour File renverser_file(File Q, Pile P)
début
    entier x;
    tant que (non estvide(Q)) faire
        x ← tête(Q);
        Q ← défiler(Q);
        empiler(P, x);
    fintantque
    tant que (non estvide(P)) faire
        x ← sommet(P);
        P ← dépiler(P);
        enfiler(Q, x);
    fintantque
    retourner Q;
fin`,
          recursive: `fonction avec retour File renverser_file(File Q, Pile P)
début
    entier x;
    si (estvide(Q)) alors
        retourner Q;
    finsi
    x ← tête(Q);
    Q ← défiler(Q);
    Q ← renverser_file(Q, P);
    enfiler(Q, x);
    retourner Q;
fin`,
          complexite: cx("O(n)", "Chaque élément passe une fois dans la pile puis revient dans la file."),
        },
      ],
    },

    // ------------------------------------------------------------------ Arbres binaires
    {
      id: "arbres", titre: "Arbres binaires", icone: "🌳",
      fiche: `
<pre>TYPE Arbre = vide ou pointeur sur enregistrement
    valeur : entier
    gauche : Arbre
    droit : Arbre
fin enregistrement</pre>
<ul>
<li>On écrit aussi <code>A->val</code>, <code>A->g</code>, <code>A->d</code>.</li>
<li>Presque tout se fait en <b>récursif</b> : cas de base <code>A = vide</code>, puis appel sur <code>A->g</code> et <code>A->d</code>.</li>
<li>Parcours : <b>préfixe</b> (racine, gauche, droit), <b>infixe</b> (gauche, racine, droit), <b>postfixe</b> (gauche, droit, racine).</li>
<li>Convention : la hauteur d'une feuille vaut 0, celle de l'arbre vide vaut −1.</li>
</ul>`,
      demo: `fonction avec retour entier taille(Arbre A)
début
    si (A = vide) alors
        retourner 0;
    finsi
    retourner 1 + taille(A->g) + taille(A->d);
fin

début
    Arbre A;
    new(A);
    A->val ← 1;
    new(A->g);
    A->g->val ← 2;
    new(A->d);
    A->d->val ← 3;
    new(A->g->d);
    A->g->d->val ← 4;
    écrire(taille(A));
fin`,
      exercices: [
        {
          id: "A1", titre: "Nombre de nœuds", fonction: "taille",
          enonce: `Écrire une fonction récursive <code>taille(Arbre A)</code> qui retourne le nombre de nœuds de A.`,
          depart: `fonction avec retour entier taille(Arbre A)
début

fin`,
          tests: [{ args: [["arbre", [1, [2, null, [4]], [3]]]], attendu: 4 }, { args: [["arbre", null]], attendu: 0 }, { args: [["arbre", [7]]], attendu: 1 }],
          check: "valeur", contraintes: { recursif: true },
          indices: ["Cas de base : l'arbre vide a 0 nœud.", "Sinon : la racine + les nœuds de gauche + ceux de droite.", "retourner 1 + taille(A->g) + taille(A->d);"],
          correction: `fonction avec retour entier taille(Arbre A)
début
    si (A = vide) alors
        retourner 0;
    finsi
    retourner 1 + taille(A->g) + taille(A->d);
fin`,
          complexite: cx("O(n)", "Un appel par nœud (plus un par sous-arbre vide)."),
        },
        {
          id: "A2", titre: "Hauteur d'un arbre", fonction: "hauteur",
          enonce: `Écrire <code>hauteur(Arbre A)</code> (convention : hauteur d'une feuille = 0, de l'arbre vide = −1).`,
          depart: `fonction avec retour entier hauteur(Arbre A)
début

fin`,
          tests: [{ args: [["arbre", [1, [2, null, [4]], [3]]]], attendu: 2 }, { args: [["arbre", null]], attendu: -1 }, { args: [["arbre", [7]]], attendu: 0 }, { args: [["arbre", [1, [2, [3, [4]]]]]], attendu: 3 }],
          check: "valeur", contraintes: { recursif: true },
          indices: ["Cas de base : retourner -1 pour l'arbre vide.", "La hauteur est 1 + la plus grande des hauteurs des deux sous-arbres.", "retourner 1 + max(hauteur(A->g), hauteur(A->d));"],
          correction: `fonction avec retour entier hauteur(Arbre A)
début
    si (A = vide) alors
        retourner -1;
    finsi
    retourner 1 + max(hauteur(A->g), hauteur(A->d));
fin`,
          complexite: cx("O(n)", "Chaque nœud est visité une fois."),
        },
        {
          id: "A3", titre: "Nombre de feuilles", fonction: "nb_feuilles",
          enonce: `Écrire <code>nb_feuilles(Arbre A)</code> qui retourne le nombre de feuilles (nœuds sans fils) de A.`,
          depart: `fonction avec retour entier nb_feuilles(Arbre A)
début

fin`,
          tests: [{ args: [["arbre", [1, [2, null, [4]], [3]]]], attendu: 2 }, { args: [["arbre", null]], attendu: 0 }, { args: [["arbre", [7]]], attendu: 1 }, { args: [["arbre", [1, [2, [4], [5]], [3, [6], [7]]]]], attendu: 4 }],
          check: "valeur", contraintes: { recursif: true },
          indices: ["Trois cas : arbre vide, feuille, nœud interne.", "Une feuille : A->g = vide et A->d = vide → retourner 1.", "Sinon : retourner nb_feuilles(A->g) + nb_feuilles(A->d);"],
          correction: `fonction avec retour entier nb_feuilles(Arbre A)
début
    si (A = vide) alors
        retourner 0;
    finsi
    si (A->g = vide et A->d = vide) alors
        retourner 1;
    finsi
    retourner nb_feuilles(A->g) + nb_feuilles(A->d);
fin`,
          complexite: cx("O(n)", "Chaque nœud est visité une fois."),
        },
        {
          id: "A4", titre: "Somme des entiers pairs positifs", fonction: "paire",
          enonce: `Écrire une fonction qui retourne la <b>somme des entiers pairs positifs</b> contenus dans un arbre. Complexité ?`,
          depart: `fonction avec retour entier paire(Arbre A)
début

fin`,
          tests: [{ args: [["arbre", [4, [3, [2], [-6]], [8, null, [5]]]]], attendu: 14 }, { args: [["arbre", null]], attendu: 0 }, { args: [["arbre", [-2, [1], [3]]]], attendu: 0 }],
          check: "valeur", contraintes: { recursif: true },
          indices: ["Même schéma que la taille, mais on n'ajoute la valeur de la racine que si elle est paire et positive.", "Test : (A->val mod 2 = 0 et A->val > 0)", "retourner A->val + paire(A->g) + paire(A->d); ou seulement paire(A->g) + paire(A->d);"],
          correction: `fonction avec retour entier paire(Arbre A)
début
    si (A = vide) alors
        retourner 0;
    sinon
        si (A->val mod 2 = 0 et A->val > 0) alors
            retourner A->val + paire(A->g) + paire(A->d);
        sinon
            retourner paire(A->g) + paire(A->d);
        finsi
    finsi
fin`,
          complexite: cx("O(n)", "Chaque nœud est visité une fois."),
        },
        {
          id: "A5", titre: "Parcours préfixe", fonction: "prefixe",
          enonce: `Écrire la fonction sans retour <code>prefixe(Arbre A)</code> qui affiche les valeurs dans l'ordre <b>préfixe</b> (racine, sous-arbre gauche, sous-arbre droit).`,
          depart: `fonction sans retour prefixe(Arbre A)
début

fin`,
          tests: [{ args: [["arbre", [1, [2, [4], [5]], [3]]]], attendu: "1 2 4 5 3" }, { args: [["arbre", null]], attendu: "" }],
          check: "sortie", contraintes: { recursif: true },
          indices: ["Si A est vide, on ne fait rien.", "Sinon on affiche la racine AVANT les deux appels récursifs.", "écrire(A->val); prefixe(A->g); prefixe(A->d);"],
          correction: `fonction sans retour prefixe(Arbre A)
début
    si (A ≠ vide) alors
        écrire(A->val);
        prefixe(A->g);
        prefixe(A->d);
    finsi
fin`,
          complexite: cx("O(n)", "Un appel par nœud."),
        },
        {
          id: "A6", titre: "Parcours postfixe", fonction: "postfixe",
          enonce: `Écrire <code>postfixe(Arbre A)</code> qui affiche les valeurs dans l'ordre <b>postfixe</b> (gauche, droit, racine).`,
          depart: `fonction sans retour postfixe(Arbre A)
début

fin`,
          tests: [{ args: [["arbre", [1, [2, [4], [5]], [3]]]], attendu: "4 5 2 3 1" }, { args: [["arbre", null]], attendu: "" }],
          check: "sortie", contraintes: { recursif: true },
          indices: ["Même squelette que le préfixe.", "La racine est affichée APRÈS les deux sous-arbres.", "postfixe(A->g); postfixe(A->d); écrire(A->val);"],
          correction: `fonction sans retour postfixe(Arbre A)
début
    si (A ≠ vide) alors
        postfixe(A->g);
        postfixe(A->d);
        écrire(A->val);
    finsi
fin`,
          complexite: cx("O(n)", "Un appel par nœud."),
        },
        {
          id: "A7", type: "preuve", titre: "Feuilles = nœuds internes + 1", source: ["Examen 2023 · Ex. 4", "Examen 2024 · Ex. 5"],
          enonce: `Montrer que le nombre de feuilles d'un arbre binaire tel que chaque nœud a 0 ou 2 fils est égal au nombre de nœuds internes + 1.`,
          verifier: "strict",
          etapes: [
            "Notons f(A) le nombre de feuilles et i(A) le nombre de nœuds internes. On raisonne par <b>récurrence sur le nombre de nœuds</b> n de A.",
            "<b>Initialisation</b> : n = 1. L'arbre est une feuille seule : f = 1 et i = 0, donc f = i + 1. ✔",
            "<b>Hérédité</b> : soit A avec n > 1 nœuds. La racine n'est pas une feuille, donc elle a exactement 2 fils : A = (racine, G, D) où G et D vérifient aussi « 0 ou 2 fils » et ont moins de n nœuds.",
            "Par hypothèse de récurrence : f(G) = i(G) + 1 et f(D) = i(D) + 1.",
            "Les feuilles de A sont celles de G et de D : f(A) = f(G) + f(D). Les nœuds internes de A sont ceux de G, de D, plus la racine : i(A) = i(G) + i(D) + 1.",
            "Donc f(A) = (i(G) + 1) + (i(D) + 1) = (i(G) + i(D) + 1) + 1 = i(A) + 1. ✔ La propriété est vraie pour tout n ≥ 1.",
          ],
          qcm: { question: "Dans l'hérédité, pourquoi la racine a-t-elle forcément 2 fils ?", choix: ["Parce que l'arbre est équilibré", "Parce que n > 1 : la racine n'est pas une feuille, et un nœud a 0 ou 2 fils", "Parce que la hauteur est au moins 1", "Par hypothèse de récurrence"], bonne: 1 },
        },
        {
          id: "A8", type: "preuve", titre: "Nœuds d'un arbre complet : 2^(h+1) − 1", source: ["Examen 2022 · Ex. 3"],
          enonce: `Montrer que le nombre total de nœuds d'un arbre binaire <b>complet</b> de hauteur h est 2<sup>h+1</sup> − 1.`,
          verifier: "complet",
          etapes: [
            "Un arbre binaire complet de hauteur h a tous ses niveaux remplis : le niveau k (k = 0 pour la racine) contient 2<sup>k</sup> nœuds.",
            "<b>Récurrence sur h.</b> h = 0 : un seul nœud, et 2<sup>0+1</sup> − 1 = 1. ✔",
            "Hérédité : un arbre complet de hauteur h + 1 = une racine + deux sous-arbres complets de hauteur h.",
            "Par hypothèse : chacun a 2<sup>h+1</sup> − 1 nœuds. Total : 1 + 2 × (2<sup>h+1</sup> − 1) = 2<sup>h+2</sup> − 1 = 2<sup>(h+1)+1</sup> − 1. ✔",
            "(Autre preuve directe : 1 + 2 + 4 + … + 2<sup>h</sup> = 2<sup>h+1</sup> − 1, somme d'une suite géométrique.)",
          ],
          qcm: { question: "Combien de nœuds a un arbre binaire complet de hauteur 4 ?", choix: ["15", "16", "31", "32"], bonne: 2 },
        },
      ],
    },

    // ------------------------------------------------------------------ ABR
    {
      id: "abr", titre: "Arbres binaires de recherche", icone: "🔍",
      fiche: `
<p>Dans un <b>ABR</b>, pour tout nœud : les valeurs du sous-arbre gauche sont plus petites, celles du sous-arbre droit plus grandes.</p>
<ul>
<li><b>Recherche / insertion</b> : on descend à gauche si x &lt; A->val, à droite sinon : O(h).</li>
<li>Le parcours <b>infixe</b> donne les valeurs dans l'ordre croissant.</li>
<li>Un paramètre <code>var A : Arbre</code> permet de modifier l'arbre de l'appelant (l'adresse est passée).</li>
<li><b>Suppression</b> d'un nœud à 2 fils : on le remplace par le plus grand du sous-arbre gauche (ou le plus petit du sous-arbre droit).</li>
</ul>`,
      demo: `fonction sans retour ajouter_feuille(x : entier; var A : Arbre)
début
    si (A = vide) alors
        new(A);
        A->val ← x;
        A->g ← vide;
        A->d ← vide;
    sinon si (x < A->val) alors
        ajouter_feuille(x, A->g);
    sinon
        ajouter_feuille(x, A->d);
    finsi
fin

début
    Arbre A;
    A ← vide;
    ajouter_feuille(50, A);
    ajouter_feuille(30, A);
    ajouter_feuille(70, A);
    ajouter_feuille(20, A);
    ajouter_feuille(40, A);
    ajouter_feuille(80, A);
fin`,
      exercices: [
        {
          id: "R1", titre: "Recherche dans un ABR", fonction: "recherche",
          enonce: `Écrire <code>recherche(Arbre A, entier x)</code> qui retourne vrai si x est dans l'ABR A, en ne descendant que dans le bon sous-arbre.`,
          depart: `fonction avec retour booleen recherche(Arbre A, entier x)
début

fin`,
          tests: [{ args: [["abr", [50, 30, 70, 20, 40, 60, 80]], 60], attendu: true }, { args: [["abr", [50, 30, 70, 20, 40, 60, 80]], 65], attendu: false }, { args: [["arbre", null], 1], attendu: false }],
          check: "valeur",
          indices: ["Si A est vide : faux. Si A->val = x : vrai.", "Sinon on ne cherche que d'un côté : à gauche si x < A->val.", "retourner recherche(A->g, x); ou recherche(A->d, x);"],
          correction: `fonction avec retour booleen recherche(Arbre A, entier x)
début
    si (A = vide) alors
        retourner faux;
    sinon si (A->val = x) alors
        retourner vrai;
    sinon si (x < A->val) alors
        retourner recherche(A->g, x);
    sinon
        retourner recherche(A->d, x);
    finsi
fin`,
          complexite: cx("O(log n)", "On descend d'un niveau à chaque appel : O(h), soit O(log n) si l'arbre est équilibré (O(n) dans le pire cas d'un arbre filiforme)."),
        },
        {
          id: "R2", titre: "Insertion d'une feuille", fonction: "ajouter_feuille",
          enonce: `Écrire la fonction sans retour <code>ajouter_feuille(x : entier; var A : Arbre)</code> qui insère x comme nouvelle feuille de l'ABR A (les valeurs égales vont à droite).`,
          depart: `fonction sans retour ajouter_feuille(x : entier; var A : Arbre)
début

fin`,
          tests: [
            { args: [35, ["abr", [50, 30, 70]]], attendu: [50, [30, null, [35, null, null]], [70, null, null]] },
            { args: [10, ["arbre", null]], attendu: [10, null, null] }, { args: [90, ["abr", [50, 30, 70]]], attendu: [50, [30, null, null], [70, null, [90, null, null]]] },
          ],
          check: "arbre", apres: 1, contraintes: { recursif: true },
          indices: ["Si A est vide : on crée le nœud ici (new(A)), c'est le var qui le rattache à l'arbre de l'appelant.", "Sinon on descend du bon côté : ajouter_feuille(x, A->g) ou ajouter_feuille(x, A->d).", "Pense à mettre A->g ← vide; A->d ← vide; pour la nouvelle feuille."],
          correction: `fonction sans retour ajouter_feuille(x : entier; var A : Arbre)
début
    si (A = vide) alors
        new(A);
        A->val ← x;
        A->g ← vide;
        A->d ← vide;
    sinon si (x < A->val) alors
        ajouter_feuille(x, A->g);
    sinon
        ajouter_feuille(x, A->d);
    finsi
fin`,
          complexite: cx("O(log n)", "O(h) : un appel par niveau descendu (O(n) si l'arbre est filiforme)."),
        },
        {
          id: "R3", titre: "Afficher en ordre décroissant", fonction: "decroissant", source: ["Examen 2023 (session 2) · Ex. 3", "Examen 2024 · Ex. 4"],
          enonce: `Écrire un algorithme <b>récursif</b> qui affiche le contenu des nœuds d'un arbre binaire de recherche en <b>ordre décroissant</b>. Complexité ?`,
          depart: `fonction sans retour decroissant(Arbre A)
début

fin`,
          tests: [{ args: [["abr", [50, 30, 70, 20, 40, 60, 80]]], attendu: "80 70 60 50 40 30 20" }, { args: [["arbre", null]], attendu: "" }, { args: [["abr", [5, 9, 7]]], attendu: "9 7 5" }],
          check: "sortie", contraintes: { recursif: true },
          indices: ["Le parcours infixe (gauche, racine, droit) donne l'ordre croissant.", "Pour l'ordre décroissant, on fait l'infixe « à l'envers » : droit, racine, gauche.", "decroissant(A->d); écrire(A->val); decroissant(A->g);"],
          correction: `fonction sans retour decroissant(Arbre A)
début
    si (A ≠ vide) alors
        decroissant(A->d);
        écrire(A->val);
        decroissant(A->g);
    finsi
fin`,
          complexite: cx("O(n)", "Chaque nœud est affiché une fois."),
        },
        {
          id: "R4", titre: "Minimum d'un ABR", fonction: "minimum",
          enonce: `Écrire <code>minimum(Arbre A)</code> qui retourne la plus petite valeur d'un ABR <b>non vide</b>.`,
          depart: `fonction avec retour entier minimum(Arbre A)
début

fin`,
          tests: [{ args: [["abr", [50, 30, 70, 20, 40]]], attendu: 20 }, { args: [["abr", [5]]], attendu: 5 }, { args: [["abr", [5, 9, 7]]], attendu: 5 }],
          check: "valeur",
          indices: ["Le minimum est le nœud le plus à gauche.", "tant que (A->g ≠ vide) faire A ← A->g; fintantque", "retourner A->val;"],
          correction: `fonction avec retour entier minimum(Arbre A)
début
    tant que (A->g ≠ vide) faire
        A ← A->g;
    fintantque
    retourner A->val;
fin`,
          recursive: `fonction avec retour entier minimum(Arbre A)
début
    si (A->g = vide) alors
        retourner A->val;
    finsi
    retourner minimum(A->g);
fin`,
          complexite: cx("O(log n)", "On descend toujours à gauche : O(h)."),
        },
        {
          id: "R5", titre: "Suppression dans un ABR", fonction: "supprimer_abr", source: ["Contrôle 2020 · Ex. 4", "Examen 2022 · Ex. 5", "Examen 2023 · Ex. 3", "Examen 2024 · Ex. 3"],
          enonce: `Écrire l'algorithme de <b>suppression</b> d'une valeur x dans un arbre binaire de recherche. Il retourne le nouvel arbre. Complexité ?<br><small>Nœud à deux fils : on le remplace par le plus grand du sous-arbre gauche (ou, au choix, le plus petit du sous-arbre droit : les deux conventions sont acceptées).</small>`,
          depart: `fonction avec retour Arbre supprimer_abr(Arbre A, entier x)
début
    Arbre m;

fin`,
          tests: [
            { args: [["abr", [50, 30, 70, 20, 40, 60, 80]], 20], attendu: [50, [30, null, [40, null, null]], [70, [60, null, null], [80, null, null]]] },
            { args: [["abr", [50, 30, 70, 60]], 70], attendu: [50, [30, null, null], [60, null, null]] },
            { args: [["abr", [50, 30, 70, 20, 40, 60, 80]], 50], attendu: [40, [30, [20, null, null], null], [70, [60, null, null], [80, null, null]]], alt: [60, [30, [20, null, null], [40, null, null]], [70, null, [80, null, null]]] },
            { args: [["abr", [50, 30]], 99], attendu: [50, [30, null, null], null] }, { args: [["abr", [5]], 5], attendu: null },
          ],
          check: "arbre", contraintes: { recursif: true },
          indices: ["Cherche x récursivement : A->g ← supprimer_abr(A->g, x) ou A->d ← supprimer_abr(A->d, x).", "Quand A->val = x : s'il a au plus un fils, on retourne ce fils (ou vide).", "Avec deux fils : m ← le plus à droite de A->g ; A->val ← m->val ; puis A->g ← supprimer_abr(A->g, m->val)."],
          correction: `fonction avec retour Arbre supprimer_abr(Arbre A, entier x)
début
    Arbre m;
    si (A = vide) alors
        retourner vide;
    finsi
    si (x < A->val) alors
        A->g ← supprimer_abr(A->g, x);
    sinon si (x > A->val) alors
        A->d ← supprimer_abr(A->d, x);
    sinon si (A->g = vide) alors
        retourner A->d;
    sinon si (A->d = vide) alors
        retourner A->g;
    sinon
        m ← A->g;
        tant que (m->d ≠ vide) faire
            m ← m->d;
        fintantque
        A->val ← m->val;
        A->g ← supprimer_abr(A->g, m->val);
    finsi
    retourner A;
fin`,
          complexite: cx("O(log n)", "O(h) : on descend pour trouver x, puis éventuellement jusqu'au maximum du sous-arbre gauche."),
        },
      ],
    },

    // ------------------------------------------------------------------ AVL
    {
      id: "avl", titre: "Arbres AVL et rotations", icone: "⚖️",
      fiche: `
<p>Un <b>AVL</b> est un ABR où, pour chaque nœud, les hauteurs des deux sous-arbres diffèrent d'au plus 1 (équilibre = h(droit) − h(gauche) ∈ {−1, 0, 1}).</p>
<ul>
<li>Après un ajout ou une suppression, on remonte vers la racine ; au premier nœud déséquilibré (±2) on fait une <b>rotation</b>.</li>
<li>Déséquilibre à gauche (−2) : rotation <b>droite</b> ; si le fils gauche penche à droite : rotation <b>gauche-droite</b> (double).</li>
<li>Déséquilibre à droite (+2) : rotation <b>gauche</b> ; si le fils droit penche à gauche : rotation <b>droite-gauche</b>.</li>
<li>Une rotation se fait <b>sans créer de nœud</b>, en changeant 2 pointeurs : O(1).</li>
</ul>
<pre>Rotation droite de A :      A               B
                           / \\             / \\
                          B   C    →      D   A
                         / \\                 / \\
                        D   E               E   C</pre>`,
      demo: `fonction avec retour Arbre rotation_droite(Arbre A)
début
    Arbre B;
    B ← A->g;
    A->g ← B->d;
    B->d ← A;
    retourner B;
fin

début
    Arbre A, B;
    new(A); A->val ← 30;
    new(A->g); A->g->val ← 20;
    new(A->g->g); A->g->g->val ← 10;
    A ← rotation_droite(A);
fin`,
      exercices: [
        {
          id: "V1", titre: "Rotation droite", fonction: "rotation_droite", source: ["Contrôle 2020 · Ex. 5", "Examen 2022 · Ex. 6", "Examen 2024 · Ex. 5"],
          enonce: `Écrire l'algorithme de la <b>rotation droite</b> d'un arbre A (dont le fils gauche n'est pas vide), <b>sans ajouter de nouveaux nœuds</b>. La fonction retourne la nouvelle racine. Complexité ?`,
          depart: `fonction avec retour Arbre rotation_droite(Arbre A)
début
    Arbre B;

fin`,
          tests: [
            { args: [["arbre", [5, [3, [1], [4]], [8]]]], attendu: [3, [1, null, null], [5, [4, null, null], [8, null, null]]] },
            { args: [["arbre", [30, [20, [10]]]]], attendu: [20, [10, null, null], [30, null, null]] },
          ],
          check: "arbre", contraintes: { sansNew: true },
          indices: ["La nouvelle racine est B = A->g.", "Le sous-arbre droit de B change de parent : il devient le fils gauche de A.", "B ← A->g; A->g ← B->d; B->d ← A; retourner B;"],
          correction: `fonction avec retour Arbre rotation_droite(Arbre A)
début
    Arbre B;
    B ← A->g;
    A->g ← B->d;
    B->d ← A;
    retourner B;
fin`,
          complexite: cx("O(1)", "Trois affectations de pointeurs, quelle que soit la taille de l'arbre."),
        },
        {
          id: "V2", titre: "Rotation gauche", fonction: "rotation_gauche", source: ["Examen 2017 · Ex. 6"],
          enonce: `Écrire l'algorithme de la <b>rotation gauche</b> dans un AVL (le fils droit de A n'est pas vide). Complexité ?`,
          depart: `fonction avec retour Arbre rotation_gauche(Arbre A)
début
    Arbre B;

fin`,
          tests: [
            { args: [["arbre", [3, [1], [5, [4], [8]]]]], attendu: [5, [3, [1, null, null], [4, null, null]], [8, null, null]] },
            { args: [["arbre", [10, null, [20, null, [30]]]]], attendu: [20, [10, null, null], [30, null, null]] },
          ],
          check: "arbre", contraintes: { sansNew: true },
          indices: ["C'est le symétrique de la rotation droite.", "B ← A->d; le sous-arbre gauche de B devient le fils droit de A.", "B ← A->d; A->d ← B->g; B->g ← A; retourner B;"],
          correction: `fonction avec retour Arbre rotation_gauche(Arbre A)
début
    Arbre B;
    B ← A->d;
    A->d ← B->g;
    B->g ← A;
    retourner B;
fin`,
          complexite: cx("O(1)", "Trois affectations de pointeurs."),
        },
        {
          id: "V3", type: "atelier", atelier: "avl", titre: "Construire un AVL puis supprimer", source: ["Examen 2017 · Ex. 5", "Contrôle 2020 · Ex. 3", "Examen 2022 · Ex. 4", "Examen 2024 · Ex. 4"],
          enonce: `Construire un arbre AVL par ajouts successifs (aux feuilles) des éléments de cette liste : <b>25, 60, 35, 10, 5, 20, 65, 45, 70, 40, 50, 55, 30, 15</b>. Ensuite, retirez 25 puis 30 puis 35. Vous devez détailler chaque étape.`,
          cles: [25, 60, 35, 10, 5, 20, 65, 45, 70, 40, 50, 55, 30, 15], suppressions: [25, 30, 35],
        },
      ],
    },

    // ------------------------------------------------------------------ Fibonacci
    {
      id: "fibo", titre: "Arbres de Fibonacci", icone: "🌀",
      fiche: `
<p>On définit la suite d'arbres de Fibonacci par récurrence :</p>
<ul><li>A<sub>0</sub> = arbre vide ; A<sub>1</sub> est réduit à un seul nœud ;</li>
<li>pour n ≥ 2, A<sub>n</sub> est l'arbre binaire dont le sous-arbre gauche est A<sub>n−1</sub> et le sous-arbre droit A<sub>n−2</sub>.</li></ul>
<p>Rappel : F<sub>0</sub> = 0, F<sub>1</sub> = 1 et F<sub>n</sub> = F<sub>n−1</sub> + F<sub>n−2</sub>.</p>`,
      demo: `fonction avec retour Arbre fibo(entier n)
début
    Arbre A;
    si (n = 0) alors
        retourner vide;
    finsi
    new(A);
    A->val ← n;
    si (n = 1) alors
        A->g ← vide;
        A->d ← vide;
    sinon
        A->g ← fibo(n - 1);
        A->d ← fibo(n - 2);
    finsi
    retourner A;
fin

début
    Arbre A;
    A ← fibo(4);
fin`,
      exercices: [
        {
          id: "Fi1", titre: "Construire un arbre de Fibonacci", fonction: "fibo", source: ["Examen 2017 · Ex. 7", "Contrôle 2020 · Ex. 6", "Examen 2023 (session 2) · Ex. 4"],
          enonce: `Écrire l'algorithme de construction d'un arbre de Fibonacci A<sub>n</sub>. Complexité ?<br><small>Chaque nœud porte comme valeur l'indice n de l'arbre dont il est la racine (la racine de A<sub>3</sub> vaut 3, etc.).</small>`,
          depart: `fonction avec retour Arbre fibo(entier n)
début
    Arbre A;

fin`,
          tests: [
            { args: [0], attendu: null }, { args: [1], attendu: [1, null, null] }, { args: [2], attendu: [2, [1, null, null], null] },
            { args: [3], attendu: [3, [2, [1, null, null], null], [1, null, null]] },
            { args: [4], attendu: [4, [3, [2, [1, null, null], null], [1, null, null]], [2, [1, null, null], null]] },
          ],
          check: "arbre", contraintes: { recursif: true },
          indices: ["Deux cas de base : n = 0 (retourner vide) et n = 1 (un nœud sans fils).", "Pour n ≥ 2 : new(A); A->val ← n; puis les deux sous-arbres sont construits récursivement.", "A->g ← fibo(n - 1); A->d ← fibo(n - 2);"],
          correction: `fonction avec retour Arbre fibo(entier n)
début
    Arbre A;
    si (n = 0) alors
        retourner vide;
    finsi
    new(A);
    A->val ← n;
    si (n = 1) alors
        A->g ← vide;
        A->d ← vide;
    sinon
        A->g ← fibo(n - 1);
        A->d ← fibo(n - 2);
    finsi
    retourner A;
fin`,
          complexite: cx("O(2ⁿ)", "On crée un nœud par appel, et Aₙ a Fₙ₊₂ − 1 nœuds : la complexité est proportionnelle à Fₙ, donc exponentielle (≈ 1,618ⁿ)."),
        },
        {
          id: "Fi2", type: "preuve", titre: "Hauteur et nombre de nœuds de Aₙ", source: ["Contrôle 2020 · Ex. 6", "Examen 2023 (session 2) · Ex. 4"],
          enonce: `1. Construire A<sub>2</sub>, A<sub>3</sub>, A<sub>4</sub>, A<sub>5</sub>. 2. Montrer que les arbres de Fibonacci sont H-équilibrés. 3. Exprimer la hauteur h<sub>n</sub> et le nombre de nœuds N<sub>n</sub> de A<sub>n</sub> à l'aide des nombres de Fibonacci F<sub>n</sub>.`,
          verifier: "fibo",
          etapes: [
            "Utilise l'exercice précédent et le bouton « Voir A<sub>n</sub> » pour construire A<sub>2</sub> à A<sub>5</sub>.",
            "<b>Hauteur</b> (feuille = 0, vide = −1) : h<sub>1</sub> = 0, h<sub>2</sub> = 1, et h<sub>n</sub> = 1 + max(h<sub>n−1</sub>, h<sub>n−2</sub>) = 1 + h<sub>n−1</sub>. Donc <b>h<sub>n</sub> = n − 1</b> pour n ≥ 1.",
            "<b>H-équilibre</b> : à la racine de A<sub>n</sub>, h(gauche) − h(droit) = h<sub>n−1</sub> − h<sub>n−2</sub> = (n − 2) − (n − 3) = 1 (pour n = 2 : 0 − (−1) = 1). Et chaque sous-arbre est lui-même un arbre de Fibonacci, donc équilibré par récurrence. ✔",
            "<b>Nœuds</b> : N<sub>0</sub> = 0, N<sub>1</sub> = 1 et N<sub>n</sub> = 1 + N<sub>n−1</sub> + N<sub>n−2</sub>.",
            "Posons M<sub>n</sub> = N<sub>n</sub> + 1 : M<sub>n</sub> = M<sub>n−1</sub> + M<sub>n−2</sub>, avec M<sub>0</sub> = 1 = F<sub>2</sub> et M<sub>1</sub> = 2 = F<sub>3</sub>. Donc M<sub>n</sub> = F<sub>n+2</sub>, et <b>N<sub>n</sub> = F<sub>n+2</sub> − 1</b>.",
          ],
          qcm: { question: "Combien de nœuds a A₆ ?", choix: ["13", "20", "21", "12"], bonne: 1 },
        },
      ],
    },

    // ------------------------------------------------------------------ Hachage
    {
      id: "hachage", titre: "Tables de hachage", icone: "#️⃣",
      fiche: `
<p>Une fonction de hachage h associe à chaque clé k une case h(k) d'un tableau de taille m (ici h(k) = k mod m, donc m cases numérotées 0 à m − 1).</p>
<ul>
<li><b>Collision</b> : deux clés ont la même case.</li>
<li><b>Chaînage</b> : chaque case contient une liste chaînée des clés qui y tombent.</li>
<li><b>Coalescence (lien explicite)</b> : les clés sont rangées dans le tableau lui-même ; une clé en collision va dans une case libre (prise dans la structure <i>Disponible</i>) et on la relie à la fin de la chaîne par un lien.</li>
<li><b>Coût moyen d'une recherche fructueuse</b> = moyenne, sur toutes les clés présentes, du nombre de comparaisons pour les trouver.</li>
</ul>`,
      exercices: [
        {
          id: "H1", type: "atelier", atelier: "chainage", titre: "Hachage par chaînage", source: ["Examen 2023 · Ex. 5", "Examen 2024 · Ex. 6"],
          enonce: `On considère la fonction de hachage h(k) = k mod 9 et une résolution des collisions par chaînage. 1) Quelle doit être la taille de la table ? 2) On insère successivement les clés {5, 28, 19, 15, 20, 33, 12, 17}. Représentez l'état de la table. 3) Calculez le coût moyen d'une recherche fructueuse.`,
          m: 9, cles: [5, 28, 19, 15, 20, 33, 12, 17],
        },
        {
          id: "H2", type: "atelier", atelier: "coalescence", titre: "Hachage par coalescence (lien explicite)", source: ["Examen 2022 · Ex. 7", "Examen 2023 (session 2) · Ex. 5", "Examen 2024 · Ex. 6"],
          enonce: `On étudie la suppression dans une table de hachage avec résolution des collisions par coalescence (lien explicite). h(k) = k mod 7. Une structure <i>Disponible</i> de type FIFO contient les cases disponibles pour gérer les collisions. a) Donnez l'état de la table après l'insertion des clés {11, 10, 4, 25, 18} si <i>Disponible</i> contient {4, 3, 2, 6, 5}. b) Rappelez la méthode de suppression d'un élément au milieu d'une liste chaînée. c) Donnez l'état de la table après la suppression de la clé 4.<br><small>Convention retenue : une clé dont la case h(k) est libre y est rangée (et la case quitte <i>Disponible</i>) ; sinon elle va dans la première case de <i>Disponible</i>, reliée à la fin de la chaîne partant de h(k).</small>`,
          m: 7, cles: [11, 10, 4, 25, 18], disponible: [4, 3, 2, 6, 5], supprimer: 4,
        },
      ],
    },
  ];

  // Annales : chaque exercice d'examen renvoie vers l'exercice interactif correspondant.
  const annales = [
    { id: "2017", titre: "Examen du 22/02/2017", annee: "2016-2017", items: [["Ex. 1", "L9"], ["Ex. 2", "P5"], ["Ex. 3", "L7"], ["Ex. 4", "L11"], ["Ex. 5", "V3"], ["Ex. 6", "V2"], ["Ex. 7", "Fi1"]] },
    { id: "2020", titre: "Contrôle du 08/01/2020", annee: "2019-2020", items: [["Ex. 1", "P5"], ["Ex. 2", "L7"], ["Ex. 3", "V3"], ["Ex. 4", "R5"], ["Ex. 5", "V1"], ["Ex. 6", "Fi1"], ["Ex. 6 (suite)", "Fi2"]] },
    { id: "2022", titre: "Examen du 06/01/2022", annee: "2021-2022", items: [["Ex. 1", "P5"], ["Ex. 2", "L7"], ["Ex. 3", "A8"], ["Ex. 4", "V3"], ["Ex. 5", "R5"], ["Ex. 6", "V1"], ["Ex. 7", "H2"]] },
    { id: "2023a", titre: "Examen du 05/01/2023", annee: "2022-2023", items: [["Ex. 1", "L10"], ["Ex. 2", "F2"], ["Ex. 3", "R5"], ["Ex. 4", "A7"], ["Ex. 5", "H1"]] },
    { id: "2023b", titre: "Examen 2022-2023 (session 2)", annee: "2022-2023", items: [["Ex. 1", "L13"], ["Ex. 2a", "P2"], ["Ex. 2b", "P3"], ["Ex. 3", "R3"], ["Ex. 4", "Fi1"], ["Ex. 4 (suite)", "Fi2"], ["Ex. 5", "H2"]] },
    { id: "2024a", titre: "Examen 2023-2024 (sujet A)", annee: "2023-2024", items: [["Ex. 1", "L10"], ["Ex. 2", "F2"], ["Ex. 3", "R5"], ["Ex. 4", "V3"], ["Ex. 5", "V1"], ["Ex. 6", "H2"]] },
    { id: "2024b", titre: "Examen 2023-2024 (sujet B)", annee: "2023-2024", items: [["Ex. 1", "L10"], ["Ex. 2", "L11"], ["Ex. 3", "F2"], ["Ex. 4", "R3"], ["Ex. 5", "A7"], ["Ex. 6", "H1"]] },
    { id: "ctrl1", titre: "Contrôle n°1", annee: "Structures de données fondamentales", items: [["Ex. 1", "L12"], ["Ex. 2", "L10"], ["Ex. 4", "P4"], ["Ex. 5", "F2"], ["Ex. 6", "P2"]] },
  ];

  const byId = {};
  chapters.forEach((ch) => ch.exercices.forEach((ex) => { ex.chapitre = ch.id; byId[ex.id] = ex; }));

  const api = { chapters, annales, byId, COMPLEXITES: C };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Contenu = api;
})(typeof window !== "undefined" ? window : globalThis);

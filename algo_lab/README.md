# Algo Lab

Site statique (sans IA ni serveur) pour maîtriser le cours « Structures de données fondamentales » : pseudo-code du cours, blocs, exécution pas à pas, exercices et annales corrigés automatiquement.

## Lancer

```bash
python -m http.server 8090 --directory algo_lab
```

Puis ouvrir http://localhost:8090. Il faut une connexion pour CodeMirror et Blockly (CDN).

## Vérifier le contenu

```bash
node algo_lab/test/check.js
```

Chaque correction doit passer ses tests et ses contraintes, et chaque code de départ doit échouer.

## Fichiers

- `js/lang.js` : lexer, parser et interpréteur du pseudo-code (avec la trace pour le pas à pas).
- `js/tests.js` : exécution des tests d'un exercice et contraintes (récursif, sans pile, une seule variable…).
- `js/content.js` : chapitres, fiches, exercices, corrections, annales.
- `js/blocks.js` : blocs Blockly dont le texte est la syntaxe du cours.
- `js/viz.js` : dessin des variables, listes, arbres, piles et files.
- `js/ateliers.js` : AVL, hachage par chaînage et par coalescence, vérifications des preuves.
- `js/app.js` : pages et navigation.

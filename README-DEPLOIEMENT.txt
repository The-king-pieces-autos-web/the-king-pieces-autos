THE KING PIECES AUTOS - VERSION VIERGE PRETE POUR MISE EN LIGNE

1) TEST LOCAL
- Ouvrir le dossier du projet dans CMD
- Lancer :
  npm install --registry=https://registry.npmjs.org/
  npm run dev

2) GITHUB
- Creer un nouveau depot vide sur GitHub
- Dans CMD :
  git init
  git add .
  git commit -m "Version vierge prete pour mise en ligne"
  git branch -M main
  git remote add origin TON_LIEN_GITHUB
  git push -u origin main

3) RENDER
- Connecter le depot GitHub a Render
- Choisir l'option Static Site
- Render lira automatiquement le fichier render.yaml
- Le build utilise : npm install && npm run build
- Le dossier publie est : dist

4) IMPORTANT
- Cette version est vide en donnees et prete a commencer le vrai travail
- Le stockage reste local tant que Supabase n'est pas reconnecte
- Le devis ne doit jamais modifier le stock

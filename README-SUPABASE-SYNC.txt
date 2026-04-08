THE KING PIÈCES AUTOS — SYNCHRO MULTI-POSTES

1) Dans Supabase > SQL Editor, exécute le fichier SUPABASE_APP_STATE.sql.
2) Vérifie dans Render que les variables existent :
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
3) Redéploie Render.
4) Ouvre le site sur un poste principal, fais une modification, attends 2 à 3 secondes.
5) Ouvre le site sur un autre poste et fais Ctrl+F5 : les données doivent remonter.

Ce système garde le localStorage en cache local mais la source commune devient Supabase via la table app_state.
La synchronisation est envoyée immédiatement à chaque modification puis relue automatiquement toutes les 2 secondes.

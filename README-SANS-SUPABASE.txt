VERSION SANS SUPABASE

Cette version a été modifiée pour fonctionner uniquement en localStorage.
Tout ce qui concernait le chargement/sauvegarde Supabase a été retiré du hook principal.

Lancer :
npm install
npm run dev

Important :
- Pas besoin de fichier .env
- Les données sont gardées localement dans le navigateur
- Pour tester si le bug venait de Supabase, utilise cette version
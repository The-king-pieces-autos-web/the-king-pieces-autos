import "./styles.css";
import { useEffect, useMemo, useState } from "react";
import logo from "./assets/logo.png";
import loginBg from "./assets/dashboard-hero.jpeg";
import { supabase, loadAppState, saveAppState } from "./lib/supabase";

const DEFAULT_USERS = [
  { id: 1, login: "admin", password: "admin123", name: "Administrateur", role: "Admin" },
];

const ENTREPRISE = {
  nom: "THE KING PIECES AUTOS",
  adresse: "32 avenue Marcel Cachin, 93240 Stains",
  email: "thekingpiecesautos@gmail.com",
  telephone: "0184741500",
  whatsapp: "+33650058945",
  tva: "FR80977631530",
};

const CATALOGUE = {
  Freinage: ["Disques de frein", "Plaquettes de frein", "Mâchoires de frein", "Tambours", "Étriers", "Flexibles de frein", "Maître-cylindre", "Cylindres de roue", "Servo-frein", "Capteurs ABS", "Câbles frein à main", "Liquide de frein"],
  Filtration: ["Filtre à huile", "Filtre à air", "Filtre carburant", "Filtre habitacle", "Décanteur gasoil", "Support filtre"],
  "Distribution / Kit chaîne": ["Kit distribution", "Courroie distribution", "Galet tendeur", "Galet enrouleur", "Pompe à eau", "Kit chaîne", "Chaîne distribution", "Guide chaîne", "Tendeur chaîne", "Pignon distribution"],
  "Embrayage / Transmission": ["Kit embrayage", "Kit embrayage + volant moteur", "Disque embrayage", "Mécanisme embrayage", "Butée embrayage", "Butée hydraulique", "Guide butée", "Fourchette embrayage", "Volant moteur", "Émetteur embrayage", "Récepteur embrayage", "Câble embrayage", "Tringlerie / câble vitesse", "Câble accélérateur", "Cardans", "Soufflets cardan", "Joints transmission", "Huile boîte"],
  "Moteur / Haut moteur": ["Culasse", "Fausse culasse / couvre culasse", "Arbre à cames", "Poussoirs", "Soupapes", "Culbuteurs", "Joint de culasse", "Pochette joints", "Segments", "Pistons", "Bielles", "Coussinets", "Pompe à huile", "Carter huile"],
  Refroidissement: ["Radiateur", "Pompe à eau", "Thermostat", "Boîtier thermostat", "Durite eau", "Durite chauffage", "Ventilateur", "Vase expansion", "Bouchon radiateur", "Liquide refroidissement"],
  "Supports moteur / boîte": ["Support moteur droit", "Support moteur gauche", "Support anti-couple", "Silent bloc moteur", "Support boîte", "Silent bloc boîte", "Support échappement"],
  "Injection / Carburant": ["Injecteurs", "Pompe injection", "Pompe carburant", "Rampe injection", "Régulateur pression", "Corps papillon", "Capteur pédale accélérateur"],
  "Allumage / Préchauffage": ["Bougies allumage", "Bobines allumage", "Faisceaux allumage", "Bougies préchauffage", "Relais préchauffage", "Boîtier préchauffage", "Alternateur", "Démarreur", "Batterie"],
  "Suspension / Direction": ["Amortisseurs", "Coupelles amortisseur", "Ressorts", "Rotules direction", "Rotules suspension", "Biellettes direction", "Biellettes barre stabilisatrice", "Bras suspension", "Triangles", "Silent blocs", "Crémaillère", "Roulements roue", "Moyeux"],
  Échappement: ["Silencieux", "Catalyseur", "FAP", "Flexible échappement", "Collier échappement", "Support échappement", "Sonde lambda"],
  "Carrosserie / Éclairage": ["Phares", "Feux arrière", "Clignotants", "Rétroviseurs", "Pare-chocs", "Ailes", "Calandre", "Lève-vitres", "Serrures"],
  "Entretien / Fluides": ["Huile moteur", "Huile boîte", "Liquide de frein", "Liquide refroidissement", "Additifs", "Nettoyant injecteurs", "Graisse"],
  "Capteurs / Électronique": ["Capteur PMH", "Capteur AAC", "Débitmètre", "Sonde lambda", "Capteur température", "Capteur pression huile", "Capteur pression turbo", "Capteur MAP", "Capteur ABS", "Relais", "Fusibles", "Comodos"],
};

const FAMILY_CATALOG = [
  { label: "Freinage", aliases: ["freinage"], sousFamilles: CATALOGUE["Freinage"] },
  { label: "Filtration", aliases: ["filtration"], sousFamilles: CATALOGUE["Filtration"] },
  {
    label: "Distribution / Kit chaîne",
    aliases: [
      "distribution kit chaine",
      "distribution kit chaîne",
      "distribution / kit chaine",
      "distribution / kit chaîne",
      "distribution-kit-chaine",
      "distribution-kit-chaîne",
    ],
    sousFamilles: ["Kit distribution", "Courroie distribution", "Galet tendeur", "Galet enrouleur", "Pompe à eau", "Kit chaîne", "Chaîne distribution", "Guide chaîne", "Tendeur chaîne", "Pignon distribution"],
  },
  { label: "Embrayage / Transmission", aliases: ["embrayage transmission", "embrayage / transmission"], sousFamilles: CATALOGUE["Embrayage / Transmission"] },
  { label: "Moteur / Haut moteur", aliases: ["moteur haut moteur", "moteur / haut moteur"], sousFamilles: CATALOGUE["Moteur / Haut moteur"] },
  { label: "Refroidissement", aliases: ["refroidissement"], sousFamilles: CATALOGUE.Refroidissement },
  { label: "Supports moteur / boîte", aliases: ["supports moteur boite", "supports moteur / boite", "supports moteur / boîte"], sousFamilles: CATALOGUE["Supports moteur / boîte"] },
  {
    label: "Injection / Carburation",
    aliases: [
      "injection carburant",
      "injection / carburant",
      "injection carburation",
      "injection / carburation",
      "injection / carburant / carburation",
    ],
    sousFamilles: ["Injecteurs", "Pompe injection", "Pompe carburant", "Rampe injection", "Régulateur pression", "Corps papillon", "Capteur pédale accélérateur"],
  },
  { label: "Allumage / Préchauffage", aliases: ["allumage prechauffage", "allumage préchauffage", "allumage / préchauffage"], sousFamilles: CATALOGUE["Allumage / Préchauffage"] },
  { label: "Suspension / Direction", aliases: ["suspension direction", "suspension / direction"], sousFamilles: CATALOGUE["Suspension / Direction"] },
  { label: "Échappement", aliases: ["echappement", "échappement"], sousFamilles: CATALOGUE["Échappement"] },
  { label: "Carrosserie / Éclairage", aliases: ["carrosserie eclairage", "carrosserie éclairage", "carrosserie / éclairage"], sousFamilles: CATALOGUE["Carrosserie / Éclairage"] },
  { label: "Entretien / Fluides", aliases: ["entretien fluides", "entretien / fluides"], sousFamilles: CATALOGUE["Entretien / Fluides"] },
  { label: "Capteurs / Électronique", aliases: ["capteurs electronique", "capteurs électronique", "capteurs / électronique"], sousFamilles: CATALOGUE["Capteurs / Électronique"] },
];

function normalizeTextKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findFamilyConfig(value) {
  const key = normalizeTextKey(value);
  return FAMILY_CATALOG.find((family) => {
    if (normalizeTextKey(family.label) === key) return true;
    return (family.aliases || []).some((alias) => normalizeTextKey(alias) === key);
  });
}

const FAMILLE_LABELS = Object.keys(CATALOGUE);

function cleanFamilyText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeFamilleName(value) {
  const cleaned = cleanFamilyText(value);

  if (
    cleaned === "distribution / kit chaine" ||
    cleaned === "distribution/kit chaine" ||
    cleaned === "distribution kit chaine" ||
    (cleaned.includes("distribution") && cleaned.includes("kit") && cleaned.includes("chaine"))
  ) {
    return "Distribution / Kit chaîne";
  }

  if (
    cleaned === "injection / carburation" ||
    cleaned === "injection/carburation" ||
    cleaned === "injection carburation" ||
    cleaned === "injection / carburant" ||
    cleaned === "injection/carburant" ||
    cleaned === "injection carburant" ||
    (cleaned.includes("injection") && (cleaned.includes("carburant") || cleaned.includes("carburation")))
  ) {
    return "Injection / Carburant";
  }

  const found = FAMILLE_LABELS.find((label) => cleanFamilyText(label) === cleaned);
  return found || value || "";
}

function getSousFamillesByFamille(value) {
  const normalized = normalizeFamilleName(value);
  return CATALOGUE[normalized] || [];
}

const MODULES = ["Stock", "Stock à commander", "Devis", "Clients", "Utilisateurs", "Historique"];

export default function App() {
  const [connected, setConnected] = useState(() => {
    return localStorage.getItem("king_current_user") ? true : false;
  });
  const [appLoaded, setAppLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("king_current_user");
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("king_current_user");
      return null;
    }
  });
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("admin123");

  const [moduleActif, setModuleActif] = useState("Stock");
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [pieces, setPieces] = useState([]);
  const [history, setHistory] = useState([]);
  const [manualOrders, setManualOrders] = useState([]);
  const [orderedAutoIds, setOrderedAutoIds] = useState([]);
  const [orderArchives, setOrderArchives] = useState([]);
  const [devis, setDevis] = useState([]);
  const [clients, setClients] = useState([]);

  const [search, setSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [devisSearch, setDevisSearch] = useState("");
  const [familleActive, setFamilleActive] = useState("");

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingPieceId, setEditingPieceId] = useState(null);
  const [editingOrderArchiveId, setEditingOrderArchiveId] = useState(null);
  const [editingDevisId, setEditingDevisId] = useState(null);
  const [editingDevisLineId, setEditingDevisLineId] = useState(null);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingClientPieceId, setEditingClientPieceId] = useState(null);
  const [editingClientArchiveId, setEditingClientArchiveId] = useState(null);

  const [selectedPiece, setSelectedPiece] = useState(null);
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedClientArchive, setSelectedClientArchive] = useState(null);
  const [clientPrintDate, setClientPrintDate] = useState(new Date().toISOString().slice(0, 10));
  const [clientPrintMonth, setClientPrintMonth] = useState(new Date().toISOString().slice(0, 7));
  const [clientPrintYear, setClientPrintYear] = useState(String(new Date().getFullYear()));
  const [devisStockSearchLineId, setDevisStockSearchLineId] = useState(null);
  const [devisStockSearchText, setDevisStockSearchText] = useState("");
  const [devisSoldSelection, setDevisSoldSelection] = useState({});
  const [devisArchiveDate, setDevisArchiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [devisArchiveMonth, setDevisArchiveMonth] = useState(new Date().toISOString().slice(0, 7));

  const [orderArchivePeriod, setOrderArchivePeriod] = useState({ debut: "", fin: "" });
  const [devisStockSelection, setDevisStockSelection] = useState([]);

  const [selectedClientPieceIds, setSelectedClientPieceIds] = useState([]);
  const [clientPaymentForm, setClientPaymentForm] = useState({
    montant: "",
    mode: "Espèces",
    commentaire: "",
  });

  const [userForm, setUserForm] = useState({ name: "", login: "", password: "", role: "Salarié" });
  const [orderForm, setOrderForm] = useState({ designation: "", reference: "", quantite: "", fournisseur: "", commentaire: "" });

  const [clientForm, setClientForm] = useState({ nom: "", telephone: "", adresse: "" });
  const [clientPieceForm, setClientPieceForm] = useState({
    designation: "",
    reference: "",
    quantite: "1",
    prix: "",
  });

  const [devisForm, setDevisForm] = useState({
    numero: "",
    client: "",
    date: new Date().toISOString().slice(0, 10),
    marque: "",
    modele: "",
    plaque: "",
    vin: "",
    telephone: "",
    origineDemande: "",
    demandeId: "",
    notesInternes: "",
    remiseType: "pourcentage",
    remiseValue: "",
  });

  const [devisLine, setDevisLine] = useState({
    designation: "",
    reference: "",
    quantite: "1",
    prixTTC: "",
    deuxOffres: false,
    fournisseur1: "",
    dateDispo1: "Sur place",
    reference2: "",
    prixTTC2: "",
    fournisseur2: "",
    dateDispo2: "",
    offreChoisie: "offre1",
  });

  const [devisLines, setDevisLines] = useState([]);

  const [form, setForm] = useState({
    designation: "",
    famille: "",
    sousFamille: "",
    refOrigine: "",
    refInterne: "",
    fournisseur: "",
    quantite: "",
    rupture: "1",
    prixPart: "",
    prixPro: "",
    image: "",
  });

  const familles = FAMILY_CATALOG.map((family) => family.label);
  const sousFamillesDisponibles = form.famille ? getSousFamillesByFamille(form.famille) : [];
  const sousFamillesAffichees = familleActive ? getSousFamillesByFamille(familleActive) : [];
  const isAdmin = currentUser?.role === "Admin";
  const visibleModules = isAdmin
    ? MODULES
    : MODULES.filter((module) => module !== "Utilisateurs" && module !== "Historique");

  useEffect(() => {
    if (!isAdmin && (moduleActif === "Utilisateurs" || moduleActif === "Historique")) {
      setModuleActif("Stock");
    }
  }, [isAdmin, moduleActif]);

  function normalizePiece(piece) {
    const normalizedFamille = normalizeFamilleName(piece?.famille || "");
    const sousFamilles = getSousFamillesByFamille(normalizedFamille);
    const sousFamilleExiste = piece?.sousFamille && sousFamilles.includes(piece.sousFamille);

    return {
      ...piece,
      famille: normalizedFamille,
      sousFamille: sousFamilleExiste
        ? piece.sousFamille
        : sousFamilles.length > 0
          ? sousFamilles[0]
          : piece?.sousFamille || "",
      rupture: Number(piece?.rupture ?? 2),
      quantite: Number(piece?.quantite ?? 0),
    };
  }

  function normalizePieces(list) {
    return (list || []).map(normalizePiece);
  }

  function dbStockToAppPiece(row) {
    return normalizePiece({
      id: row.id,
      legacyId: row.legacy_id || "",
      designation: row.designation || "",
      famille: row.famille || "",
      sousFamille: row.sous_famille || "",
      refOrigine: row.ref_origine || "",
      refInterne: row.ref_interne || "",
      fournisseur: row.fournisseur || "",
      quantite: Number(row.quantite || 0),
      rupture: Number(row.stock_minimum ?? 1),
      prixPart: Number(row.prix_part || 0),
      prixPro: Number(row.prix_pro || 0),
      image: row.image_url || "",
      commentaire: row.commentaire || "",
      createdBy: row.created_by || "",
      updatedBy: row.updated_by || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
      sourceDb: "stock_items",
    });
  }

  function appPieceToDbStock(piece) {
    return {
      designation: piece.designation || "",
      famille: piece.famille || "",
      sous_famille: piece.sousFamille || "",
      ref_origine: piece.refOrigine || "",
      ref_interne: piece.refInterne || "",
      fournisseur: piece.fournisseur || "",
      quantite: Number(piece.quantite || 0),
      stock_minimum: Number(piece.rupture ?? 1),
      prix_part: Number(piece.prixPart || 0),
      prix_pro: Number(piece.prixPro || 0),
      image_url: piece.image || "",
      commentaire: piece.commentaire || "",
      updated_by: currentUser?.login || currentUser?.name || "system",
    };
  }

  async function loadStockItemsFromDb(limit = 500) {
    const { data, error } = await supabase
      .from("stock_items")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Chargement stock_items impossible", error);
      return null;
    }

    return normalizePieces((data || []).map(dbStockToAppPiece));
  }

    function dbDevisToApp(row) {
    const lignes = Array.isArray(row.lignes) ? row.lignes : [];

    return {
      id: row.id,
      numero: row.devis_numero || "",
      client: row.client || "",
      telephone: row.telephone || "",
      date: row.date_devis || new Date().toISOString().slice(0, 10),
      marque: row.marque || "",
      modele: row.modele || "",
      plaque: row.plaque || "",
      vin: row.vin || "",
      origineDemande: row.origine_demande || "",
      status: row.statut || "Archivé",
      lignes,
      lignesCompletes: lignes,
      sousTotalHT: Number(row.sous_total_ht || 0),
      sousTotalTTC: Number(row.sous_total_ttc || row.total_ttc || 0),
      remiseHT: Number(row.remise_ht || 0),
      remiseTTC: Number(row.remise_ttc || 0),
      totalHT: Number(row.total_ht || 0),
      tva: Number(row.tva || 0),
      totalTTC: Number(row.total_ttc || 0),
      totalToutesPiecesTTC: Number(row.total_toutes_pieces_ttc || row.total_ttc || 0),
      totalValideClientTTC: Number(row.total_valide_client_ttc || row.total_ttc || 0),
      notesInternes: row.notes_internes || "",
      createdBy: row.created_by || "",
      updatedBy: row.updated_by || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
      sourceDb: "devis",
    };
  }

    function appDevisToDb(devisItem) {
    return {
      id: String(devisItem.id || Date.now()),
      legacy_id: devisItem.legacyId || null,
      devis_numero: devisItem.numero || nextDevisNumero(),
      client: devisItem.client || "",
      telephone: devisItem.telephone || "",
      date_devis: devisItem.date || new Date().toISOString().slice(0, 10),
      marque: devisItem.marque || "",
      modele: devisItem.modele || "",
      plaque: devisItem.plaque || "",
      vin: devisItem.vin || "",
      origine_demande: devisItem.origineDemande || "",
      lignes: devisItem.lignes || [],
      total_ttc: Number(devisItem.totalTTC || 0),
      total_toutes_pieces_ttc: Number(devisItem.totalToutesPiecesTTC || devisItem.totalTTC || 0),
      total_valide_client_ttc: Number(devisItem.totalValideClientTTC || devisItem.totalTTC || 0),
      statut: devisItem.status || "Archivé",
      created_by: devisItem.createdBy || currentUser?.name || "",
      updated_by: currentUser?.name || currentUser?.login || "system",
      created_at: devisItem.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    };
  }

    async function loadDevisFromDb(limit = 150) {
    const { data, error } = await supabase
      .from("devis")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Chargement devis impossible", error);
      return null;
    }

    return (data || []).map(dbDevisToApp);
  }

  async function insertDevisInDb(devisItem) {
    const payload = appDevisToDb(devisItem);

    const { error } = await supabase
      .from("devis")
      .insert([payload]);

    if (error) {
      console.error("Supabase devis INSERT error:", error);
      throw error;
    }

    return dbDevisToApp(payload);
  }

    async function updateDevisInDb(id, devisItem) {
    const payload = appDevisToDb({ ...devisItem, id });

    const { error } = await supabase
      .from("devis")
      .update(payload)
      .eq("id", String(id));

    if (error) {
      console.error("Supabase devis UPDATE error:", error);
      throw error;
    }

    return dbDevisToApp(payload);
  }

    async function deleteDevisInDb(id) {
    const { error } = await supabase
      .from("devis")
      .delete()
      .eq("id", String(id));

    if (error) throw error;
  }

  function parseArchiveDate(value) {
    if (!value) return null;

    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;

    const match = String(value).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      return new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00`);
    }

    return null;
  }

  function filterClientArchivesByPeriod(client, period, dateValue) {
    if (!client || !Array.isArray(client.archives)) return [];

    return client.archives.filter((archive) => {
      const d = parseArchiveDate(archive.date || archive.createdAt);
      if (!d) return false;

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      if (period === "jour") {
        return `${year}-${month}-${day}` === dateValue;
      }

      if (period === "mois") {
        return `${year}-${month}` === dateValue;
      }

      if (period === "annee") {
        return String(year) === String(dateValue);
      }

      return true;
    });
  }

  function getClientArchiveTotal(archives) {
    return (archives || []).reduce((sum, archive) => sum + Number(archive.total || archive.montant || 0), 0);
  }

  function buildClientArchiveRows(archives) {
    return (archives || [])
      .map((archive, archiveIndex) => {
        const pieces = Array.isArray(archive.pieces) && archive.pieces.length
          ? archive.pieces
              .map(
                (piece, pieceIndex) => `
                  <tr>
                    <td>${archiveIndex + 1}.${pieceIndex + 1}</td>
                    <td>${piece.designation || piece.nom || "-"}</td>
                    <td>${piece.reference || "-"}</td>
                    <td>${piece.quantite || 1}</td>
                    <td>${Number(piece.prixOriginal || piece.prix || 0).toFixed(2)} €</td>
                    <td>${Number(piece.prixPaye || 0).toFixed(2)} €</td>
                    <td>${piece.paiementStatut || "-"}</td>
                  </tr>
                `
              )
              .join("")
          : `
              <tr>
                <td>${archiveIndex + 1}</td>
                <td colspan="6">Paiement sans détail pièce</td>
              </tr>
            `;

        return `
          <tr class="archive-title">
            <td colspan="7">
              Paiement du ${archive.date || "-"} — ${Number(archive.total || archive.montant || 0).toFixed(2)} €
              — Mode : ${archive.mode || "-"} — ${archive.commentaire || ""}
            </td>
          </tr>
          ${pieces}
        `;
      })
      .join("");
  }

  function printClientArchives(client, archives, title) {
    if (!client) return alert("Sélectionne un client.");
    if (!archives || archives.length === 0) return alert("Aucune archive à imprimer.");

    const total = getClientArchiveTotal(archives);
    const rows = buildClientArchiveRows(archives);

    const win = window.open("", "_blank");

    win.document.write(`
      <html>
        <head>
          <title>${title} - ${client.nom || ""}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #10234d; margin: 0; }
            .page { min-height: calc(297mm - 28mm); display: flex; flex-direction: column; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #123f8f; padding-bottom: 12px; margin-bottom: 16px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .brand img { width: 72px; height: 72px; object-fit: contain; }
            h1 { margin: 0; color: #123f8f; font-size: 21px; }
            h2 { margin: 0; color: #123f8f; font-size: 24px; text-align: right; }
            h3 { color: #123f8f; margin: 0 0 8px; }
            p { margin: 4px 0; font-size: 12px; }
            .box { border: 1px solid #d9e3f2; border-radius: 10px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #123f8f; color: white; padding: 8px; text-align: left; font-size: 11px; }
            td { border: 1px solid #d9e3f2; padding: 7px; font-size: 11px; vertical-align: top; }
            .archive-title td { background: #eef4ff; color: #123f8f; font-weight: bold; }
            .total { margin-left: auto; width: 280px; background: #000; color: white; padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; font-weight: bold; }
            .footer { margin-top: auto; border-top: 2px solid #123f8f; padding-top: 8px; text-align: center; font-size: 10px; color: #555; line-height: 1.5; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                <img src="${logo}" />
                <div>
                  <h1>${ENTREPRISE.nom}</h1>
                  <p>📍 ${ENTREPRISE.adresse}</p>
                  <p>📧 ${ENTREPRISE.email}</p>
                  <p>☎ ${ENTREPRISE.telephone} — WhatsApp ${ENTREPRISE.whatsapp}</p>
                </div>
              </div>
              <div>
                <h2>${title}</h2>
                <p><strong>Date impression :</strong> ${new Date().toLocaleString("fr-FR")}</p>
              </div>
            </div>

            <div class="box">
              <h3>Client</h3>
              <p><strong>Nom :</strong> ${client.nom || "-"}</p>
              <p><strong>Téléphone :</strong> ${client.telephone || "-"}</p>
              <p><strong>Adresse :</strong> ${client.adresse || "-"}</p>
            </div>

            <div class="box">
              <h3>Archives paiements</h3>
              <table>
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Pièce</th>
                    <th>Référence</th>
                    <th>Qté</th>
                    <th>Prix origine</th>
                    <th>Prix payé</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>

            <div class="total">
              <span>Total payé</span>
              <span>${total.toFixed(2)} €</span>
            </div>

            <div class="footer">
              ${ENTREPRISE.nom} — ${ENTREPRISE.adresse}<br/>
              Email : ${ENTREPRISE.email} — Téléphone : ${ENTREPRISE.telephone} — WhatsApp : ${ENTREPRISE.whatsapp}<br/>
              TVA : ${ENTREPRISE.tva}
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);

    win.document.close();
    addHistory("Impression archives client", `${client.nom || "-"} — ${title}`);
  }

  function printSingleClientArchive(client, archive) {
    if (!client || !archive) return;
    printClientArchives(client, [archive], `Archive paiement client`);
  }

  function printClientJournal(client) {
    if (!client) return alert("Sélectionne un client.");

    const pendingRows = (client.pieces || [])
      .map(
        (piece, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${piece.designation || "-"}</td>
            <td>${piece.reference || "-"}</td>
            <td>${piece.quantite || 1}</td>
            <td>${Number(piece.prix || 0).toFixed(2)} €</td>
            <td>${(Number(piece.prix || 0) * Number(piece.quantite || 1)).toFixed(2)} €</td>
          </tr>
        `
      )
      .join("");

    const archiveRows = buildClientArchiveRows(client.archives || []);
    const pendingTotal = (client.pieces || []).reduce((sum, piece) => sum + Number(piece.prix || 0) * Number(piece.quantite || 1), 0);
    const paidTotal = getClientArchiveTotal(client.archives || []);

    const win = window.open("", "_blank");

    win.document.write(`
      <html>
        <head>
          <title>Journal client - ${client.nom || ""}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #10234d; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #123f8f; padding-bottom: 12px; margin-bottom: 16px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .brand img { width: 72px; height: 72px; object-fit: contain; }
            h1 { margin: 0; color: #123f8f; font-size: 21px; }
            h2 { margin: 0; color: #123f8f; font-size: 24px; text-align: right; }
            h3 { color: #123f8f; margin: 0 0 8px; }
            p { margin: 4px 0; font-size: 12px; }
            .box { border: 1px solid #d9e3f2; border-radius: 10px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #123f8f; color: white; padding: 8px; text-align: left; font-size: 11px; }
            td { border: 1px solid #d9e3f2; padding: 7px; font-size: 11px; vertical-align: top; }
            .archive-title td { background: #eef4ff; color: #123f8f; font-weight: bold; }
            .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 12px 0; }
            .stat { border: 1px solid #d9e3f2; border-radius: 10px; padding: 10px; }
            .stat span { color: #64748b; font-size: 11px; font-weight: bold; display: block; }
            .stat strong { color: #123f8f; font-size: 18px; display: block; margin-top: 4px; }
            .footer { margin-top: 24px; border-top: 2px solid #123f8f; padding-top: 8px; text-align: center; font-size: 10px; color: #555; line-height: 1.5; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <img src="${logo}" />
              <div>
                <h1>${ENTREPRISE.nom}</h1>
                <p>📍 ${ENTREPRISE.adresse}</p>
                <p>📧 ${ENTREPRISE.email}</p>
                <p>☎ ${ENTREPRISE.telephone} — WhatsApp ${ENTREPRISE.whatsapp}</p>
              </div>
            </div>
            <div>
              <h2>JOURNAL CLIENT</h2>
              <p><strong>Date :</strong> ${new Date().toLocaleString("fr-FR")}</p>
            </div>
          </div>

          <div class="box">
            <h3>Client</h3>
            <p><strong>Nom :</strong> ${client.nom || "-"}</p>
            <p><strong>Téléphone :</strong> ${client.telephone || "-"}</p>
            <p><strong>Adresse :</strong> ${client.adresse || "-"}</p>
          </div>

          <div class="stats">
            <div class="stat"><span>Total payé archivé</span><strong>${paidTotal.toFixed(2)} €</strong></div>
            <div class="stat"><span>Reste en cours</span><strong>${pendingTotal.toFixed(2)} €</strong></div>
          </div>

          <div class="box">
            <h3>Pièces impayées / en cours</h3>
            <table>
              <thead>
                <tr><th>N°</th><th>Pièce</th><th>Référence</th><th>Qté</th><th>Prix</th><th>Total</th></tr>
              </thead>
              <tbody>${pendingRows || `<tr><td colspan="6">Aucune pièce en cours.</td></tr>`}</tbody>
            </table>
          </div>

          <div class="box">
            <h3>Historique des paiements archivés</h3>
            <table>
              <thead>
                <tr><th>N°</th><th>Pièce</th><th>Référence</th><th>Qté</th><th>Prix origine</th><th>Prix payé</th><th>Statut</th></tr>
              </thead>
              <tbody>${archiveRows || `<tr><td colspan="7">Aucun paiement archivé.</td></tr>`}</tbody>
            </table>
          </div>

          <div class="footer">
            ${ENTREPRISE.nom} — ${ENTREPRISE.adresse}<br/>
            Email : ${ENTREPRISE.email} — Téléphone : ${ENTREPRISE.telephone} — WhatsApp : ${ENTREPRISE.whatsapp}<br/>
            TVA : ${ENTREPRISE.tva}
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `);

    win.document.close();
    addHistory("Impression journal client", client.nom || "-");
  }

  function autoSelectClientPaymentPieces() {
    if (!selectedClient) return alert("Sélectionne un client.");
    const montant = Number(clientPaymentForm.montant || 0);
    if (montant <= 0) return alert("Entre un montant avant auto-sélection.");

    let remaining = montant;
    const selectedIds = [];

    for (const piece of selectedClient.pieces || []) {
      if (remaining <= 0) break;

      const lineTotal = Number(piece.prix || 0) * Number(piece.quantite || 1);
      if (lineTotal <= 0) continue;

      selectedIds.push(piece.id);
      remaining -= lineTotal;
    }

    setSelectedClientPieceIds(selectedIds);
  }

  function dbClientToApp(row, piecesRows = [], paiementsRows = []) {
    return {
      id: row.id,
      legacyId: row.legacy_id || "",
      nom: row.nom || "",
      telephone: row.telephone || "",
      adresse: row.adresse || "",
      pieces: (piecesRows || []).map((p) => ({
        id: p.id,
        legacyId: p.legacy_id || "",
        designation: p.designation || "",
        reference: p.reference || "",
        quantite: Number(p.quantite || 1),
        prix: Number(p.prix ?? p.montant ?? 0),
        statut: p.statut || "En cours",
        date: p.date_piece || p.created_at || "",
        createdAt: p.created_at || "",
        updatedAt: p.updated_at || "",
      })),
      archives: (paiementsRows || []).map((p) => ({
        id: p.id,
        legacyId: p.legacy_id || "",
        type: "Paiement client",
        montant: Number(p.montant || 0),
        total: Number(p.montant || 0),
        mode: p.mode_paiement || p.mode || "",
        commentaire: p.commentaire || "",
        pieces: Array.isArray(p.pieces_payees) ? p.pieces_payees : [],
        date: p.date_paiement || p.created_at || "",
        user: p.created_by || "",
        createdAt: p.created_at || "",
      })),
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
      sourceDb: "clients",
    };
  }

  function appClientToDb(client) {
    return {
      nom: client.nom || "",
      telephone: client.telephone || "",
      adresse: client.adresse || "",
      updated_by: currentUser?.name || currentUser?.login || "system",
    };
  }

  function appClientPieceToDb(piece, clientId) {
    return {
      client_id: clientId,
      designation: piece.designation || "",
      reference: piece.reference || "",
      quantite: Number(piece.quantite || 1),
      prix: Number(piece.prix || 0),
      statut: piece.statut || "En cours",
      updated_by: currentUser?.name || currentUser?.login || "system",
    };
  }

  async function loadClientsFromDb(limit = 150) {
    const { data: clientRows, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (clientError) {
      console.error("Chargement clients impossible", clientError);
      return null;
    }

    const clientIds = (clientRows || []).map((client) => client.id);

    if (clientIds.length === 0) return [];

    const { data: pieceRows, error: pieceError } = await supabase
      .from("client_pieces")
      .select("*")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false });

    if (pieceError) {
      console.error("Chargement client_pieces impossible", pieceError);
      return null;
    }

    const { data: paiementRows, error: paiementError } = await supabase
      .from("client_paiements")
      .select("*")
      .in("client_id", clientIds)
      .order("date_paiement", { ascending: false })
      .limit(500);

    if (paiementError) {
      console.error("Chargement client_paiements impossible", paiementError);
      return null;
    }

    return (clientRows || []).map((client) =>
      dbClientToApp(
        client,
        (pieceRows || []).filter((p) => String(p.client_id) === String(client.id)),
        (paiementRows || []).filter((p) => String(p.client_id) === String(client.id))
      )
    );
  }

  async function loadUsersFromDb() {
    const { data, error } = await supabase
      .from("users_app")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Chargement users_app impossible", error);
      return null;
    }

    return data || [];
  }

  async function reloadUsersFromDb() {
    const dbUsers = await loadUsersFromDb();
    if (dbUsers?.length) {
      setUsers(dbUsers);
      const savedUser = localStorage.getItem("king_current_user");
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          const freshUser = dbUsers.find((u) => u.id === parsedUser.id || u.login === parsedUser.login);
          if (freshUser) {
            setCurrentUser(freshUser);
            localStorage.setItem("king_current_user", JSON.stringify(freshUser));
          }
        } catch {
          // rien
        }
      }
    }
  }

  async function reloadClientsFromDb() {
    const dbClients = await loadClientsFromDb();
    if (dbClients) {
      setClients(dbClients);
      if (selectedClient) {
        const fresh = dbClients.find((client) => String(client.id) === String(selectedClient.id));
        setSelectedClient(fresh || null);
      }
      addHistory("Rechargement clients", "Clients rechargés depuis les tables professionnelles");
    }
  }

  async function insertClientInDb(client) {
    const payload = {
      ...appClientToDb(client),
      created_by: currentUser?.name || currentUser?.login || "system",
    };

    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return dbClientToApp(data, [], []);
  }

  async function updateClientInDb(id, client) {
    const { data, error } = await supabase
      .from("clients")
      .update(appClientToDb(client))
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return dbClientToApp(data, client.pieces || [], client.archives || []);
  }

  async function deleteClientInDb(id) {
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async function insertClientPieceInDb(clientId, piece) {
    const payload = {
      ...appClientPieceToDb(piece, clientId),
      created_by: currentUser?.name || currentUser?.login || "system",
    };

    const { data, error } = await supabase
      .from("client_pieces")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return {
      id: data.id,
      designation: data.designation || "",
      reference: data.reference || "",
      quantite: Number(data.quantite || 1),
      prix: Number(data.prix ?? data.montant ?? 0),
      statut: data.statut || "En cours",
      date: data.date_piece || data.created_at || "",
      createdAt: data.created_at || "",
      updatedAt: data.updated_at || "",
    };
  }

  async function updateClientPieceInDb(id, piece, clientId) {
    const { data, error } = await supabase
      .from("client_pieces")
      .update(appClientPieceToDb(piece, clientId))
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return {
      id: data.id,
      designation: data.designation || "",
      reference: data.reference || "",
      quantite: Number(data.quantite || 1),
      prix: Number(data.prix ?? data.montant ?? 0),
      statut: data.statut || "En cours",
      date: data.date_piece || data.created_at || "",
      createdAt: data.created_at || "",
      updatedAt: data.updated_at || "",
    };
  }

  async function deleteClientPieceInDb(id) {
    const { error } = await supabase
      .from("client_pieces")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async function insertClientPaymentInDb(clientId, paymentArchive) {
    const { data, error } = await supabase
      .from("client_paiements")
      .insert({
        client_id: clientId,
        montant: Number(paymentArchive.montant || paymentArchive.total || 0),
        mode_paiement: paymentArchive.mode || "",
        pieces_payees: paymentArchive.pieces || [],
        commentaire: paymentArchive.commentaire || "",
        created_by: currentUser?.name || currentUser?.login || "system",
      })
      .select("*")
      .single();

    if (error) throw error;

    return {
      ...paymentArchive,
      id: data.id,
      montant: Number(data.montant || 0),
      total: Number(data.montant || 0),
      mode: data.mode_paiement || paymentArchive.mode || "",
      commentaire: data.commentaire || "",
      pieces: Array.isArray(data.pieces_payees) ? data.pieces_payees : paymentArchive.pieces || [],
      date: data.date_paiement || data.created_at || new Date().toLocaleString("fr-FR"),
      user: data.created_by || currentUser?.name || "-",
    };
  }

  async function updateClientPaymentInDb(id, archive) {
    const { data, error } = await supabase
      .from("client_paiements")
      .update({
        montant: Number(archive.montant || archive.total || 0),
        mode_paiement: archive.mode || "",
        pieces_payees: archive.pieces || [],
        commentaire: archive.commentaire || "",
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return {
      ...archive,
      id: data.id,
      montant: Number(data.montant || 0),
      total: Number(data.montant || 0),
      mode: data.mode_paiement || archive.mode || "",
      commentaire: data.commentaire || "",
      pieces: Array.isArray(data.pieces_payees) ? data.pieces_payees : archive.pieces || [],
      date: data.date_paiement || data.created_at || archive.date,
      user: data.created_by || archive.user || currentUser?.name || "-",
    };
  }

  async function deleteClientPaymentInDb(id) {
    const { error } = await supabase
      .from("client_paiements")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async function reloadStockFromDb() {
    const professionalStock = await loadStockItemsFromDb();
    if (professionalStock) {
      setPieces(professionalStock);
      addHistory("Rechargement stock", "Stock rechargé depuis stock_items");
    }
  }

  async function insertStockItemInDb(piece) {
    const payload = {
      ...appPieceToDbStock(piece),
      created_by: currentUser?.login || currentUser?.name || "system",
    };

    const { data, error } = await supabase
      .from("stock_items")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return dbStockToAppPiece(data);
  }

  async function updateStockItemInDb(id, piece) {
    const { data, error } = await supabase
      .from("stock_items")
      .update(appPieceToDbStock(piece))
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return dbStockToAppPiece(data);
  }

  async function deleteStockItemInDb(id) {
    const { error } = await supabase
      .from("stock_items")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async function updateStockQuantityInDb(id, nextQuantity) {
    const { data, error } = await supabase
      .from("stock_items")
      .update({
        quantite: Number(nextQuantity || 0),
        updated_by: currentUser?.login || currentUser?.name || "system",
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return dbStockToAppPiece(data);
  }

  function compressImageFile(file, maxWidth = 700, quality = 0.58) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          const ratio = Math.min(1, maxWidth / img.width);
          const width = Math.round(img.width * ratio);
          const height = Math.round(img.height * ratio);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", quality));
        };

        img.onerror = reject;
        img.src = event.target.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function removeHeavyImagesForLocalStorage(payload) {
    return {
      ...payload,
      pieces: (payload.pieces || []).map((piece) => ({
        ...piece,
        image: piece.image ? "" : "",
      })),
      manualOrders: (payload.manualOrders || []).map((order) => ({
        ...order,
        image: order.image ? "" : "",
      })),
      orderArchives: (payload.orderArchives || []).map((archive) => ({
        ...archive,
        image: archive.image ? "" : "",
      })),
    };
  }

  function safeLocalStorageSet(key, value) {
    if (key === "king_app_full") {
      try {
        localStorage.removeItem("king_app_full");
      } catch {
        // Ignore localStorage errors. Supabase is the main storage.
      }
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn("LocalStorage indisponible :", error);
    }
  }

  useEffect(() => {
    async function startApp() {
      try {
        const remoteState = await loadAppState();

        const professionalStock = await loadStockItemsFromDb();
        setPieces(professionalStock && professionalStock.length ? professionalStock : normalizePieces(remoteState.pieces || []));
        setHistory(remoteState.history || []);
        setManualOrders(remoteState.manualOrders || []);
        setOrderedAutoIds(remoteState.orderedAutoIds || []);
        setOrderArchives(remoteState.orderArchives || []);
        const professionalDevis = await loadDevisFromDb();
        setDevis(Array.isArray(professionalDevis) ? professionalDevis : remoteState.devis || []);
        const professionalClients = await loadClientsFromDb();
        setClients(Array.isArray(professionalClients) ? professionalClients : remoteState.clients || []);

        const { data: remoteUsers, error: usersError } = await supabase
          .from("users_app")
          .select("*")
          .order("id", { ascending: true });

        if (!usersError && remoteUsers?.length) {
          setUsers(remoteUsers);

          const savedUser = localStorage.getItem("king_current_user");
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              const freshUser = remoteUsers.find((u) => u.id === parsedUser.id || u.login === parsedUser.login);
              if (freshUser) {
                setCurrentUser(freshUser);
                localStorage.setItem("king_current_user", JSON.stringify(freshUser));
                setConnected(true);
              } else {
                localStorage.removeItem("king_current_user");
                setCurrentUser(null);
                setConnected(false);
              }
            } catch {
              localStorage.removeItem("king_current_user");
              setCurrentUser(null);
              setConnected(false);
            }
          }
        } else {
          setUsers(DEFAULT_USERS);
        }

        safeLocalStorageSet(
          "king_app_full",
          JSON.stringify({
            users: remoteUsers?.length ? remoteUsers : DEFAULT_USERS,
            pieces: remoteState.pieces || [],
            history: remoteState.history || [],
            manualOrders: remoteState.manualOrders || [],
            orderedAutoIds: remoteState.orderedAutoIds || [],
            orderArchives: remoteState.orderArchives || [],
            devis: remoteState.devis || [],
            clients: remoteState.clients || [],
            savedAt: new Date().toISOString(),
          })
        );
      } catch (error) {
        console.error("Chargement Supabase impossible, fallback localStorage", error);

        const saved = localStorage.getItem("king_app_full");
        if (saved) {
          try {
            const data = JSON.parse(saved);
            setUsers(data.users?.length ? data.users : DEFAULT_USERS);
            setPieces(normalizePieces(data.pieces || []));
            setHistory(data.history || []);
            setManualOrders(data.manualOrders || []);
            setOrderedAutoIds(data.orderedAutoIds || []);
            setOrderArchives(data.orderArchives || []);
            setDevis(data.devis || []);
                const professionalClients = await loadClientsFromDb();
            setClients(Array.isArray(professionalClients) ? professionalClients : data.clients || []);
          } catch {
            localStorage.removeItem("king_app_full");
          }
        }
      } finally {
        setAppLoaded(true);
      }
    }

    startApp();
  }, []);

  useEffect(() => {
    if (!connected || !appLoaded) return;

    const timers = {};
    const debounceReload = (key, fn) => {
      window.clearTimeout(timers[key]);
      timers[key] = window.setTimeout(() => {
        fn().catch((error) => console.error(`Realtime ${key} impossible`, error));
      }, 350);
    };

    const channel = supabase
      .channel("king-app-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_items" }, () => {
        debounceReload("stock", reloadStockFromDb);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "devis" }, async () => {
        debounceReload("devis", async () => {
          const dbDevis = await loadDevisFromDb();
          if (Array.isArray(dbDevis)) setDevis(dbDevis);
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        debounceReload("clients", reloadClientsFromDb);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "client_pieces" }, () => {
        debounceReload("clients", reloadClientsFromDb);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "client_paiements" }, () => {
        debounceReload("clients", reloadClientsFromDb);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "users_app" }, () => {
        debounceReload("users", reloadUsersFromDb);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Synchronisation multi-PC active");
        }
      });

    return () => {
      Object.values(timers).forEach((timer) => window.clearTimeout(timer));
      supabase.removeChannel(channel);
    };
  }, [connected, appLoaded]);

  useEffect(() => {
    if (!appLoaded) return;

    const payload = {
      users,
      pieces: normalizePieces(pieces),
      history,
      manualOrders,
      orderedAutoIds,
      orderArchives,
      devis,
      clients,
      savedAt: new Date().toISOString(),
    };

    safeLocalStorageSet("king_app_full", JSON.stringify(payload));
    saveAppState(payload).catch((error) => {
      console.error("Sauvegarde Supabase impossible", error);
    });
  }, [appLoaded, users, pieces, history, manualOrders, orderedAutoIds, orderArchives, devis, clients]);

  useEffect(() => {
    if (selectedClient) {
      const freshClient = clients.find((c) => c.id === selectedClient.id);
      if (freshClient) setSelectedClient(freshClient);
    }
  }, [clients]);

  const ruptures = pieces.filter((p) => Number(p.quantite) < Number(p.rupture));

  const results = useMemo(() => {
    return pieces.filter((p) => {
      const txt = `${p.designation} ${p.refOrigine} ${p.refInterne} ${p.famille} ${p.sousFamille}`.toLowerCase();
      return txt.includes(search.toLowerCase()) && (!familleActive || normalizeFamilleName(p.famille) === normalizeFamilleName(familleActive));
    });
  }, [pieces, search, familleActive]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const txt = `${client.nom} ${client.telephone} ${client.adresse}`.toLowerCase();
      return txt.includes(clientSearch.toLowerCase());
    });
  }, [clients, clientSearch]);

  const stockACommanderAuto = pieces.filter(
    (p) => Number(p.quantite) < Number(p.rupture) && !orderedAutoIds.includes(p.id)
  );

  const allOrders = [
    ...stockACommanderAuto.map((p) => ({ ...p, orderType: "auto", reference: p.refInterne || p.refOrigine || "" })),
    ...manualOrders.map((p) => ({ ...p, orderType: "manuel" })),
  ];

  const devisTotals = useMemo(() => {
    const sousTotalTTC = devisLines.reduce((s, l) => s + getLineTotal(l), 0);
    const remiseValue = Number(devisForm.remiseValue || 0);
    let remiseTTC = devisForm.remiseType === "pourcentage" ? sousTotalTTC * (remiseValue / 100) : remiseValue;
    if (remiseTTC > sousTotalTTC) remiseTTC = sousTotalTTC;
    const totalTTC = Math.max(0, sousTotalTTC - remiseTTC);
    const totalHT = totalTTC / 1.2;
    const tva = totalTTC - totalHT;
    const remiseHT = remiseTTC / 1.2;
    const sousTotalHT = sousTotalTTC / 1.2;
    return { sousTotalTTC, sousTotalHT, remiseTTC, remiseHT, totalTTC, totalHT, tva };
  }, [devisLines, devisForm.remiseType, devisForm.remiseValue]);


  const filteredDevis = useMemo(() => {
    const q = String(devisSearch || "").toLowerCase().trim();
    return (devis || []).filter((d) => {
      const txt = `${d.numero || ""} ${d.client || ""} ${d.telephone || ""} ${d.plaque || ""} ${d.vin || ""} ${d.marque || ""} ${d.modele || ""} ${d.status || ""}`.toLowerCase();
      return !q || txt.includes(q);
    });
  }, [devis, devisSearch]);

  function nextDevisNumero() {
    const year = new Date().getFullYear();
    const allNumbers = devis.map((d) => d.numero).filter(Boolean);

    const currentYearNumbers = allNumbers
      .map((numero) => String(numero || ""))
      .filter((numero) => numero.includes(`-${year}-`))
      .map((numero) => {
        const lastPart = numero.split("-").pop();
        return Number(lastPart || 0);
      })
      .filter((n) => !Number.isNaN(n));

    const nextNumber = currentYearNumbers.length ? Math.max(...currentYearNumbers) + 1 : 1;

    return `DV-${year}-${String(nextNumber).padStart(5, "0")}`;
  }


  function getLineUnitPrice(line) {
    if (line?.deuxOffres && line?.offreChoisie === "offre2") {
      return Number(line.prixTTC2 || 0);
    }
    return Number(line?.prixTTC || 0);
  }

  function getLineTotal(line) {
    return Number(line?.quantite || 0) * getLineUnitPrice(line);
  }

  function toggleLineConfirmedByClient(lineId) {
    setDevisLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, confirmedByClient: !line.confirmedByClient } : line
      )
    );
  }

  function selectAllLinesConfirmedByClient() {
    setDevisLines((prev) => prev.map((line) => ({ ...line, confirmedByClient: true })));
  }

  function clearLinesConfirmedByClient() {
    setDevisLines((prev) => prev.map((line) => ({ ...line, confirmedByClient: false })));
  }

  function addHistory(action, details) {
    setHistory((prev) => [
      {
        id: Date.now(),
        user: currentUser?.name || "-",
        login: currentUser?.login || "-",
        role: currentUser?.role || "-",
        action,
        details,
        date: new Date().toLocaleString("fr-FR"),
      },
      ...prev,
    ]);
  }

  async function handleLogin(e) {
    e.preventDefault();

    const cleanedLogin = String(login).trim().toLowerCase();
    const cleanedPassword = String(password).trim();

    try {
      const { data: remoteUser, error } = await supabase
        .from("users_app")
        .select("*")
        .ilike("login", cleanedLogin)
        .eq("password", cleanedPassword)
        .maybeSingle();

      if (!error && remoteUser) {
        setCurrentUser(remoteUser);
        localStorage.setItem("king_current_user", JSON.stringify(remoteUser));
        setConnected(true);
        setModuleActif("Stock");

        const { data: remoteUsers } = await supabase
          .from("users_app")
          .select("*")
          .order("id", { ascending: true });

        if (remoteUsers?.length) setUsers(remoteUsers);
        return;
      }
    } catch (error) {
      console.error("Connexion Supabase impossible, fallback local", error);
    }

    const user = users.find(
      (u) =>
        String(u.login).trim().toLowerCase() === cleanedLogin &&
        String(u.password).trim() === cleanedPassword
    );

    if (!user) return alert("Identifiant ou mot de passe incorrect.");

    setCurrentUser(user);
    localStorage.setItem("king_current_user", JSON.stringify(user));
    setConnected(true);
    setModuleActif("Stock");
  }

  async function resetLogin() {
    try {
      await supabase.from("users_app").upsert(
        {
          login: "admin",
          password: "admin123",
          name: "Administrateur",
          role: "Admin",
        },
        { onConflict: "login" }
      );

      const { data: remoteUsers } = await supabase
        .from("users_app")
        .select("*")
        .order("id", { ascending: true });

      if (remoteUsers?.length) setUsers(remoteUsers);
    } catch (error) {
      console.error("Réinitialisation Supabase impossible", error);
      setUsers(DEFAULT_USERS);
    }

    setLogin("admin");
    setPassword("admin123");
    alert("Compte admin réinitialisé : admin / admin123");
  }

  function change(e) {
    const { name, value } = e.target;

    if (name === "famille") {
      const normalizedFamille = normalizeFamilleName(value);
      const sousFamilles = getSousFamillesByFamille(normalizedFamille);

      return setForm({
        ...form,
        famille: normalizedFamille,
        sousFamille: sousFamilles.length > 0 ? sousFamilles[0] : "",
      });
    }

    if (name === "sousFamille") {
      return setForm({
        ...form,
        sousFamille: value,
      });
    }

    setForm({ ...form, [name]: value });
  }

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return alert("Choisis un fichier image.");
    }

    if (file.size > 8 * 1024 * 1024) {
      return alert("Image trop lourde. Choisis une image plus légère.");
    }

    try {
      const compressedImage = await compressImageFile(file);
      setForm({ ...form, image: compressedImage });
    } catch (error) {
      console.error("Compression image impossible", error);
      alert("Impossible d'ajouter cette image. Essaie une autre image.");
    }
  }

  function removePieceImage() {
    setForm({ ...form, image: "" });
  }

  async function ajouter(e) {
    e.preventDefault();

    if (!form.designation || !form.famille || !form.sousFamille) {
      return alert("Complète au minimum le nom de la pièce, la famille et la sous-famille.");
    }

    try {
      if (editingPieceId) {
        const updatedPiecePayload = normalizePiece({
          id: editingPieceId,
          ...form,
          quantite: Number(form.quantite || 0),
          rupture: Number(form.rupture || 1),
          updatedBy: currentUser?.login || currentUser?.name,
          updatedAt: new Date().toLocaleString("fr-FR"),
        });

        const updatedPiece = await updateStockItemInDb(editingPieceId, updatedPiecePayload);

        setPieces(pieces.map((piece) => (piece.id === editingPieceId ? updatedPiece : piece)));
        addHistory("Modification pièce stock", `${form.designation} — ${form.famille} / ${form.sousFamille}`);
        cancelEditPiece();
        return;
      }

      const newPiecePayload = normalizePiece({
        ...form,
        quantite: Number(form.quantite || 0),
        rupture: Number(form.rupture || 1),
        createdBy: currentUser?.login || currentUser?.name,
        createdAt: new Date().toLocaleString("fr-FR"),
      });

      const newPiece = await insertStockItemInDb(newPiecePayload);

      setPieces([newPiece, ...pieces]);
      addHistory("Ajout pièce", `${form.designation} — ${form.famille} / ${form.sousFamille}`);

      setForm({
        designation: "",
        famille: "",
        sousFamille: "",
        refOrigine: "",
        refInterne: "",
        fournisseur: "",
        quantite: "",
        rupture: "1",
        prixPart: "",
        prixPro: "",
        image: "",
      });
    } catch (error) {
      console.error("Erreur sauvegarde stock_items", error);
      alert("Erreur Supabase : impossible d'enregistrer la pièce dans stock_items.");
    }
  }

  function startEditPiece(piece) {
    setEditingPieceId(piece.id);
    setForm({
      designation: piece.designation || "",
      famille: piece.famille || "",
      sousFamille: piece.sousFamille || "",
      refOrigine: piece.refOrigine || "",
      refInterne: piece.refInterne || "",
      fournisseur: piece.fournisseur || "",
      quantite: String(piece.quantite ?? ""),
      rupture: String(piece.rupture ?? "2"),
      prixPart: String(piece.prixPart ?? ""),
      prixPro: String(piece.prixPro ?? ""),
      image: piece.image || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditPiece() {
    setEditingPieceId(null);
    setForm({
      designation: "",
      famille: "",
      sousFamille: "",
      refOrigine: "",
      refInterne: "",
      fournisseur: "",
      quantite: "",
      rupture: "1",
      prixPart: "",
      prixPro: "",
      image: "",
    });
  }

  async function vendre(id) {
    const piece = pieces.find((p) => p.id === id);
    if (!piece) return;

    const nextQuantity = Math.max(0, Number(piece.quantite || 0) - 1);

    try {
      const updatedPiece = await updateStockQuantityInDb(id, nextQuantity);

      setPieces(pieces.map((p) => (p.id === id ? updatedPiece : p)));
      setOrderedAutoIds((prev) => prev.filter((x) => x !== id));
      addHistory("Vente pièce", `${piece.designation} — stock diminué de 1`);
    } catch (error) {
      console.error("Erreur vente stock_items", error);
      alert("Erreur Supabase : stock non diminué.");
    }
  }

  async function supprimer(id) {
    if (!isAdmin) return alert("Seul l'administrateur peut supprimer une pièce.");

    const piece = pieces.find((p) => p.id === id);
    if (!piece) return;

    if (!window.confirm(`Supprimer définitivement la pièce : ${piece.designation} ?`)) return;

    try {
      await deleteStockItemInDb(id);

      setPieces(pieces.filter((p) => p.id !== id));
      setOrderedAutoIds((prev) => prev.filter((x) => x !== id));
      addHistory("Suppression pièce", piece.designation);
    } catch (error) {
      console.error("Erreur suppression stock_items", error);
      alert("Erreur Supabase : impossible de supprimer la pièce.");
    }
  }

  function normalizeTextForMatch(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function findMatchingEmptyDevisLine(piece) {
    const pieceName = normalizeTextForMatch(piece.designation);
    const pieceSousFamille = normalizeTextForMatch(piece.sousFamille);
    const pieceFamille = normalizeTextForMatch(piece.famille);

    return devisLines.find((line) => {
      if (!line.sourceRequestId) return false;
      if (line.reference || Number(line.prixTTC || 0) > 0) return false;

      const lineName = normalizeTextForMatch(line.designation);

      if (!lineName) return false;

      return (
        pieceName.includes(lineName) ||
        lineName.includes(pieceName) ||
        (pieceSousFamille && (pieceSousFamille.includes(lineName) || lineName.includes(pieceSousFamille))) ||
        (pieceFamille && (pieceFamille.includes(lineName) || lineName.includes(pieceFamille)))
      );
    });
  }

  function fillExistingDevisRequestLine(piece, priceType) {
    const matchingLine = findMatchingEmptyDevisLine(piece);

    if (!matchingLine) return false;

    const prixChoisi =
      priceType === "pro"
        ? Number(piece.prixPro || piece.prixPart || 0)
        : Number(piece.prixPart || piece.prixPro || 0);

    setDevisLines((prev) =>
      prev.map((line) =>
        line.id === matchingLine.id
          ? {
              ...line,
              designation: line.designation || piece.designation,
              reference: piece.refInterne || piece.refOrigine || "",
              quantite: Number(line.quantite || 1),
              prixTTC: prixChoisi,
              priceType,
              sourceStockId: piece.id,
              stockDesignation: piece.designation,
            }
          : line
      )
    );

    addHistory(
      "Ligne devis complétée depuis stock",
      `${matchingLine.designation} → ${piece.designation} — tarif ${priceType === "pro" ? "professionnel" : "particulier"}`
    );

    setModuleActif("Devis");
    return true;
  }

  function addStockPieceToDevis(piece, priceType) {
    if (fillExistingDevisRequestLine(piece, priceType)) {
      return;
    }

    if (!devisForm.numero) {
      setDevisForm((prev) => ({ ...prev, numero: nextDevisNumero() }));
    }

    const prixChoisi =
      priceType === "pro"
        ? Number(piece.prixPro || piece.prixPart || 0)
        : Number(piece.prixPart || piece.prixPro || 0);

    setDevisLines((prev) => [
      ...prev,
      {
        id: Date.now(),
        designation: piece.designation,
        reference: piece.refInterne || piece.refOrigine || "",
        quantite: 1,
        prixTTC: prixChoisi,
        priceType,
        sourceStockId: piece.id,
      },
    ]);

    setModuleActif("Devis");
    addHistory(
      "Ajout pièce au devis",
      `${piece.designation} — tarif ${priceType === "pro" ? "professionnel" : "particulier"}`
    );
  }

  function togglePieceForDevis(piece, priceType = "particulier") {
    if (fillExistingDevisRequestLine(piece, priceType)) {
      return;
    }

    setDevisStockSelection((prev) => {
      const exists = prev.find((item) => item.id === piece.id && item.priceType === priceType);

      if (exists) {
        return prev.filter((item) => !(item.id === piece.id && item.priceType === priceType));
      }

      const prixChoisi =
        priceType === "pro"
          ? Number(piece.prixPro || piece.prixPart || 0)
          : Number(piece.prixPart || piece.prixPro || 0);

      return [
        ...prev,
        {
          id: piece.id,
          designation: piece.designation,
          reference: piece.refInterne || piece.refOrigine || "",
          prixTTC: prixChoisi,
          quantite: 1,
          priceType,
          sourceStockId: piece.id,
          confirmed: false,
        },
      ];
    });
  }

  function updateDevisStockSelectionItem(itemId, priceType, field, value) {
    setDevisStockSelection((prev) =>
      prev.map((item) =>
        item.id === itemId && item.priceType === priceType
          ? {
              ...item,
              [field]:
                field === "quantite" || field === "prixTTC"
                  ? Number(value || 0)
                  : value,
            }
          : item
      )
    );
  }

  function toggleConfirmDevisStockSelection(itemId, priceType) {
    setDevisStockSelection((prev) =>
      prev.map((item) =>
        item.id === itemId && item.priceType === priceType
          ? { ...item, confirmed: !item.confirmed }
          : item
      )
    );
  }

  function confirmAllDevisStockSelection() {
    setDevisStockSelection((prev) => prev.map((item) => ({ ...item, confirmed: true })));
  }

  function unconfirmAllDevisStockSelection() {
    setDevisStockSelection((prev) => prev.map((item) => ({ ...item, confirmed: false })));
  }

  function removeFromDevisStockSelection(itemId, priceType) {
    setDevisStockSelection((prev) =>
      prev.filter((item) => !(item.id === itemId && item.priceType === priceType))
    );
  }

  function addSelectedPiecesToDevis() {
    const confirmedItems = devisStockSelection.filter((item) => item.confirmed);

    if (devisStockSelection.length === 0) {
      return alert("Ajoute d'abord des pièces dans la liste client.");
    }

    if (confirmedItems.length === 0) {
      return alert("Coche au moins une pièce validée par le client avant de transférer au devis.");
    }

    if (!devisForm.numero) {
      setDevisForm((prev) => ({ ...prev, numero: nextDevisNumero() }));
    }

    let remainingItems = [...confirmedItems];

    setDevisLines((prevLines) => {
      let updatedLines = [...prevLines];

      remainingItems = remainingItems.filter((piece) => {
        const fakeStockPiece = {
          id: piece.sourceStockId,
          designation: piece.designation,
          refInterne: piece.reference,
          refOrigine: piece.reference,
          famille: "",
          sousFamille: "",
          prixPart: piece.priceType === "particulier" ? piece.prixTTC : "",
          prixPro: piece.priceType === "pro" ? piece.prixTTC : "",
        };

        const pieceName = normalizeTextForMatch(fakeStockPiece.designation);

        const matchingLine = updatedLines.find((line) => {
          if (!line.sourceRequestId) return false;
          if (line.reference || Number(line.prixTTC || 0) > 0) return false;

          const lineName = normalizeTextForMatch(line.designation);
          if (!lineName) return false;

          return pieceName.includes(lineName) || lineName.includes(pieceName);
        });

        if (!matchingLine) return true;

        updatedLines = updatedLines.map((line) =>
          line.id === matchingLine.id
            ? {
                ...line,
                reference: piece.reference || "",
                quantite: Number(piece.quantite || line.quantite || 1),
                prixTTC: Number(piece.prixTTC || 0),
                priceType: piece.priceType,
                sourceStockId: piece.sourceStockId,
                stockDesignation: piece.designation,
              }
            : line
        );

        return false;
      });

      const newLines = remainingItems.map((piece) => ({
        id: Date.now() + Math.random(),
        designation: piece.designation,
        reference: piece.reference,
        quantite: Number(piece.quantite || 1),
        prixTTC: Number(piece.prixTTC || 0),
        priceType: piece.priceType,
        sourceStockId: piece.sourceStockId,
      }));

      return [...updatedLines, ...newLines];
    });

    addHistory("Transfert sélection client au devis", `${confirmedItems.length} pièce(s) confirmée(s) transférée(s)`);

    setDevisStockSelection((prev) => prev.filter((item) => !item.confirmed));
    setModuleActif("Devis");
  }

  function clearDevisStockSelection() {
    setDevisStockSelection([]);
  }

  function changeDevisForm(e) {
    setDevisForm({ ...devisForm, [e.target.name]: e.target.value });
  }

  function changeDevisLine(e) {
    setDevisLine({ ...devisLine, [e.target.name]: e.target.value });
  }

  function addManualLineToDevis(e) {
    e.preventDefault();

    if (!devisLine.designation || !devisLine.prixTTC) {
      return alert("Ajoute au minimum la désignation et le prix TTC.");
    }

    if (!devisForm.numero) {
      setDevisForm((prev) => ({ ...prev, numero: nextDevisNumero() }));
    }

    if (editingDevisLineId) {
      setDevisLines(
        devisLines.map((line) =>
          line.id === editingDevisLineId
            ? {
                ...line,
                designation: devisLine.designation,
                reference: devisLine.reference,
                quantite: Number(devisLine.quantite || 1),
                prixTTC: Number(devisLine.prixTTC || 0),
                updatedAt: new Date().toLocaleString("fr-FR"),
              }
            : line
        )
      );

      addHistory("Modification ligne devis", devisLine.designation);
      cancelEditDevisLine();
      return;
    }

    setDevisLines([
      ...devisLines,
      {
        id: Date.now(),
        designation: devisLine.designation,
        reference: devisLine.reference,
        quantite: Number(devisLine.quantite || 1),
        prixTTC: Number(devisLine.prixTTC || 0),
        deuxOffres: Boolean(devisLine.deuxOffres),
        fournisseur1: devisLine.fournisseur1,
        dateDispo1: devisLine.dateDispo1,
        reference2: devisLine.reference2,
        prixTTC2: Number(devisLine.prixTTC2 || 0),
        fournisseur2: devisLine.fournisseur2,
        dateDispo2: devisLine.dateDispo2,
        offreChoisie: devisLine.deuxOffres ? devisLine.offreChoisie || "offre1" : "offre1",
        priceType: devisLine.deuxOffres ? "deux offres" : "manuel",
      },
    ]);

    setDevisLine({ designation: "", reference: "", quantite: "1", prixTTC: "", deuxOffres: false, fournisseur1: "", dateDispo1: "Sur place", reference2: "", prixTTC2: "", fournisseur2: "", dateDispo2: "", offreChoisie: "offre1" });
  }

  function removeDevisLine(id) {
    setDevisLines(devisLines.filter((l) => l.id !== id));
    if (editingDevisLineId === id) cancelEditDevisLine();
  }

  function editDevisLine(line) {
    setEditingDevisLineId(line.id);
    setDevisLine({
      designation: line.designation || "",
      reference: line.reference || "",
      quantite: String(line.quantite || "1"),
      prixTTC: String(line.prixTTC || ""),
      deuxOffres: Boolean(line.deuxOffres),
      fournisseur1: line.fournisseur1 || "",
      dateDispo1: line.dateDispo1 || "Sur place",
      reference2: line.reference2 || "",
      prixTTC2: String(line.prixTTC2 || ""),
      fournisseur2: line.fournisseur2 || "",
      dateDispo2: line.dateDispo2 || "",
      offreChoisie: line.offreChoisie || "offre1",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditDevisLine() {
    setEditingDevisLineId(null);
    setDevisLine({ designation: "", reference: "", quantite: "1", prixTTC: "", deuxOffres: false, fournisseur1: "", dateDispo1: "Sur place", reference2: "", prixTTC2: "", fournisseur2: "", dateDispo2: "", offreChoisie: "offre1" });
  }

  function duplicateDevisLine(line) {
    setDevisLines([
      ...devisLines,
      {
        ...line,
        id: Date.now(),
        designation: line.designation,
        reference: line.reference,
        quantite: Number(line.quantite || 1),
        prixTTC: Number(line.prixTTC || 0),
      },
    ]);
    addHistory("Duplication ligne devis", line.designation || "-");
  }

  function updateDevisLine(id, field, value) {
    setDevisLines(
      devisLines.map((line) =>
        line.id === id ? { ...line, [field]: field === "quantite" || field === "prixTTC" || field === "prixTTC2" ? Number(value || 0) : value } : line
      )
    );
  }

  function resetDevisDraft() {
    setEditingDevisId(null);
    setEditingDevisLineId(null);
    setDevisForm({
      numero: nextDevisNumero(),
      client: "",
      date: new Date().toISOString().slice(0, 10),
      marque: "",
      modele: "",
      plaque: "",
      vin: "",
      telephone: "",
      origineDemande: "",
      notesInternes: "",
      remiseType: "pourcentage",
      remiseValue: "",
    });
    setDevisLines([]);
    setDevisLine({ designation: "", reference: "", quantite: "1", prixTTC: "", deuxOffres: false, fournisseur1: "", dateDispo1: "Sur place", reference2: "", prixTTC2: "", fournisseur2: "", dateDispo2: "", offreChoisie: "offre1" });
  }

  async function saveDevis(status = "Archivé") {
    if (!devisForm.client) return alert("Nom client obligatoire.");
    if (devisLines.length === 0) return alert("Ajoute au moins une ligne au devis.");

    const numero = devisForm.numero || nextDevisNumero();

    const allDevisLines = devisLines.map((line) => {
      const unitPrice =
        line.deuxOffres && line.offreChoisie === "offre2"
          ? Number(line.prixTTC2 || 0)
          : Number(line.prixTTC || 0);

      return {
        ...line,
        validationClient: line.confirmedByClient ? "Validé par le client" : "Non validé par le client",
        prixFinalTTC: unitPrice,
        totalFinalTTC: Number(line.quantite || 0) * unitPrice,
      };
    });

    const confirmedLinesForDevis = allDevisLines.filter((line) => line.confirmedByClient);

    if (confirmedLinesForDevis.length === 0) {
      return alert("Coche au moins une pièce validée par le client avant de valider le devis.");
    }

    const totalConfirmedTTC = confirmedLinesForDevis.reduce((sum, line) => sum + Number(line.totalFinalTTC || 0), 0);
    const totalConfirmedHT = totalConfirmedTTC / 1.2;
    const tvaConfirmed = totalConfirmedTTC - totalConfirmedHT;
    const totalAllTTC = allDevisLines.reduce((sum, line) => sum + Number(line.totalFinalTTC || 0), 0);

    const savedDevisPayload = {
      id: editingDevisId || Date.now(),
      ...devisForm,
      numero,
      lignes: confirmedLinesForDevis,
      sousTotalHT: totalConfirmedHT,
      sousTotalTTC: totalConfirmedTTC,
      remiseHT: 0,
      remiseTTC: 0,
      totalHT: totalConfirmedHT,
      tva: tvaConfirmed,
      totalTTC: totalConfirmedTTC,
      totalValideClientTTC: totalConfirmedTTC,
      status: "Archivé",
      createdBy: currentUser?.name || "-",
      createdAt: editingDevisId
        ? devis.find((d) => d.id === editingDevisId)?.createdAt || new Date().toLocaleString("fr-FR")
        : new Date().toLocaleString("fr-FR"),
      updatedAt: new Date().toLocaleString("fr-FR"),
    };

    try {
      

      let savedDevis;

      if (editingDevisId) {
        savedDevis = await updateDevisInDb(editingDevisId, savedDevisPayload);
        setDevis(devis.map((d) => (d.id === editingDevisId ? savedDevis : d)));
        addHistory("Modification devis validé", `${numero} — ${devisForm.client}`);
      } else {
        savedDevis = await insertDevisInDb(savedDevisPayload);
        setDevis([savedDevis, ...devis]);
        addHistory("Devis validé", `${numero} — ${devisForm.client}`);
      }



      resetDevisDraft();
    } catch (error) {
      console.error("Erreur enregistrement devis/devis", error);
      alert("Erreur Supabase : impossible d'enregistrer le devis.");
    }
  }

  function editDevis(d) {
    setEditingDevisId(d.id);
    setDevisForm({
      numero: d.numero,
      client: d.client,
      date: d.date,
      marque: d.marque,
      modele: d.modele,
      plaque: d.plaque,
      vin: d.vin || "",
      telephone: d.telephone || "",
      origineDemande: d.origineDemande || "",
      demandeId: d.demandeId || "",
      notesInternes: d.notesInternes || "",
      remiseType: d.remiseType || "pourcentage",
      remiseValue: d.remiseValue || "",
    });
    setDevisLines(d.lignes || []);
    setSelectedDevis(null);
    setModuleActif("Devis");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteDevis(id) {
    if (!isAdmin) return alert("Seul l'administrateur peut supprimer un devis.");
    const d = devis.find((x) => x.id === id);
    if (!window.confirm(`Supprimer le devis ${d?.numero} ?`)) return;
    setDevis(devis.filter((x) => x.id !== id));
    if (selectedDevis?.id === id) setSelectedDevis(null);
    if (editingDevisId === id) resetDevisDraft();
    addHistory("Suppression devis", `${d?.numero} — ${d?.client}`);
  }
  function printDevis(d) {
    const lignes = (d.lignes || [])
      .map(
        (l, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${l.designation || ""}</td>
          <td>${l.quantite || 0}</td>
          <td>${Number(l.prixTTC || 0).toFixed(2)} €</td>
          <td>${(Number(l.quantite || 0) * Number(l.prixTTC || 0)).toFixed(2)} €</td>
        </tr>
      `
      )
      .join("");

    const win = window.open("", "_blank");

    win.document.write(`
      <html>
        <head>
          <title>${d.numero} - ${ENTREPRISE.nom}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #10234d; background: #fff; margin: 0; font-size: 12px; }
            .page { min-height: calc(297mm - 28mm); display: flex; flex-direction: column; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #123f8f; padding-bottom: 12px; margin-bottom: 14px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .brand img { width: 78px; height: 78px; object-fit: contain; }
            .brand h1 { margin: 0; color: #123f8f; font-size: 22px; letter-spacing: .4px; }
            .brand p { margin: 3px 0; color: #444; font-size: 10.5px; font-weight: bold; }
            .doc-title { text-align: right; }
            .doc-title h2 { margin: 0; color: #123f8f; font-size: 26px; }
            .doc-title p { margin: 4px 0; font-size: 11px; }
            .infos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
            .box { border: 1px solid #d9e3f2; border-radius: 10px; padding: 9px 11px; page-break-inside: avoid; }
            .box h3 { margin: 0 0 6px; color: #123f8f; font-size: 14px; }
            .box p { margin: 3px 0; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: auto; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            th { background: #123f8f; color: white; text-align: left; padding: 8px; font-size: 11px; }
            td { border: 1px solid #d9e3f2; padding: 7px; font-size: 11px; }
            .content { flex: 1; }
            .bottomBlock { margin-top: auto; page-break-inside: avoid; }
            .totals { width: 330px; margin-left: auto; margin-top: 16px; border: 1px solid #d9e3f2; border-radius: 12px; overflow: hidden; page-break-inside: avoid; }
            .totals div { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #d9e3f2; font-weight: bold; font-size: 11px; }
            .totals .discount { color: #dc2626; }
            .totals .ttc { background: #000; color: white; font-size: 15px; padding: 10px 12px; }
            .footer { margin-top: 18px; border-top: 2px solid #123f8f; padding-top: 8px; text-align: center; font-size: 10px; color: #555; line-height: 1.5; page-break-inside: avoid; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                <img src="${logo}" />
                <div>
                  <h1>${ENTREPRISE.nom}</h1>
                  <p>📍 ${ENTREPRISE.adresse}</p>
                  <p>📧 ${ENTREPRISE.email}</p>
                  <p>☎ ${ENTREPRISE.telephone} — WhatsApp ${ENTREPRISE.whatsapp}</p>
                </div>
              </div>
              <div class="doc-title">
                <h2>DEVIS</h2>
                <p><strong>N° :</strong> ${d.numero}</p>
                <p><strong>Date :</strong> ${d.date || ""}</p>
              </div>
            </div>
            <div class="content">
              <div class="infos">
                <div class="box"><h3>Client</h3><p><strong>Nom :</strong> ${d.client || ""}</p></div>
                <div class="box">
                  <h3>Véhicule</h3>
                  <p><strong>Marque :</strong> ${d.marque || ""}</p>
                  <p><strong>Modèle :</strong> ${d.modele || ""}</p>
                  <p><strong>Immatriculation :</strong> ${d.plaque || ""}</p><p><strong>VIN :</strong> ${d.vin || ""}</p><p><strong>Téléphone :</strong> ${d.telephone || ""}</p>
                </div>
              </div>
              <div class="box">
                <h3>Détail du devis</h3>
                <table>
                  <thead><tr><th>N°</th><th>Désignation</th><th>Quantité</th><th>Prix TTC</th><th>Total TTC</th></tr></thead>
                  <tbody>${lignes}</tbody>
                </table>
              </div>
            </div>
            <div class="bottomBlock">
              <div class="totals">
                <div><span>Sous-total HT</span><span>${Number(d.sousTotalHT || d.totalHT || 0).toFixed(2)} €</span></div>
                <div class="discount"><span>Remise HT</span><span>- ${Number(d.remiseHT || 0).toFixed(2)} €</span></div>
                <div><span>Total HT</span><span>${Number(d.totalHT || 0).toFixed(2)} €</span></div>
                <div><span>TVA 20%</span><span>${Number(d.tva || 0).toFixed(2)} €</span></div>
                <div class="ttc"><span>Total TTC</span><span>${Number(d.totalTTC || 0).toFixed(2)} €</span></div>
              </div>
              <div class="footer">
                ${ENTREPRISE.nom} — ${ENTREPRISE.adresse}<br/>
                Email : ${ENTREPRISE.email} — Téléphone : ${ENTREPRISE.telephone} — WhatsApp : ${ENTREPRISE.whatsapp}<br/>
                TVA : ${ENTREPRISE.tva}
              </div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);

    win.document.close();
    addHistory("Impression devis", `${d.numero} — ${d.client}`);
  }

  function archiveOrder(piece, source) {
    const archive = {
      id: Date.now(),
      source,
      designation: piece.designation || "",
      reference: piece.reference || piece.refInterne || piece.refOrigine || "",
      quantite: piece.quantite || "",
      fournisseur: piece.fournisseur || "",
      commentaire: piece.commentaire || "",
      image: piece.image || "",
      famille: piece.famille || "",
      sousFamille: piece.sousFamille || "",
      date: new Date().toLocaleString("fr-FR"),
      user: currentUser?.name || currentUser?.login || "-",
    };
    setOrderArchives((prev) => [archive, ...prev]);
    return archive;
  }

  function commanderAutoPiece(id) {
    const piece = pieces.find((p) => p.id === id);
    if (!piece) return;
    archiveOrder(piece, "Automatique stock");
    setOrderedAutoIds((prev) => [...prev, id]);
    addHistory("Pièce commandée", `${piece.designation} — archivée dans commandes passées`);
  }

  function changeOrderForm(e) {
    setOrderForm({ ...orderForm, [e.target.name]: e.target.value });
  }

  function addOrUpdateOrder(e) {
    e.preventDefault();
    if (!orderForm.designation) return alert("Nom de la pièce obligatoire.");
    if (editingOrderId) {
      setManualOrders(manualOrders.map((order) => (order.id === editingOrderId ? { ...order, ...orderForm } : order)));
      addHistory("Modification commande manuelle", orderForm.designation);
      cancelEditOrder();
      return;
    }
    const newOrder = { id: Date.now(), ...orderForm, createdBy: currentUser?.login, createdAt: new Date().toLocaleString("fr-FR") };
    setManualOrders([newOrder, ...manualOrders]);
    addHistory("Ajout commande manuelle", orderForm.designation);
    setOrderForm({ designation: "", reference: "", quantite: "", fournisseur: "", commentaire: "" });
  }

  function startEditOrder(order) {
    setEditingOrderId(order.id);
    setOrderForm({
      designation: order.designation || "",
      reference: order.reference || "",
      quantite: order.quantite || "",
      fournisseur: order.fournisseur || "",
      commentaire: order.commentaire || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditOrder() {
    setEditingOrderId(null);
    setOrderForm({ designation: "", reference: "", quantite: "", fournisseur: "", commentaire: "" });
  }

  function deleteManualOrder(id) {
    const order = manualOrders.find((o) => o.id === id);
    setManualOrders(manualOrders.filter((o) => o.id !== id));
    if (order) addHistory("Suppression commande manuelle", order.designation);
  }

  function markManualOrderDone(id) {
    const order = manualOrders.find((o) => o.id === id);
    if (!order) return;
    archiveOrder(order, "Manuelle");
    setManualOrders(manualOrders.filter((o) => o.id !== id));
    addHistory("Commande manuelle archivée", order.designation);
  }

  function printOrders() {
    const rows = allOrders.map((p, i) => `
      <tr>
        <td>${i + 1}</td><td>${p.designation || ""}</td><td>${p.reference || p.refInterne || p.refOrigine || ""}</td>
        <td>${p.quantite || ""}</td><td>${p.fournisseur || ""}</td><td>${p.orderType === "auto" ? "Automatique" : "Manuelle"}</td>
      </tr>`).join("");
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Bon de commande</title>
      <style>
        body{font-family:Arial;padding:30px;color:#10234d}
        .header{text-align:center;border-bottom:4px solid #123f8f;padding-bottom:20px;margin-bottom:25px}
        h1{color:#123f8f;margin:0} table{width:100%;border-collapse:collapse;margin-top:20px}
        th{background:#123f8f;color:white;padding:10px;text-align:left} td{border:1px solid #ddd;padding:10px}
      </style></head><body>
      <div class="header"><h1>${ENTREPRISE.nom}</h1><p>Bon de commande fournisseur</p><p>${new Date().toLocaleString("fr-FR")}</p></div>
      <table><thead><tr><th>N°</th><th>Pièce</th><th>Référence</th><th>Quantité</th><th>Fournisseur</th><th>Type</th></tr></thead><tbody>${rows || `<tr><td colspan="6">Aucune pièce à commander.</td></tr>`}</tbody></table>
      <script>window.print();</script>
      </body></html>
    `);

    win.document.close();
    addHistory("Impression bon de commande", `${allOrders.length} pièce(s) imprimée(s)`);
  }

  function changeOrderArchivePeriod(e) {
    setOrderArchivePeriod({ ...orderArchivePeriod, [e.target.name]: e.target.value });
  }

  function printOrderArchivesList(archives, title = "Archives commandes passées") {
    const rows = (archives || [])
      .map(
        (archive, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${archive.designation || ""}</td>
          <td>${archive.reference || "-"}</td>
          <td>${archive.quantite || "-"}</td>
          <td>${archive.fournisseur || "-"}</td>
          <td>${archive.source || "-"}</td>
          <td>${archive.date || "-"}</td>
        </tr>
      `
      )
      .join("");

    const win = window.open("", "_blank");

    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #10234d; margin: 0; background: #fff; }
            .page { min-height: calc(297mm - 28mm); display: flex; flex-direction: column; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #123f8f; padding-bottom: 12px; margin-bottom: 16px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .brand img { width: 72px; height: 72px; object-fit: contain; }
            h1 { margin: 0; color: #123f8f; font-size: 21px; }
            h2 { margin: 0; color: #123f8f; font-size: 24px; text-align: right; }
            p { margin: 4px 0; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #123f8f; color: white; padding: 8px; text-align: left; font-size: 11px; }
            td { border: 1px solid #d9e3f2; padding: 7px; font-size: 11px; }
            .footer { margin-top: auto; border-top: 2px solid #123f8f; padding-top: 8px; text-align: center; font-size: 10px; color: #555; line-height: 1.5; page-break-inside: avoid; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                <img src="${logo}" />
                <div>
                  <h1>${ENTREPRISE.nom}</h1>
                  <p>📍 ${ENTREPRISE.adresse}</p>
                  <p>📧 ${ENTREPRISE.email}</p>
                  <p>☎ ${ENTREPRISE.telephone} — WhatsApp ${ENTREPRISE.whatsapp}</p>
                </div>
              </div>
              <div>
                <h2>${title}</h2>
                <p><strong>Date impression :</strong> ${new Date().toLocaleString("fr-FR")}</p>
                <p><strong>Total archives :</strong> ${archives.length}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Pièce</th>
                  <th>Référence</th>
                  <th>Quantité</th>
                  <th>Fournisseur</th>
                  <th>Source</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>${rows || `<tr><td colspan="7">Aucune archive.</td></tr>`}</tbody>
            </table>

            <div class="footer">
              ${ENTREPRISE.nom} — ${ENTREPRISE.adresse}<br/>
              Email : ${ENTREPRISE.email} — Téléphone : ${ENTREPRISE.telephone} — WhatsApp : ${ENTREPRISE.whatsapp}<br/>
              TVA : ${ENTREPRISE.tva}
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);

    win.document.close();
    addHistory("Impression archives commandes", `${title} — ${archives.length} archive(s)`);
  }

  function printSingleOrderArchive(archive) {
    printOrderArchivesList([archive], `Archive commande — ${archive.designation || ""}`);
  }

  function printOrderArchivesByPeriod() {
    if (!orderArchivePeriod.debut || !orderArchivePeriod.fin) {
      return alert("Choisis une date de début et une date de fin.");
    }

    const start = new Date(orderArchivePeriod.debut);
    const end = new Date(orderArchivePeriod.fin);
    end.setHours(23, 59, 59, 999);

    const filtered = orderArchives.filter((archive) => {
      const archiveDate = new Date(archive.date);
      return archiveDate >= start && archiveDate <= end;
    });

    if (filtered.length === 0) {
      return alert("Aucune archive trouvée sur cette période.");
    }

    printOrderArchivesList(
      filtered,
      `Archives commandes du ${new Date(orderArchivePeriod.debut).toLocaleDateString("fr-FR")} au ${new Date(orderArchivePeriod.fin).toLocaleDateString("fr-FR")}`
    );
  }

  function startEditOrderArchive(archive) {
    setEditingOrderArchiveId(archive.id);
    setOrderForm({
      designation: archive.designation || "",
      reference: archive.reference || "",
      quantite: archive.quantite || "",
      fournisseur: archive.fournisseur || "",
      commentaire: archive.commentaire || "",
    });
    setSelectedArchive(null);
    setModuleActif("Stock à commander");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addOrUpdateOrderArchive(e) {
    e.preventDefault();

    if (!orderForm.designation) return alert("Nom de la pièce obligatoire.");

    if (editingOrderArchiveId) {
      setOrderArchives(
        orderArchives.map((archive) =>
          archive.id === editingOrderArchiveId
            ? {
                ...archive,
                designation: orderForm.designation,
                reference: orderForm.reference,
                quantite: orderForm.quantite,
                fournisseur: orderForm.fournisseur,
                commentaire: orderForm.commentaire,
                updatedAt: new Date().toLocaleString("fr-FR"),
                updatedBy: currentUser?.name || "-",
              }
            : archive
        )
      );

      addHistory("Modification archive commande", orderForm.designation);
      cancelEditOrderArchive();
      return;
    }

    const archive = {
      id: Date.now(),
      source: "Archive ajoutée manuellement",
      designation: orderForm.designation,
      reference: orderForm.reference,
      quantite: orderForm.quantite,
      fournisseur: orderForm.fournisseur,
      commentaire: orderForm.commentaire,
      date: new Date().toLocaleString("fr-FR"),
      user: currentUser?.name || currentUser?.login || "-",
    };

    setOrderArchives([archive, ...orderArchives]);
    addHistory("Ajout archive commande", orderForm.designation);
    setOrderForm({ designation: "", reference: "", quantite: "", fournisseur: "", commentaire: "" });
  }

  function cancelEditOrderArchive() {
    setEditingOrderArchiveId(null);
    setOrderForm({ designation: "", reference: "", quantite: "", fournisseur: "", commentaire: "" });
  }

  function deleteOrderArchive(id) {
    if (!isAdmin) return alert("Seul l'administrateur peut supprimer une archive.");

    const archive = orderArchives.find((a) => a.id === id);
    if (!window.confirm(`Supprimer l'archive ${archive?.designation || ""} ?`)) return;

    setOrderArchives(orderArchives.filter((a) => a.id !== id));
    if (selectedArchive?.id === id) setSelectedArchive(null);
    if (editingOrderArchiveId === id) cancelEditOrderArchive();

    addHistory("Suppression archive commande", archive?.designation || "-");
  }


  function changeClientForm(e) {
    setClientForm({ ...clientForm, [e.target.name]: e.target.value });
  }

  function changeClientPieceForm(e) {
    setClientPieceForm({ ...clientPieceForm, [e.target.name]: e.target.value });
  }

  function changeClientPaymentForm(e) {
    setClientPaymentForm({ ...clientPaymentForm, [e.target.name]: e.target.value });
  }

  function getClientTotal(client) {
    return (client.pieces || []).reduce((sum, piece) => sum + Number(piece.prix || 0) * Number(piece.quantite || 0), 0);
  }

  function getClientArchivedTotal(client) {
    return (client.archives || []).reduce((sum, archive) => sum + Number(archive.total || archive.montant || 0), 0);
  }

  function printClientArchive(archive) {
    if (!selectedClient || !archive) return;

    const rows = (archive.pieces || [])
      .map(
        (piece, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${piece.designation || ""}</td>
          <td>${piece.reference || "-"}</td>
          <td>${piece.quantite || 1}</td>
          <td>${Number(piece.prixPaye || piece.prix || 0).toFixed(2)} €</td>
          <td>${piece.paiementStatut || "-"}</td>
        </tr>
      `
      )
      .join("");

    const win = window.open("", "_blank");

    win.document.write(`
      <html>
        <head>
          <title>Archive client - ${selectedClient.nom}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #10234d; margin: 0; background: #fff; }
            .page { min-height: calc(297mm - 28mm); display: flex; flex-direction: column; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #123f8f; padding-bottom: 12px; margin-bottom: 16px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .brand img { width: 72px; height: 72px; object-fit: contain; }
            h1 { margin: 0; color: #123f8f; font-size: 21px; }
            h2 { margin: 0; color: #123f8f; font-size: 24px; text-align: right; }
            p { margin: 4px 0; font-size: 11px; }
            .box { border: 1px solid #d9e3f2; border-radius: 10px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #123f8f; color: white; padding: 8px; text-align: left; font-size: 11px; }
            td { border: 1px solid #d9e3f2; padding: 7px; font-size: 11px; }
            .total { margin-top: 16px; margin-left: auto; width: 300px; background: #000; color: white; border-radius: 10px; padding: 12px; display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; page-break-inside: avoid; }
            .footer { margin-top: auto; border-top: 2px solid #123f8f; padding-top: 8px; text-align: center; font-size: 10px; color: #555; line-height: 1.5; page-break-inside: avoid; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                <img src="${logo}" />
                <div>
                  <h1>${ENTREPRISE.nom}</h1>
                  <p>📍 ${ENTREPRISE.adresse}</p>
                  <p>📧 ${ENTREPRISE.email}</p>
                  <p>☎ ${ENTREPRISE.telephone} — WhatsApp ${ENTREPRISE.whatsapp}</p>
                </div>
              </div>
              <div>
                <h2>ARCHIVE CLIENT</h2>
                <p><strong>Date :</strong> ${archive.date || ""}</p>
                <p><strong>Type :</strong> ${archive.type || ""}</p>
              </div>
            </div>

            <div class="grid">
              <div class="box">
                <h3>Client</h3>
                <p><strong>Nom :</strong> ${selectedClient.nom || ""}</p>
                <p><strong>Téléphone :</strong> ${selectedClient.telephone || "-"}</p>
                <p><strong>Adresse :</strong> ${selectedClient.adresse || "-"}</p>
              </div>

              <div class="box">
                <h3>Paiement</h3>
                <p><strong>Mode :</strong> ${archive.mode || "-"}</p>
                <p><strong>Commentaire :</strong> ${archive.commentaire || "-"}</p>
                <p><strong>Validé par :</strong> ${archive.user || "-"}</p>
              </div>
            </div>

            <div class="box">
              <h3>Détail des pièces</h3>
              <table>
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Désignation</th>
                    <th>Référence</th>
                    <th>Qté</th>
                    <th>Payé</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>

            <div class="total">
              <span>Total archive</span>
              <span>${Number(archive.total || archive.montant || 0).toFixed(2)} €</span>
            </div>

            <div class="footer">
              ${ENTREPRISE.nom} — ${ENTREPRISE.adresse}<br/>
              Email : ${ENTREPRISE.email} — Téléphone : ${ENTREPRISE.telephone} — WhatsApp : ${ENTREPRISE.whatsapp}<br/>
              TVA : ${ENTREPRISE.tva}
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);

    win.document.close();
    addHistory("Impression archive client", `${selectedClient.nom} — ${Number(archive.total || archive.montant || 0).toFixed(2)} €`);
  }

  function startEditClientArchive(archive) {
    if (!selectedClient || !archive) return;

    setEditingClientArchiveId(archive.id);
    setClientPaymentForm({
      montant: String(Number(archive.total || archive.montant || 0)),
      mode: archive.mode || "Espèces",
      commentaire: archive.commentaire || "",
    });

    setSelectedClientArchive(null);
    setModuleActif("Clients");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveClientArchiveEdit(e) {
    e.preventDefault();

    if (!selectedClient) return alert("Sélectionne un client.");
    if (!editingClientArchiveId) return alert("Aucune archive en modification.");

    const montant = Number(clientPaymentForm.montant || 0);
    if (montant <= 0) return alert("Montant invalide.");

    const oldArchive = (selectedClient.archives || []).find((archive) => archive.id === editingClientArchiveId);
    if (!oldArchive) return alert("Archive introuvable.");

    const archivePayload = {
      ...oldArchive,
      montant,
      total: montant,
      mode: clientPaymentForm.mode,
      commentaire: clientPaymentForm.commentaire,
      updatedAt: new Date().toLocaleString("fr-FR"),
      updatedBy: currentUser?.name || "-",
    };

    try {
      const savedArchive = await updateClientPaymentInDb(editingClientArchiveId, archivePayload);

      const freshClients = await loadClientsFromDb();
      if (freshClients) {
        setClients(freshClients);
        setSelectedClient(freshClients.find((c) => String(c.id) === String(selectedClient.id)));
      } else {
        const updatedClients = clients.map((client) =>
          client.id === selectedClient.id
            ? {
                ...client,
                archives: (client.archives || []).map((archive) =>
                  archive.id === editingClientArchiveId ? savedArchive : archive
                ),
              }
            : client
        );
        setClients(updatedClients);
        setSelectedClient(updatedClients.find((c) => c.id === selectedClient.id));
      }

      setEditingClientArchiveId(null);
      setClientPaymentForm({ montant: "", mode: "Espèces", commentaire: "" });

      addHistory("Modification archive client", `${selectedClient.nom} — ${montant.toFixed(2)} €`);
    } catch (error) {
      console.error("Erreur modification paiement client", error);
      alert("Erreur Supabase : archive client non modifiée.");
    }
  }

    function cancelClientArchiveEdit() {
    setEditingClientArchiveId(null);
    setClientPaymentForm({ montant: "", mode: "Espèces", commentaire: "" });
  }

  async function deleteClientArchive(archiveId) {
    if (!selectedClient) return;
    if (!isAdmin) return alert("Seul l'administrateur peut supprimer une archive.");

    const archive = (selectedClient.archives || []).find((a) => a.id === archiveId);
    if (!window.confirm("Supprimer cette archive client ?")) return;

    try {
      await deleteClientPaymentInDb(archiveId);

      const freshClients = await loadClientsFromDb();
      if (freshClients) {
        setClients(freshClients);
        setSelectedClient(freshClients.find((c) => String(c.id) === String(selectedClient.id)));
      } else {
        const updatedClients = clients.map((client) =>
          client.id === selectedClient.id
            ? { ...client, archives: (client.archives || []).filter((a) => a.id !== archiveId) }
            : client
        );
        setClients(updatedClients);
        setSelectedClient(updatedClients.find((c) => c.id === selectedClient.id));
      }

      setSelectedClientArchive(null);

      addHistory(
        "Suppression archive client",
        `${selectedClient.nom} — ${Number(archive?.total || archive?.montant || 0).toFixed(2)} €`
      );
    } catch (error) {
      console.error("Erreur suppression paiement client", error);
      alert("Erreur Supabase : archive non supprimée.");
    }
  }

    function getSelectedClientPaymentTotal() {
    if (!selectedClient) return 0;
    return (selectedClient.pieces || [])
      .filter((p) => selectedClientPieceIds.includes(p.id))
      .reduce((sum, p) => sum + Number(p.prix || 0) * Number(p.quantite || 1), 0);
  }

  function toggleClientPieceForPayment(pieceId) {
    setSelectedClientPieceIds((prev) => (prev.includes(pieceId) ? prev.filter((id) => id !== pieceId) : [...prev, pieceId]));
  }

  function clearClientPaymentSelection() {
    setSelectedClientPieceIds([]);
  }

  async function addOrUpdateClient(e) {
    e.preventDefault();
    if (!clientForm.nom) return alert("Nom client obligatoire.");

    try {
      if (editingClientId) {
        const oldClient = clients.find((client) => client.id === editingClientId);
        const updatedClient = await updateClientInDb(editingClientId, {
          ...oldClient,
          nom: clientForm.nom,
          telephone: clientForm.telephone,
          adresse: clientForm.adresse,
        });

        const freshClients = await loadClientsFromDb();
        if (freshClients) {
          setClients(freshClients);
          if (selectedClient?.id === editingClientId) {
            setSelectedClient(freshClients.find((c) => String(c.id) === String(editingClientId)));
          }
        } else {
          const updatedClients = clients.map((client) => (client.id === editingClientId ? updatedClient : client));
          setClients(updatedClients);
          if (selectedClient?.id === editingClientId) setSelectedClient(updatedClients.find((c) => c.id === editingClientId));
        }

        addHistory("Modification client", clientForm.nom);
        cancelClientEdit();
        return;
      }

      const newClient = await insertClientInDb({
        nom: clientForm.nom,
        telephone: clientForm.telephone,
        adresse: clientForm.adresse,
      });

      const freshClients = await loadClientsFromDb();
      if (freshClients) {
        setClients(freshClients);
        setSelectedClient(freshClients.find((c) => String(c.id) === String(newClient.id)) || newClient);
      } else {
        setClients([newClient, ...clients]);
        setSelectedClient(newClient);
      }

      addHistory("Création client", newClient.nom);
      setClientForm({ nom: "", telephone: "", adresse: "" });
    } catch (error) {
      console.error("Erreur client Supabase", error);
      alert("Erreur Supabase : client non enregistré.");
    }
  }

    function editClient(client) {
    setEditingClientId(client.id);
    setClientForm({ nom: client.nom || "", telephone: client.telephone || "", adresse: client.adresse || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelClientEdit() {
    setEditingClientId(null);
    setClientForm({ nom: "", telephone: "", adresse: "" });
  }

  async function deleteClient(id) {
    if (!isAdmin) return alert("Seul l'administrateur peut supprimer un client.");
    const client = clients.find((c) => c.id === id);
    if (!window.confirm(`Supprimer le client ${client?.nom} ?`)) return;

    try {
      await deleteClientInDb(id);

      setClients(clients.filter((c) => c.id !== id));
      if (selectedClient?.id === id) setSelectedClient(null);
      if (editingClientId === id) cancelClientEdit();
      addHistory("Suppression client", client?.nom || "-");
    } catch (error) {
      console.error("Erreur suppression client", error);
      alert("Erreur Supabase : client non supprimé.");
    }
  }

    function openClient(client) {
    setSelectedClient(client);
    setEditingClientPieceId(null);
    setSelectedClientPieceIds([]);
    setClientPieceForm({ designation: "", reference: "", quantite: "1", prix: "" });
  }

  async function addOrUpdateClientPiece(e) {
    e.preventDefault();
    if (!selectedClient) return alert("Sélectionne un client.");
    if (!clientPieceForm.designation) return alert("Nom de la pièce obligatoire.");
    if (!clientPieceForm.prix) return alert("Prix obligatoire.");

    try {
      if (editingClientPieceId) {
        const savedPiece = await updateClientPieceInDb(
          editingClientPieceId,
          {
            designation: clientPieceForm.designation,
            reference: clientPieceForm.reference,
            quantite: Number(clientPieceForm.quantite || 1),
            prix: Number(clientPieceForm.prix || 0),
            statut: "En cours",
          },
          selectedClient.id
        );

        const freshClients = await loadClientsFromDb();
        if (freshClients) {
          setClients(freshClients);
          setSelectedClient(freshClients.find((c) => String(c.id) === String(selectedClient.id)));
        } else {
          const updatedClients = clients.map((client) => {
            if (client.id !== selectedClient.id) return client;
            return {
              ...client,
              pieces: (client.pieces || []).map((piece) => (piece.id === editingClientPieceId ? savedPiece : piece)),
            };
          });
          setClients(updatedClients);
          setSelectedClient(updatedClients.find((c) => c.id === selectedClient.id));
        }

        addHistory("Modification pièce client", `${selectedClient.nom} — ${clientPieceForm.designation}`);
        cancelClientPieceEdit();
        return;
      }

      const savedPiece = await insertClientPieceInDb(selectedClient.id, {
        designation: clientPieceForm.designation,
        reference: clientPieceForm.reference,
        quantite: Number(clientPieceForm.quantite || 1),
        prix: Number(clientPieceForm.prix || 0),
        statut: "En cours",
      });

      const freshClients = await loadClientsFromDb();
      if (freshClients) {
        setClients(freshClients);
        setSelectedClient(freshClients.find((c) => String(c.id) === String(selectedClient.id)));
      } else {
        const updatedClients = clients.map((client) =>
          client.id === selectedClient.id ? { ...client, pieces: [savedPiece, ...(client.pieces || [])] } : client
        );
        setClients(updatedClients);
        setSelectedClient(updatedClients.find((c) => c.id === selectedClient.id));
      }

      addHistory("Ajout pièce client", `${selectedClient.nom} — ${savedPiece.designation}`);
      setClientPieceForm({ designation: "", reference: "", quantite: "1", prix: "" });
    } catch (error) {
      console.error("Erreur pièce client Supabase", error);
      alert("Erreur Supabase : pièce client non enregistrée.");
    }
  }

    function editClientPiece(piece) {
    setEditingClientPieceId(piece.id);
    setClientPieceForm({
      designation: piece.designation || "",
      reference: piece.reference || "",
      quantite: piece.quantite || "1",
      prix: piece.prix || "",
    });
  }

  function cancelClientPieceEdit() {
    setEditingClientPieceId(null);
    setClientPieceForm({ designation: "", reference: "", quantite: "1", prix: "" });
  }

  async function deleteClientPiece(pieceId) {
    if (!selectedClient) return;
    const piece = (selectedClient.pieces || []).find((p) => p.id === pieceId);
    if (!window.confirm(`Supprimer la pièce ${piece?.designation} ?`)) return;

    try {
      await deleteClientPieceInDb(pieceId);

      const freshClients = await loadClientsFromDb();
      if (freshClients) {
        setClients(freshClients);
        setSelectedClient(freshClients.find((c) => String(c.id) === String(selectedClient.id)));
      } else {
        const updatedClients = clients.map((client) =>
          client.id === selectedClient.id ? { ...client, pieces: (client.pieces || []).filter((p) => p.id !== pieceId) } : client
        );
        setClients(updatedClients);
        setSelectedClient(updatedClients.find((c) => c.id === selectedClient.id));
      }

      setSelectedClientPieceIds((prev) => prev.filter((id) => id !== pieceId));
      addHistory("Suppression pièce client", `${selectedClient.nom} — ${piece?.designation || "-"}`);
    } catch (error) {
      console.error("Erreur suppression pièce client", error);
      alert("Erreur Supabase : pièce client non supprimée.");
    }
  }

    async function payClientPieces(e) {
    e.preventDefault();
    if (!selectedClient) return alert("Sélectionne un client.");

    const montant = Number(clientPaymentForm.montant || 0);
    if (montant <= 0) return alert("Entre un montant de paiement valide.");
    if (!selectedClient.pieces || selectedClient.pieces.length === 0) return alert("Ce client n’a aucune pièce impayée.");

    let remainingPayment = montant;

    const targets =
      selectedClientPieceIds.length > 0
        ? selectedClient.pieces.filter((p) => selectedClientPieceIds.includes(p.id))
        : selectedClient.pieces;

    if (targets.length === 0) return alert("Sélectionne au moins une pièce ou laisse vide pour paiement automatique.");

    const paidPieces = [];
    const piecesToDelete = [];
    const piecesToUpdate = [];

    selectedClient.pieces.forEach((piece) => {
      const isTarget = targets.some((p) => p.id === piece.id);
      const lineTotal = Number(piece.prix || 0) * Number(piece.quantite || 1);

      if (!isTarget || remainingPayment <= 0) return;

      if (remainingPayment >= lineTotal) {
        paidPieces.push({
          ...piece,
          prixOriginal: lineTotal,
          prixPaye: lineTotal,
          paiementStatut: "Payé totalement",
        });
        piecesToDelete.push(piece.id);
        remainingPayment -= lineTotal;
        return;
      }

      paidPieces.push({
        ...piece,
        prixOriginal: lineTotal,
        prixPaye: remainingPayment,
        paiementStatut: "Payé partiellement",
      });

      piecesToUpdate.push({
        ...piece,
        quantite: 1,
        prix: Number((lineTotal - remainingPayment).toFixed(2)),
        remarquePaiement: `Reste à payer après paiement partiel du ${new Date().toLocaleDateString("fr-FR")}`,
        updatedAt: new Date().toLocaleString("fr-FR"),
      });

      remainingPayment = 0;
    });

    const montantUtilise = Number((montant - remainingPayment).toFixed(2));
    if (paidPieces.length === 0 || montantUtilise <= 0) return alert("Le paiement n’a pu être appliqué à aucune pièce.");

    const paymentArchive = {
      id: Date.now(),
      type: "Paiement client",
      montant: montantUtilise,
      total: montantUtilise,
      mode: clientPaymentForm.mode,
      commentaire: clientPaymentForm.commentaire,
      pieces: paidPieces,
      date: new Date().toLocaleString("fr-FR"),
      user: currentUser?.name || "-",
    };

    try {
      await insertClientPaymentInDb(selectedClient.id, paymentArchive);

      for (const pieceId of piecesToDelete) {
        await deleteClientPieceInDb(pieceId);
      }

      for (const piece of piecesToUpdate) {
        await updateClientPieceInDb(piece.id, piece, selectedClient.id);
      }

      const freshClients = await loadClientsFromDb();
      if (freshClients) {
        setClients(freshClients);
        setSelectedClient(freshClients.find((c) => String(c.id) === String(selectedClient.id)));
      }

      setClientPaymentForm({ montant: "", mode: "Espèces", commentaire: "" });
      setSelectedClientPieceIds([]);

      addHistory("Paiement client", `${selectedClient.nom} — ${montantUtilise.toFixed(2)} € — ${clientPaymentForm.mode}`);
    } catch (error) {
      console.error("Erreur paiement client Supabase", error);
      alert("Erreur Supabase : paiement client non enregistré.");
    }
  }

    async function archiveAllClientPurchases() {
    if (!selectedClient) return;
    if (!selectedClient.pieces || selectedClient.pieces.length === 0) return alert("Aucune pièce à archiver.");

    const total = getClientTotal(selectedClient);

    const archive = {
      id: Date.now(),
      type: "Achats archivés",
      pieces: selectedClient.pieces.map((p) => ({
        ...p,
        prixOriginal: Number(p.prix || 0) * Number(p.quantite || 1),
        prixPaye: Number(p.prix || 0) * Number(p.quantite || 1),
        paiementStatut: "Archivé sans paiement",
      })),
      total,
      montant: total,
      mode: "Archive",
      commentaire: "Archivage manuel des achats client",
      date: new Date().toLocaleString("fr-FR"),
      user: currentUser?.name || "-",
    };

    try {
      await insertClientPaymentInDb(selectedClient.id, archive);

      for (const piece of selectedClient.pieces) {
        await deleteClientPieceInDb(piece.id);
      }

      const freshClients = await loadClientsFromDb();
      if (freshClients) {
        setClients(freshClients);
        setSelectedClient(freshClients.find((c) => String(c.id) === String(selectedClient.id)));
      }

      setSelectedClientPieceIds([]);
      addHistory("Achats client archivés", `${selectedClient.nom} — ${total.toFixed(2)} €`);
    } catch (error) {
      console.error("Erreur archivage client Supabase", error);
      alert("Erreur Supabase : archivage client non enregistré.");
    }
  }

    function changeUserForm(e) {
    setUserForm({ ...userForm, [e.target.name]: e.target.value });
  }

  async function addOrUpdateUser(e) {
    e.preventDefault();

    if (!isAdmin) return alert("Seul l'administrateur peut gérer les comptes.");
    if (!userForm.name || !userForm.login || !userForm.password) {
      return alert("Complète le nom, l'identifiant et le mot de passe.");
    }

    const normalizedLogin = userForm.login.trim().toLowerCase();

    const exists = users.some(
      (u) => String(u.login).trim().toLowerCase() === normalizedLogin && u.id !== editingUserId
    );

    if (exists) return alert("Cet identifiant existe déjà.");

    try {
      if (editingUserId) {
        const oldUser = users.find((u) => u.id === editingUserId);

        if (oldUser?.login === "admin" && normalizedLogin !== "admin") {
          return alert("L'identifiant du compte admin principal doit rester admin.");
        }

        const { data: updatedUser, error } = await supabase
          .from("users_app")
          .update({
            name: userForm.name,
            login: normalizedLogin,
            password: userForm.password,
            role: userForm.role,
          })
          .eq("id", editingUserId)
          .select()
          .single();

        if (error) throw error;

        const updatedUsers = users.map((u) => (u.id === editingUserId ? updatedUser : u));
        setUsers(updatedUsers);

        if (currentUser?.id === editingUserId) setCurrentUser(updatedUser);

        addHistory("Modification compte", `${updatedUser.name} (${updatedUser.login}) — ${updatedUser.role}`);
        cancelEditUser();
        return;
      }

      const { data: newUser, error } = await supabase
        .from("users_app")
        .insert({
          name: userForm.name,
          login: normalizedLogin,
          password: userForm.password,
          role: userForm.role,
        })
        .select()
        .single();

      if (error) throw error;

      setUsers([...users, newUser]);
      addHistory("Création compte", `${newUser.name} (${newUser.login}) — ${newUser.role}`);
      setUserForm({ name: "", login: "", password: "", role: "Salarié" });
    } catch (error) {
      console.error("Erreur gestion compte Supabase", error);
      alert("Erreur Supabase : le compte n'a pas été enregistré. Vérifie la table users_app.");
    }
  }

  function startEditUser(user) {
    if (!isAdmin) return alert("Seul l'administrateur peut modifier les comptes.");
    setEditingUserId(user.id);
    setUserForm({ name: user.name, login: user.login, password: user.password, role: user.role });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditUser() {
    setEditingUserId(null);
    setUserForm({ name: "", login: "", password: "", role: "Salarié" });
  }

  async function deleteUser(id) {
    if (!isAdmin) return alert("Seul l'administrateur peut supprimer des comptes.");

    const target = users.find((u) => u.id === id);
    if (target?.login === "admin") return alert("Le compte admin principal ne peut pas être supprimé.");
    if (!window.confirm(`Supprimer le compte de ${target?.name} ?`)) return;

    try {
      const { error } = await supabase.from("users_app").delete().eq("id", id);
      if (error) throw error;

      setUsers(users.filter((u) => u.id !== id));

      if (editingUserId === id) cancelEditUser();
      if (target) addHistory("Suppression compte", `${target.name} (${target.login})`);
    } catch (error) {
      console.error("Erreur suppression compte Supabase", error);
      alert("Erreur Supabase : le compte n'a pas été supprimé.");
    }
  }

  function exportBackup() {
    const data = JSON.stringify({ users, pieces, history, manualOrders, orderedAutoIds, orderArchives, devis, clients, date: new Date().toLocaleString("fr-FR") }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "SAUVEGARDE_THE_KING_PIECES_AUTOS.json";
    a.click();
  }

  function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const data = JSON.parse(evt.target.result);
        setUsers(data.users?.length ? data.users : DEFAULT_USERS);
        setPieces(data.pieces || []);
        setHistory(data.history || []);
        setManualOrders(data.manualOrders || []);
        setOrderedAutoIds(data.orderedAutoIds || []);
        setOrderArchives(data.orderArchives || []);
        setDevis(data.devis || []);
        setClients(data.clients || []);
        alert("Sauvegarde restaurée avec succès.");
      } catch {
        alert("Fichier de sauvegarde invalide.");
      }
    };
    reader.readAsText(file);
  }

  if (!appLoaded) {
    return (
      <div className="loginPage" style={{ backgroundImage: `url(${loginBg})` }}>
        <div className="loginOverlay"></div>
        <div className="loginCard">
          <div className="loginLogoCircle"><img src={logo} alt={ENTREPRISE.nom} /></div>
          <h1>{ENTREPRISE.nom}</h1>
          <p>Chargement des données multi-PC...</p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="loginPage" style={{ backgroundImage: `url(${loginBg})` }}>
        <div className="loginOverlay"></div>
        <form className="loginCard" onSubmit={handleLogin}>
          <div className="loginLogoCircle"><img src={logo} alt={ENTREPRISE.nom} /></div>
          <h1>{ENTREPRISE.nom}</h1>
          <p>Connexion au logiciel de gestion</p>
          <div className="loginFields">
            <label>Identifiant</label>
            <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="admin" />
            <label>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="admin123" />
          </div>
          <button className="loginButton" type="submit">Se connecter</button>
          <button className="resetLoginButton" type="button" onClick={resetLogin}>Réinitialiser admin</button>
          <div className="loginHelp">Identifiant admin : <b>admin</b> — Mot de passe : <b>admin123</b></div>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logoBlock">
          <img src={logo} alt={ENTREPRISE.nom} />
          <h1>{ENTREPRISE.nom}</h1>
          <p>Connecté : {currentUser?.name}</p>
        </div>

        <nav className="moduleMenu">
          {visibleModules.map((module) => (
            <button key={module} className={moduleActif === module ? "active" : ""} onClick={() => setModuleActif(module)}>
              {module}
            </button>
          ))}
        </nav>

        <div className="backupBox">
          <h3>Sauvegarde</h3>
          <button onClick={exportBackup}>Exporter</button>
          <label>Restaurer<input type="file" accept=".json" onChange={importBackup} hidden /></label>
          <button
            onClick={() => {
              localStorage.removeItem("king_current_user");
              setCurrentUser(null);
              setConnected(false);
              setModuleActif("Stock");
            }}
          >
            Déconnexion
          </button>
        </div>

        <div className="sidebarAlert"><strong>{ruptures.length}</strong><span>pièce(s) à commander</span></div>
      </aside>

      <main className="workspace">
        <header className="topHeader">
          <div>
            <span className="smallBadge">{moduleActif}</span>
            <h2>{moduleActif}</h2>
            <p>Utilisateur : <b>{currentUser?.name}</b> — Rôle : <b>{currentUser?.role}</b></p>
          </div>
          <div className="headerLogo"><img src={logo} alt="Logo" /></div>
        </header>

        {moduleActif === "Stock" && (
          <>
            <section className="searchLine">
              <span>🔎</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche rapide : nom de pièce, référence origine, référence interne, famille..." />
            </section>

            <section className="stats">
              <div><span>Pièces</span><strong>{pieces.length}</strong></div>
              <div><span>Stock total</span><strong>{pieces.reduce((s, p) => s + Number(p.quantite || 0), 0)}</strong></div>
              <div><span>À commander</span><strong>{ruptures.length}</strong></div>
              <div><span>Résultats</span><strong>{results.length}</strong></div>
            </section>
            {devisStockSelection.length > 0 && (
              <section className="panel" style={{ marginBottom: "22px" }}>
                <div className="panelTitle">
                  <span>CL</span>
                  <div>
                    <h3>Liste de recherche client</h3>
                    <p>
                      Ajoute toutes les pièces trouvées ici. Ensuite coche uniquement les pièces validées par le client,
                      puis transfère les pièces confirmées dans le devis.
                    </p>
                  </div>
                </div>

                <div className="actions" style={{ marginBottom: "16px" }}>
                  <button onClick={confirmAllDevisStockSelection}>Tout valider</button>
                  <button onClick={unconfirmAllDevisStockSelection}>Tout dévalider</button>
                  <button onClick={addSelectedPiecesToDevis}>Transférer les pièces validées au devis</button>
                  <button className="delete" onClick={clearDevisStockSelection}>Vider toute la liste</button>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      background: "white",
                      borderRadius: "18px",
                      overflow: "hidden",
                      border: "1px solid rgba(191, 212, 255, 0.85)",
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#123f8f", color: "white" }}>
                        <th style={{ padding: "12px", textAlign: "left" }}>Validé</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Pièce</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Référence</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Tarif</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Qté</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Prix TTC</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Total</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {devisStockSelection.map((item) => (
                        <tr
                          key={`${item.id}-${item.priceType}`}
                          style={{
                            borderBottom: "1px solid #d9e3f2",
                            background: item.confirmed ? "#eaf1ff" : "white",
                          }}
                        >
                          <td style={{ padding: "12px" }}>
                            <input
                              type="checkbox"
                              checked={Boolean(item.confirmed)}
                              onChange={() => toggleConfirmDevisStockSelection(item.id, item.priceType)}
                              style={{ width: "18px", height: "18px" }}
                            />
                          </td>

                          <td style={{ padding: "12px", fontWeight: "900", color: "#08275f" }}>
                            {item.designation}
                          </td>

                          <td style={{ padding: "12px" }}>
                            {item.reference || "-"}
                          </td>

                          <td style={{ padding: "12px" }}>
                            {item.priceType === "pro" ? "Professionnel" : "Particulier"}
                          </td>

                          <td style={{ padding: "12px", width: "90px" }}>
                            <input
                              value={item.quantite}
                              onChange={(e) => updateDevisStockSelectionItem(item.id, item.priceType, "quantite", e.target.value)}
                              style={{
                                width: "80px",
                                border: "1px solid #bfd4ff",
                                borderRadius: "10px",
                                height: "38px",
                                padding: "0 10px",
                              }}
                            />
                          </td>

                          <td style={{ padding: "12px", width: "120px" }}>
                            <input
                              value={item.prixTTC}
                              onChange={(e) => updateDevisStockSelectionItem(item.id, item.priceType, "prixTTC", e.target.value)}
                              style={{
                                width: "110px",
                                border: "1px solid #bfd4ff",
                                borderRadius: "10px",
                                height: "38px",
                                padding: "0 10px",
                              }}
                            />
                          </td>

                          <td style={{ padding: "12px", fontWeight: "900" }}>
                            {(Number(item.quantite || 0) * Number(item.prixTTC || 0)).toFixed(2)} €
                          </td>

                          <td style={{ padding: "12px" }}>
                            <button
                              className="delete"
                              onClick={() => removeFromDevisStockSelection(item.id, item.priceType)}
                            >
                              Retirer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="stats" style={{ marginBottom: 0 }}>
                  <div>
                    <span>Pièces dans la liste</span>
                    <strong>{devisStockSelection.length}</strong>
                  </div>
                  <div>
                    <span>Pièces validées</span>
                    <strong>{devisStockSelection.filter((item) => item.confirmed).length}</strong>
                  </div>
                  <div>
                    <span>Total validé</span>
                    <strong>
                      {devisStockSelection
                        .filter((item) => item.confirmed)
                        .reduce((sum, item) => sum + Number(item.quantite || 0) * Number(item.prixTTC || 0), 0)
                        .toFixed(2)} €
                    </strong>
                  </div>
                  <div>
                    <span>Total liste</span>
                    <strong>
                      {devisStockSelection
                        .reduce((sum, item) => sum + Number(item.quantite || 0) * Number(item.prixTTC || 0), 0)
                        .toFixed(2)} €
                    </strong>
                  </div>
                </div>
              </section>
            )}

            <section className="contentGrid">
              <div className="panel formPanel">
                <div className="panelTitle"><span>01</span><div><h3>{editingPieceId ? "Modifier une pièce" : "Ajouter une pièce"}</h3><p>Stock branché sur la table professionnelle Supabase stock_items. Choisis une famille puis une sous-famille.</p></div></div>
                <form className="form" onSubmit={ajouter}>
                  <input name="designation" value={form.designation} onChange={change} placeholder="Nom de la pièce" />
                  <select name="famille" value={form.famille} onChange={change}>
                    <option value="">Famille principale</option>
                    {familles.map((f) => <option key={f}>{f}</option>)}
                  </select>
                  <select name="sousFamille" value={form.sousFamille} onChange={change} disabled={!form.famille}>
                    <option value="">{form.famille ? "Choisir une sous-famille" : "Choisis d’abord une famille"}</option>
                    {sousFamillesDisponibles.map((sf) => (
                      <option key={sf} value={sf}>
                        {sf}
                      </option>
                    ))}
                  </select>
                  <input name="refOrigine" value={form.refOrigine} onChange={change} placeholder="Référence origine" />
                  <input name="refInterne" value={form.refInterne} onChange={change} placeholder="Référence interne" />
                  <input name="fournisseur" value={form.fournisseur} onChange={change} placeholder="Fournisseur" />
                  <input name="quantite" value={form.quantite} onChange={change} placeholder="Quantité" />
                  <input name="rupture" value={form.rupture} onChange={change} placeholder="Stock minimum voulu" />
                  <input name="prixPart" value={form.prixPart} onChange={change} placeholder="Prix particulier TTC" />
                  <input name="prixPro" value={form.prixPro} onChange={change} placeholder="Prix professionnel TTC" />
                  <label className="imageInput">
                    {form.image ? "Modifier image pièce" : "Ajouter image pièce"}
                    <input type="file" accept="image/*" onChange={handleImage} hidden />
                  </label>
                  {form.image && (
                    <>
                      <img className="imagePreview" src={form.image} alt="Aperçu pièce" />
                      <button type="button" className="delete" onClick={removePieceImage}>
                        Supprimer image pièce
                      </button>
                    </>
                  )}
                  <button>{editingPieceId ? "Enregistrer modification" : "Ajouter au stock"}</button>
                  {editingPieceId && <button type="button" className="delete" onClick={cancelEditPiece}>Annuler modification</button>}
                </form>
              </div>

              <div className="panel familiesPanel">
                <div className="panelTitle">
                  <span>02</span>
                  <div>
                    <h3>Familles & sous-familles</h3>
                    <p>Toutes les sous-familles sont visibles directement sous chaque famille.</p>
                  </div>
                </div>

                <div className="familyList">
                  <button className={!familleActive ? "selected" : ""} onClick={() => setFamilleActive("")}>
                    <strong>Toutes les familles</strong>
                    <small>Afficher tout le stock</small>
                  </button>

                  {familles.map((famille) => {
                    const sousFamilles = getSousFamillesByFamille(famille);
                    const selectedFamily = normalizeFamilleName(familleActive) === normalizeFamilleName(famille);

                    return (
                      <div
                        key={famille}
                        style={{
                          border: selectedFamily ? "2px solid #123f8f" : "1px solid rgba(191, 212, 255, 0.82)",
                          borderRadius: "18px",
                          background: selectedFamily ? "#eaf1ff" : "#fbfdff",
                          padding: "12px",
                        }}
                      >
                        <button
                          type="button"
                          className={selectedFamily ? "selected" : ""}
                          onClick={() => setFamilleActive(famille)}
                          style={{ width: "100%", marginBottom: "10px" }}
                        >
                          <strong>{famille}</strong>
                          <small>{sousFamilles.length} sous-famille(s)</small>
                        </button>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))",
                            gap: "8px",
                          }}
                        >
                          {sousFamilles.map((sf) => {
                            const selectedSub = normalizeFamilleName(form.famille) === normalizeFamilleName(famille) && form.sousFamille === sf;

                            return (
                              <button
                                key={`${famille}-${sf}`}
                                type="button"
                                onClick={() => {
                                  const normalizedFamille = normalizeFamilleName(famille);
                                  setFamilleActive(normalizedFamille);
                                  setForm({
                                    ...form,
                                    famille: normalizedFamille,
                                    sousFamille: sf,
                                  });
                                }}
                                style={{
                                  border: selectedSub ? "2px solid #123f8f" : "1px solid #bfd4ff",
                                  background: selectedSub ? "#123f8f" : "white",
                                  color: selectedSub ? "white" : "#10234d",
                                  borderRadius: "14px",
                                  padding: "9px",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  fontWeight: "800",
                                  fontSize: "12px",
                                  minHeight: "42px",
                                }}
                              >
                                {sf}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>            </section>

            <section className="panel stockPanel">
              <div className="panelTitle"><span>03</span><div><h3>Stock enregistré</h3><p>{results.length} résultat(s)</p></div></div>
              {results.length === 0 && <div className="empty">Aucune pièce enregistrée.</div>}
              <div className="products">
                {results.map((piece) => {
                  const low = Number(piece.quantite) < Number(piece.rupture);
                  return (
                    <article className="product clickable" key={piece.id} onClick={() => setSelectedPiece(piece)}>
                      {piece.image ? <img className="productImage" src={piece.image} alt={piece.designation} /> : <div className="noImage">Image pièce</div>}
                      <div className="productTop"><div className="icon">⚙</div><div><h4>{piece.designation}</h4><p>{piece.famille} / {piece.sousFamille}</p></div></div>
                      <div className="productInfo">
                        <div><small>Réf origine</small><b>{piece.refOrigine || "-"}</b></div>
                        <div><small>Réf interne</small><b>{piece.refInterne || "-"}</b></div>
                        <div><small>Particulier</small><b>{piece.prixPart || 0} €</b></div>
                        <div><small>Professionnel</small><b>{piece.prixPro || 0} €</b></div>
                      </div>
                      <div className="stockStatus"><strong>Stock : {piece.quantite} / minimum : {piece.rupture}</strong><span className={low ? "danger" : "success"}>{low ? "À commander" : "Disponible"}</span></div>
                      <div className="actions" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => vendre(piece.id)}>Vendu - retirer 1 du stock</button>
                        <button onClick={() => togglePieceForDevis(piece, "particulier")}>
                          {devisStockSelection.some((item) => item.id === piece.id && item.priceType === "particulier") ? "Retirer de la liste" : "Compléter devis / prix particulier"}
                        </button>
                        <button onClick={() => togglePieceForDevis(piece, "pro")}>
                          {devisStockSelection.some((item) => item.id === piece.id && item.priceType === "pro") ? "Retirer prix pro" : "Compléter devis / prix professionnel"}
                        </button>
                        <button onClick={() => startEditPiece(piece)}>Modifier</button>
                        <button className="delete" onClick={() => supprimer(piece.id)}>Supprimer</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {moduleActif === "Devis" && (
          <>
            <section className="stats">
              <div><span>Devis enregistrés</span><strong>{devis.length}</strong></div>
              <div><span>Lignes en cours</span><strong>{devisLines.length}</strong></div>
              <div><span>Total TTC</span><strong>{devisTotals.totalTTC.toFixed(2)} €</strong></div>
              <div><span>Mode</span><strong>{editingDevisId ? "Modification" : "Création"}</strong></div>
            </section>

            <section className="panel stockPanel">
              <div className="panelTitle">
                <span>01</span>
                <div>
                  <h3>{editingDevisId ? "Modifier le devis final" : "Devis final"}</h3>
                  <p>Crée un devis manuel. Coche seulement les pièces validées par le client. Les pièces validées venant du stock seront retirées du stock à la validation.</p>
                </div>
              </div>

              <form className="form">
                <input name="numero" value={devisForm.numero || nextDevisNumero()} onChange={changeDevisForm} placeholder="Numéro devis" />
                <input name="client" value={devisForm.client} onChange={changeDevisForm} placeholder="Nom client" />
                <input name="telephone" value={devisForm.telephone || ""} onChange={changeDevisForm} placeholder="Téléphone / WhatsApp" />
                <input name="date" type="date" value={devisForm.date} onChange={changeDevisForm} />
                <input name="marque" value={devisForm.marque} onChange={changeDevisForm} placeholder="Marque voiture" />
                <input name="modele" value={devisForm.modele} onChange={changeDevisForm} placeholder="Modèle voiture" />
                <input name="plaque" value={devisForm.plaque} onChange={changeDevisForm} placeholder="Immatriculation" />
                <input name="vin" value={devisForm.vin || ""} onChange={changeDevisForm} placeholder="VIN / numéro de châssis" />

                <select name="remiseType" value={devisForm.remiseType} onChange={changeDevisForm}>
                  <option value="pourcentage">Remise en %</option>
                  <option value="montant">Remise en €</option>
                </select>

                <input name="remiseValue" value={devisForm.remiseValue} onChange={changeDevisForm} placeholder="Valeur remise" />
              </form>

              <div className="panel" style={{ marginTop: "18px", boxShadow: "none" }}>
                <div className="panelTitle">
                  <span>+</span>
                  <div>
                    <h3>{editingDevisLineId ? "Modifier une pièce" : "Ajouter une pièce"}</h3>
                    <p>Référence visible dans le logiciel, cachée sur l’impression client.</p>
                  </div>
                </div>

                <form className="form" onSubmit={addManualLineToDevis}>
                  <input name="designation" value={devisLine.designation} onChange={changeDevisLine} placeholder="Désignation pièce" />
                  <input name="reference" value={devisLine.reference} onChange={changeDevisLine} placeholder="Référence offre 1" />
                  <input name="quantite" value={devisLine.quantite} onChange={changeDevisLine} placeholder="Quantité" />
                  <input name="prixTTC" value={devisLine.prixTTC} onChange={changeDevisLine} placeholder="Prix TTC offre 1" />
                  <input name="fournisseur1" value={devisLine.fournisseur1 || ""} onChange={changeDevisLine} placeholder="Fournisseur offre 1" />
                  <input name="dateDispo1" value={devisLine.dateDispo1 || ""} onChange={changeDevisLine} placeholder="Disponibilité offre 1 ex: sur place" />

                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "900", color: "#123f8f" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(devisLine.deuxOffres)}
                      onChange={(e) => setDevisLine({ ...devisLine, deuxOffres: e.target.checked })}
                      style={{ width: "18px", height: "18px" }}
                    />
                    Ajouter une 2ème offre fournisseur
                  </label>

                  {devisLine.deuxOffres && (
                    <>
                      <input name="reference2" value={devisLine.reference2 || ""} onChange={changeDevisLine} placeholder="Référence offre 2" />
                      <input name="prixTTC2" value={devisLine.prixTTC2 || ""} onChange={changeDevisLine} placeholder="Prix TTC offre 2" />
                      <input name="fournisseur2" value={devisLine.fournisseur2 || ""} onChange={changeDevisLine} placeholder="Fournisseur offre 2" />
                      <input name="dateDispo2" value={devisLine.dateDispo2 || ""} onChange={changeDevisLine} placeholder="Disponibilité offre 2 ex: sous 48h" />
                      <select name="offreChoisie" value={devisLine.offreChoisie || "offre1"} onChange={changeDevisLine}>
                        <option value="offre1">Total avec offre 1</option>
                        <option value="offre2">Total avec offre 2</option>
                      </select>
                    </>
                  )}

                  <button>{editingDevisLineId ? "Enregistrer modification" : "Ajouter au devis"}</button>
                  {editingDevisLineId && <button type="button" onClick={cancelEditDevisLine}>Annuler</button>}
                </form>
              </div>

              {devisLines.length === 0 && <div className="empty" style={{ marginTop: "18px" }}>Aucune pièce dans le devis.</div>}

              {devisLines.length > 0 && (
                <div style={{ overflowX: "auto", marginTop: "18px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "18px", overflow: "hidden", border: "1px solid rgba(191, 212, 255, 0.85)" }}>
                    <thead>
                      <tr style={{ background: "#123f8f", color: "white" }}>
                        <th style={{ padding: "12px", textAlign: "left" }}>Validé client</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>N°</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Désignation</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Référence interne</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Qté</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Prix TTC</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Total</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devisLines.map((line, index) => (
                        <tr key={line.id} style={{ borderBottom: "1px solid #d9e3f2", background: editingDevisLineId === line.id ? "#eaf1ff" : "white" }}>
                          <td style={{ padding: "12px" }}>
                            <input
                              type="checkbox"
                              checked={Boolean(line.confirmedByClient)}
                              onChange={() => toggleLineConfirmedByClient(line.id)}
                              title="Coche seulement les pièces validées par le client"
                              style={{ width: "18px", height: "18px" }}
                            />
                            <div style={{ fontSize: "10px", marginTop: "4px", color: line.confirmedByClient ? "#16a34a" : "#dc2626", fontWeight: "900" }}>
                              {line.confirmedByClient ? "Validé" : "Non validé"}
                            </div>
                          </td>
                          <td style={{ padding: "12px", fontWeight: "900" }}>{index + 1}</td>
                          <td style={{ padding: "12px" }}>{line.designation}</td>
                          <td style={{ padding: "12px", minWidth: "260px" }}>
                            <input
                              value={line.reference || ""}
                              onFocus={() => openStockSearchForDevisLine(line)}
                              onChange={(e) => {
                                updateDevisLine(line.id, "reference", e.target.value);
                                setDevisStockSearchLineId(line.id);
                                setDevisStockSearchText(e.target.value || line.designation || "");
                              }}
                              placeholder="Clique ici pour chercher dans le stock"
                              style={{ width: "210px", border: "1px solid #bfd4ff", borderRadius: "10px", height: "36px", padding: "0 10px" }}
                            />

                            {devisStockSearchLineId === line.id && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  padding: "10px",
                                  border: "1px solid #bfd4ff",
                                  borderRadius: "14px",
                                  background: "#f8fbff",
                                  minWidth: "360px",
                                }}
                              >
                                <div className="form" style={{ gridTemplateColumns: "1fr auto", marginBottom: "10px" }}>
                                  <input
                                    value={devisStockSearchText}
                                    onChange={(e) => setDevisStockSearchText(e.target.value)}
                                    placeholder="Recherche stock : référence, nom, famille..."
                                  />
                                  <button type="button" className="delete" onClick={closeStockSearchForDevisLine}>Fermer</button>
                                </div>

                                {getStockSearchResultsForDevisLine().length === 0 && (
                                  <div className="empty">Aucune pièce trouvée dans le stock.</div>
                                )}

                                <div className="historyList">
                                  {getStockSearchResultsForDevisLine().map((piece) => (
                                    <div className="historyItem" key={piece.id}>
                                      <strong>{piece.designation}</strong>
                                      <p>Réf interne : {piece.refInterne || "-"} — Réf origine : {piece.refOrigine || "-"}</p>
                                      <p>Stock : {piece.quantite} — Particulier : {piece.prixPart || 0} € — Pro : {piece.prixPro || 0} €</p>
                                      <div className="actions" style={{ marginTop: "8px" }}>
                                        <button type="button" onClick={() => applyStockPieceToDevisLine(line.id, piece, "particulier")}>
                                          Choisir prix particulier
                                        </button>
                                        <button type="button" onClick={() => applyStockPieceToDevisLine(line.id, piece, "pro")}>
                                          Choisir prix professionnel
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {line.deuxOffres && (
                              <input value={line.reference2 || ""} onChange={(e) => updateDevisLine(line.id, "reference2", e.target.value)} placeholder="Réf. offre 2" style={{ width: "210px", border: "1px solid #bfd4ff", borderRadius: "10px", height: "36px", padding: "0 10px", marginTop: "6px" }} />
                            )}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <input value={line.quantite} onChange={(e) => updateDevisLine(line.id, "quantite", e.target.value)} style={{ width: "70px", border: "1px solid #bfd4ff", borderRadius: "10px", height: "36px", padding: "0 10px" }} />
                          </td>
                          <td style={{ padding: "12px" }}>
                            <input value={line.prixTTC} onChange={(e) => updateDevisLine(line.id, "prixTTC", e.target.value)} placeholder="Prix offre 1" style={{ width: "90px", border: "1px solid #bfd4ff", borderRadius: "10px", height: "36px", padding: "0 10px" }} />
                            {line.deuxOffres && (
                              <>
                                <input value={line.prixTTC2 || ""} onChange={(e) => updateDevisLine(line.id, "prixTTC2", e.target.value)} placeholder="Prix offre 2" style={{ width: "90px", border: "1px solid #bfd4ff", borderRadius: "10px", height: "36px", padding: "0 10px", marginTop: "6px" }} />
                                <select value={line.offreChoisie || "offre1"} onChange={(e) => updateDevisLine(line.id, "offreChoisie", e.target.value)} style={{ width: "120px", border: "1px solid #bfd4ff", borderRadius: "10px", height: "36px", padding: "0 8px", marginTop: "6px" }}>
                                  <option value="offre1">Choisir offre 1</option>
                                  <option value="offre2">Choisir offre 2</option>
                                </select>
                              </>
                            )}
                          </td>
                          <td style={{ padding: "12px", fontWeight: "900" }}>
                            {line.deuxOffres ? (
                              <div>
                                <div>Offre 1 : {(Number(line.quantite) * Number(line.prixTTC || 0)).toFixed(2)} €</div>
                                <div>Offre 2 : {(Number(line.quantite) * Number(line.prixTTC2 || 0)).toFixed(2)} €</div>
                                <div style={{ color: "#123f8f", marginTop: "6px" }}>
                                  Total choisi : {getLineTotal(line).toFixed(2)} €
                                </div>
                              </div>
                            ) : (
                              `${getLineTotal(line).toFixed(2)} €`
                            )}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div className="actions">
                              <button onClick={() => editDevisLine(line)}>Modifier</button>
                              {line.sourceStockId && (
                                <button onClick={() => decreaseStockFromDevisLine(line)}>
                                  Retirer stock
                                </button>
                              )}
                              <button onClick={() => duplicateDevisLine(line)}>Dupliquer</button>
                              <button className="delete" onClick={() => removeDevisLine(line.id)}>Supprimer</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <section className="stats">
                <div><span>Sous-total HT</span><strong>{devisTotals.sousTotalHT.toFixed(2)} €</strong></div>
                <div><span>Remise HT</span><strong>{devisTotals.remiseHT.toFixed(2)} €</strong></div>
                <div><span>TVA 20%</span><strong>{devisTotals.tva.toFixed(2)} €</strong></div>
                <div><span>Total TTC</span><strong>{devisTotals.totalTTC.toFixed(2)} €</strong></div>
              </section>

              <div className="actions" style={{ marginTop: "16px" }}>
                <button type="button" onClick={selectAllLinesConfirmedByClient}>Tout valider client</button>
                <button type="button" onClick={clearLinesConfirmedByClient}>Tout mettre non validé</button>
              </div>

              <div className="actions" style={{ marginTop: "16px" }}>
                <button onClick={() => saveDevis("Archivé")}>
                  "Valider devis"
                </button>
                <button className="delete" onClick={resetDevisDraft}>Vider devis</button>
              </div>
            </section>

            <section className="panel stockPanel">
              <div className="panelTitle">
                <span>02</span>
                <div>
                  <h3>Devis enregistrés</h3>
                  <p>Devis branché sur la table professionnelle Supabase. Modifier, supprimer ou imprimer à tout moment.</p>
                </div>
              </div>

              <section className="searchLine" style={{ marginBottom: "14px" }}>
                <span>🔎</span>
                <input
                  value={devisSearch}
                  onChange={(e) => setDevisSearch(e.target.value)}
                  placeholder="Rechercher un devis : plaque, VIN, nom client, téléphone, numéro..."
                />
              </section>

              {filteredDevis.length === 0 && <div className="empty">Aucun devis trouvé.</div>}

              <div className="historyList">
                {filteredDevis.map((d) => (
                  <div className="historyItem clickable" key={d.id} onClick={() => setSelectedDevis(d)}>
                    <strong>{d.numero} — {d.client}</strong>
                    <p>{d.marque} {d.modele} — Plaque : {d.plaque || "-"} — VIN : {d.vin || "-"}</p>
                    <span>{d.status} — TTC : {Number(d.totalTTC).toFixed(2)} € — {d.createdAt}</span>
                    <div className="actions" style={{ marginTop: "12px" }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => printDevis(d)}>Imprimer</button>
                      <button onClick={() => editDevis(d)}>Modifier</button>
                      <button className="delete" onClick={() => deleteDevis(d.id)}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </>
        )}

        {moduleActif === "Clients" && (
          <>
            <section className="stats">
              <div><span>Clients</span><strong>{clients.length}</strong></div>
              <div><span>Achats en cours</span><strong>{clients.reduce((s, c) => s + (c.pieces?.length || 0), 0)}</strong></div>
              <div><span>Total dû global</span><strong>{clients.reduce((s, c) => s + getClientTotal(c), 0).toFixed(2)} €</strong></div>
              <div><span>Archives</span><strong>{clients.reduce((s, c) => s + (c.archives?.length || 0), 0)}</strong></div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "22px", marginTop: "24px", alignItems: "start" }}>
              <div className="panel">
                <div className="panelTitle"><span>01</span><div><h3>Clients</h3><p>Créer, rechercher et ouvrir une fiche.</p></div></div>
                <form className="form" onSubmit={addOrUpdateClient} style={{ gridTemplateColumns: "1fr" }}>
                  <input name="nom" value={clientForm.nom} onChange={changeClientForm} placeholder="Nom du client" />
                  <input name="telephone" value={clientForm.telephone} onChange={changeClientForm} placeholder="Téléphone" />
                  <input name="adresse" value={clientForm.adresse} onChange={changeClientForm} placeholder="Adresse" />
                  <button>{editingClientId ? "Enregistrer modification client" : "Ajouter client"}</button>
                  {editingClientId && <button type="button" onClick={cancelClientEdit}>Annuler modification</button>}
                </form>

                <div className="searchLine" style={{ marginTop: "18px", height: "58px" }}>
                  <span>🔎</span>
                  <input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Rechercher client..." />
                </div>

                <div className="historyList" style={{ marginTop: "18px" }}>
                  {filteredClients.length === 0 && <div className="empty">Aucun client enregistré.</div>}
                  {filteredClients.map((client) => (
                    <div key={client.id} className="historyItem clickable" onClick={() => openClient(client)} style={{ border: selectedClient?.id === client.id ? "2px solid #123f8f" : undefined }}>
                      <strong>{client.nom}</strong>
                      <p>{client.telephone || "-"} — {client.adresse || "-"}</p>
                      <span>Total dû : {getClientTotal(client).toFixed(2)} € — Archives : {client.archives?.length || 0}</span>
                      <div className="actions" style={{ marginTop: "12px" }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openClient(client)}>Ouvrir</button>
                        <button onClick={() => editClient(client)}>Modifier</button>
                        <button className="delete" onClick={() => deleteClient(client.id)}>Supprimer</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                {!selectedClient && <div className="empty">Sélectionne un client à gauche pour afficher sa fiche complète.</div>}
                {selectedClient && (
                  <>
                    <div className="panelTitle"><span>02</span><div><h3>Fiche client — {selectedClient.nom}</h3><p>{selectedClient.telephone || "-"} — {selectedClient.adresse || "-"}</p></div></div>
                    <section className="stats">
                      <div><span>Pièces impayées</span><strong>{selectedClient.pieces?.length || 0}</strong></div>
                      <div><span>Total dû</span><strong>{getClientTotal(selectedClient).toFixed(2)} €</strong></div>
                      <div><span>Sélection paiement</span><strong>{getSelectedClientPaymentTotal().toFixed(2)} €</strong></div>
                      <div><span>Archives</span><strong>{selectedClient.archives?.length || 0}</strong></div>
                    </section>

                    <div className="panel" style={{ marginTop: "22px", boxShadow: "none" }}>
                      <div className="panelTitle"><span>03</span><div><h3>{editingClientPieceId ? "Modifier une pièce achetée" : "Ajouter une pièce achetée"}</h3><p>Les achats restent dans pièces impayées tant qu’ils ne sont pas payés.</p></div></div>
                      <form className="form" onSubmit={addOrUpdateClientPiece}>
                        <input name="designation" value={clientPieceForm.designation} onChange={changeClientPieceForm} placeholder="Nom de la pièce" />
                        <input name="reference" value={clientPieceForm.reference} onChange={changeClientPieceForm} placeholder="Référence" />
                        <input name="quantite" value={clientPieceForm.quantite} onChange={changeClientPieceForm} placeholder="Quantité" />
                        <input name="prix" value={clientPieceForm.prix} onChange={changeClientPieceForm} placeholder="Prix TTC" />
                        <button>{editingClientPieceId ? "Enregistrer modification pièce" : "Ajouter pièce achetée"}</button>
                        {editingClientPieceId && <button type="button" onClick={cancelClientPieceEdit}>Annuler modification pièce</button>}
                      </form>
                    </div>

                    <div className="panel" style={{ marginTop: "22px", boxShadow: "none" }}>
                      <div className="panelTitle"><span>04</span><div><h3>Paiement client</h3><p>Sélection manuelle ou paiement automatique. Si paiement partiel : payé en archive, reste dans impayé.</p></div></div>
                      <form className="form" onSubmit={editingClientArchiveId ? saveClientArchiveEdit : payClientPieces}>
                        <input name="montant" value={clientPaymentForm.montant} onChange={changeClientPaymentForm} placeholder="Montant payé" />
                        <select name="mode" value={clientPaymentForm.mode} onChange={changeClientPaymentForm}>
                          <option>Espèces</option><option>Carte</option><option>Chèque</option><option>Virement</option>
                        </select>
                        <input name="commentaire" value={clientPaymentForm.commentaire} onChange={changeClientPaymentForm} placeholder="Commentaire paiement" />
                        <button>{editingClientArchiveId ? "Enregistrer modification archive" : "Valider paiement"}</button>
                    {!editingClientArchiveId && (
                      <button type="button" onClick={autoSelectClientPaymentPieces}>
                        Auto-sélection montant
                      </button>
                    )}
                        {editingClientArchiveId ? (
                          <button type="button" onClick={cancelClientArchiveEdit}>Annuler modification archive</button>
                        ) : (
                          <button type="button" onClick={clearClientPaymentSelection}>Vider sélection</button>
                        )}
                      </form>
                      <div className="empty" style={{ marginTop: "14px" }}>
                        Pièces sélectionnées : {selectedClientPieceIds.length} — Total sélection : {getSelectedClientPaymentTotal().toFixed(2)} €
                      </div>
                    </div>

                    <div className="panel" style={{ marginTop: "22px", boxShadow: "none" }}>
                      <div className="panelTitle"><span>05</span><div><h3>Pièces impayées / en cours</h3><p>Sélectionne les pièces à payer, modifie ou supprime.</p></div></div>
                      <div className="actions" style={{ marginBottom: "18px" }}>
                        <button onClick={archiveAllClientPurchases}>Archiver achats sans paiement</button>
                        <button className="delete" onClick={() => setSelectedClient(null)}>Fermer fiche</button>
                      </div>
                      {(!selectedClient.pieces || selectedClient.pieces.length === 0) && <div className="empty">Aucune pièce impayée pour ce client.</div>}
                      <div className="historyList">
                        {(selectedClient.pieces || []).map((piece) => (
                          <div className="historyItem" key={piece.id}>
                            <label style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                              <input type="checkbox" checked={selectedClientPieceIds.includes(piece.id)} onChange={() => toggleClientPieceForPayment(piece.id)} />
                              Sélectionner pour paiement
                            </label>
                            <strong>{piece.designation}</strong>
                            <p>Référence : {piece.reference || "-"} — Date : {piece.date || "-"}</p>
                            {piece.remarquePaiement && <p>{piece.remarquePaiement}</p>}
                            <span>Qté : {piece.quantite} — Reste dû : {Number(piece.prix || 0).toFixed(2)} € — Total : {(Number(piece.quantite || 0) * Number(piece.prix || 0)).toFixed(2)} €</span>
                            <div className="actions" style={{ marginTop: "12px" }}>
                              <button onClick={() => editClientPiece(piece)}>Modifier pièce</button>
                              <button className="delete" onClick={() => deleteClientPiece(piece.id)}>Supprimer pièce</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="panel" style={{ marginTop: "22px", boxShadow: "none" }}>
                      <div className="panelTitle"><span>06</span><div><h3>Historique paiements / archives</h3><p>Clique sur une archive pour l’afficher.</p></div></div>
                      {(!selectedClient.archives || selectedClient.archives.length === 0) && <div className="empty">Aucune archive pour ce client.</div>}
                      <div className="historyList">
                        {(selectedClient.archives || []).map((archive) => (
                          <div className="historyItem clickable" key={archive.id} onClick={() => setSelectedClientArchive(archive)}>
                            <strong>{archive.type}</strong>
                            <p>Montant : {Number(archive.total || archive.montant || 0).toFixed(2)} € — Mode : {archive.mode || "-"}</p>
                            <span>{archive.user} — {archive.date}</span>
                            <div className="actions" style={{ marginTop: "12px" }} onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setSelectedClientArchive(archive)}>Afficher</button>
                              <button onClick={() => printClientArchive(archive)}>Imprimer</button>
                              <button onClick={() => startEditClientArchive(archive)}>Modifier</button>
                              <button className="delete" onClick={() => deleteClientArchive(archive.id)}>Supprimer</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}

        {moduleActif === "Stock à commander" && (
          <>
            <section className="panel stockPanel">
              <div className="panelTitle"><span>01</span><div><h3>Ajouter une pièce à commander</h3><p>Ajout manuel indépendant du stock.</p></div></div>
              <form className="form userForm" onSubmit={addOrUpdateOrder}>
                <input name="designation" value={orderForm.designation} onChange={changeOrderForm} placeholder="Nom de la pièce" />
                <input name="reference" value={orderForm.reference} onChange={changeOrderForm} placeholder="Référence" />
                <input name="quantite" value={orderForm.quantite} onChange={changeOrderForm} placeholder="Quantité" />
                <input name="fournisseur" value={orderForm.fournisseur} onChange={changeOrderForm} placeholder="Fournisseur" />
                <input name="commentaire" value={orderForm.commentaire} onChange={changeOrderForm} placeholder="Commentaire" />
                <button>{editingOrderId ? "Enregistrer modification" : "Ajouter à commander"}</button>
                {editingOrderId && <button type="button" onClick={cancelEditOrder}>Annuler modification</button>}
              </form>
            </section>

            <section className="panel stockPanel">
              <div className="panelTitle"><span>02</span><div><h3>Liste des pièces à commander</h3><p>Pièces dont le stock actuel est inférieur au stock minimum voulu + ajouts manuels.</p></div></div>
              <div className="actions" style={{ marginBottom: "20px" }}><button onClick={printOrders}>Imprimer bon de commande</button></div>
              {allOrders.length === 0 && <div className="empty">Aucune pièce à commander.</div>}
              <div className="products">
                {allOrders.map((piece) => (
                  <article className="product" key={`${piece.orderType}-${piece.id}`}>
                    {piece.image && <img className="productImage" src={piece.image} alt={piece.designation} />}
                    <div className="productTop"><div className="icon">{piece.orderType === "auto" ? "⚠" : "🛒"}</div><div><h4>{piece.designation}</h4><p>{piece.orderType === "auto" ? "Réappro automatique" : "Ajout manuel"}</p></div></div>
                    <div className="productInfo">
                      <div><small>Référence</small><b>{piece.reference || piece.refInterne || piece.refOrigine || "-"}</b></div>
                      <div><small>Quantité</small><b>{piece.quantite || "-"}</b></div>
                      <div><small>Fournisseur</small><b>{piece.fournisseur || "-"}</b></div>
                      <div><small>Commentaire</small><b>{piece.commentaire || "-"}</b></div>
                    </div>
                    <div className="stockStatus"><strong>À commander</strong><span className="danger">Commande</span></div>
                    <div className="actions">
                      {piece.orderType === "auto" ? (
                        <><button onClick={() => commanderAutoPiece(piece.id)}>Commandé</button><button onClick={() => setModuleActif("Stock")}>Voir stock</button></>
                      ) : (
                        <><button onClick={() => markManualOrderDone(piece.id)}>Commandé</button><button onClick={() => startEditOrder(piece)}>Modifier</button><button className="delete" onClick={() => deleteManualOrder(piece.id)}>Supprimer</button></>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel stockPanel">
              <div className="panelTitle">
                <span>03</span>
                <div>
                  <h3>{editingOrderArchiveId ? "Modifier une archive commande" : "Ajouter une archive commande"}</h3>
                  <p>Permet d’ajouter une archive manuelle ou de modifier une commande déjà archivée.</p>
                </div>
              </div>

              <form className="form userForm" onSubmit={addOrUpdateOrderArchive}>
                <input name="designation" value={orderForm.designation} onChange={changeOrderForm} placeholder="Nom de la pièce archivée" />
                <input name="reference" value={orderForm.reference} onChange={changeOrderForm} placeholder="Référence" />
                <input name="quantite" value={orderForm.quantite} onChange={changeOrderForm} placeholder="Quantité" />
                <input name="fournisseur" value={orderForm.fournisseur} onChange={changeOrderForm} placeholder="Fournisseur" />
                <input name="commentaire" value={orderForm.commentaire} onChange={changeOrderForm} placeholder="Commentaire" />
                <button>{editingOrderArchiveId ? "Enregistrer modification archive" : "Ajouter archive"}</button>
                {editingOrderArchiveId && <button type="button" onClick={cancelEditOrderArchive}>Annuler modification</button>}
              </form>
            </section>

            <section className="panel stockPanel">
              <div className="panelTitle"><span>04</span><div><h3>Archives commandes passées</h3><p>Afficher, imprimer une par une, imprimer par période, modifier ou supprimer.</p></div></div>

              <div className="form" style={{ marginBottom: "18px" }}>
                <input type="date" name="debut" value={orderArchivePeriod.debut} onChange={changeOrderArchivePeriod} />
                <input type="date" name="fin" value={orderArchivePeriod.fin} onChange={changeOrderArchivePeriod} />
                <button type="button" onClick={printOrderArchivesByPeriod}>Imprimer période</button>
                <button type="button" onClick={() => printOrderArchivesList(orderArchives, "Toutes les archives commandes")}>Imprimer tout</button>
              </div>

              {orderArchives.length === 0 && <div className="empty">Aucune commande archivée.</div>}
              <div className="historyList">
                {orderArchives.map((archive) => (
                  <div className="historyItem clickable" key={archive.id} onClick={() => setSelectedArchive(archive)}>
                    <strong>{archive.designation}</strong>
                    <p>Référence : {archive.reference || "-"} — Qté : {archive.quantite || "-"}</p>
                    <span>{archive.source} — {archive.user} — {archive.date}</span>
                    <div className="actions" style={{ marginTop: "12px" }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setSelectedArchive(archive)}>Afficher</button>
                      <button onClick={() => printSingleOrderArchive(archive)}>Imprimer</button>
                      <button onClick={() => startEditOrderArchive(archive)}>Modifier</button>
                      <button className="delete" onClick={() => deleteOrderArchive(archive.id)}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {isAdmin && moduleActif === "Utilisateurs" && (
          <section className="panel stockPanel">
            <div className="panelTitle"><span>01</span><div><h3>Comptes salariés</h3><p>Créer, modifier et supprimer les comptes.</p></div></div>
            {!isAdmin && <div className="empty">Seul l’administrateur peut gérer les comptes.</div>}
            {isAdmin && (
              <form className="form userForm" onSubmit={addOrUpdateUser}>
                <input name="name" value={userForm.name} onChange={changeUserForm} placeholder="Nom du salarié" />
                <input name="login" value={userForm.login} onChange={changeUserForm} placeholder="Identifiant" />
                <input name="password" value={userForm.password} onChange={changeUserForm} placeholder="Mot de passe" />
                <select name="role" value={userForm.role} onChange={changeUserForm}><option>Salarié</option><option>Admin</option></select>
                <button>{editingUserId ? "Enregistrer la modification" : "Créer le compte"}</button>
                {editingUserId && <button type="button" onClick={cancelEditUser}>Annuler la modification</button>}
              </form>
            )}
            <div className="usersGrid">
              {users.map((user) => (
                <div className="userCard" key={user.id}>
                  <h4>{user.name}</h4><p>Identifiant : {user.login}</p><p>Mot de passe : {user.password}</p><strong>{user.role}</strong>
                  {isAdmin && <><button onClick={() => startEditUser(user)}>Modifier</button>{user.login !== "admin" && <button onClick={() => deleteUser(user.id)}>Supprimer</button>}</>}
                </div>
              ))}
            </div>
          </section>
        )}

        {isAdmin && moduleActif === "Historique" && (
          <section className="panel stockPanel">
            <div className="panelTitle"><span>01</span><div><h3>Historique d’activité</h3><p>Suivi de ce que chaque salarié fait.</p></div></div>
            {history.length === 0 && <div className="empty">Aucune action enregistrée.</div>}
            <div className="historyList">
              {history.map((item) => (
                <div className="historyItem" key={item.id}>
                  <strong>{item.action}</strong><p>{item.details}</p><span>{item.user} ({item.login}) — {item.date}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {selectedPiece && (
        <div className="modalOverlay" onClick={() => setSelectedPiece(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setSelectedPiece(null)}>×</button>
            <h2>{selectedPiece.designation}</h2>
            {selectedPiece.image ? <img className="modalImage" src={selectedPiece.image} alt={selectedPiece.designation} /> : <div className="modalNoImage">Aucune image</div>}
            <div className="modalGrid">
              <p><b>Famille :</b> {selectedPiece.famille}</p><p><b>Sous-famille :</b> {selectedPiece.sousFamille}</p>
              <p><b>Référence origine :</b> {selectedPiece.refOrigine || "-"}</p><p><b>Référence interne :</b> {selectedPiece.refInterne || "-"}</p>
              <p><b>Fournisseur :</b> {selectedPiece.fournisseur || "-"}</p><p><b>Stock actuel :</b> {selectedPiece.quantite}</p><p><b>Stock minimum voulu :</b> {selectedPiece.rupture}</p>
              <p><b>Prix particulier :</b> {selectedPiece.prixPart || 0} €</p><p><b>Prix professionnel :</b> {selectedPiece.prixPro || 0} €</p>
            </div>
          </div>
        </div>
      )}

      {selectedArchive && (
        <div className="modalOverlay" onClick={() => setSelectedArchive(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setSelectedArchive(null)}>×</button>
            <h2>Archive commande</h2>
            {selectedArchive.image && <img className="modalImage" src={selectedArchive.image} alt={selectedArchive.designation} />}
            <div className="modalGrid">
              <p><b>Pièce :</b> {selectedArchive.designation}</p><p><b>Référence :</b> {selectedArchive.reference || "-"}</p>
              <p><b>Quantité :</b> {selectedArchive.quantite || "-"}</p><p><b>Fournisseur :</b> {selectedArchive.fournisseur || "-"}</p>
              <p><b>Commentaire :</b> {selectedArchive.commentaire || "-"}</p><p><b>Source :</b> {selectedArchive.source}</p>
              <p><b>Validé par :</b> {selectedArchive.user}</p><p><b>Date :</b> {selectedArchive.date}</p>
            </div>

            <div className="actions" style={{ marginTop: "18px" }}>
              <button onClick={() => printSingleOrderArchive(selectedArchive)}>Imprimer</button>
              <button onClick={() => startEditOrderArchive(selectedArchive)}>Modifier</button>
              <button className="delete" onClick={() => deleteOrderArchive(selectedArchive.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {selectedDevis && (
        <div className="modalOverlay" onClick={() => setSelectedDevis(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setSelectedDevis(null)}>×</button>
            <h2>{selectedDevis.numero}</h2>
            <div className="modalGrid">
              <p><b>Client :</b> {selectedDevis.client}</p><p><b>Date :</b> {selectedDevis.date}</p>
              <p><b>Véhicule :</b> {selectedDevis.marque} {selectedDevis.modele}</p><p><b>Plaque :</b> {selectedDevis.plaque}</p><p><b>VIN :</b> {selectedDevis.vin || "-"}</p><p><b>Téléphone :</b> {selectedDevis.telephone || "-"}</p><p><b>Origine :</b> {selectedDevis.origineDemande || "-"}</p>
              <p><b>Sous-total HT :</b> {Number(selectedDevis.sousTotalHT || selectedDevis.totalHT).toFixed(2)} €</p>
              <p><b>Remise HT :</b> {Number(selectedDevis.remiseHT || 0).toFixed(2)} €</p>
              <p><b>TVA :</b> {Number(selectedDevis.tva).toFixed(2)} €</p><p><b>Total TTC :</b> {Number(selectedDevis.totalTTC).toFixed(2)} €</p>
              <p><b>Statut :</b> {selectedDevis.status}</p>
            </div>
            <div className="actions" style={{ marginTop: "18px" }}>
              <button onClick={() => printDevis(selectedDevis)}>Imprimer</button>
              <button onClick={() => editDevis(selectedDevis)}>Modifier</button>
              <button className="delete" onClick={() => deleteDevis(selectedDevis.id)}>Supprimer</button>
            </div>
            <div className="historyList" style={{ marginTop: "18px" }}>
              {selectedDevis.lignes.map((l) => (
                <div className="historyItem" key={l.id}>
                  <strong>{l.designation}</strong><p>Qté : {l.quantite} — Prix TTC : {(l.deuxOffres && l.offreChoisie === "offre2" ? Number(l.prixTTC2 || 0) : Number(l.prixTTC || 0)).toFixed(2)} €</p><span>Référence interne : {l.reference || "-"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedClientArchive && (
        <div className="modalOverlay" onClick={() => setSelectedClientArchive(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setSelectedClientArchive(null)}>×</button>
            <h2>Archive client</h2>
            <div className="modalGrid">
              <p><b>Type :</b> {selectedClientArchive.type}</p>
              <p><b>Date :</b> {selectedClientArchive.date}</p>
              <p><b>Validé par :</b> {selectedClientArchive.user}</p>
              <p><b>Mode :</b> {selectedClientArchive.mode || "-"}</p>
              <p><b>Commentaire :</b> {selectedClientArchive.commentaire || "-"}</p>
              <p><b>Total :</b> {Number(selectedClientArchive.total || selectedClientArchive.montant || 0).toFixed(2)} €</p>
            </div>
            <div className="actions" style={{ marginTop: "18px" }}>
              <button onClick={() => printClientArchive(selectedClientArchive)}>Imprimer</button>
              <button onClick={() => startEditClientArchive(selectedClientArchive)}>Modifier</button>
              <button className="delete" onClick={() => deleteClientArchive(selectedClientArchive.id)}>Supprimer</button>
            </div>

            <div className="historyList" style={{ marginTop: "18px" }}>
              {(selectedClientArchive.pieces || []).map((piece) => (
                <div className="historyItem" key={piece.id}>
                  <strong>{piece.designation}</strong>
                  <p>Référence : {piece.reference || "-"} — Qté : {piece.quantite}</p>
                  <span>
                    Payé : {Number(piece.prixPaye || piece.prix || 0).toFixed(2)} € — Statut : {piece.paiementStatut || "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

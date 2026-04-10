function SuppliersModule({ suppliers, setSuppliers, products, setProducts, clients, quotes, globalSearch, addAudit }) {
  const createSupplierShape = (supplier = {}) => {
    const safeSupplier = supplier && typeof supplier === 'object' ? supplier : {};

    return {
      ...safeSupplier,
      id: safeSupplier.id || crypto.randomUUID(),
      name: String(safeSupplier.name || ''),
      contact: String(safeSupplier.contact || ''),
      billingType: String(safeSupplier.billingType || 'par achat'),
      paymentCycle: String(safeSupplier.paymentCycle || 'à échéance'),
      defaultPaymentMode: String(safeSupplier.defaultPaymentMode || 'virement'),
      alertDays: Number(safeSupplier.alertDays || 0),
      invoices: Array.isArray(safeSupplier.invoices) ? safeSupplier.invoices : [],
      credits: Array.isArray(safeSupplier.credits) ? safeSupplier.credits : [],
      paymentArchive: Array.isArray(safeSupplier.paymentArchive) ? safeSupplier.paymentArchive : [],
      documents: Array.isArray(safeSupplier.documents) ? safeSupplier.documents : [],
    };
  };

  const safeSuppliers = Array.isArray(suppliers)
    ? suppliers
        .filter((supplier) => supplier && typeof supplier === 'object')
        .map((supplier) => createSupplierShape(supplier))
    : [];

  const emptyInvoiceForm = () => ({
    number: '',
    date: today(),
    amount: 0,
    dueDate: today(),
    pdfName: '',
    paymentMode: 'virement',
  });

  const [selectedId, setSelectedId] = useState(safeSuppliers[0]?.id || null);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editingCreditId, setEditingCreditId] = useState(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact: '',
    billingType: 'par achat',
    paymentCycle: 'à échéance',
    defaultPaymentMode: 'virement',
    alertDays: 3,
  });
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm());
  const [creditForm, setCreditForm] = useState(emptyInvoiceForm());
  const [paymentForm, setPaymentForm] = useState({
    date: today(),
    amount: 0,
    mode: 'virement',
    note: '',
    reference: '',
  });
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [selectedCreditIds, setSelectedCreditIds] = useState([]);

  const filtered = safeSuppliers.filter((supplier) =>
    [
      supplier?.name || '',
      supplier?.contact || '',
      supplier?.billingType || '',
      supplier?.paymentCycle || '',
      supplier?.defaultPaymentMode || '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(String(globalSearch || '').toLowerCase())
  );

  const selected = createSupplierShape(
    safeSuppliers.find((supplier) => supplier?.id === selectedId) || filtered[0] || {}
  );

  useEffect(() => {
    if (!selected?.id && safeSuppliers[0]?.id) {
      setSelectedId(safeSuppliers[0].id);
    }
  }, [selected?.id, safeSuppliers]);

  useEffect(() => {
    setSelectedInvoiceIds((prev) =>
      prev.filter((id) => (selected?.invoices || []).some((invoice) => invoice.id === id))
    );
    setSelectedCreditIds((prev) =>
      prev.filter((id) => (selected?.credits || []).some((credit) => credit.id === id))
    );
  }, [selected?.id, selected?.invoices, selected?.credits]);

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      contact: '',
      billingType: 'par achat',
      paymentCycle: 'à échéance',
      defaultPaymentMode: 'virement',
      alertDays: 3,
    });
    setEditingSupplierId(null);
  };

  const resetInvoiceForm = () => {
    setInvoiceForm(emptyInvoiceForm());
    setEditingInvoiceId(null);
  };

  const resetCreditForm = () => {
    setCreditForm(emptyInvoiceForm());
    setEditingCreditId(null);
  };

  const saveSupplier = (e) => {
    e.preventDefault();

    const payload = {
      ...supplierForm,
      alertDays: Number(supplierForm.alertDays || 0),
    };

    if (!payload.name.trim()) return;

    if (editingSupplierId) {
      setSuppliers((prev) =>
        (Array.isArray(prev) ? prev : []).map((supplier) =>
          supplier?.id === editingSupplierId
            ? {
                ...createSupplierShape(supplier),
                ...payload,
              }
            : supplier
        )
      );
      addAudit?.('Modification', `Fournisseur ${payload.name}`);
    } else {
      const supplier = {
        id: crypto.randomUUID(),
        ...payload,
        invoices: [],
        credits: [],
        paymentArchive: [],
        documents: [],
      };
      setSuppliers((prev) => [supplier, ...((Array.isArray(prev) ? prev : []).filter(Boolean))]);
      setSelectedId(supplier.id);
      addAudit?.('Ajout', `Fournisseur ${supplier.name}`);
    }

    resetSupplierForm();
  };

  const loadSupplierForEdit = (supplier) => {
    const safe = createSupplierShape(supplier);
    setEditingSupplierId(safe.id);
    setSupplierForm({
      name: safe.name || '',
      contact: safe.contact || '',
      billingType: safe.billingType || 'par achat',
      paymentCycle: safe.paymentCycle || 'à échéance',
      defaultPaymentMode: safe.defaultPaymentMode || 'virement',
      alertDays: Number(safe.alertDays || 0),
    });
  };

  const deleteSupplier = (supplierId) => {
    setSuppliers((prev) =>
      (Array.isArray(prev) ? prev : []).filter((supplier) => supplier && supplier.id !== supplierId)
    );

    if (selectedId === supplierId) {
      const nextSupplier = safeSuppliers.find((supplier) => supplier.id !== supplierId);
      setSelectedId(nextSupplier?.id || null);
    }

    if (editingSupplierId === supplierId) resetSupplierForm();
    addAudit?.('Suppression', 'Fournisseur');
  };

  const saveInvoice = () => {
    if (!selected?.id) return;

    const invoicePayload = {
      number: invoiceForm.number || `FAC-${new Date().getTime()}`,
      date: invoiceForm.date || today(),
      amount: round2(invoiceForm.amount),
      dueDate: invoiceForm.dueDate || today(),
      pdfName: invoiceForm.pdfName || '',
      paymentMode: invoiceForm.paymentMode || selected.defaultPaymentMode || 'virement',
      status: 'non payée',
    };

    if (invoicePayload.amount <= 0) return;

    if (editingInvoiceId) {
      setSuppliers((prev) =>
        (Array.isArray(prev) ? prev : []).map((supplier) => {
          if (!supplier || supplier.id !== selected.id) return supplier;
          const safe = createSupplierShape(supplier);
          return {
            ...safe,
            invoices: safe.invoices.map((invoice) =>
              invoice.id === editingInvoiceId ? { ...invoice, ...invoicePayload } : invoice
            ),
          };
        })
      );
      addAudit?.('Modification', `Facture fournisseur ${invoicePayload.number}`);
    } else {
      const invoice = {
        id: crypto.randomUUID(),
        ...invoicePayload,
      };

      setSuppliers((prev) =>
        (Array.isArray(prev) ? prev : []).map((supplier) => {
          if (!supplier || supplier.id !== selected.id) return supplier;
          const safe = createSupplierShape(supplier);
          return { ...safe, invoices: [invoice, ...safe.invoices] };
        })
      );
      addAudit?.('Ajout', `Facture fournisseur ${invoice.number}`);
    }

    resetInvoiceForm();
  };

  const loadInvoiceForEdit = (invoice) => {
    setEditingInvoiceId(invoice.id);
    setInvoiceForm({
      number: invoice.number || '',
      date: invoice.date || today(),
      amount: Number(invoice.amount || 0),
      dueDate: invoice.dueDate || today(),
      pdfName: invoice.pdfName || '',
      paymentMode: invoice.paymentMode || selected?.defaultPaymentMode || 'virement',
    });
  };

  const deleteInvoice = (invoiceId) => {
    if (!selected?.id) return;

    setSuppliers((prev) =>
      (Array.isArray(prev) ? prev : []).map((supplier) => {
        if (!supplier || supplier.id !== selected.id) return supplier;
        const safe = createSupplierShape(supplier);
        return {
          ...safe,
          invoices: safe.invoices.filter((invoice) => invoice.id !== invoiceId),
        };
      })
    );

    setSelectedInvoiceIds((prev) => prev.filter((id) => id !== invoiceId));

    if (editingInvoiceId === invoiceId) resetInvoiceForm();
    addAudit?.('Suppression', 'Facture fournisseur');
  };

  const saveCredit = () => {
    if (!selected?.id) return;

    const creditPayload = {
      number: creditForm.number || `AV-${new Date().getTime()}`,
      date: creditForm.date || today(),
      amount: round2(creditForm.amount),
      dueDate: creditForm.dueDate || today(),
      pdfName: creditForm.pdfName || '',
      paymentMode: creditForm.paymentMode || selected.defaultPaymentMode || 'virement',
    };

    if (creditPayload.amount <= 0) return;

    if (editingCreditId) {
      setSuppliers((prev) =>
        (Array.isArray(prev) ? prev : []).map((supplier) => {
          if (!supplier || supplier.id !== selected.id) return supplier;
          const safe = createSupplierShape(supplier);
          return {
            ...safe,
            credits: safe.credits.map((credit) =>
              credit.id === editingCreditId ? { ...credit, ...creditPayload } : credit
            ),
          };
        })
      );
      addAudit?.('Modification', `Avoir fournisseur ${creditPayload.number}`);
    } else {
      const credit = {
        id: crypto.randomUUID(),
        ...creditPayload,
      };

      setSuppliers((prev) =>
        (Array.isArray(prev) ? prev : []).map((supplier) => {
          if (!supplier || supplier.id !== selected.id) return supplier;
          const safe = createSupplierShape(supplier);
          return { ...safe, credits: [credit, ...safe.credits] };
        })
      );
      addAudit?.('Ajout', `Avoir fournisseur ${credit.number}`);
    }

    resetCreditForm();
  };

  const loadCreditForEdit = (credit) => {
    setEditingCreditId(credit.id);
    setCreditForm({
      number: credit.number || '',
      date: credit.date || today(),
      amount: Number(credit.amount || 0),
      dueDate: credit.dueDate || today(),
      pdfName: credit.pdfName || '',
      paymentMode: credit.paymentMode || selected?.defaultPaymentMode || 'virement',
    });
  };

  const deleteCredit = (creditId) => {
    if (!selected?.id) return;

    setSuppliers((prev) =>
      (Array.isArray(prev) ? prev : []).map((supplier) => {
        if (!supplier || supplier.id !== selected.id) return supplier;
        const safe = createSupplierShape(supplier);
        return {
          ...safe,
          credits: safe.credits.filter((credit) => credit.id !== creditId),
        };
      })
    );

    setSelectedCreditIds((prev) => prev.filter((id) => id !== creditId));

    if (editingCreditId === creditId) resetCreditForm();
    addAudit?.('Suppression', 'Avoir fournisseur');
  };

  const toggleInvoiceSelection = (invoiceId) =>
    setSelectedInvoiceIds((prev) =>
      prev.includes(invoiceId) ? prev.filter((id) => id !== invoiceId) : [...prev, invoiceId]
    );

  const toggleCreditSelection = (creditId) =>
    setSelectedCreditIds((prev) =>
      prev.includes(creditId) ? prev.filter((id) => id !== creditId) : [...prev, creditId]
    );

  const selectedInvoices = useMemo(
    () => (selected?.invoices || []).filter((invoice) => selectedInvoiceIds.includes(invoice.id)),
    [selected?.invoices, selectedInvoiceIds]
  );

  const selectedCredits = useMemo(
    () => (selected?.credits || []).filter((credit) => selectedCreditIds.includes(credit.id)),
    [selected?.credits, selectedCreditIds]
  );

  const selectionSummary = useMemo(() => {
    const totalInvoices = round2(
      selectedInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)
    );
    const totalCredits = round2(
      selectedCredits.reduce((sum, credit) => sum + Number(credit.amount || 0), 0)
    );
    const netToPay = round2(Math.max(0, totalInvoices - totalCredits));
    return { totalInvoices, totalCredits, netToPay };
  }, [selectedInvoices, selectedCredits]);

  const supplierTotals = useMemo(() => {
    if (!selected?.id) {
      return {
        totalFactured: 0,
        totalCredits: 0,
        totalRemaining: 0,
        nextDueDate: '',
        nextDueAmount: 0,
        totalArchivedPaid: 0,
      };
    }

    const totalFactured = round2(
      (selected?.invoices || []).reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)
    );
    const totalCredits = round2(
      (selected?.credits || []).reduce((sum, credit) => sum + Number(credit.amount || 0), 0)
    );
    const totalRemaining = round2(Math.max(0, totalFactured - totalCredits));
    const nextOpenInvoice = [...(selected?.invoices || [])]
      .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))[0];
    const totalArchivedPaid = round2(
      (selected?.paymentArchive || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    );

    return {
      totalFactured,
      totalCredits,
      totalRemaining,
      nextDueDate: nextOpenInvoice?.dueDate || '',
      nextDueAmount: Number(nextOpenInvoice?.amount || 0),
      totalArchivedPaid,
    };
  }, [selected]);

  const registerPayment = () => {
    if (!selected?.id) return;
    if (!selectedInvoices.length && !selectedCredits.length) return;

    const amount = round2(paymentForm.amount);
    if (amount <= 0) return;

    const archive = {
      id: crypto.randomUUID(),
      date: paymentForm.date || today(),
      amount,
      mode: paymentForm.mode || selected.defaultPaymentMode || 'virement',
      reference: paymentForm.reference || '',
      note: paymentForm.note || '',
      invoices: selectedInvoices,
      credits: selectedCredits,
      totalInvoices: selectionSummary.totalInvoices,
      totalCredits: selectionSummary.totalCredits,
      netToPay: selectionSummary.netToPay,
    };

    setSuppliers((prev) =>
      (Array.isArray(prev) ? prev : []).map((supplier) => {
        if (!supplier || supplier.id !== selected.id) return supplier;
        const safe = createSupplierShape(supplier);
        return {
          ...safe,
          invoices: safe.invoices.filter((invoice) => !selectedInvoiceIds.includes(invoice.id)),
          credits: safe.credits.filter((credit) => !selectedCreditIds.includes(credit.id)),
          paymentArchive: [archive, ...safe.paymentArchive],
        };
      })
    );

    setSelectedInvoiceIds([]);
    setSelectedCreditIds([]);
    setPaymentForm({
      date: today(),
      amount: 0,
      mode: selected.defaultPaymentMode || 'virement',
      note: '',
      reference: '',
    });

    addAudit?.('Paiement', `Paiement fournisseur ${selected.name}`);
  };

  return (
    <div className="module-shell">
      <section className="panel panel-suppliers">
        <div className="panel-header">
          <div>
            <h2>Fournisseurs</h2>
            <p>Gestion des fournisseurs, factures, avoirs et paiements.</p>
          </div>
        </div>

        <div className="panel-grid two-columns">
          <form className="card form-card" onSubmit={saveSupplier}>
            <h3>{editingSupplierId ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}</h3>

            <div className="form-grid">
              <input
                value={supplierForm.name}
                onChange={(e) => setSupplierForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nom du fournisseur"
              />
              <input
                value={supplierForm.contact}
                onChange={(e) => setSupplierForm((prev) => ({ ...prev, contact: e.target.value }))}
                placeholder="Contact"
              />
              <input
                value={supplierForm.billingType}
                onChange={(e) =>
                  setSupplierForm((prev) => ({ ...prev, billingType: e.target.value }))
                }
                placeholder="Type de facturation"
              />
              <input
                value={supplierForm.paymentCycle}
                onChange={(e) =>
                  setSupplierForm((prev) => ({ ...prev, paymentCycle: e.target.value }))
                }
                placeholder="Cycle de paiement"
              />
              <input
                value={supplierForm.defaultPaymentMode}
                onChange={(e) =>
                  setSupplierForm((prev) => ({
                    ...prev,
                    defaultPaymentMode: e.target.value,
                  }))
                }
                placeholder="Mode de paiement par défaut"
              />
              <input
                type="number"
                value={supplierForm.alertDays}
                onChange={(e) =>
                  setSupplierForm((prev) => ({
                    ...prev,
                    alertDays: Number(e.target.value || 0),
                  }))
                }
                placeholder="Alerte jours"
              />
            </div>

            <div className="row-actions">
              <button type="submit" className="btn-primary">
                {editingSupplierId ? 'Enregistrer modification' : 'Ajouter fournisseur'}
              </button>
              {editingSupplierId && (
                <button type="button" className="btn-secondary" onClick={resetSupplierForm}>
                  Annuler
                </button>
              )}
            </div>
          </form>

          <div className="card list-card">
            <h3>Liste des fournisseurs</h3>

            {!filtered.length ? (
              <p className="muted">Aucun fournisseur.</p>
            ) : (
              <div className="stack-list">
                {filtered.map((supplier) => (
                  <div
                    key={supplier.id}
                    className={`supplier-row ${supplier.id === selectedId ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="supplier-main"
                      onClick={() => setSelectedId(supplier.id)}
                    >
                      <strong>{supplier.name || 'Sans nom'}</strong>
                      <span>{supplier.contact || 'Aucun contact'}</span>
                    </button>

                    <div className="row-actions compact">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => loadSupplierForEdit(supplier)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="link-btn danger-text"
                        onClick={() => deleteSupplier(supplier.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{selected?.name || 'Aucun fournisseur sélectionné'}</h2>
            <p>
              Factures : {(selected?.invoices || []).length} | Avoirs : {(selected?.credits || []).length} | Archives :{' '}
              {(selected?.paymentArchive || []).length}
            </p>
          </div>
        </div>

        {!selected?.id ? (
          <div className="card">
            <p className="muted">Sélectionne un fournisseur pour continuer.</p>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <span>Total facturé</span>
                <strong>{formatCurrency(supplierTotals.totalFactured)}</strong>
              </div>
              <div className="stat-card">
                <span>Total avoirs</span>
                <strong>{formatCurrency(supplierTotals.totalCredits)}</strong>
              </div>
              <div className="stat-card">
                <span>Reste dû</span>
                <strong>{formatCurrency(supplierTotals.totalRemaining)}</strong>
              </div>
              <div className="stat-card">
                <span>Déjà archivé payé</span>
                <strong>{formatCurrency(supplierTotals.totalArchivedPaid)}</strong>
              </div>
            </div>

            <div className="panel-grid two-columns">
              <div className="card form-card">
                <h3>{editingInvoiceId ? 'Modifier une facture' : 'Ajouter une facture'}</h3>

                <div className="form-grid">
                  <input
                    value={invoiceForm.number}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({ ...prev, number: e.target.value }))
                    }
                    placeholder="Numéro facture"
                  />
                  <input
                    type="date"
                    value={invoiceForm.date}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                  <input
                    type="number"
                    value={invoiceForm.amount}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        amount: Number(e.target.value || 0),
                      }))
                    }
                    placeholder="Montant"
                  />
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
                  <input
                    value={invoiceForm.pdfName}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({ ...prev, pdfName: e.target.value }))
                    }
                    placeholder="Nom PDF"
                  />
                  <input
                    value={invoiceForm.paymentMode}
                    onChange={(e) =>
                      setInvoiceForm((prev) => ({ ...prev, paymentMode: e.target.value }))
                    }
                    placeholder="Mode de paiement"
                  />
                </div>

                <div className="row-actions">
                  <button type="button" className="btn-primary" onClick={saveInvoice}>
                    {editingInvoiceId ? 'Enregistrer modification' : 'Ajouter facture'}
                  </button>
                  {editingInvoiceId && (
                    <button type="button" className="btn-secondary" onClick={resetInvoiceForm}>
                      Annuler
                    </button>
                  )}
                </div>
              </div>

              <div className="card form-card">
                <h3>{editingCreditId ? 'Modifier un avoir' : 'Ajouter un avoir'}</h3>

                <div className="form-grid">
                  <input
                    value={creditForm.number}
                    onChange={(e) =>
                      setCreditForm((prev) => ({ ...prev, number: e.target.value }))
                    }
                    placeholder="Numéro avoir"
                  />
                  <input
                    type="date"
                    value={creditForm.date}
                    onChange={(e) => setCreditForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                  <input
                    type="number"
                    value={creditForm.amount}
                    onChange={(e) =>
                      setCreditForm((prev) => ({
                        ...prev,
                        amount: Number(e.target.value || 0),
                      }))
                    }
                    placeholder="Montant"
                  />
                  <input
                    type="date"
                    value={creditForm.dueDate}
                    onChange={(e) =>
                      setCreditForm((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
                  <input
                    value={creditForm.pdfName}
                    onChange={(e) =>
                      setCreditForm((prev) => ({ ...prev, pdfName: e.target.value }))
                    }
                    placeholder="Nom PDF"
                  />
                  <input
                    value={creditForm.paymentMode}
                    onChange={(e) =>
                      setCreditForm((prev) => ({ ...prev, paymentMode: e.target.value }))
                    }
                    placeholder="Mode de paiement"
                  />
                </div>

                <div className="row-actions">
                  <button type="button" className="btn-primary" onClick={saveCredit}>
                    {editingCreditId ? 'Enregistrer modification' : 'Ajouter avoir'}
                  </button>
                  {editingCreditId && (
                    <button type="button" className="btn-secondary" onClick={resetCreditForm}>
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="panel-grid two-columns">
              <div className="card list-card">
                <h3>Factures</h3>
                {!(selected?.invoices || []).length ? (
                  <p className="muted">Aucune facture.</p>
                ) : (
                  <div className="stack-list">
                    {(selected?.invoices || []).map((invoice) => (
                      <div key={invoice.id} className="invoice-row">
                        <label className="checkbox-line">
                          <input
                            type="checkbox"
                            checked={selectedInvoiceIds.includes(invoice.id)}
                            onChange={() => toggleInvoiceSelection(invoice.id)}
                          />
                          <span>
                            {invoice.number} — {invoice.date} — {formatCurrency(invoice.amount)}
                          </span>
                        </label>

                        <div className="row-actions compact">
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => loadInvoiceForEdit(invoice)}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="link-btn danger-text"
                            onClick={() => deleteInvoice(invoice.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card list-card">
                <h3>Avoirs</h3>
                {!(selected?.credits || []).length ? (
                  <p className="muted">Aucun avoir.</p>
                ) : (
                  <div className="stack-list">
                    {(selected?.credits || []).map((credit) => (
                      <div key={credit.id} className="invoice-row">
                        <label className="checkbox-line">
                          <input
                            type="checkbox"
                            checked={selectedCreditIds.includes(credit.id)}
                            onChange={() => toggleCreditSelection(credit.id)}
                          />
                          <span>
                            {credit.number} — {credit.date} — {formatCurrency(credit.amount)}
                          </span>
                        </label>

                        <div className="row-actions compact">
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => loadCreditForEdit(credit)}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="link-btn danger-text"
                            onClick={() => deleteCredit(credit.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card form-card">
              <h3>Paiement fournisseur</h3>
              <p>
                Total factures : {formatCurrency(selectionSummary.totalInvoices)} | Total avoirs :{' '}
                {formatCurrency(selectionSummary.totalCredits)} | À payer :{' '}
                {formatCurrency(selectionSummary.netToPay)}
              </p>

              <div className="form-grid">
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, date: e.target.value }))}
                />
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      amount: Number(e.target.value || 0),
                    }))
                  }
                  placeholder="Montant payé"
                />
                <input
                  value={paymentForm.mode}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, mode: e.target.value }))}
                  placeholder="Mode"
                />
                <input
                  value={paymentForm.reference}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))
                  }
                  placeholder="Référence"
                />
                <input
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Note"
                />
              </div>

              <div className="row-actions">
                <button type="button" className="btn-primary" onClick={registerPayment}>
                  Enregistrer paiement
                </button>
              </div>
            </div>

            <div className="card list-card">
              <h3>Historique des paiements archivés</h3>

              {!(selected?.paymentArchive || []).length ? (
                <p className="muted">Aucun paiement archivé.</p>
              ) : (
                <div className="stack-list">
                  {(selected?.paymentArchive || []).map((payment) => (
                    <div key={payment.id} className="archive-card">
                      <strong>{payment.date}</strong>
                      <div>Montant : {formatCurrency(payment.amount)}</div>
                      <div>Mode : {payment.mode}</div>
                      <div>Référence : {payment.reference || '-'}</div>
                      <div>Note : {payment.note || '-'}</div>
                      <div>
                        Factures : {(payment.invoices || []).map((item) => item.number).join(', ') || '-'}
                      </div>
                      <div>
                        Avoirs : {(payment.credits || []).map((item) => item.number).join(', ') || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
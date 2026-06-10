"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Scissors, Tag, Trash2, X, Layers2 } from "lucide-react";

/* ─── design tokens (inline fallback map) ─── */
const tokens = {
  bgPrimary: "var(--color-background-primary, #ffffff)",
  bgSecondary: "var(--color-background-secondary, #f8fafc)",
  textPrimary: "var(--color-text-primary, #0f172a)",
  textSecondary: "var(--color-text-secondary, #475569)",
  textTertiary: "var(--color-text-tertiary, #94a3b8)",
  borderPrimary: "var(--color-border-primary, #e2e8f0)",
  borderSecondary: "var(--color-border-secondary, #f1f5f9)",
  borderTertiary: "var(--color-border-tertiary, rgba(15,23,42,0.08))",
  radiusMd: "var(--border-radius-md, 12px)",
  radiusLg: "var(--border-radius-lg, 16px)",
  info: "#3b82f6",
  infoBg: "rgba(59,130,246,0.10)",
  danger: "#dc2626",
  dangerBg: "rgba(220,38,38,0.08)",
};

/* ─── shared style helpers ─── */
const s = {
  modalBody: {
    padding: "24px",
    display: "grid",
    gap: "20px",
  },
  tabRow: {
    display: "flex",
    gap: "8px",
    borderBottom: `1px solid ${tokens.borderPrimary}`,
    paddingBottom: "12px",
  },
  tabBtn: (active) => ({
    padding: "10px 18px",
    borderRadius: tokens.radiusMd,
    border: "none",
    background: active ? tokens.infoBg : "transparent",
    color: active ? tokens.info : tokens.textSecondary,
    fontWeight: 600,
    fontSize: "0.92rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    letterSpacing: "-0.01em",
  }),
  sectionTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 600,
    color: tokens.textPrimary,
    letterSpacing: "-0.01em",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: tokens.textSecondary,
  },
  requiredMark: { color: "#dc2626", marginLeft: "2px" },
  input: {
    height: "36px",
    padding: "0 12px",
    borderRadius: "8px",
    border: `1px solid ${tokens.borderPrimary}`,
    background: tokens.bgPrimary,
    color: tokens.textPrimary,
    fontSize: "0.9rem",
    outline: "none",
    transition: "border 0.2s ease, box-shadow 0.2s ease",
    width: "100%",
    boxSizing: "border-box",
  },
  inputFocus: {
    borderColor: tokens.info,
    boxShadow: `0 0 0 3px ${tokens.infoBg}`,
  },
  textarea: {
    minHeight: "80px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: `1px solid ${tokens.borderPrimary}`,
    background: tokens.bgPrimary,
    color: tokens.textPrimary,
    fontSize: "0.9rem",
    outline: "none",
    resize: "vertical",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  select: {
    height: "36px",
    padding: "0 12px",
    borderRadius: "8px",
    border: `1px solid ${tokens.borderPrimary}`,
    background: tokens.bgPrimary,
    color: tokens.textPrimary,
    fontSize: "0.9rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  btnOutline: {
    padding: "10px 18px",
    borderRadius: tokens.radiusMd,
    border: `1px solid ${tokens.borderPrimary}`,
    background: "transparent",
    color: tokens.textSecondary,
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  btnOutlineHover: {
    background: tokens.bgSecondary,
    color: tokens.textPrimary,
  },
  btnPrimary: {
    padding: "10px 18px",
    borderRadius: tokens.radiusMd,
    border: "none",
    background: tokens.infoBg,
    color: tokens.info,
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  btnPrimaryHover: {
    background: "rgba(59,130,246,0.18)",
  },
  card: {
    background: tokens.bgSecondary,
    border: `1px solid ${tokens.borderTertiary}`,
    borderRadius: tokens.radiusMd,
    padding: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    transition: "box-shadow 0.2s ease",
  },
  cardHover: {
    boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
  },
  emptyState: {
    textAlign: "center",
    padding: "36px 20px",
    color: tokens.textTertiary,
    fontSize: "0.9rem",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },
  grid1: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
  },
  listGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "12px",
  },
  actionBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: tokens.textTertiary,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  actionBtnHover: {
    background: tokens.bgPrimary,
    color: tokens.textPrimary,
  },
  actionBtnDangerHover: {
    background: tokens.dangerBg,
    color: tokens.danger,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "14px",
  },
  formRow: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    marginTop: "4px",
  },
};

/* ─── default sample categories ─── */
const DEFAULT_CATEGORIES = [
  { id: "sample-1", title: "Haircuts", description: "All haircut services", isSample: true },
  { id: "sample-2", title: "Color Services", description: "Coloring, highlights, and toning", isSample: true },
];

const TABS = [
  { id: "services", label: "Services", icon: Scissors },
  { id: "addons", label: "Add-ons", icon: Layers2 },
  { id: "categories", label: "Categories", icon: Tag },
];

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ─── component ─── */
export default function AddServiceModal({
  isOpen = false,
  onClose,
  initialServices = [],
  initialAddOns = [],
  initialCategories = [],
  onSaveService,
  onSaveAddon,
  onSaveCategory,
  onDelete,
}) {
  const [activeTab, setActiveTab] = useState("services");

  /* local lists (synced from props on open) */
  const [serviceList, setServiceList] = useState([]);
  const [addonList, setAddonList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);

  /* form states */
  const [serviceForm, setServiceForm] = useState({
    id: "",
    name: "",
    description: "",
    duration: "",
    price: "",
    category: "",
  });
  const [addonForm, setAddonForm] = useState({
    id: "",
    name: "",
    extraDuration: "",
    extraPrice: "",
  });
  const [categoryForm, setCategoryForm] = useState({
    id: "",
    name: "",
    description: "",
  });

  const [editingId, setEditingId] = useState("");
  const [errors, setErrors] = useState({});

  /* sync props into local state whenever modal opens */
  useEffect(() => {
    if (!isOpen) return;
    setServiceList(Array.isArray(initialServices) ? initialServices.map((s) => ({ ...s })) : []);
    setAddonList(Array.isArray(initialAddOns) ? initialAddOns.map((a) => ({ ...a })) : []);
    setCategoryList(Array.isArray(initialCategories) ? initialCategories.map((c) => ({ ...c })) : []);
    setActiveTab("services");
    setEditingId("");
    setErrors({});
    clearAllForms();
  }, [isOpen, initialServices, initialAddOns, initialCategories]);

  function clearAllForms() {
    setServiceForm({ id: "", name: "", description: "", duration: "", price: "", category: "", newCategory: "" });
    setAddonForm({ id: "", name: "", extraDuration: "", extraPrice: "" });
    setCategoryForm({ id: "", name: "", description: "" });
  }

  /* ─── helpers ─── */
  const validate = useCallback((fields, requiredKeys) => {
    const next = {};
    requiredKeys.forEach((k) => {
      if (!String(fields[k] || "").trim()) next[k] = "This field is required";
    });
    return next;
  }, []);

  const categoryOptions = useMemo(() => {
    return categoryList.filter((c) => !c.isSample);
  }, [categoryList]);

  /* ─── Services ─── */
  function handleAddService() {
    const errs = validate(serviceForm, ["name", "duration", "price"]);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    let parentCategoryId = serviceForm.category || "";
    if (parentCategoryId === "__new__" && serviceForm.newCategory?.trim()) {
      const newCat = {
        id: createId("cat"),
        title: serviceForm.newCategory.trim(),
        description: "",
        serviceType: "category",
      };
      setCategoryList((prev) => [...prev, newCat]);
      if (onSaveCategory) onSaveCategory(newCat, false);
      parentCategoryId = newCat.id;
    } else if (parentCategoryId === "__new__") {
      parentCategoryId = "";
    }
    const payload = {
      id: editingId || createId("svc"),
      title: serviceForm.name.trim(),
      description: serviceForm.description.trim(),
      duration: `${serviceForm.duration} Minutes`,
      price: Number(serviceForm.price),
      parentCategoryId,
    };
    if (editingId) {
      setServiceList((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item)));
    } else {
      setServiceList((prev) => [...prev, payload]);
    }
    if (onSaveService) onSaveService(payload, Boolean(editingId));
    setServiceForm({ id: "", name: "", description: "", duration: "", price: "", category: "" });
    setEditingId("");
    setErrors({});
  }

  function handleEditService(service) {
    const dur = String(service.duration || "").replace(/\s*Minutes?/i, "").trim();
    setServiceForm({
      id: service.id || service._id,
      name: service.title || "",
      description: service.description || "",
      duration: dur,
      price: service.price != null ? String(service.price) : "",
      category: service.parentCategoryId || "",
      newCategory: "",
    });
    setEditingId(service.id || service._id);
    setErrors({});
    setActiveTab("services");
  }

  function handleDeleteService(id) {
    setServiceList((prev) => prev.filter((s) => (s.id || s._id) !== id));
    if (editingId === id) {
      setEditingId("");
      setServiceForm({ id: "", name: "", description: "", duration: "", price: "", category: "" });
    }
    if (onDelete) onDelete(id, "service");
  }

  /* ─── Add-ons ─── */
  function handleAddAddon() {
    const errs = validate(addonForm, ["name", "extraPrice"]);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const payload = {
      id: editingId || createId("addon"),
      title: addonForm.name.trim(),
      price: Number(addonForm.extraPrice),
      duration: addonForm.extraDuration ? `${addonForm.extraDuration} Minutes` : "",
      description: "",
      metadata: { timeAdded: "after", limitedDays: false, requireDeposit: false },
    };
    if (editingId) {
      setAddonList((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item)));
    } else {
      setAddonList((prev) => [...prev, payload]);
    }
    if (onSaveAddon) onSaveAddon(payload, Boolean(editingId));
    setAddonForm({ id: "", name: "", extraDuration: "", extraPrice: "" });
    setEditingId("");
    setErrors({});
  }

  function handleEditAddon(addon) {
    const dur = String(addon.duration || "").replace(/\s*Minutes?/i, "").trim();
    setAddonForm({
      id: addon.id || addon._id,
      name: addon.title || "",
      extraDuration: dur,
      extraPrice: addon.price != null ? String(addon.price) : "",
    });
    setEditingId(addon.id || addon._id);
    setErrors({});
    setActiveTab("addons");
  }

  function handleDeleteAddon(id) {
    setAddonList((prev) => prev.filter((a) => (a.id || a._id) !== id));
    if (editingId === id) {
      setEditingId("");
      setAddonForm({ id: "", name: "", extraDuration: "", extraPrice: "" });
    }
    if (onDelete) onDelete(id, "addon");
  }

  /* ─── Categories ─── */
  function handleAddCategory() {
    const errs = validate(categoryForm, ["name"]);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const payload = {
      id: editingId || createId("cat"),
      title: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      serviceType: "category",
    };
    if (editingId) {
      setCategoryList((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item)));
    } else {
      setCategoryList((prev) => [...prev, payload]);
    }
    if (onSaveCategory) onSaveCategory(payload, Boolean(editingId));
    setCategoryForm({ id: "", name: "", description: "" });
    setEditingId("");
    setErrors({});
  }

  function handleEditCategory(category) {
    setCategoryForm({
      id: category.id || category._id,
      name: category.title || "",
      description: category.description || "",
    });
    setEditingId(category.id || category._id);
    setErrors({});
    setActiveTab("categories");
  }

  function handleDeleteCategory(id) {
    setCategoryList((prev) => prev.filter((c) => (c.id || c._id) !== id));
    if (editingId === id) {
      setEditingId("");
      setCategoryForm({ id: "", name: "", description: "" });
    }
    if (onDelete) onDelete(id, "category");
  }

  function clearCurrentForm() {
    setErrors({});
    setEditingId("");
    if (activeTab === "services") setServiceForm({ id: "", name: "", description: "", duration: "", price: "", category: "" });
    if (activeTab === "addons") setAddonForm({ id: "", name: "", extraDuration: "", extraPrice: "" });
    if (activeTab === "categories") setCategoryForm({ id: "", name: "", description: "" });
  }

  if (!isOpen) return null;

  const isEditing = Boolean(editingId);

  /* ─── duration options ─── */
  const durationOptions = [15, 30, 45, 60, 75, 90, 120, 150, 180];

  return (
    <div className="vendor-service-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Add service menu">
      <div
        className="vendor-service-modal"
        style={{ maxWidth: "800px", width: "min(100%, 800px)", borderRadius: "8px", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="vendor-service-modal-title">
          <span />
          <h3>{isEditing ? "Edit Service Menu" : "Add To The Service Menu"}</h3>
          <button type="button" onClick={onClose} aria-label="Close add menu" style={{ cursor: "pointer" }}>
            <X size={28} />
          </button>
        </div>

        {/* body */}
        <div style={s.modalBody}>
          {/* tabs */}
          <div style={s.tabRow} role="tablist" aria-label="Service menu tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  style={s.tabBtn(active)}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setEditingId("");
                    setErrors({});
                    clearAllForms();
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = tokens.bgSecondary;
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ───── Services Tab ───── */}
          {activeTab === "services" && (
            <div style={s.formRow}>
              {/* form */}
              <div>
                <h4 style={s.sectionTitle}>Service Details</h4>
                <div style={{ height: "12px" }} />
                <div style={s.formGrid}>
                  <label style={s.label}>
                    <span>
                      Service name
                      <span style={s.requiredMark}>*</span>
                    </span>
                    <input
                      style={s.input}
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))}
                      onFocus={(e) => Object.assign(e.target.style, s.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = tokens.borderPrimary;
                        e.target.style.boxShadow = "none";
                      }}
                      placeholder="e.g. Women's Haircut"
                      aria-required="true"
                      aria-invalid={!!errors.name}
                    />
                    {errors.name ? (
                      <span style={{ color: tokens.danger, fontSize: "0.78rem" }}>{errors.name}</span>
                    ) : null}
                  </label>

                  <label style={s.label}>
                    <span>
                      Duration (minutes)
                      <span style={s.requiredMark}>*</span>
                    </span>
                    <select
                      style={s.select}
                      value={serviceForm.duration}
                      onChange={(e) => setServiceForm((f) => ({ ...f, duration: e.target.value }))}
                      aria-required="true"
                      aria-invalid={!!errors.duration}
                    >
                      <option value="">Select duration</option>
                      {durationOptions.map((m) => (
                        <option key={m} value={String(m)}>
                          {m} Minutes
                        </option>
                      ))}
                    </select>
                    {errors.duration ? (
                      <span style={{ color: tokens.danger, fontSize: "0.78rem" }}>{errors.duration}</span>
                    ) : null}
                  </label>

                  <label style={s.label}>
                    <span>
                      Price
                      <span style={s.requiredMark}>*</span>
                    </span>
                    <input
                      style={s.input}
                      type="number"
                      min="0"
                      step="0.01"
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm((f) => ({ ...f, price: e.target.value }))}
                      onFocus={(e) => Object.assign(e.target.style, s.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = tokens.borderPrimary;
                        e.target.style.boxShadow = "none";
                      }}
                      placeholder="0.00"
                      aria-required="true"
                      aria-invalid={!!errors.price}
                    />
                    {errors.price ? (
                      <span style={{ color: tokens.danger, fontSize: "0.78rem" }}>{errors.price}</span>
                    ) : null}
                  </label>

                  <label style={s.label}>
                    <span>Category</span>
                    <select
                      style={s.select}
                      value={serviceForm.category}
                      onChange={(e) => setServiceForm((f) => ({ ...f, category: e.target.value }))}
                    >
                      <option value="">Default</option>
                      {categoryOptions.map((cat) => (
                        <option key={cat.id || cat._id || cat.title} value={cat.id || cat._id || cat.title}>
                          {cat.title}
                        </option>
                      ))}
                      <option value="__new__">+ Create new category</option>
                    </select>
                    {serviceForm.category === "__new__" && (
                      <label style={{ ...s.label, marginTop: "8px" }}>
                        <span>New category name <span style={s.requiredMark}>*</span></span>
                        <input
                          style={s.input}
                          placeholder="Enter category name"
                          value={serviceForm.newCategory || ""}
                          onChange={(e) => setServiceForm((f) => ({ ...f, newCategory: e.target.value }))}
                          onFocus={(e) => Object.assign(e.target.style, s.inputFocus)}
                          onBlur={(e) => {
                            e.target.style.borderColor = tokens.borderPrimary;
                            e.target.style.boxShadow = "none";
                          }}
                        />
                      </label>
                    )}
                  </label>
                </div>

                <label style={{ ...s.label, marginTop: "14px" }}>
                  <span>Description</span>
                  <textarea
                    style={s.textarea}
                    rows={3}
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
                    onFocus={(e) => Object.assign(e.target.style, s.inputFocus)}
                    onBlur={(e) => {
                      e.target.style.borderColor = tokens.borderPrimary;
                      e.target.style.boxShadow = "none";
                    }}
                    placeholder="Optional description..."
                  />
                </label>

                <div style={s.buttonRow}>
                  <button
                    type="button"
                    style={s.btnOutline}
                    onClick={clearCurrentForm}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.btnOutlineHover)}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = tokens.textSecondary;
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    style={s.btnPrimary}
                    onClick={handleAddService}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.btnPrimaryHover)}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = tokens.infoBg;
                    }}
                  >
                    <Plus size={16} />
                    {isEditing ? "Update Service" : "Add Service"}
                  </button>
                </div>
              </div>

              {/* list */}
              <div>
                <h4 style={s.sectionTitle}>
                  Services{" "}
                  <span style={{ color: tokens.textTertiary, fontWeight: 400, fontSize: "0.85rem" }}>
                    ({serviceList.length})
                  </span>
                </h4>
                <div style={{ height: "12px" }} />
                {serviceList.length ? (
                  <div style={s.listGrid}>
                    {serviceList.map((svc) => {
                      const sid = svc.id || svc._id;
                      return (
                        <div
                          key={sid}
                          style={s.card}
                          onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.cardHover)}
                          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                        >
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ color: tokens.textPrimary, fontSize: "0.95rem", display: "block" }}>
                              {svc.title}
                            </strong>
                            <span style={{ color: tokens.textSecondary, fontSize: "0.82rem" }}>
                              ${Number(svc.price || 0).toFixed(2)} · {svc.duration || "N/A"}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                            <button
                              type="button"
                              aria-label={`Edit ${svc.title}`}
                              style={s.actionBtn}
                              onClick={() => handleEditService(svc)}
                              onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.actionBtnHover)}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = tokens.textTertiary;
                              }}
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${svc.title}`}
                              style={s.actionBtn}
                              onClick={() => handleDeleteService(sid)}
                              onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.actionBtnDangerHover)}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = tokens.textTertiary;
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={s.emptyState}>
                    <Scissors size={32} style={{ marginBottom: "8px", opacity: 0.4 }} />
                    <p style={{ margin: 0 }}>No services yet. Add your first service above.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ───── Add-ons Tab ───── */}
          {activeTab === "addons" && (
            <div style={s.formRow}>
              {/* form */}
              <div>
                <h4 style={s.sectionTitle}>Add-On Details</h4>
                <div style={{ height: "12px" }} />
                <div style={s.formGrid}>
                  <label style={s.label}>
                    <span>
                      Add-on name
                      <span style={s.requiredMark}>*</span>
                    </span>
                    <input
                      style={s.input}
                      value={addonForm.name}
                      onChange={(e) => setAddonForm((f) => ({ ...f, name: e.target.value }))}
                      onFocus={(e) => Object.assign(e.target.style, s.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = tokens.borderPrimary;
                        e.target.style.boxShadow = "none";
                      }}
                      placeholder="e.g. Deep Conditioning"
                      aria-required="true"
                      aria-invalid={!!errors.name}
                    />
                    {errors.name ? (
                      <span style={{ color: tokens.danger, fontSize: "0.78rem" }}>{errors.name}</span>
                    ) : null}
                  </label>

                  <label style={s.label}>
                    <span>Extra duration (minutes)</span>
                    <select
                      style={s.select}
                      value={addonForm.extraDuration}
                      onChange={(e) => setAddonForm((f) => ({ ...f, extraDuration: e.target.value }))}
                    >
                      <option value="">None</option>
                      {durationOptions.map((m) => (
                        <option key={m} value={String(m)}>
                          {m} Minutes
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={s.label}>
                    <span>
                      Extra price
                      <span style={s.requiredMark}>*</span>
                    </span>
                    <input
                      style={s.input}
                      type="number"
                      min="0"
                      step="0.01"
                      value={addonForm.extraPrice}
                      onChange={(e) => setAddonForm((f) => ({ ...f, extraPrice: e.target.value }))}
                      onFocus={(e) => Object.assign(e.target.style, s.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = tokens.borderPrimary;
                        e.target.style.boxShadow = "none";
                      }}
                      placeholder="0.00"
                      aria-required="true"
                      aria-invalid={!!errors.extraPrice}
                    />
                    {errors.extraPrice ? (
                      <span style={{ color: tokens.danger, fontSize: "0.78rem" }}>{errors.extraPrice}</span>
                    ) : null}
                  </label>
                </div>

                <div style={s.buttonRow}>
                  <button
                    type="button"
                    style={s.btnOutline}
                    onClick={clearCurrentForm}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.btnOutlineHover)}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = tokens.textSecondary;
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    style={s.btnPrimary}
                    onClick={handleAddAddon}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.btnPrimaryHover)}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = tokens.infoBg;
                    }}
                  >
                    <Plus size={16} />
                    {isEditing ? "Update Add-On" : "Add Add-On"}
                  </button>
                </div>
              </div>

              {/* list */}
              <div>
                <h4 style={s.sectionTitle}>
                  Add-ons{" "}
                  <span style={{ color: tokens.textTertiary, fontWeight: 400, fontSize: "0.85rem" }}>
                    ({addonList.length})
                  </span>
                </h4>
                <div style={{ height: "12px" }} />
                {addonList.length ? (
                  <div style={s.listGrid}>
                    {addonList.map((addon) => {
                      const aid = addon.id || addon._id;
                      return (
                        <div
                          key={aid}
                          style={s.card}
                          onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.cardHover)}
                          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                        >
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ color: tokens.textPrimary, fontSize: "0.95rem", display: "block" }}>
                              {addon.title}
                            </strong>
                            <span style={{ color: tokens.textSecondary, fontSize: "0.82rem" }}>
                              +${Number(addon.price || 0).toFixed(2)}
                              {addon.duration ? ` · ${addon.duration}` : ""}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                            <button
                              type="button"
                              aria-label={`Edit ${addon.title}`}
                              style={s.actionBtn}
                              onClick={() => handleEditAddon(addon)}
                              onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.actionBtnHover)}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = tokens.textTertiary;
                              }}
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${addon.title}`}
                              style={s.actionBtn}
                              onClick={() => handleDeleteAddon(aid)}
                              onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.actionBtnDangerHover)}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = tokens.textTertiary;
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={s.emptyState}>
                    <Layers2 size={32} style={{ marginBottom: "8px", opacity: 0.4 }} />
                    <p style={{ margin: 0 }}>No add-ons yet. Add your first add-on above.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ───── Categories Tab ───── */}
          {activeTab === "categories" && (
            <div style={s.formRow}>
              {/* form */}
              <div>
                <h4 style={s.sectionTitle}>Category Details</h4>
                <div style={{ height: "12px" }} />
                <div style={s.formGrid}>
                  <label style={s.label}>
                    <span>
                      Category name
                      <span style={s.requiredMark}>*</span>
                    </span>
                    <input
                      style={s.input}
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                      onFocus={(e) => Object.assign(e.target.style, s.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = tokens.borderPrimary;
                        e.target.style.boxShadow = "none";
                      }}
                      placeholder="e.g. Natural Hair"
                      aria-required="true"
                      aria-invalid={!!errors.name}
                    />
                    {errors.name ? (
                      <span style={{ color: tokens.danger, fontSize: "0.78rem" }}>{errors.name}</span>
                    ) : null}
                  </label>

                  <label style={s.label}>
                    <span>Description</span>
                    <input
                      style={s.input}
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                      onFocus={(e) => Object.assign(e.target.style, s.inputFocus)}
                      onBlur={(e) => {
                        e.target.style.borderColor = tokens.borderPrimary;
                        e.target.style.boxShadow = "none";
                      }}
                      placeholder="Optional"
                    />
                  </label>
                </div>

                <div style={s.buttonRow}>
                  <button
                    type="button"
                    style={s.btnOutline}
                    onClick={clearCurrentForm}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.btnOutlineHover)}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = tokens.textSecondary;
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    style={s.btnPrimary}
                    onClick={handleAddCategory}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.btnPrimaryHover)}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = tokens.infoBg;
                    }}
                  >
                    <Plus size={16} />
                    {isEditing ? "Update Category" : "Create Category"}
                  </button>
                </div>
              </div>

              {/* list */}
              <div>
                <h4 style={s.sectionTitle}>
                  Categories{" "}
                  <span style={{ color: tokens.textTertiary, fontWeight: 400, fontSize: "0.85rem" }}>
                    ({categoryList.length})
                  </span>
                </h4>
                <div style={{ height: "12px" }} />
                {(categoryList.length ? categoryList : DEFAULT_CATEGORIES).map((cat) => {
                  const cid = cat.id || cat._id;
                  const isSample = cat.isSample;
                  return (
                    <div
                      key={cid}
                      style={{
                        ...s.card,
                        marginBottom: "10px",
                        opacity: isSample ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSample) Object.assign(e.currentTarget.style, s.cardHover);
                      }}
                      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ color: tokens.textPrimary, fontSize: "0.95rem", display: "block" }}>
                          {cat.title}
                        </strong>
                        {cat.description ? (
                          <span style={{ color: tokens.textSecondary, fontSize: "0.82rem" }}>{cat.description}</span>
                        ) : null}
                        {isSample && (
                          <span
                            style={{
                              color: tokens.textTertiary,
                              fontSize: "0.75rem",
                              fontStyle: "italic",
                              display: "block",
                              marginTop: "2px",
                            }}
                          >
                            Example category
                          </span>
                        )}
                      </div>
                      {!isSample && (
                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          <button
                            type="button"
                            aria-label={`Edit ${cat.title}`}
                            style={s.actionBtn}
                            onClick={() => handleEditCategory(cat)}
                            onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.actionBtnHover)}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = tokens.textTertiary;
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${cat.title}`}
                            style={s.actionBtn}
                            onClick={() => handleDeleteCategory(cid)}
                            onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.actionBtnDangerHover)}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = tokens.textTertiary;
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { ADMIN_RESOURCES } from "./admin-model.js?v=20260821-price-maintenance";

export function initAdminModule({ nav, table, form, title, status, newButton, t, fetchJson, onDataChanged, getCatalog }) {
  let currentResource = ADMIN_RESOURCES[0];
  let rows = [];
  let editingRowId = "";
  let loaded = false;

  nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-resource]");
    if (!button) return;
    currentResource = ADMIN_RESOURCES.find((resource) => resource.key === button.dataset.resource) || currentResource;
    editingRowId = "";
    load();
  });

  newButton.addEventListener("click", () => {
    const row = Object.fromEntries(currentResource.fields.map((field) => [field.key, field.type === "boolean" ? true : ""]));
    rows = [row, ...rows];
    editingRowId = "__new__";
    renderLocale();
  });

  table.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-id]");
    const saveButton = event.target.closest("[data-save-id]");
    const deleteButton = event.target.closest("[data-delete-id]");
    if (editButton) {
      editingRowId = editButton.dataset.editId;
      renderTable();
      return;
    }
    if (saveButton) {
      await saveInlineRow(saveButton.dataset.saveId);
      return;
    }
    if (deleteButton) {
      if (!confirm(t("admin.confirmDelete"))) return;
      try {
        await fetchJson(`./api/admin/${currentResource.key}/${encodeURIComponent(deleteButton.dataset.deleteId)}`, { method: "DELETE" });
        showStatus(t("admin.deleted"));
        await onDataChanged();
        await load();
      } catch {
        showStatus(t("admin.error.delete"), true);
      }
    }
  });

  function renderLocale() {
    renderNav();
    renderTable();
    form.innerHTML = "";
  }

  async function load() {
    try {
      const data = await fetchJson(`./api/admin/${currentResource.key}`);
      rows = data.rows || [];
      loaded = true;
      renderLocale();
    } catch {
      showStatus(t("admin.error.load"), true);
    }
  }

  function renderNav() {
    nav.innerHTML = renderAdminNav(ADMIN_RESOURCES, currentResource.key, t);
  }

  function renderTable() {
    title.textContent = t(currentResource.labelKey);
    newButton.hidden = ["freight-prices", "lease-prices"].includes(currentResource.key);
    if (!loaded) {
      table.innerHTML = `<p class="empty">${escapeHtml(t("admin.empty"))}</p>`;
      return;
    }
    if (!rows.length) {
      table.innerHTML = `<p class="empty">${escapeHtml(t("admin.empty"))}</p>`;
      return;
    }
    const fields = currentResource.fields;
    table.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            ${fields.map((field) => `<th>${escapeHtml(t(`admin.fields.${field.key}`))}</th>`).join("")}
            <th>${escapeHtml(t("admin.actions"))}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => renderRow(row, fields)).join("")}
        </tbody>
      </table>`;
  }

  function renderRow(row, fields) {
    const id = row[currentResource.idField] === undefined || row[currentResource.idField] === "" ? "__new__" : String(row[currentResource.idField]);
    const editing = id === editingRowId;
    return `
      <tr data-row-id="${escapeHtml(id)}" class="${editing ? "editing" : ""}">
        ${fields.map((field) => `<td>${editing ? renderInlineField(field, row[field.key], row) : escapeHtml(formatAdminValue(row[field.key], field, getCatalog?.()))}</td>`).join("")}
        <td class="admin-actions">
          <button type="button" data-edit-id="${escapeHtml(id)}" ${editing ? "disabled" : ""}>${escapeHtml(t("admin.edit"))}</button>
          <button type="button" data-delete-id="${escapeHtml(id)}" ${id === "__new__" ? "disabled" : ""}>${escapeHtml(t("admin.delete"))}</button>
          <button type="button" data-save-id="${escapeHtml(id)}" ${editing ? "" : "disabled"}>${escapeHtml(t("admin.save"))}</button>
        </td>
      </tr>`;
  }

  function renderInlineField(field, value, row) {
    return renderAdminField({
      field,
      value,
      editingRow: row,
      currentIdField: currentResource.idField,
      catalog: getCatalog?.(),
      t,
    });
  }

  async function saveInlineRow(id) {
    const tableRow = table.querySelector(`[data-row-id="${cssEscape(id)}"]`);
    if (!tableRow) return;
    const sourceRow = id === "__new__" ? {} : rows.find((row) => String(row[currentResource.idField]) === id) || {};
    try {
      const payload = rowPayload(tableRow, sourceRow, id !== "__new__");
      validateResourcePayload(payload);
      const path = id === "__new__" ? `./api/admin/${currentResource.key}` : `./api/admin/${currentResource.key}/${encodeURIComponent(id)}`;
      const method = id === "__new__" ? "POST" : "PUT";
      await fetchJson(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showStatus(t("admin.saved"));
      editingRowId = "";
      await onDataChanged();
      await load();
    } catch {
      showStatus(t("admin.error.save"), true);
    }
  }

  function rowPayload(tableRow, sourceRow, editingExisting) {
    const data = new FormData();
    tableRow.querySelectorAll("input, select").forEach((input) => {
      if (input.type === "checkbox") {
        if (input.checked) data.set(input.name, "on");
      } else {
        data.set(input.name, input.value);
      }
    });
    return Object.fromEntries(
      currentResource.fields
        .filter((field) => !(editingExisting && field.key === currentResource.idField) && (!field.readonly || editingExisting))
        .map((field) => {
          const rawValue = data.has(field.key) ? data.get(field.key) : sourceRow?.[field.key];
          if (field.type === "boolean") return [field.key, data.has(field.key)];
          if (field.type === "number") return [field.key, rawValue === "" || rawValue === undefined ? null : Number(rawValue)];
          return [field.key, rawValue || ""];
        }),
    );
  }

  function validateResourcePayload(payload) {
    if (currentResource.key === "lease-prices" && Number(payload.displayPriceUsd) < 0) {
      throw new Error(t("admin.error.finalPriceNonNegative"));
    }
    if (currentResource.key === "freight-prices" && (Number(payload.socPriceUsd) < 0 || Number(payload.cocPriceUsd) < 0)) {
      throw new Error(t("admin.error.finalPriceNonNegative"));
    }
  }

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  renderLocale();
  return { load, renderLocale };
}

export function renderAdminNav(resources, currentKey, t) {
  const sections = [];
  for (const resource of resources) {
    const sectionKey = resource.sectionKey || "admin.sections.uncategorized";
    let section = sections.find((item) => item.key === sectionKey);
    if (!section) {
      section = { key: sectionKey, items: [] };
      sections.push(section);
    }
    section.items.push(resource);
  }
  return sections
    .map(
      (section) => `
        <div class="admin-nav-section">
          <div class="admin-nav-section-title">${escapeHtml(t(section.key))}</div>
          <div class="admin-nav-section-items">
            ${section.items
              .map(
                (resource) =>
                  `<button type="button" class="${resource.key === currentKey ? "active" : ""}" data-resource="${resource.key}">${escapeHtml(t(resource.labelKey))}</button>`,
              )
              .join("")}
          </div>
        </div>`,
    )
    .join("");
}

export function formatAdminValue(value, field, catalog = {}) {
  if (field.type === "boolean") return value ? "Y" : "N";
  const related = findReferenceItem(value, field, catalog);
  if (related) return `${value} / ${related.nameCn} / ${related.nameEn}`;
  return value ?? "";
}

export function renderAdminField({ field, value, editingRow, currentIdField, catalog = {}, t }) {
  if (field.readonly && !editingRow) return "";
  const disabled = field.readonly || (editingRow && field.key === currentIdField) ? "disabled" : "";
  const required = field.required ? "required" : "";
  if (field.type === "boolean") {
    return `
        <label class="checkbox-field">
          <input type="checkbox" name="${field.key}" ${value === false ? "" : "checked"} ${disabled}>
          <span>${escapeHtml(t(`admin.fields.${field.key}`))}</span>
        </label>`;
  }
  if (field.reference) {
    return `
      <label>
        <span>${escapeHtml(t(`admin.fields.${field.key}`))}</span>
        <select name="${field.key}" ${required} ${disabled}>
          ${referenceOptions(field, value, catalog)}
        </select>
      </label>`;
  }
  if (field.options) {
    return `
      <label>
        <span>${escapeHtml(t(`admin.fields.${field.key}`))}</span>
        <select name="${field.key}" ${required} ${disabled}>
          ${field.options.map((option) => `<option value="${escapeHtml(option)}" ${String(option) === String(value ?? "") ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>`;
  }
  return `
      <label>
        <span>${escapeHtml(t(`admin.fields.${field.key}`))}</span>
        <input name="${field.key}" type="${field.type === "number" ? "number" : "text"}" value="${escapeHtml(value ?? "")}" ${required} ${disabled}>
      </label>`;
}

function referenceOptions(field, value, catalog) {
  const items = catalog?.[field.reference.collection] || [];
  const blankOption = field.required ? "" : `<option value="" ${value ? "" : "selected"}></option>`;
  const options = items.map((item) => {
    const optionValue = item[field.reference.valueKey];
    const selected = String(optionValue) === String(value ?? "") ? "selected" : "";
    return `<option value="${escapeHtml(optionValue)}" ${selected}>${escapeHtml(formatAdminValue(optionValue, field, catalog))}</option>`;
  });
  if (value && !items.some((item) => String(item[field.reference.valueKey]) === String(value))) {
    options.unshift(`<option value="${escapeHtml(value)}" selected>${escapeHtml(value)}</option>`);
  }
  return `${blankOption}${options.join("")}`;
}

function findReferenceItem(value, field, catalog) {
  if (!field.reference || value === null || value === undefined || value === "") return null;
  return (catalog?.[field.reference.collection] || []).find((item) => String(item[field.reference.valueKey]) === String(value));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) return CSS.escape(String(value));
  return String(value).replaceAll('"', '\"');
}

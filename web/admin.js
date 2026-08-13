import { ADMIN_RESOURCES } from "./admin-model.js?v=20260813-rail-ownership-quotes";

export function initAdminModule({ nav, table, form, title, status, newButton, t, fetchJson, onDataChanged, getCatalog }) {
  let currentResource = ADMIN_RESOURCES[0];
  let rows = [];
  let editingRow = null;
  let loaded = false;

  nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-resource]");
    if (!button) return;
    currentResource = ADMIN_RESOURCES.find((resource) => resource.key === button.dataset.resource) || currentResource;
    editingRow = null;
    load();
  });

  newButton.addEventListener("click", () => {
    editingRow = null;
    renderForm();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = formPayload();
      const id = editingRow?.[currentResource.idField];
      const path = id ? `./api/admin/${currentResource.key}/${encodeURIComponent(id)}` : `./api/admin/${currentResource.key}`;
      const method = id ? "PUT" : "POST";
      await fetchJson(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showStatus(t("admin.saved"));
      await onDataChanged();
      await load();
    } catch {
      showStatus(t("admin.error.save"), true);
    }
  });

  table.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-id]");
    const deleteButton = event.target.closest("[data-delete-id]");
    if (editButton) {
      editingRow = rows.find((row) => String(row[currentResource.idField]) === editButton.dataset.editId);
      renderForm();
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
    renderForm();
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
    nav.innerHTML = ADMIN_RESOURCES.map(
      (resource) =>
        `<button type="button" class="${resource.key === currentResource.key ? "active" : ""}" data-resource="${resource.key}">${escapeHtml(t(resource.labelKey))}</button>`,
    ).join("");
  }

  function renderTable() {
    title.textContent = t(currentResource.labelKey);
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
    const id = String(row[currentResource.idField]);
    return `
      <tr>
        ${fields.map((field) => `<td>${escapeHtml(formatAdminValue(row[field.key], field, getCatalog?.()))}</td>`).join("")}
        <td class="admin-actions">
          <button type="button" data-edit-id="${escapeHtml(id)}">${escapeHtml(t("admin.edit"))}</button>
          <button type="button" data-delete-id="${escapeHtml(id)}">${escapeHtml(t("admin.delete"))}</button>
        </td>
      </tr>`;
  }

  function renderForm() {
    const row = editingRow || {};
    form.innerHTML = `
      <h3>${escapeHtml(editingRow ? t("admin.edit") : t("admin.new"))}</h3>
      <div class="admin-fields">
        ${currentResource.fields.map((field) => renderField(field, row[field.key])).join("")}
      </div>
      <button type="submit">${escapeHtml(t("admin.save"))}</button>`;
  }

  function renderField(field, value) {
    return renderAdminField({
      field,
      value,
      editingRow,
      currentIdField: currentResource.idField,
      catalog: getCatalog?.(),
      t,
    });
  }

  function formPayload() {
    const data = new FormData(form);
    return Object.fromEntries(
      currentResource.fields
        .filter((field) => !field.readonly && !(editingRow && field.key === currentResource.idField))
        .map((field) => {
          if (field.type === "boolean") return [field.key, data.has(field.key)];
          if (field.type === "number") return [field.key, data.get(field.key) === "" ? null : Number(data.get(field.key))];
          return [field.key, data.get(field.key) || ""];
        }),
    );
  }

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  renderLocale();
  return { load, renderLocale };
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

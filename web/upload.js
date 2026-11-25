export function initUploadModule({ form, fileInput, status, result, history, t, fetchJson, onImported }) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const agentCode = String(formData.get("agent") || "").trim();
    const file = fileInput.files?.[0];
    if (!agentCode) return showStatus(t("upload.error.agentRequired"), true);
    if (!file) return showStatus(t("upload.error.fileRequired"), true);
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "xlsx"].includes(extension)) return showStatus(t("upload.error.fileType"), true);

    showStatus(t("upload.importing"));
    result.innerHTML = "";
    try {
      const contentBase64 = await fileToBase64(file);
      const response = await fetchJson("./api/quotes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentCode, fileName: file.name, contentBase64 }),
      });
      showStatus(t("upload.success", { count: response.quoteCount, agent: response.agentCode }));
      result.innerHTML = renderSummary(response, t);
      form.reset();
      await onImported?.();
      await refreshHistory();
    } catch (error) {
      showStatus(error.message || t("upload.error.import"), true);
    }
  });

  return { refreshHistory };

  async function refreshHistory() {
    try {
      const data = await fetchJson("./api/quotes/imports?limit=20");
      if (!data.imports?.length) {
        history.innerHTML = `<p class="empty">${escapeHtml(t("upload.history.empty"))}</p>`;
        return;
      }
      history.innerHTML = `
        <h3>${escapeHtml(t("upload.history.title"))}</h3>
        <div class="history-wrap">
          <table class="history-table">
            <thead><tr>
              <th>${escapeHtml(t("upload.history.time"))}</th>
              <th>${escapeHtml(t("upload.history.agent"))}</th>
              <th>${escapeHtml(t("upload.history.source"))}</th>
              <th>${escapeHtml(t("upload.history.file"))}</th>
              <th>${escapeHtml(t("upload.history.period"))}</th>
              <th>${escapeHtml(t("upload.history.count"))}</th>
            </tr></thead>
            <tbody>
              ${data.imports.map((row) => `
                <tr>
                  <td>${escapeHtml(row.importedAt)}</td>
                  <td>${escapeHtml(row.agentCode)}</td>
                  <td>${escapeHtml(row.sourceType.toUpperCase())}</td>
                  <td>${escapeHtml(row.fileName)}</td>
                  <td>${escapeHtml(formatPeriod(row.effectiveFrom, row.effectiveTo))}</td>
                  <td>${escapeHtml(row.quoteCount)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    } catch {
      history.innerHTML = `<p class="empty">${escapeHtml(t("upload.history.unavailable"))}</p>`;
    }
  }

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }
}

function renderSummary(data, t) {
  return `
    <div class="metric"><span>${escapeHtml(t("upload.result.agent"))}</span><strong>${escapeHtml(data.agentCode)}</strong></div>
    <div class="metric"><span>${escapeHtml(t("upload.result.source"))}</span><strong>${escapeHtml(data.sourceType.toUpperCase())}</strong></div>
    <div class="metric"><span>${escapeHtml(t("upload.result.file"))}</span><strong>${escapeHtml(data.fileName)}</strong></div>
    <div class="metric"><span>${escapeHtml(t("upload.result.period"))}</span><strong>${escapeHtml(formatPeriod(data.effectiveFrom, data.effectiveTo))}</strong></div>
    <div class="total"><span>${escapeHtml(t("upload.result.count"))}</span><strong>${escapeHtml(data.quoteCount)}</strong></div>`;
}

function formatPeriod(from, to) {
  if (!from && !to) return "-";
  return `${from || "?"} ~ ${to || "?"}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.slice(value.indexOf(",") + 1) : value);
    };
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

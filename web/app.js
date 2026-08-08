import {
  RAIL_DESTINATIONS,
  LEASE_PICKUPS,
  calculateRailCost,
  calculateLeaseCost,
  findRailDestinationFromInput,
} from "./calculator.js";
import { localeCookieString, resolveInitialLocale, t } from "./i18n.js";

const railDestinationInput = document.querySelector("#railDestination");
const railDestinationOptions = document.querySelector("#railDestinationOptions");
const railForm = document.querySelector("#railForm");
const leaseForm = document.querySelector("#leaseForm");
const railResult = document.querySelector("#railResult");
const leaseResult = document.querySelector("#leaseResult");
const pickupInput = document.querySelector("#pickup");
const localeSwitch = document.querySelector("#localeSwitch");

let currentLocale = resolveInitialLocale({
  headerLocale: document.documentElement.dataset.bhHeaderLocale,
  cookieString: document.cookie,
});
let lastRailData = null;
let lastLeaseData = null;

function optionLabel(item) {
  return `${item.nameCn} / ${item.nameEn} / ${item.stationCode}`;
}

function pickupLabel(item) {
  return `${item.nameCn} / ${item.nameEn}`;
}

function renderPickupList() {
  document.querySelector("#pickupList").innerHTML = LEASE_PICKUPS.map((item) => `<option value="${pickupLabel(item)}">${item.code}</option>`).join("");
}

function resolveDestination() {
  return findRailDestinationFromInput(railDestinationInput.value);
}

function matchingDestinations(query) {
  const typed = query.trim().toLowerCase();
  if (!typed) return RAIL_DESTINATIONS;
  return RAIL_DESTINATIONS.filter((item) => [item.nameCn, item.nameEn, item.stationCode, optionLabel(item)].some((value) => String(value).toLowerCase().includes(typed)));
}

function renderDestinationOptions(items) {
  railDestinationOptions.innerHTML = items.map((item) => `<button type="button" class="autocomplete-option" role="option" data-station-code="${item.stationCode}">${optionLabel(item)}</button>`).join("");
}

function showDestinationOptions({ filter }) {
  renderDestinationOptions(matchingDestinations(filter ? railDestinationInput.value : ""));
  railDestinationOptions.hidden = false;
}

function hideDestinationOptions() {
  railDestinationOptions.hidden = true;
}

function resolvePickup() {
  const typed = pickupInput.value.trim().toLowerCase();
  return LEASE_PICKUPS.find((item) => [item.code, item.nameCn, item.nameEn, pickupLabel(item)].some((value) => String(value).toLowerCase() === typed));
}

function renderStaticText() {
  document.documentElement.lang = currentLocale;
  document.title = t(currentLocale, "app.title");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(currentLocale, node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(currentLocale, node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(currentLocale, node.dataset.i18nAriaLabel));
  });
  localeSwitch.querySelectorAll("[data-locale]").forEach((button) => {
    const active = button.dataset.locale === currentLocale;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderEmptyResults() {
  if (!lastRailData) railResult.innerHTML = `<p class="empty">${t(currentLocale, "rail.empty")}</p>`;
  if (!lastLeaseData) leaseResult.innerHTML = `<p class="empty">${t(currentLocale, "lease.empty")}</p>`;
}

function setLocale(locale, { persist }) {
  currentLocale = locale;
  if (persist) document.cookie = localeCookieString(locale);
  renderStaticText();
  renderEmptyResults();
  if (lastRailData) renderRail(lastRailData);
  if (lastLeaseData) renderLease(lastLeaseData);
}

railDestinationInput.addEventListener("focus", () => {
  showDestinationOptions({ filter: false });
});

railDestinationInput.addEventListener("click", () => {
  showDestinationOptions({ filter: false });
});

railDestinationInput.addEventListener("input", () => {
  showDestinationOptions({ filter: true });
});

railDestinationInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideDestinationOptions();
});

railDestinationOptions.addEventListener("click", (event) => {
  const option = event.target.closest(".autocomplete-option");
  if (!option) return;
  const destination = RAIL_DESTINATIONS.find((item) => item.stationCode === option.dataset.stationCode);
  if (!destination) return;
  railDestinationInput.value = optionLabel(destination);
  hideDestinationOptions();
});

document.addEventListener("pointerdown", (event) => {
  if (railDestinationInput.contains(event.target) || railDestinationOptions.contains(event.target)) return;
  hideDestinationOptions();
});

localeSwitch.addEventListener("click", (event) => {
  const button = event.target.closest("[data-locale]");
  if (!button) return;
  setLocale(button.dataset.locale, { persist: true });
});

railForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(railForm);
  lastRailData = calculateRailCost({
    border: form.get("border"),
    destinationCode: resolveDestination()?.stationCode,
    containerSize: form.get("containerSize"),
    ownership: form.get("ownership"),
  });
  renderRail(lastRailData);
});

leaseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(leaseForm);
  lastLeaseData = calculateLeaseCost({
    border: form.get("leaseBorder"),
    pickupCode: resolvePickup()?.code,
    containerSize: form.get("leaseContainerSize"),
  });
  renderLease(lastLeaseData);
});

function renderRail(data) {
  if (!data.available) {
    railResult.innerHTML = `<p class="empty">${t(currentLocale, data.reasonKey)}</p>`;
    return;
  }
  railResult.innerHTML = `
    <div class="metric"><span>${t(currentLocale, "rail.result.destination")}</span><strong>${optionLabel(data.destination)}</strong></div>
    <div class="metric"><span>${t(currentLocale, "rail.result.base")}</span><strong>$${usd(data.baseUsd)}</strong></div>
    <div class="metric"><span>${t(currentLocale, "rail.result.adjustment")}</span><strong>${signed(data.adjustmentUsd)}</strong></div>
    <div class="total"><span>${t(currentLocale, "rail.result.total")}</span><strong>$${usd(data.totalUsd)}</strong></div>
    <p class="note">${t(currentLocale, data.ruleKey, data.ruleParams)}</p>`;
}

function renderLease(data) {
  if (!data.available) {
    leaseResult.innerHTML = `<p class="empty">${t(currentLocale, data.reasonKey)}</p>`;
    return;
  }
  leaseResult.innerHTML = `
    <div class="metric"><span>${t(currentLocale, "lease.result.pickup")}</span><strong>${pickupLabel(data.pickup)}</strong></div>
    <div class="metric"><span>${t(currentLocale, "lease.result.table")}</span><strong>$${usd(data.tableUsd)}</strong></div>
    <div class="metric"><span>${t(currentLocale, "lease.result.adjustment")}</span><strong>${signed(data.adjustmentUsd)}</strong></div>
    <div class="total"><span>${t(currentLocale, "lease.result.total")}</span><strong>$${usd(data.totalUsd)}</strong></div>
    <p class="note">${t(currentLocale, data.ruleKey)}</p>`;
}

function usd(value) {
  return Number(value).toLocaleString("en-US");
}

function signed(value) {
  return `${value > 0 ? "+" : ""}$${usd(value)}`;
}

renderPickupList();
setLocale(currentLocale, { persist: false });

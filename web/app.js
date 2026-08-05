import {
  RAIL_DESTINATIONS,
  LEASE_PICKUPS,
  calculateRailCost,
  calculateLeaseCost,
  findRailDestinationFromInput,
} from "./calculator.js";

const railDestinationInput = document.querySelector("#railDestination");
const railDestinationOptions = document.querySelector("#railDestinationOptions");
const railForm = document.querySelector("#railForm");
const leaseForm = document.querySelector("#leaseForm");
const railResult = document.querySelector("#railResult");
const leaseResult = document.querySelector("#leaseResult");
const pickupInput = document.querySelector("#pickup");

function optionLabel(item) {
  return `${item.nameCn} / ${item.nameEn} / ${item.stationCode}`;
}

document.querySelector("#pickupList").innerHTML = LEASE_PICKUPS.map((item) => `<option value="${item.nameCn} / ${item.nameEn}">${item.code}</option>`).join("");

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
  return LEASE_PICKUPS.find((item) => [item.code, item.nameCn, item.nameEn, `${item.nameCn} / ${item.nameEn}`].some((value) => String(value).toLowerCase() === typed));
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

railForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(railForm);
  renderRail(calculateRailCost({
    border: form.get("border"),
    destinationCode: resolveDestination()?.stationCode,
    containerSize: form.get("containerSize"),
    ownership: form.get("ownership"),
  }));
});

leaseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(leaseForm);
  renderLease(calculateLeaseCost({
    border: form.get("leaseBorder"),
    pickupCode: resolvePickup()?.code,
    containerSize: form.get("leaseContainerSize"),
  }));
});

function renderRail(data) {
  if (!data.available) {
    railResult.innerHTML = `<p class="empty">${data.reason}</p>`;
    return;
  }
  railResult.innerHTML = `
    <div class="metric"><span>目的站</span><strong>${optionLabel(data.destination)}</strong></div>
    <div class="metric"><span>表价/基准</span><strong>$${usd(data.baseUsd)}</strong></div>
    <div class="metric"><span>调整</span><strong>${signed(data.adjustmentUsd)}</strong></div>
    <div class="total"><span>成本价 / 柜</span><strong>$${usd(data.totalUsd)}</strong></div>
    <p class="note">${data.rule}</p>`;
}

function renderLease(data) {
  if (!data.available) {
    leaseResult.innerHTML = `<p class="empty">${data.reason}</p>`;
    return;
  }
  leaseResult.innerHTML = `
    <div class="metric"><span>提箱地</span><strong>${data.pickup.nameCn} / ${data.pickup.nameEn}</strong></div>
    <div class="metric"><span>表价</span><strong>$${usd(data.tableUsd)}</strong></div>
    <div class="metric"><span>调整</span><strong>${signed(data.adjustmentUsd)}</strong></div>
    <div class="total"><span>租箱价 / 柜</span><strong>$${usd(data.totalUsd)}</strong></div>
    <p class="note">${data.rule}</p>`;
}

function usd(value) {
  return Number(value).toLocaleString("en-US");
}

function signed(value) {
  return `${value > 0 ? "+" : ""}$${usd(value)}`;
}

const storageKey = "decomposition-scenarios-v1";
const ltvStorageKey = "decomposition-ltv-v1";
const activeScenarioStorageKey = "decomposition-active-scenario-v1";

const defaultScenario = {
  name: "Базовый план",
  mode: "budget",
  budget: 100000,
  targetProfit: 300000,
  cpc: 15,
  ctr: 1.45,
  siteConversion: 5.09,
  salesConversion: 20,
  averageCheck: 20000,
  margin: 30,
};

const defaultLtv = {
  averageCheck: 20000,
  margin: 30,
  orders: 3,
  retentionCost: 1200,
};

const fieldNames = Object.keys(defaultScenario);
const ltvFieldNames = Object.keys(defaultLtv);
const controlConfigs = {
  cpc: { unit: "₽", min: 5, max: 500, step: 1, digits: 0 },
  budget: { unit: "₽", min: 1000, max: 1000000, step: 1000, digits: 0 },
  targetProfit: { unit: "₽", min: 10000, max: 5000000, step: 10000, digits: 0 },
  ctr: { unit: "%", min: 0.1, max: 20, step: 0.1, digits: 1 },
  siteConversion: { unit: "%", min: 0.5, max: 30, step: 0.1, digits: 1 },
  salesConversion: { unit: "%", min: 1, max: 70, step: 1, digits: 0 },
  averageCheck: { unit: "₽", min: 500, max: 300000, step: 500, digits: 0 },
  margin: { unit: "%", min: 1, max: 90, step: 1, digits: 0 },
};
const ltvControlConfigs = {
  averageCheck: { unit: "₽", min: 500, max: 300000, step: 500, digits: 0 },
  margin: { unit: "%", min: 1, max: 90, step: 1, digits: 0 },
  orders: { unit: "шт.", min: 1, max: 24, step: 1, digits: 0 },
  retentionCost: { unit: "₽", min: 0, max: 50000, step: 500, digits: 0 },
};
const template = document.querySelector("#scenario-template");
const scenarioList = document.querySelector("#scenario-list");
const addButton = document.querySelector("#add-button");
const tripleButton = document.querySelector("#triple-button");
const compareSection = document.querySelector(".scenario-compare");
const compareHead = document.querySelector("#compare-head");
const compareBody = document.querySelector("#compare-body");
const compareFilters = document.querySelector(".compare-filters");
const resetButton = document.querySelector("#reset-button");
const printButton = document.querySelector("#print-button");
const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll("[data-tab-panel]");

const summary = {
  count: document.querySelector("#scenario-count"),
  clients: document.querySelector("#clients-total"),
  profit: document.querySelector("#profit-total"),
  roi: document.querySelector("#roi-best"),
};

const ltvFields = {
  averageCheck: document.querySelector("#ltv-average-check"),
  margin: document.querySelector("#ltv-margin"),
  orders: document.querySelector("#ltv-orders"),
  retentionCost: document.querySelector("#ltv-retention-cost"),
};

const ltvOutputs = {
  cac: document.querySelector("#ltv-cac"),
  revenue: document.querySelector("#ltv-revenue"),
  profit: document.querySelector("#ltv-profit"),
  firstProfit: document.querySelector("#ltv-first-profit"),
  retentionValue: document.querySelector("#ltv-retention-value"),
  ratio: document.querySelector("#ltv-cac-ratio"),
  portfolioValue: document.querySelector("#ltv-portfolio-value"),
};

const ltvInsights = {
  retentionList: document.querySelector("[data-ltv-retention-list]"),
  leverList: document.querySelector("[data-ltv-lever-list]"),
  breakEvenStatus: document.querySelector("[data-ltv-break-even-status]"),
  breakEvenList: document.querySelector("[data-ltv-break-even-list]"),
};

const mapOutputs = {
  summaryBudget: document.querySelector('[data-map-summary="budget"]'),
  summaryClients: document.querySelector('[data-map-summary="clients"]'),
  summaryProfit: document.querySelector('[data-map-summary="profit"]'),
  summaryRoi: document.querySelector('[data-map-summary="roi"]'),
  summaryRatio: document.querySelector('[data-map-summary="ratio"]'),
  note: document.querySelector("[data-map-note]"),
};

let scenarios = readScenarios();
let ltv = readLtv();
let fitFrame = 0;
let activeScenarioIndex = readActiveScenarioIndex();

const compareColumns = [
  { key: "budget", label: "Бюджет", type: "money", value: ({ result }) => formatMoney(result.budget) },
  { key: "leads", label: "Лиды", type: "number", value: ({ result }) => formatFlexibleNumber(result.leads, 2) },
  { key: "clients", label: "Клиенты", type: "number", value: ({ result }) => formatFlexibleNumber(result.clients, 2) },
  { key: "revenue", label: "Выручка", type: "money", value: ({ result }) => formatMoney(result.revenue) },
  { key: "netProfit", label: "Чистая прибыль", type: "money", value: ({ result }) => formatMoney(result.netProfit), tone: ({ result }) => result.netProfit },
  { key: "roi", label: "ROI", type: "number", value: ({ result }) => formatPercent(result.roi, 1), tone: ({ result }) => result.roi },
];

function readScenarios() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved) && saved.length) {
      return saved.map(normalizeScenario);
    }
  } catch (error) {
    console.warn("Не удалось прочитать сохраненные сценарии.", error);
  }

  return [structuredClone(defaultScenario)];
}

function normalizeScenario(scenario) {
  return {
    ...defaultScenario,
    ...scenario,
    mode: scenario.mode === "target" ? "target" : "budget",
    name: String(scenario.name || defaultScenario.name).slice(0, 32),
  };
}

function readLtv() {
  try {
    const saved = JSON.parse(localStorage.getItem(ltvStorageKey));
    if (saved && typeof saved === "object") {
      return normalizeLtv(saved);
    }
  } catch (error) {
    console.warn("Не удалось прочитать параметры LTV.", error);
  }

  return structuredClone(defaultLtv);
}

function readActiveScenarioIndex() {
  const saved = Number.parseInt(localStorage.getItem(activeScenarioStorageKey), 10);
  return Number.isFinite(saved) && saved >= 0 ? saved : 0;
}

function clampActiveScenario() {
  activeScenarioIndex = Math.min(Math.max(activeScenarioIndex, 0), scenarios.length - 1);
}

function getActiveScenario() {
  clampActiveScenario();
  return scenarios[activeScenarioIndex] || scenarios[0] || structuredClone(defaultScenario);
}

function normalizeLtv(values) {
  return ltvFieldNames.reduce((normalized, field) => {
    normalized[field] = parseNumber(values[field] ?? defaultLtv[field]);
    return normalized;
  }, {});
}

function parseNumber(value) {
  const normalized = String(value).replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function safeDivide(value, divisor) {
  return divisor > 0 ? value / divisor : 0;
}

function calculate(scenario) {
  if (scenario.mode === "target") {
    return calculateFromTarget(scenario);
  }

  const clicks = safeDivide(scenario.budget, scenario.cpc);
  const impressions = safeDivide(clicks, scenario.ctr / 100);
  const leads = clicks * (scenario.siteConversion / 100);
  const clients = leads * (scenario.salesConversion / 100);
  const revenue = clients * scenario.averageCheck;
  const grossProfit = revenue * (scenario.margin / 100);
  const netProfit = grossProfit - scenario.budget;

  return {
    clicks,
    impressions,
    leads,
    clients,
    revenue,
    grossProfit,
    netProfit,
    leadPrice: safeDivide(scenario.budget, leads),
    clientPrice: safeDivide(scenario.budget, clients),
    roi: safeDivide(netProfit, scenario.budget) * 100,
    budget: scenario.budget,
  };
}

function calculateFromTarget(scenario) {
  const siteRate = scenario.siteConversion / 100;
  const salesRate = scenario.salesConversion / 100;
  const marginProfitPerClient = scenario.averageCheck * (scenario.margin / 100);
  const clientPrice = siteRate > 0 && salesRate > 0 ? safeDivide(scenario.cpc, siteRate * salesRate) : 0;
  const netProfitPerClient = marginProfitPerClient - clientPrice;
  const targetProfit = Math.max(scenario.targetProfit, 0);
  const clients = netProfitPerClient > 0 ? safeDivide(targetProfit, netProfitPerClient) : 0;
  const leads = salesRate > 0 ? safeDivide(clients, salesRate) : 0;
  const clicks = siteRate > 0 ? safeDivide(leads, siteRate) : 0;
  const budget = clicks * scenario.cpc;
  const impressions = safeDivide(clicks, scenario.ctr / 100);
  const revenue = clients * scenario.averageCheck;
  const grossProfit = revenue * (scenario.margin / 100);
  const netProfit = grossProfit - budget;

  return {
    clicks,
    impressions,
    leads,
    clients,
    revenue,
    grossProfit,
    netProfit,
    leadPrice: safeDivide(budget, leads),
    clientPrice: safeDivide(budget, clients),
    roi: safeDivide(netProfit, budget) * 100,
    budget,
    targetReady: netProfitPerClient > 0,
    maxCpc: marginProfitPerClient * siteRate * salesRate,
    maxClientPrice: marginProfitPerClient,
  };
}

function calculateLtv(values, clients, cac) {
  const marginProfit = values.averageCheck * (values.margin / 100);
  const revenue = values.averageCheck * values.orders;
  const profit = revenue * (values.margin / 100);
  const repeatProfit = Math.max(values.orders - 1, 0) * marginProfit;
  const retentionValue = repeatProfit - values.retentionCost;

  return {
    cac,
    revenue,
    profit,
    firstProfit: marginProfit,
    retentionValue,
    ratio: safeDivide(profit, cac),
    portfolioValue: retentionValue * clients,
  };
}

function calculateBreakEven(scenario, result) {
  const siteRate = scenario.siteConversion / 100;
  const salesRate = scenario.salesConversion / 100;
  const marginRate = scenario.margin / 100;
  const budget = scenario.mode === "target" ? result.budget : scenario.budget;
  const marginProfitPerClient = scenario.averageCheck * marginRate;
  const requiredClients = safeDivide(budget, marginProfitPerClient);
  const coreReady = budget > 0 && marginProfitPerClient > 0;

  return {
    isProfitable: result.netProfit >= 0,
    coreReady,
    requiredClients: coreReady ? requiredClients : null,
    requiredLeads: coreReady && salesRate > 0 ? requiredClients / salesRate : null,
    maxCpc: marginProfitPerClient > 0 && siteRate > 0 && salesRate > 0
      ? marginProfitPerClient * siteRate * salesRate
      : null,
    minSalesConversion: scenario.cpc > 0 && marginProfitPerClient > 0 && siteRate > 0
      ? safeDivide(scenario.cpc, marginProfitPerClient * siteRate) * 100
      : null,
    minSiteConversion: scenario.cpc > 0 && marginProfitPerClient > 0 && salesRate > 0
      ? safeDivide(scenario.cpc, marginProfitPerClient * salesRate) * 100
      : null,
    minAverageCheck: scenario.cpc > 0 && marginRate > 0 && siteRate > 0 && salesRate > 0
      ? safeDivide(scenario.cpc, marginRate * siteRate * salesRate)
      : null,
    minMargin: scenario.cpc > 0 && scenario.averageCheck > 0 && siteRate > 0 && salesRate > 0
      ? safeDivide(scenario.cpc, scenario.averageCheck * siteRate * salesRate) * 100
      : null,
    missing: [
      budget <= 0 ? "бюджет или цель" : "",
      scenario.averageCheck <= 0 ? "средний чек" : "",
      scenario.margin <= 0 ? "маржу" : "",
    ].filter(Boolean),
  };
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatFlexibleNumber(value, digits = 2) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatMoney(value, digits = 0) {
  return `${formatNumber(value, digits)} ₽`;
}

function formatPercent(value, digits = 1) {
  return `${formatNumber(value, digits)}%`;
}

function setOutputs(card, result, scenario) {
  const outputs = {
    impressions: card.querySelector('[data-output="impressions"]'),
    clicks: card.querySelector('[data-output="clicks"]'),
    leads: card.querySelector('[data-output="leads"]'),
    clients: card.querySelector('[data-output="clients"]'),
    grossProfit: card.querySelector('[data-output="grossProfit"]'),
    netProfit: card.querySelector('[data-output="netProfit"]'),
    leadPrice: card.querySelector('[data-output="leadPrice"]'),
    clientPrice: card.querySelector('[data-output="clientPrice"]'),
    roi: card.querySelector('[data-output="roi"]'),
    revenue: card.querySelector('[data-output="revenue"]'),
  };
  const targetOutputs = {
    budget: card.querySelector('[data-target-output="budget"]'),
    maxCpc: card.querySelector('[data-target-output="maxCpc"]'),
    maxClientPrice: card.querySelector('[data-target-output="maxClientPrice"]'),
  };

  outputs.impressions.textContent = result.targetReady === false ? "Недостаточно данных" : formatNumber(result.impressions, 0);
  outputs.clicks.textContent = formatFlexibleNumber(result.clicks, 2);
  outputs.leads.textContent = formatFlexibleNumber(result.leads, 2);
  outputs.clients.textContent = formatFlexibleNumber(result.clients, 2);
  outputs.grossProfit.textContent = formatMoney(result.grossProfit, 0);
  outputs.netProfit.textContent = formatMoney(result.netProfit, 0);
  outputs.leadPrice.textContent = formatMoney(result.leadPrice, 2);
  outputs.clientPrice.textContent = formatMoney(result.clientPrice, 2);
  outputs.roi.textContent = formatPercent(result.roi, 1);
  outputs.revenue.textContent = formatMoney(result.revenue, 0);
  if (targetOutputs.budget) {
    targetOutputs.budget.textContent = result.targetReady === false ? "Недостаточно данных" : formatMoney(result.budget, 0);
    targetOutputs.maxCpc.textContent = formatMoney(result.maxCpc || 0, 2);
    targetOutputs.maxClientPrice.textContent = formatMoney(result.maxClientPrice || 0, 2);
  }

  card.querySelectorAll("[data-target-metric]").forEach((metric) => {
    metric.hidden = scenario.mode !== "target";
  });

  setSignedTone(outputs.grossProfit, result.grossProfit);
  setSignedTone(outputs.netProfit, result.netProfit);
  setSignedTone(outputs.roi, result.roi);
  setNeutralTone(outputs.impressions, outputs.clicks, outputs.leads, outputs.clients, outputs.leadPrice, outputs.clientPrice, outputs.revenue);
  if (targetOutputs.budget) {
    setNeutralTone(targetOutputs.budget, targetOutputs.maxCpc, targetOutputs.maxClientPrice);
  }
  const breakEven = calculateBreakEven(scenario, result);
  renderBreakEven(card, breakEven, scenario);
  renderDiagnosis(card, buildDiagnosisItems(scenario, result, breakEven));
  syncModeView(card, scenario);
  scheduleMetricFit();
}

function fillFields(card, scenario) {
  fieldNames.forEach((field) => {
    const input = card.querySelector(`[data-field="${field}"]`);
    if (input) {
      input.value = field === "name" ? scenario[field] : String(scenario[field]).replace(".", ",");
    }
  });

  syncControls(card, scenario);
}

function createScenarioCard(scenario, index) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.index = index;
  fillFields(card, scenario);
  setOutputs(card, calculate(scenario), scenario);
  card.querySelector('[data-action="remove"]').disabled = scenarios.length === 1;
  return card;
}

function render() {
  clampActiveScenario();
  scenarioList.replaceChildren(createScenarioCard(getActiveScenario(), activeScenarioIndex));
  refreshIcons();
  fillLtvFields();
  renderSummary();
  renderComparison();
  save();
}

function renderSummary() {
  const results = scenarios.map(calculate);
  const clients = results.reduce((sum, result) => sum + result.clients, 0);
  const budget = results.reduce((sum, result) => sum + (result.budget || 0), 0);
  const profit = results.reduce((sum, result) => sum + result.netProfit, 0);
  const roi = Math.max(...results.map((result) => result.roi));
  const activeResult = calculate(getActiveScenario());

  summary.count.textContent = formatNumber(scenarios.length);
  summary.clients.textContent = formatFlexibleNumber(clients, 2);
  summary.profit.textContent = formatMoney(profit);
  summary.roi.textContent = formatPercent(roi, 1);
  setNeutralTone(summary.count, summary.clients);
  setSignedTone(summary.profit, profit);
  setSignedTone(summary.roi, roi);
  renderLtv(calculateLtv(ltv, activeResult.clients, activeResult.clientPrice));
  renderFunnelMap();
}

function renderComparison() {
  compareSection.hidden = scenarios.length <= 1;

  const comparisons = scenarios.map((scenario, index) => ({
    index,
    scenario,
    result: calculate(scenario),
  }));
  const bestProfit = Math.max(...comparisons.map(({ result }) => result.netProfit));
  const bestRoi = Math.max(...comparisons.map(({ result }) => result.roi));
  const visibleColumns = getVisibleCompareColumns();

  const headRow = document.createElement("tr");
  headRow.append(createTableHeadCell("Сценарий"));
  visibleColumns.forEach((column) => headRow.append(createTableHeadCell(column.label)));
  compareHead.replaceChildren(headRow);

  compareBody.replaceChildren(...comparisons.map(({ index, scenario, result }) => {
    const row = document.createElement("tr");
    const isBest = result.netProfit === bestProfit || result.roi === bestRoi;

    row.dataset.compareIndex = String(index);
    row.tabIndex = 0;
    row.classList.toggle("is-active", index === activeScenarioIndex);
    row.classList.toggle("is-best", isBest);
    row.classList.toggle("is-loss", result.netProfit < 0);
    row.append(createComparisonCell("name", scenario.name || "Сценарий", index === activeScenarioIndex ? "Активный" : isBest ? "Лучший" : result.netProfit < 0 ? "Убыток" : ""));
    visibleColumns.forEach((column) => {
      const toneValue = column.tone ? column.tone({ result, scenario }) : null;
      const toneClass = toneValue > 0 ? " is-positive" : toneValue < 0 ? " is-negative" : "";
      row.append(createComparisonCell(`${column.type}${toneClass}`, column.value({ result, scenario })));
    });
    return row;
  }));
}

function getVisibleCompareColumns() {
  const checked = new Set([...document.querySelectorAll("[data-compare-toggle]:checked")].map((input) => input.dataset.compareToggle));
  return compareColumns.filter((column) => checked.has(column.key));
}

function createTableHeadCell(text) {
  const cell = document.createElement("th");
  cell.scope = "col";
  cell.textContent = text;
  return cell;
}

function createComparisonCell(type, text, badge = "") {
  const cell = document.createElement("td");
  cell.className = type;

  if (type === "name") {
    const name = document.createElement("strong");
    name.textContent = text;
    cell.append(name);

    if (badge) {
      const marker = document.createElement("span");
      marker.textContent = badge;
      cell.append(marker);
    }

    return cell;
  }

  cell.textContent = text;
  return cell;
}

function createScenarioRange(baseScenario) {
  const base = normalizeScenario(baseScenario);

  return [
    varyScenario(base, "Пессимистичный", 1.2, 0.8),
    { ...base, name: "Базовый" },
    varyScenario(base, "Оптимистичный", 0.8, 1.2),
  ];
}

function varyScenario(base, name, cpcFactor, conversionFactor) {
  return {
    ...base,
    name,
    cpc: roundScenarioValue(base.cpc * cpcFactor),
    siteConversion: roundScenarioValue(base.siteConversion * conversionFactor),
    salesConversion: roundScenarioValue(base.salesConversion * conversionFactor),
  };
}

function roundScenarioValue(value) {
  return Math.round(value * 100) / 100;
}

function syncControls(card, scenario) {
  Object.keys(controlConfigs).forEach((field) => {
    updateControlView(card, field, scenario[field]);
  });
  syncModeView(card, scenario);
}

function syncModeView(card, scenario) {
  const isTarget = scenario.mode === "target";
  card.querySelectorAll("[data-mode-option]").forEach((button) => {
    const isActive = button.dataset.modeOption === scenario.mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });

  const budgetControl = card.querySelector('[data-control="budget"]');
  const targetControl = card.querySelector('[data-control="targetProfit"]');
  if (budgetControl) {
    budgetControl.hidden = isTarget;
  }
  if (targetControl) {
    targetControl.hidden = !isTarget;
  }
}

function updateControlView(card, field, value) {
  const config = controlConfigs[field];
  const range = card.querySelector(`[data-range-for="${field}"]`);
  const editInput = card.querySelector(`[data-field="${field}"]`);
  const valueNode = card.querySelector(`[data-value-for="${field}"]`);
  const numericValue = Number(value) || 0;

  if (valueNode) {
    valueNode.textContent = formatNumber(numericValue, config.digits);
  }

  if (editInput) {
    editInput.value = String(numericValue).replace(".", ",");
  }

  if (!range) {
    return;
  }

  expandRangeToValue(range, numericValue);
  range.value = String(numericValue);
  updateRangeMeta(card, field, range);
  updateRangeProgress(range);
}

function expandRangeToValue(range, value) {
  const currentMin = Number(range.min);
  const currentMax = Number(range.max);

  if (Number.isFinite(value) && value < currentMin) {
    range.min = String(value);
  }

  if (Number.isFinite(value) && value > currentMax) {
    range.max = String(value);
  }
}

function updateRangeMeta(card, field, range) {
  const minNode = card.querySelector(`[data-range-min-for="${field}"]`);
  const maxNode = card.querySelector(`[data-range-max-for="${field}"]`);

  if (minNode) {
    minNode.textContent = formatControlMeta(field, Number(range.min));
  }

  if (maxNode) {
    maxNode.textContent = formatControlMeta(field, Number(range.max));
  }
}

function updateRangeProgress(range) {
  const min = Number(range.min) || 0;
  const max = Number(range.max) || 100;
  const value = Number(range.value) || 0;
  const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const bounded = Math.max(0, Math.min(100, progress));
  range.style.setProperty("--progress", `${bounded}%`);
}

function formatControlMeta(field, value) {
  const config = controlConfigs[field];
  return formatControlMetaWithConfig(config, value);
}

function formatLtvControlMeta(field, value) {
  const config = ltvControlConfigs[field];
  return formatControlMetaWithConfig(config, value);
}

function formatControlMetaWithConfig(config, value) {
  const digits = Number.isInteger(value) ? 0 : config.digits;
  return `${formatNumber(value, digits)}${config.unit === "%" ? "%" : ` ${config.unit}`}`;
}

function startControlEdit(card, field) {
  const control = card.querySelector(`[data-control="${field}"]`);
  const input = card.querySelector(`.value-edit-input[data-field="${field}"]`);
  if (!control || !input) {
    return;
  }

  control.classList.add("is-editing");
  input.hidden = false;
  input.dataset.previousValue = input.value;
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function closeControlEdit(input, shouldCommit) {
  if (!input || input.hidden) {
    return;
  }

  const field = input.dataset.field;
  const card = input.closest(".scenario-card");
  const control = input.closest(".control-card");
  const index = scenarioIndexFrom(input);

  if (shouldCommit) {
    scenarios[index][field] = parseNumber(input.value);
    updateControlView(card, field, scenarios[index][field]);
    updateScenario(card, scenarios[index]);
  } else {
    input.value = input.dataset.previousValue || input.value;
  }

  input.hidden = true;
  control.classList.remove("is-editing");
}

function updateScenario(card, scenario) {
  setOutputs(card, calculate(scenario), scenario);
  renderSummary();
  renderComparison();
  save();
}

function syncLtvControls() {
  Object.keys(ltvControlConfigs).forEach((field) => {
    updateLtvControlView(field, ltv[field]);
  });
}

function updateLtvControlView(field, value) {
  const config = ltvControlConfigs[field];
  const container = document.querySelector(`[data-ltv-control="${field}"]`);
  const range = document.querySelector(`[data-ltv-range-for="${field}"]`);
  const editInput = document.querySelector(`[data-ltv-field="${field}"]`);
  const valueNode = document.querySelector(`[data-ltv-value-for="${field}"]`);
  const numericValue = Number(value) || 0;

  if (valueNode) {
    valueNode.textContent = formatNumber(numericValue, config.digits);
  }

  if (editInput) {
    editInput.value = String(numericValue).replace(".", ",");
  }

  if (!range || !container) {
    return;
  }

  expandRangeToValue(range, numericValue);
  range.value = String(numericValue);
  updateLtvRangeMeta(field, range);
  updateRangeProgress(range);
}

function updateLtvRangeMeta(field, range) {
  const minNode = document.querySelector(`[data-ltv-range-min-for="${field}"]`);
  const maxNode = document.querySelector(`[data-ltv-range-max-for="${field}"]`);

  if (minNode) {
    minNode.textContent = formatLtvControlMeta(field, Number(range.min));
  }

  if (maxNode) {
    maxNode.textContent = formatLtvControlMeta(field, Number(range.max));
  }
}

function startLtvControlEdit(field) {
  const control = document.querySelector(`[data-ltv-control="${field}"]`);
  const input = document.querySelector(`[data-ltv-field="${field}"]`);
  if (!control || !input) {
    return;
  }

  control.classList.add("is-editing");
  input.hidden = false;
  input.dataset.previousValue = input.value;
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function closeLtvControlEdit(input, shouldCommit) {
  if (!input || input.hidden) {
    return;
  }

  const field = input.dataset.ltvField;
  const control = input.closest(".control-card");

  if (shouldCommit) {
    ltv[field] = parseNumber(input.value);
    updateLtvControlView(field, ltv[field]);
    renderSummary();
    save();
  } else {
    input.value = input.dataset.previousValue || input.value;
  }

  input.hidden = true;
  control.classList.remove("is-editing");
}

function fillLtvFields() {
  ltvFieldNames.forEach((field) => {
    ltvFields[field].value = String(ltv[field]).replace(".", ",");
  });
  syncLtvControls();
}

function renderLtv(result) {
  ltvOutputs.cac.textContent = formatMoney(result.cac, 2);
  ltvOutputs.revenue.textContent = formatMoney(result.revenue);
  ltvOutputs.profit.textContent = formatMoney(result.profit);
  ltvOutputs.firstProfit.textContent = formatMoney(result.firstProfit);
  ltvOutputs.retentionValue.textContent = formatMoney(result.retentionValue);
  ltvOutputs.ratio.textContent = `${formatNumber(result.ratio, 1)}x`;
  ltvOutputs.portfolioValue.textContent = formatMoney(result.portfolioValue);

  setNeutralTone(ltvOutputs.cac, ltvOutputs.revenue, ltvOutputs.firstProfit);
  setSignedTone(ltvOutputs.profit, result.profit);
  setSignedTone(ltvOutputs.retentionValue, result.retentionValue);
  setSignedTone(ltvOutputs.portfolioValue, result.portfolioValue);
  setRatioTone(ltvOutputs.ratio, result.ratio);
  renderLtvInsights(result);
  refreshScenarioDiagnoses();
  scheduleMetricFit();
}

function renderFunnelMap() {
  if (!mapOutputs.note) {
    return;
  }

  const scenario = getActiveScenario();
  const result = calculate(scenario);
  const ltvResult = calculateLtv(ltv, result.clients, result.clientPrice);
  const setText = (selector, value) => {
    const node = document.querySelector(`[data-map-output="${selector}"]`);
    if (node) {
      node.textContent = value;
    }
  };

  mapOutputs.summaryBudget.textContent = formatMoney(result.budget, 0);
  mapOutputs.summaryClients.textContent = `≈${formatNumber(Math.round(result.clients))}`;
  mapOutputs.summaryProfit.textContent = formatMoney(result.netProfit, 0);
  mapOutputs.summaryRoi.textContent = formatPercent(result.roi, 1);
  mapOutputs.summaryRatio.textContent = `${formatNumber(ltvResult.ratio, 1)}x`;
  setSignedTone(mapOutputs.summaryProfit, result.netProfit);
  setSignedTone(mapOutputs.summaryRoi, result.roi);
  setRatioTone(mapOutputs.summaryRatio, ltvResult.ratio);

  setText("budget", formatMoney(result.budget, 0));
  setText("cpc", formatMoney(scenario.cpc, 0));
  setText("clicks", `≈${formatNumber(Math.round(result.clicks))}`);
  setText("trafficCpc", formatMoney(scenario.cpc, 0));
  setText("leads", `≈${formatNumber(Math.round(result.leads))}`);
  setText("siteConversion", formatPercent(scenario.siteConversion, 1));
  setText("leadPrice", formatMoney(result.leadPrice, 2));
  setText("clients", `≈${formatNumber(Math.round(result.clients))}`);
  setText("salesConversion", formatPercent(scenario.salesConversion, 1));
  setText("clientPrice", formatMoney(result.clientPrice, 2));
  setText("revenue", formatMoney(result.revenue, 0));
  setText("averageCheck", formatMoney(scenario.averageCheck, 0));
  setText("grossProfit", formatMoney(result.grossProfit, 0));
  setText("netProfit", formatMoney(result.netProfit, 0));
  setText("mapRoi", formatPercent(result.roi, 1));
  setText("ltvProfit", formatMoney(ltvResult.profit, 0));
  setText("ltvRatio", `${formatNumber(ltvResult.ratio, 1)}x`);
  setText("portfolioValue", formatMoney(ltvResult.portfolioValue, 0));

  document.querySelectorAll("[data-map-stage]").forEach((card) => {
    card.classList.remove("is-weak", "is-good");
  });

  const issue = getMapIssue(scenario, result, ltvResult);
  const issueCard = document.querySelector(`[data-map-stage="${issue.stage}"]`);
  if (issueCard) {
    issueCard.classList.add(issue.tone === "good" ? "is-good" : "is-weak");
  }
  replaceDiagnosisItems(mapOutputs.note, [{ tone: issue.tone, text: issue.text }]);
  scheduleMetricFit();
}

function getMapIssue(scenario, result, ltvResult) {
  const marginProfitPerClient = scenario.averageCheck * (scenario.margin / 100);
  if (result.clientPrice > marginProfitPerClient) {
    return { stage: "sales", tone: "bad", text: "Клиент дорогой: CAC выше маржинальной прибыли с клиента." };
  }
  if (scenario.siteConversion < 2) {
    return { stage: "leads", tone: "warn", text: "Слабое место: конверсия сайта ниже 2%." };
  }
  if (scenario.salesConversion < 10) {
    return { stage: "sales", tone: "warn", text: "Слабое место: конверсия продаж ниже 10%." };
  }
  if (ltvResult.ratio > 0 && ltvResult.ratio < 1) {
    return { stage: "ltv", tone: "bad", text: "LTV не перекрывает стоимость привлечения." };
  }
  if (result.roi < 0) {
    return { stage: getWeakestPoint(scenario, calculateBreakEven(scenario, result)) === "конверсия сайта" ? "leads" : "sales", tone: "bad", text: "Воронка не окупается: проверьте слабый этап конверсии и стоимость клиента." };
  }
  return { stage: ltvResult.ratio >= 3 ? "ltv" : "profit", tone: "good", text: "Воронка окупается. Экономика сценария выглядит устойчивой." };
}

function renderLtvInsights(result) {
  renderLtvRetentionConclusion(result);
  renderLtvLevers(result);
  renderLtvBreakEven(result);
}

function renderLtvRetentionConclusion(result) {
  const item = getLtvRetentionConclusion(result);
  replaceDiagnosisItems(ltvInsights.retentionList, [item]);
}

function getLtvRetentionConclusion(result) {
  if (!Number.isFinite(result.ratio) || result.cac <= 0 || result.profit <= 0) {
    return {
      tone: "neutral",
      text: "Введите CAC и прибыль по клиенту, чтобы рассчитать LTV:CAC.",
    };
  }

  if (result.ratio < 1) {
    return {
      tone: "bad",
      text: "Удержание не перекрывает стоимость привлечения. Клиент приносит меньше прибыли, чем стоит его привлечение.",
    };
  }

  if (result.ratio < 3) {
    return {
      tone: "warn",
      text: "Модель окупается, но запас небольшой. Стоит снижать CAC или повышать повторные покупки.",
    };
  }

  return {
    tone: "good",
    text: "Экономика удержания сильная. Клиент приносит прибыль сильно выше стоимости привлечения.",
  };
}

function renderLtvLevers(result) {
  replaceDiagnosisItems(ltvInsights.leverList, buildLtvLeverItems(result));
}

function buildLtvLeverItems(result) {
  if (ltv.averageCheck <= 0 || ltv.margin <= 0 || ltv.orders <= 0) {
    return [{
      tone: "neutral",
      text: "Введите средний чек, маржу и покупки за цикл, чтобы найти главный рычаг LTV.",
    }];
  }

  const baseNetProfit = getLtvNetProfit(ltv);
  const variants = [
    {
      key: "orders",
      name: "покупки за цикл",
      text: (delta) => `+1 покупка даст +${formatMoney(delta, 0)} прибыли на клиента.`,
      values: { ...ltv, orders: ltv.orders + 1 },
    },
    {
      key: "margin",
      name: "маржа",
      text: (delta) => `+10% к марже даст +${formatMoney(delta, 0)} LTV по прибыли.`,
      values: { ...ltv, margin: ltv.margin * 1.1 },
    },
    {
      key: "averageCheck",
      name: "средний чек",
      text: (delta) => `+10% к среднему чеку даст +${formatMoney(delta, 0)} LTV по прибыли.`,
      values: { ...ltv, averageCheck: ltv.averageCheck * 1.1 },
    },
    {
      key: "retentionCost",
      name: "расход на удержание",
      text: (delta) => `-10% расхода даст +${formatMoney(delta, 0)} прибыли на клиента.`,
      values: { ...ltv, retentionCost: ltv.retentionCost * 0.9 },
    },
  ].map((variant) => ({
    ...variant,
    delta: getLtvNetProfit(variant.values) - baseNetProfit,
  }));

  if (result.cac > 0 && result.profit > 0) {
    const nextRatio = safeDivide(result.profit, result.cac * 0.9);
    variants.push({
      key: "cac",
      name: "CAC",
      delta: 0.01,
      text: () => `-10% к CAC поднимет LTV:CAC до ${formatNumber(nextRatio, 1)}x.`,
    });
  }

  return variants
    .filter(({ delta }) => delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
    .map((variant, index) => ({
      tone: index === 0 ? "good" : "neutral",
      text: `${index === 0 ? `Главный рычаг: ${variant.name}. ` : `${capitalize(variant.name)}. `}${variant.text(variant.delta)}`,
    }));
}

function getLtvNetProfit(values) {
  return values.averageCheck * values.orders * (values.margin / 100) - values.retentionCost;
}

function renderLtvBreakEven(result) {
  const ready = result.cac > 0 && result.profit > 0;
  if (!ready) {
    ltvInsights.breakEvenStatus.textContent = "Введите CAC и прибыль по клиенту, чтобы рассчитать пороги.";
    replaceDiagnosisItems(ltvInsights.breakEvenList, [{
      tone: "neutral",
      text: "Недостаточно данных для точки окупаемости удержания.",
    }]);
    return;
  }

  const isProfitable = result.ratio >= 1;
  const firstProfit = ltv.averageCheck * (ltv.margin / 100);
  const minOrders = firstProfit > 0 ? Math.max(1, Math.ceil(safeDivide(result.cac, firstProfit))) : null;
  const minMargin = ltv.averageCheck > 0 && ltv.orders > 0
    ? safeDivide(result.cac, ltv.averageCheck * ltv.orders) * 100
    : null;
  const maxRetentionCost = Math.max(0, result.profit - result.cac);

  ltvInsights.breakEvenStatus.textContent = isProfitable
    ? "Клиент окупает привлечение. Ниже пороги запаса."
    : "Минимальные показатели, при которых удержание перекроет CAC.";

  replaceDiagnosisItems(ltvInsights.breakEvenList, [
    {
      tone: "neutral",
      text: `Макс. CAC: ${formatMoney(result.profit, 0)}.`,
    },
    {
      tone: "neutral",
      text: minOrders
        ? `Покупок за цикл нужно минимум ${formatFlexibleNumber(minOrders, 0)}.`
        : "Покупок за цикл: недостаточно данных.",
    },
    {
      tone: "neutral",
      text: minMargin
        ? `${isProfitable ? "Маржа может снизиться до" : "Маржа должна быть не ниже"} ${formatPercent(minMargin, 1)}.`
        : "Маржа: недостаточно данных.",
    },
    {
      tone: "neutral",
      text: `Расход на удержание может вырасти до ${formatMoney(maxRetentionCost, 0)}.`,
    },
  ]);
}

function renderBreakEven(card, breakEven, scenario) {
  const outputs = {
    clients: card.querySelector('[data-zero-output="clients"]'),
    leads: card.querySelector('[data-zero-output="leads"]'),
    cpc: card.querySelector('[data-zero-output="cpc"]'),
    salesConversion: card.querySelector('[data-zero-output="salesConversion"]'),
  };
  const labels = {
    clients: card.querySelector('[data-zero-label="clients"]'),
    leads: card.querySelector('[data-zero-label="leads"]'),
    cpc: card.querySelector('[data-zero-label="cpc"]'),
    salesConversion: card.querySelector('[data-zero-label="salesConversion"]'),
  };
  const status = card.querySelector("[data-zero-status]");
  const improveTitle = card.querySelector("[data-improve-title]");
  const improveStatus = card.querySelector("[data-improve-status]");
  const improveList = card.querySelector("[data-improve-list]");
  const isProfitable = breakEven.coreReady && breakEven.isProfitable;

  if (isProfitable) {
    labels.clients.textContent = "Цена клика до";
    labels.leads.textContent = "Конверсия сайта до";
    labels.cpc.textContent = "Конверсия продаж до";
    labels.salesConversion.textContent = "Маржа до";
    setThresholdOutput(outputs.clients, breakEven.maxCpc, (value) => formatMoney(value, 2));
    setThresholdOutput(outputs.leads, breakEven.minSiteConversion, (value) => formatPercent(value, 1));
    setThresholdOutput(outputs.cpc, breakEven.minSalesConversion, (value) => formatPercent(value, 1));
    setThresholdOutput(outputs.salesConversion, breakEven.minMargin, (value) => formatPercent(value, 1));
  } else {
    labels.clients.textContent = "Нужно клиентов";
    labels.leads.textContent = "Нужно лидов";
    labels.cpc.textContent = "Макс. цена клика";
    labels.salesConversion.textContent = "Мин. конверсия продаж";
    setThresholdOutput(outputs.clients, breakEven.requiredClients, (value) => formatFlexibleNumber(value, 2));
    setThresholdOutput(outputs.leads, breakEven.requiredLeads, (value) => formatFlexibleNumber(value, 2));
    setThresholdOutput(outputs.cpc, breakEven.maxCpc, (value) => formatMoney(value, 2));
    setThresholdOutput(outputs.salesConversion, breakEven.minSalesConversion, (value) => formatPercent(value, 1));
  }
  setNeutralTone(outputs.clients, outputs.leads, outputs.cpc, outputs.salesConversion);

  if (!breakEven.coreReady) {
    const missingText = breakEven.missing.join(", ");
    status.textContent = `Для точки окупаемости заполните ${missingText}.`;
    improveTitle.textContent = "Что улучшить";
    improveStatus.textContent = "Рекомендации появятся после заполнения экономики сделки.";
    replaceImproveItems(improveList, [
      "Нужны бюджет, средний чек и маржа больше нуля.",
    ]);
    return;
  }

  status.textContent = isProfitable
    ? "Сценарий уже окупается. Ниже пороги, до которых показатели могут ухудшиться без ухода в минус."
    : "Минимальные показатели, при которых реклама выйдет в ноль.";

  improveTitle.textContent = isProfitable ? "Главный рычаг роста" : "Что улучшить";
  improveStatus.textContent = isProfitable
    ? "Что сильнее всего увеличит прибыль в текущем сценарии."
    : "Что нужно изменить, чтобы выйти в ноль.";
  replaceImproveItems(improveList, buildImproveItems(breakEven, scenario, calculate(scenario)));
}

function setThresholdOutput(element, value, formatter) {
  const isReady = Number.isFinite(value) && value >= 0;
  element.textContent = isReady ? formatter(value) : "Недостаточно данных";
  element.classList.toggle("is-text-value", !isReady);
}

function buildImproveItems(breakEven, scenario, result) {
  if (breakEven.isProfitable) {
    return buildGrowthLeverItems(scenario, result);
  }

  return buildBreakEvenImproveItems(breakEven, scenario);
}

function buildGrowthLeverItems(scenario, result) {
  const variants = [
    {
      key: "salesConversion",
      name: "конверсия продаж",
      action: "+10% к конверсии продаж",
      factor: 1.1,
    },
    {
      key: "siteConversion",
      name: "конверсия сайта",
      action: "+10% к конверсии сайта",
      factor: 1.1,
    },
    {
      key: "averageCheck",
      name: "средний чек",
      action: "+10% к среднему чеку",
      factor: 1.1,
    },
    {
      key: "margin",
      name: "маржа",
      action: "+10% к марже",
      factor: 1.1,
    },
    {
      key: "cpc",
      name: "цена клика",
      action: "-10% к цене клика",
      factor: 0.9,
    },
  ];

  return variants
    .map((variant) => {
      const nextScenario = {
        ...scenario,
        [variant.key]: scenario[variant.key] * variant.factor,
      };
      return {
        ...variant,
        delta: calculate(nextScenario).netProfit - result.netProfit,
      };
    })
    .filter(({ delta }) => delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
    .map((variant, index) => {
      const prefix = index === 0 ? `Главный рычаг: ${variant.name}. ` : `${capitalize(variant.name)}. `;
      return `${prefix}${variant.action} даст +${formatMoney(variant.delta, 0)} прибыли.`;
    });
}

function buildBreakEvenImproveItems(breakEven, scenario) {
  const candidates = [
    {
      value: breakEven.maxCpc,
      isRelevant: breakEven.maxCpc && scenario.cpc > breakEven.maxCpc,
      effort: safeDivide(scenario.cpc - breakEven.maxCpc, scenario.cpc),
      text: `Снизьте цену клика до ${formatMoney(breakEven.maxCpc, 2)}.`,
    },
    {
      value: breakEven.minSiteConversion,
      isRelevant: breakEven.minSiteConversion && scenario.siteConversion < breakEven.minSiteConversion,
      effort: safeDivide(breakEven.minSiteConversion - scenario.siteConversion, scenario.siteConversion),
      text: `Поднимите конверсию сайта до ${formatPercent(breakEven.minSiteConversion, 1)}.`,
    },
    {
      value: breakEven.minSalesConversion,
      isRelevant: breakEven.minSalesConversion && scenario.salesConversion < breakEven.minSalesConversion,
      effort: safeDivide(breakEven.minSalesConversion - scenario.salesConversion, scenario.salesConversion),
      text: `Поднимите конверсию продаж до ${formatPercent(breakEven.minSalesConversion, 1)}.`,
    },
    {
      value: breakEven.minMargin,
      isRelevant: breakEven.minMargin && scenario.margin < breakEven.minMargin,
      effort: safeDivide(breakEven.minMargin - scenario.margin, scenario.margin),
      text: `Поднимите маржу до ${formatPercent(breakEven.minMargin, 1)}.`,
    },
    {
      value: breakEven.minAverageCheck,
      isRelevant: breakEven.minAverageCheck && scenario.averageCheck < breakEven.minAverageCheck,
      effort: safeDivide(breakEven.minAverageCheck - scenario.averageCheck, scenario.averageCheck),
      text: `Увеличьте средний чек до ${formatMoney(breakEven.minAverageCheck, 0)}.`,
    },
  ];

  return candidates
    .filter(({ value, isRelevant }) => Number.isFinite(value) && isRelevant)
    .sort((a, b) => a.effort - b.effort)
    .slice(0, 4)
    .map(({ text }) => text);
}

function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function replaceImproveItems(list, items) {
  const safeItems = items.length ? items : ["Недостаточно данных для рекомендации."];
  list.replaceChildren(...safeItems.map((item) => {
    const element = document.createElement("li");
    element.textContent = item;
    return element;
  }));
}

function buildDiagnosisItems(scenario, result, breakEven) {
  if (!breakEven.coreReady) {
    return [{
      tone: "neutral",
      text: "Не хватает экономики сделки: заполните бюджет, средний чек и маржу.",
    }];
  }

  const items = [];
  const marginProfitPerClient = scenario.averageCheck * (scenario.margin / 100);

  if (breakEven.isProfitable) {
    items.push({
      tone: "good",
      text: `Сценарий окупается. Чистая прибыль ${formatMoney(result.netProfit, 0)}, ROI ${formatPercent(result.roi, 1)}.`,
    });

    items.push({
      tone: "good",
      text: `Главный запас дают ${getReserveSources(scenario, breakEven)}.`,
    });
    items.push({
      tone: "warn",
      text: `Главный риск: ${getRiskSource(scenario, breakEven)}.`,
    });
    return items.slice(0, 3);
  }

  items.push({
    tone: "bad",
    text: `Сценарий не окупается. Чистая прибыль ${formatMoney(result.netProfit, 0)}, ROI ${formatPercent(result.roi, 1)}.`,
  });

  items.push({
    tone: "bad",
    text: marginProfitPerClient > 0 && result.clientPrice > marginProfitPerClient
      ? "Основная причина: цена клиента выше маржинальной прибыли с клиента."
      : "Основная причина: маржинальной прибыли не хватает, чтобы покрыть рекламный бюджет.",
  });

  items.push({
    tone: "warn",
    text: `Главное слабое место: ${getWeakestPoint(scenario, breakEven)}.`,
  });

  return items.slice(0, 3);
}

function getReserveSources(scenario, breakEven) {
  const reserves = [
    {
      label: "маржа",
      value: breakEven.minMargin > 0 ? safeDivide(scenario.margin - breakEven.minMargin, breakEven.minMargin) : 0,
    },
    {
      label: "конверсия продаж",
      value: breakEven.minSalesConversion > 0
        ? safeDivide(scenario.salesConversion - breakEven.minSalesConversion, breakEven.minSalesConversion)
        : 0,
    },
    {
      label: "конверсия сайта",
      value: breakEven.minSiteConversion > 0
        ? safeDivide(scenario.siteConversion - breakEven.minSiteConversion, breakEven.minSiteConversion)
        : 0,
    },
    {
      label: "цена клика",
      value: breakEven.maxCpc > 0 ? safeDivide(breakEven.maxCpc - scenario.cpc, scenario.cpc) : 0,
    },
  ].sort((a, b) => b.value - a.value);

  return reserves.slice(0, 2).map(({ label }) => label).join(" и ");
}

function getRiskSource(scenario, breakEven) {
  const risks = [
    {
      label: "рост цены клика",
      value: breakEven.maxCpc > 0 ? safeDivide(breakEven.maxCpc - scenario.cpc, scenario.cpc) : Infinity,
    },
    {
      label: "падение конверсии продаж",
      value: breakEven.minSalesConversion > 0
        ? safeDivide(scenario.salesConversion - breakEven.minSalesConversion, breakEven.minSalesConversion)
        : Infinity,
    },
    {
      label: "падение конверсии сайта",
      value: breakEven.minSiteConversion > 0
        ? safeDivide(scenario.siteConversion - breakEven.minSiteConversion, breakEven.minSiteConversion)
        : Infinity,
    },
    {
      label: "снижение маржи",
      value: breakEven.minMargin > 0 ? safeDivide(scenario.margin - breakEven.minMargin, breakEven.minMargin) : Infinity,
    },
  ].sort((a, b) => a.value - b.value);

  return risks[0]?.label || "рост цены клика или падение конверсии продаж";
}

function getWeakestPoint(scenario, breakEven) {
  const gaps = [
    {
      label: "цена клика",
      value: breakEven.maxCpc > 0 ? safeDivide(scenario.cpc - breakEven.maxCpc, breakEven.maxCpc) : 0,
    },
    {
      label: "конверсия сайта",
      value: breakEven.minSiteConversion > 0
        ? safeDivide(breakEven.minSiteConversion - scenario.siteConversion, scenario.siteConversion)
        : 0,
    },
    {
      label: "конверсия продаж",
      value: breakEven.minSalesConversion > 0
        ? safeDivide(breakEven.minSalesConversion - scenario.salesConversion, scenario.salesConversion)
        : 0,
    },
    {
      label: "маржа",
      value: breakEven.minMargin > 0 ? safeDivide(breakEven.minMargin - scenario.margin, scenario.margin) : 0,
    },
  ].sort((a, b) => b.value - a.value);

  return gaps.find(({ value }) => value > 0)?.label || "экономика сделки";
}

function renderDiagnosis(card, items) {
  const list = card.querySelector("[data-diagnosis-list]");
  replaceDiagnosisItems(list, items);
}

function replaceDiagnosisItems(list, items) {
  const safeItems = items.length ? items : [{
    tone: "neutral",
    text: "Критичных ограничений по текущим порогам не найдено.",
  }];

  list.replaceChildren(...safeItems.map(({ tone, text }) => {
    const element = document.createElement("li");
    element.className = `is-${tone}`;
    element.textContent = text;
    return element;
  }));
}

function refreshScenarioDiagnoses() {
  scenarioList.querySelectorAll(".scenario-card").forEach((card, index) => {
    const scenario = scenarios[index];
    const result = calculate(scenario);
    renderDiagnosis(card, buildDiagnosisItems(scenario, result, calculateBreakEven(scenario, result)));
  });
}

function setMetricTone(element, tone) {
  element.classList.remove("is-positive", "is-negative", "is-neutral");
  element.classList.add(`is-${tone}`);

  const accentCard = element.closest(".is-accent");
  if (accentCard) {
    accentCard.classList.toggle("is-good", tone === "positive");
    accentCard.classList.toggle("is-bad", tone === "negative");
  }
}

function setSignedTone(element, value) {
  setMetricTone(element, value > 0 ? "positive" : value < 0 ? "negative" : "neutral");
}

function setRatioTone(element, value) {
  if (value >= 3) {
    setMetricTone(element, "positive");
    return;
  }

  setMetricTone(element, value > 0 && value < 1 ? "negative" : "neutral");
}

function setNeutralTone(...elements) {
  elements.forEach((element) => setMetricTone(element, "neutral"));
}

function scheduleMetricFit() {
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(fitMetricValues);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function fitMetricValues() {
  document.querySelectorAll(".metric-value").forEach((value) => {
    value.style.fontSize = "";
    const minimumSize = value.closest(".small, .summary-grid") ? 16 : 20;
    let currentSize = Number.parseFloat(getComputedStyle(value).fontSize);

    while (value.scrollWidth > value.clientWidth && currentSize > minimumSize) {
      currentSize -= 1;
      value.style.fontSize = `${currentSize}px`;
    }
  });
}

function save() {
  localStorage.setItem(storageKey, JSON.stringify(scenarios));
  localStorage.setItem(ltvStorageKey, JSON.stringify(ltv));
  localStorage.setItem(activeScenarioStorageKey, String(activeScenarioIndex));
}

function scenarioIndexFrom(element) {
  return Number(element.closest(".scenario-card").dataset.index);
}

scenarioList.addEventListener("input", (event) => {
  const nameInput = event.target.closest('[data-field="name"]');
  const rangeInput = event.target.closest("[data-range-for]");
  if (!nameInput && !rangeInput) {
    return;
  }

  const input = nameInput || rangeInput;
  const card = input.closest(".scenario-card");
  const index = scenarioIndexFrom(input);
  const field = nameInput ? "name" : rangeInput.dataset.rangeFor;
  scenarios[index][field] = nameInput ? input.value : parseNumber(input.value);

  if (rangeInput) {
    updateControlView(card, field, scenarios[index][field]);
  }

  updateScenario(card, scenarios[index]);
});

scenarioList.addEventListener("click", (event) => {
  const modeButton = event.target.closest("[data-mode-option]");
  if (modeButton) {
    const card = modeButton.closest(".scenario-card");
    const index = scenarioIndexFrom(modeButton);
    scenarios[index].mode = modeButton.dataset.modeOption;
    syncModeView(card, scenarios[index]);
    updateScenario(card, scenarios[index]);
    return;
  }

  const editButton = event.target.closest("[data-edit-for]");
  if (editButton) {
    startControlEdit(editButton.closest(".scenario-card"), editButton.dataset.editFor);
    return;
  }

  const action = event.target.closest("[data-action]");
  if (!action) {
    return;
  }

  const index = scenarioIndexFrom(action);
  if (action.dataset.action === "duplicate") {
    scenarios.splice(index + 1, 0, {
      ...scenarios[index],
      name: `${scenarios[index].name || "Сценарий"} копия`.slice(0, 32),
    });
    activeScenarioIndex = index + 1;
  }

  if (action.dataset.action === "remove" && scenarios.length > 1) {
    scenarios.splice(index, 1);
    if (activeScenarioIndex >= scenarios.length) {
      activeScenarioIndex = scenarios.length - 1;
    }
  }

  render();
});

compareBody.addEventListener("click", (event) => {
  const row = event.target.closest("[data-compare-index]");
  if (!row) {
    return;
  }

  activeScenarioIndex = Number(row.dataset.compareIndex);
  render();
});

compareBody.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const row = event.target.closest("[data-compare-index]");
  if (!row) {
    return;
  }

  event.preventDefault();
  activeScenarioIndex = Number(row.dataset.compareIndex);
  render();
});

compareFilters.addEventListener("change", (event) => {
  if (!document.querySelector("[data-compare-toggle]:checked")) {
    event.target.checked = true;
  }
  renderComparison();
});

scenarioList.addEventListener("keydown", (event) => {
  const input = event.target.closest(".value-edit-input");
  if (!input) {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    closeControlEdit(input, true);
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeControlEdit(input, false);
  }
});

scenarioList.addEventListener("focusout", (event) => {
  const input = event.target.closest(".value-edit-input");
  if (!input) {
    return;
  }

  requestAnimationFrame(() => closeControlEdit(input, true));
});

document.querySelector(".ltv-inputs").addEventListener("input", (event) => {
  const range = event.target.closest("[data-ltv-range-for]");
  if (!range) {
    return;
  }

  const field = range.dataset.ltvRangeFor;
  ltv[field] = parseNumber(range.value);
  updateLtvControlView(field, ltv[field]);
  renderSummary();
  save();
});

document.querySelector(".ltv-inputs").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-ltv-edit-for]");
  if (editButton) {
    startLtvControlEdit(editButton.dataset.ltvEditFor);
  }
});

document.querySelector(".ltv-inputs").addEventListener("keydown", (event) => {
  const input = event.target.closest(".value-edit-input");
  if (!input) {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    closeLtvControlEdit(input, true);
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeLtvControlEdit(input, false);
  }
});

document.querySelector(".ltv-inputs").addEventListener("focusout", (event) => {
  const input = event.target.closest(".value-edit-input");
  if (!input) {
    return;
  }

  requestAnimationFrame(() => closeLtvControlEdit(input, true));
});

addButton.addEventListener("click", () => {
  scenarios.push({
    ...defaultScenario,
    name: `Сценарий ${scenarios.length + 1}`,
  });
  activeScenarioIndex = scenarios.length - 1;
  render();
});

tripleButton.addEventListener("click", () => {
  scenarios = createScenarioRange(scenarios[0] || defaultScenario);
  activeScenarioIndex = 1;
  render();
});

resetButton.addEventListener("click", () => {
  scenarios = [structuredClone(defaultScenario)];
  ltv = structuredClone(defaultLtv);
  activeScenarioIndex = 0;
  render();
});

printButton.addEventListener("click", () => window.print());

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.tabTarget;

    tabButtons.forEach((tabButton) => {
      const isActive = tabButton.dataset.tabTarget === target;
      tabButton.classList.toggle("is-active", isActive);
      tabButton.setAttribute("aria-selected", String(isActive));
    });

    tabPanels.forEach((panel) => {
      const isActive = panel.dataset.tabPanel === target;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });

    closeHelpTips();
    scheduleMetricFit();
  });
});

const mobileTooltipMedia = window.matchMedia("(hover: none), (pointer: coarse), (max-width: 760px)");

function closeHelpTips(except) {
  document.querySelectorAll(".help-icon.is-open").forEach((icon) => {
    if (icon !== except) {
      icon.classList.remove("is-open");
    }
  });
}

document.addEventListener("pointerover", (event) => {
  const helpIcon = event.target.closest(".help-icon");
  if (!helpIcon || mobileTooltipMedia.matches) {
    return;
  }

  closeHelpTips(helpIcon);
  helpIcon.classList.add("is-open");
});

document.addEventListener("pointerout", (event) => {
  const helpIcon = event.target.closest(".help-icon");
  if (!helpIcon || mobileTooltipMedia.matches || helpIcon.contains(event.relatedTarget)) {
    return;
  }

  helpIcon.classList.remove("is-open");
});

document.addEventListener("focusin", (event) => {
  const helpIcon = event.target.closest(".help-icon");
  if (!helpIcon || mobileTooltipMedia.matches) {
    return;
  }

  closeHelpTips(helpIcon);
  helpIcon.classList.add("is-open");
});

document.addEventListener("focusout", (event) => {
  const helpIcon = event.target.closest(".help-icon");
  if (!helpIcon || mobileTooltipMedia.matches) {
    return;
  }

  helpIcon.classList.remove("is-open");
});

document.addEventListener("click", (event) => {
  const helpIcon = event.target.closest(".help-icon");

  if (helpIcon && mobileTooltipMedia.matches) {
    event.preventDefault();
    event.stopPropagation();
    const shouldOpen = !helpIcon.classList.contains("is-open");
    closeHelpTips(helpIcon);
    helpIcon.classList.toggle("is-open", shouldOpen);
    return;
  }

  if (!helpIcon) {
    closeHelpTips();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeHelpTips();
  }
});

window.addEventListener("resize", scheduleMetricFit);

render();
refreshIcons();

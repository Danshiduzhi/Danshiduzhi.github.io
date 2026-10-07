(() => {
  "use strict";

const ordersDaily = [
  4, 0, 0, 0, 0, 0, 0, 0, 1, 0, 3, 0, 1, 1, 1, 1, 5, 0, 0, 1, 1, 0, 1, 1,
  0, 0, 1, 2, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 5, 1, 0, 1, 1, 1, 0, 0,
  1, 1, 1, 1, 1, 0, 1, 0, 0, 2, 1, 1, 3, 1, 0, 1, 2, 1, 1, 0, 1, 1, 2, 0,
  1, 1, 0, 1, 1, 1, 1, 1, 0, 2, 2, 2, 1, 1, 2, 1, 0, 3, 4, 4, 1, 3, 1, 1,
  1, 1, 1, 2, 1, 1, 0, 1, 1, 3, 1, 1, 1, 1, 1, 1
];

const revenueDaily = [
  230, 0, 0, 0, 0, 0, 0, 0, 44, 0, 156, 0, 53, 74, 160, 63, 322, 0, 0, 57,
  53, 0, 61, 106, 0, 0, 73, 144, 0, 68, 70, 70, 61, 56, 67, 75, 94, 0, 0, 0,
  388, 69, 0, 71, 75, 71, 0, 0, 71, 66, 91, 54, 129, 0, 58, 0, 0, 151, 81,
  112, 288, 116, 0, 68, 139, 90, 73, 0, 89, 90, 183, 0, 80, 75, 0, 70, 57,
  66, 79, 72, 0, 176, 173, 160, 76, 75, 168, 84, 0, 214, 338, 417, 95, 233,
  71, 61, 89, 86, 90, 161, 72, 82, 0, 76, 72, 278, 91, 81, 89, 112, 69, 98
];

const chartMargin = {
  top: 28,
  right: 34,
  bottom: 44,
  left: 58
};

const compactChartViewport = window.matchMedia("(max-width: 720px)").matches;
const chartWidth = compactChartViewport ? 520 : 900;
const chartHeight = compactChartViewport ? 360 : 340;
const chartInnerWidth = chartWidth - chartMargin.left - chartMargin.right;
const chartInnerHeight = chartHeight - chartMargin.top - chartMargin.bottom;
const chartStartDate = new Date(Date.UTC(2026, 5, 13));
const chartPrefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const svgNamespace = "http://www.w3.org/2000/svg";

function createChartNode(tagName, attributes = {}) {
  const node = document.createElementNS(svgNamespace, tagName);

  Object.entries(attributes).forEach(([key, value]) => {
    node.setAttribute(key, String(value));
  });

  return node;
}

function formatDate(index) {
  const date = new Date(chartStartDate);
  date.setUTCDate(date.getUTCDate() + index);
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatFullDate(index) {
  const date = new Date(chartStartDate);
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
}

function formatTick(value, type) {
  if (type === "currency") {
    return value === 0 ? "0" : `¥${value / 1000}k`;
  }

  return String(value);
}

function buildCumulativeSeries(dailyValues) {
  let total = 0;
  return dailyValues.map((value) => {
    total += value;
    return total;
  });
}

function getAxisConfig(values, valueType, isFullRange) {
  if (isFullRange) {
    return valueType === "currency"
      ? { minValue: 0, maxValue: 10000, ticks: [0, 2500, 5000, 7500, 10000] }
      : { minValue: 0, maxValue: 120, ticks: [0, 30, 60, 90, 120] };
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = Math.max(maximum - minimum, valueType === "currency" ? 500 : 5);
  const stepCandidates = valueType === "currency"
    ? [100, 250, 500, 1000, 2000, 2500]
    : [1, 2, 5, 10, 20, 25];
  const step = stepCandidates.find((candidate) => candidate >= span / 4) || stepCandidates[stepCandidates.length - 1];
  const minValue = Math.max(0, Math.floor((minimum - step * 0.5) / step) * step);
  const maxValue = Math.ceil((maximum + step * 0.5) / step) * step;
  const ticks = [];

  for (let tick = minValue; tick <= maxValue; tick += step) {
    ticks.push(tick);
  }

  return { minValue, maxValue, ticks };
}

function renderCumulativeChart(options) {
  const { svg, dailyValues, minValue, maxValue, ticks, color, gradientId, peakThreshold, finalLabel, valueType, startOffset = 0, initialValue = 0 } = options;

  if (!svg) {
    return;
  }

  svg.setAttribute("viewBox", `0 0 ${chartWidth} ${chartHeight}`);
  const values = buildCumulativeSeries(dailyValues).map((value) => value + initialValue);
  const lastIndex = values.length - 1;
  const x = (index) => chartMargin.left + (index / lastIndex) * chartInnerWidth;
  const y = (value) => chartMargin.top + chartInnerHeight - ((value - minValue) / (maxValue - minValue)) * chartInnerHeight;
  const baseline = chartMargin.top + chartInnerHeight;

  const defs = createChartNode("defs");
  const gradient = createChartNode("linearGradient", {
    id: gradientId,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  });
  gradient.append(
    createChartNode("stop", { offset: "0", "stop-color": color, "stop-opacity": "0.28" }),
    createChartNode("stop", { offset: "1", "stop-color": color, "stop-opacity": "0" })
  );
  defs.appendChild(gradient);
  svg.appendChild(defs);

  ticks.forEach((tick) => {
    const tickY = y(tick);
    svg.appendChild(
      createChartNode("line", {
        class: "chart-grid-line",
        x1: chartMargin.left,
        y1: tickY,
        x2: chartWidth - chartMargin.right,
        y2: tickY
      })
    );
    const label = createChartNode("text", {
      class: "chart-axis-label chart-y-label",
      x: chartMargin.left - 12,
      y: tickY + 4,
      "text-anchor": "end"
    });
    label.textContent = formatTick(tick, valueType);
    svg.appendChild(label);
  });

  const tickIndexes = values.length > 40
    ? [0, Math.round((values.length - 1) * 0.33), Math.round((values.length - 1) * 0.66), values.length - 1]
    : [0, Math.round((values.length - 1) * 0.5), values.length - 1];

  tickIndexes.forEach((index) => {
    const label = createChartNode("text", {
      class: "chart-axis-label chart-x-label",
      x: x(index),
      y: chartHeight - 14,
      "text-anchor": "middle"
    });
    label.textContent = formatDate(index + startOffset);
    svg.appendChild(label);
  });

  const areaPath = values.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`).join(" ");
  const area = createChartNode("path", {
    class: "chart-area",
    d: `${areaPath} L ${x(lastIndex)} ${baseline} L ${x(0)} ${baseline} Z`,
    fill: `url(#${gradientId})`
  });
  svg.appendChild(area);

  const linePath = values.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`).join(" ");
  const line = createChartNode("path", {
    class: "chart-line",
    d: linePath,
    stroke: color
  });
  svg.appendChild(line);

  dailyValues.forEach((value, index) => {
    if (value < peakThreshold) {
      return;
    }

    const point = createChartNode("circle", {
      class: "chart-point",
      cx: x(index),
      cy: y(values[index]),
      r: 4,
      fill: color
    });
    const title = createChartNode("title");
    title.textContent = `${formatFullDate(index + startOffset)}：单日${valueType === "currency" ? "净利润" : "成交"}${valueType === "currency" ? ` ¥${value}` : ` ${value} 单`}`;
    point.appendChild(title);
    svg.appendChild(point);
  });

  const finalX = x(lastIndex);
  const finalY = y(values[lastIndex]);
  svg.appendChild(
    createChartNode("circle", {
      class: "chart-final-point",
      cx: finalX,
      cy: finalY,
      r: 5.5,
      fill: color
    })
  );

  const finalText = createChartNode("text", {
    class: "chart-final-label",
    x: finalX - 8,
    y: finalY + 22,
    "text-anchor": "end"
  });
  finalText.textContent = finalLabel;
  svg.appendChild(finalText);

  if (chartPrefersReducedMotion) {
    return;
  }

  const length = line.getTotalLength();
  line.style.strokeDasharray = `${length}`;
  line.style.strokeDashoffset = `${length}`;
  area.style.opacity = "0";

  const observer = new IntersectionObserver(
    ([entry], chartObserver) => {
      if (!entry.isIntersecting) {
        return;
      }

      line.style.transition = "stroke-dashoffset 1500ms cubic-bezier(0.16, 1, 0.3, 1)";
      line.style.strokeDashoffset = "0";
      area.style.transition = "opacity 900ms ease-in-out 250ms";
      area.style.opacity = "1";
      chartObserver.disconnect();
    },
    { threshold: 0.28 }
  );

  observer.observe(svg);
}

const recentDays = 30;
let chartRange = "recent";

function getChartWindow(values) {
  if (chartRange === "full") {
    return { values, startOffset: 0 };
  }

  return {
    values: values.slice(-recentDays),
    startOffset: values.length - recentDays
  };
}

function renderAllCharts() {
  const ordersChart = document.querySelector("#orders-chart");
  const revenueChart = document.querySelector("#revenue-chart");
  ordersChart.replaceChildren();
  revenueChart.replaceChildren();

  const ordersWindow = getChartWindow(ordersDaily);
  const revenueWindow = getChartWindow(revenueDaily);
  const ordersBaseValues = buildCumulativeSeries(ordersDaily).slice(0, ordersWindow.startOffset);
  const revenueBaseValues = buildCumulativeSeries(revenueDaily).slice(0, revenueWindow.startOffset);
  const ordersBase = ordersBaseValues[ordersBaseValues.length - 1] || 0;
  const revenueBase = revenueBaseValues[revenueBaseValues.length - 1] || 0;
  const ordersValues = buildCumulativeSeries(ordersWindow.values).map((value) => value + ordersBase);
  const revenueValues = buildCumulativeSeries(revenueWindow.values).map((value) => value + revenueBase);
  const ordersAxis = getAxisConfig(ordersValues, "orders", chartRange === "full");
  const revenueAxis = getAxisConfig(revenueValues, "currency", chartRange === "full");
  const rangeDescription = chartRange === "full" ? "完整统计" : "截止 2026 年 10 月 2 日前最近 30 天";

  ordersChart.setAttribute("aria-label", `${rangeDescription}的累计成交订单折线图，累计超过 117 单`);
  revenueChart.setAttribute("aria-label", `${rangeDescription}的累计净利润折线图，累计超过 9166 元`);

  renderCumulativeChart({
    svg: ordersChart,
    dailyValues: ordersWindow.values,
    startOffset: ordersWindow.startOffset,
    initialValue: ordersBase,
    minValue: ordersAxis.minValue,
    maxValue: ordersAxis.maxValue,
    ticks: ordersAxis.ticks,
    color: "#82d4f6",
    gradientId: "orders-area-gradient",
    peakThreshold: 4,
    finalLabel: "117+ 单",
    valueType: "orders"
  });

  renderCumulativeChart({
    svg: revenueChart,
    dailyValues: revenueWindow.values,
    startOffset: revenueWindow.startOffset,
    initialValue: revenueBase,
    minValue: revenueAxis.minValue,
    maxValue: revenueAxis.maxValue,
    ticks: revenueAxis.ticks,
    color: "#d6b25e",
    gradientId: "revenue-area-gradient",
    peakThreshold: 300,
    finalLabel: "¥9,166+",
    valueType: "currency"
  });
}

const expandButton = document.querySelector("#orders-expand");
const chartsContainer = document.querySelector("#orders-charts");

expandButton?.addEventListener("click", () => {
  chartRange = chartRange === "recent" ? "full" : "recent";
  const isFull = chartRange === "full";
  chartsContainer.dataset.range = chartRange;
  expandButton.textContent = isFull ? "收起完整统计" : "查看完整统计";
  expandButton.setAttribute("aria-expanded", String(isFull));
  renderAllCharts();
});

renderAllCharts();

})();

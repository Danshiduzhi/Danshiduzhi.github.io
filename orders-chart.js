(() => {
  "use strict";

  // Illustrative daily distribution, not a transaction ledger. Preserve the supplied totals.
  const ordersDaily = [
    4, 0, 0, 0, 0, 0, 0, 0, 1, 0, 3, 0, 1, 1, 1, 1, 5, 0, 0, 1, 1, 0, 1, 1,
    0, 0, 1, 2, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 5, 1, 0, 1, 1, 1, 0, 0,
    1, 1, 1, 1, 1, 0, 1, 0, 0, 2, 1, 1, 3, 1, 0, 1, 2, 1, 1, 0, 1, 1, 2, 0,
    1, 1, 0, 1, 1, 1, 1, 1, 0, 2, 2, 2, 1, 1, 2, 1, 0, 3, 4, 4, 1, 3, 1, 1,
    1, 1, 1, 2, 1, 1, 0, 1, 1, 3, 1, 1, 1, 1, 1, 1
  ];
  const profitDaily = [
    230, 0, 0, 0, 0, 0, 0, 0, 44, 0, 156, 0, 53, 74, 160, 63, 322, 0, 0, 57,
    53, 0, 61, 106, 0, 0, 73, 144, 0, 68, 70, 70, 61, 56, 67, 75, 94, 0, 0, 0,
    388, 69, 0, 71, 75, 71, 0, 0, 71, 66, 91, 54, 129, 0, 58, 0, 0, 151, 81,
    112, 288, 116, 0, 68, 139, 90, 73, 0, 89, 90, 183, 0, 80, 75, 0, 70, 57,
    66, 79, 72, 0, 176, 173, 160, 76, 75, 168, 84, 0, 214, 338, 417, 95, 233,
    71, 61, 89, 86, 90, 161, 72, 82, 0, 76, 72, 278, 91, 81, 89, 112, 69, 98
  ];
  const latestSnapshot = { date: Date.UTC(2026, 9, 16), orders: 121, profit: 10766 };

  const ordersChart = document.querySelector("#orders-chart");
  const profitChart = document.querySelector("#revenue-chart");
  const expandButton = document.querySelector("#orders-expand");
  const chartsContainer = document.querySelector("#orders-charts");
  const rangeLabel = document.querySelector("#orders-range-label");
  if (!ordersChart || !profitChart || !chartsContainer) return;

  const recentDays = 30;
  const chartStartDate = Date.UTC(2026, 5, 13);
  const day = 86400000;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactViewport = window.matchMedia("(max-width: 600px)");
  const namespace = "http://www.w3.org/2000/svg";
  let chartRange = "recent";
  let resizeFrame = 0;
  let widthSignature = "";

  const lineObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const line = entry.target.querySelector(".chart-line");
        const area = entry.target.querySelector(".chart-area");
        const update = entry.target.querySelector(".chart-update-line");
        if (line && area) {
          line.style.transition = "stroke-dashoffset 1100ms cubic-bezier(0.2, 0.7, 0.2, 1)";
          line.style.strokeDashoffset = "0";
          area.style.transition = "opacity 650ms ease 150ms";
          area.style.opacity = "1";
          if (update) {
            update.style.transition = "opacity 650ms ease 200ms";
            update.style.opacity = "1";
          }
        }
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 })
    : null;

  function node(tagName, attributes = {}, text) {
    const element = document.createElementNS(namespace, tagName);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return `${String(date.getUTCMonth() + 1).padStart(2, "0")}.${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  function formatTick(value, currency) {
    return currency && value !== 0 ? `¥${value / 1000}k` : String(value);
  }

  function cumulative(values) {
    let total = 0;
    return values.map((value) => (total += value));
  }

  // The new snapshot is an aggregate, not invented daily activity after October 2.
  const dates = [...ordersDaily.map((_, index) => chartStartDate + index * day), latestSnapshot.date];
  const orderTotals = [...cumulative(ordersDaily), latestSnapshot.orders];
  const profitTotals = [...cumulative(profitDaily), latestSnapshot.profit];

  function getStartOffset() {
    if (chartRange === "full") return 0;
    const cutoff = latestSnapshot.date - (recentDays - 1) * day;
    return Math.max(0, dates.findIndex((date) => date >= cutoff));
  }

  function axisFor(values, currency) {
    const low = chartRange === "full" ? 0 : values[0];
    const high = values[values.length - 1];
    const span = Math.max(high - low, currency ? 500 : 5);
    const unit = 10 ** Math.floor(Math.log10(span / 4));
    const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * unit >= span / 4) * unit;
    const min = chartRange === "full" ? 0 : Math.max(0, Math.floor((low - step * 0.4) / step) * step);
    const max = Math.ceil((high + step * 0.4) / step) * step;
    const ticks = [];
    for (let tick = min; tick <= max; tick += step) ticks.push(tick);
    return { min, max, ticks };
  }

  function renderChart({ svg, totals, color, gradientId, finalLabel, currency = false, animate = false }) {
    const startOffset = getStartOffset();
    // Slice cumulative values so the recent view never implies a reset to zero.
    const values = totals.slice(startOffset);
    const width = Math.max(220, Math.round(svg.getBoundingClientRect().width));
    const height = Math.round(width / (compactViewport.matches ? 1.6 : 2));
    const margin = { top: 30, right: 24, bottom: 34, left: 49 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const axis = axisFor(values, currency);
    const lastIndex = values.length - 1;
    const firstDate = dates[startOffset];
    const dateSpan = Math.max(day, latestSnapshot.date - firstDate);
    const x = (index) => margin.left + (dates[index + startOffset] - firstDate) / dateSpan * plotWidth;
    const y = (value) => margin.top + plotHeight * (1 - (value - axis.min) / (axis.max - axis.min));
    const baseline = height - margin.bottom;
    const fragment = document.createDocumentFragment();
    const defs = node("defs");
    const gradient = node("linearGradient", { id: gradientId, x1: "0", y1: "0", x2: "0", y2: "1" });
    gradient.append(
      node("stop", { offset: "0", "stop-color": color, "stop-opacity": "0.15" }),
      node("stop", { offset: "1", "stop-color": color, "stop-opacity": "0" })
    );
    defs.append(gradient);
    fragment.append(defs);

    axis.ticks.forEach((tick) => {
      const tickY = y(tick);
      fragment.append(
        node("line", { class: "chart-grid-line", x1: margin.left, y1: tickY, x2: width - margin.right, y2: tickY }),
        node("text", { class: "chart-axis-label", x: margin.left - 10, y: tickY + 4, "text-anchor": "end" }, formatTick(tick, currency))
      );
    });

    const tickCount = chartRange === "full" ? 4 : 3;
    for (let i = 0; i < tickCount; i += 1) {
      const fraction = i / (tickCount - 1);
      const timestamp = firstDate + Math.round(fraction * dateSpan / day) * day;
      fragment.append(node("text", {
        class: "chart-axis-label", x: margin.left + fraction * plotWidth, y: height - 12, "text-anchor": "middle"
      }, formatDate(timestamp)));
    }

    const history = values.slice(0, -1);
    const lastHistoryIndex = history.length - 1;
    const path = history.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(" ");
    const area = node("path", {
      class: "chart-area", d: `${path} L${x(lastHistoryIndex)},${baseline} L${x(0)},${baseline} Z`, fill: `url(#${gradientId})`
    });
    const line = node("path", { class: "chart-line", d: path, stroke: color });
    const update = node("path", {
      class: "chart-update-line", stroke: color,
      d: `M${x(lastHistoryIndex)},${y(history[lastHistoryIndex])} L${x(lastIndex)},${y(values[lastIndex])}`
    });
    fragment.append(area, line, update);
    fragment.append(node("circle", {
      class: "chart-final-point", cx: x(lastIndex), cy: y(values[lastIndex]), r: 4, fill: color
    }));
    fragment.append(node("text", {
      class: "chart-final-label", x: x(lastIndex) - 8, y: y(values[lastIndex]) - 13, "text-anchor": "end"
    }, finalLabel));

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("aria-label", `${formatDate(firstDate)} 至 ${formatDate(latestSnapshot.date)}累计${currency ? "净利润" : "成交订单"}趋势示意，总计 ${finalLabel}，10月2日后为累计更新，非逐日账本`);
    svg.replaceChildren(fragment);

    if (animate && lineObserver && !reduceMotion.matches) {
      const length = line.getTotalLength();
      line.style.strokeDasharray = String(length);
      line.style.strokeDashoffset = String(length);
      area.style.opacity = "0";
      update.style.opacity = "0";
      lineObserver.observe(svg);
    }
  }

  function getWidthSignature() {
    return `${ordersChart.clientWidth}:${profitChart.clientWidth}:${compactViewport.matches}`;
  }

  function renderAll(animate = false) {
    lineObserver?.disconnect();
    const common = { animate };
    renderChart({ ...common, svg: ordersChart, totals: orderTotals, color: "#9bd8cb", gradientId: "orders-area-gradient", finalLabel: `${latestSnapshot.orders.toLocaleString("en-US")}+ 单` });
    renderChart({ ...common, svg: profitChart, totals: profitTotals, color: "#d5bb80", gradientId: "profit-area-gradient", finalLabel: `¥${latestSnapshot.profit.toLocaleString("en-US")}+`, currency: true });
    const isFull = chartRange === "full";
    chartsContainer.dataset.range = chartRange;
    expandButton?.setAttribute("aria-expanded", String(isFull));
    const buttonLabel = expandButton?.querySelector("[data-range-label]");
    if (buttonLabel) buttonLabel.textContent = isFull ? "收起完整统计" : "查看完整统计";
    if (rangeLabel) {
      rangeLabel.textContent = `${isFull ? "完整趋势" : "近期趋势"} · ${formatDate(dates[getStartOffset()])} — ${formatDate(latestSnapshot.date)}`;
    }
    widthSignature = getWidthSignature();
  }

  function requestResize() {
    if (getWidthSignature() === widthSignature || resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      renderAll();
    });
  }

  expandButton?.addEventListener("click", () => {
    chartRange = chartRange === "recent" ? "full" : "recent";
    renderAll();
  });
  reduceMotion.addEventListener("change", () => renderAll());
  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(requestResize);
    resizeObserver.observe(ordersChart.parentElement);
    resizeObserver.observe(profitChart.parentElement);
  } else {
    window.addEventListener("resize", requestResize, { passive: true });
  }
  compactViewport.addEventListener("change", requestResize);
  renderAll(true);
})();

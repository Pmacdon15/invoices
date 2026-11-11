/*
 * The HTML for the invoice card (MCP Apps, SEP-1865, and the OpenAI Apps
 * SDK). The page is fully self-contained: inline CSS and JS, no network
 * requests, nothing loaded from outside. It talks only to the host it is
 * embedded in. It only displays the invoice and calls no tools: changes, the
 * PDF and the link to the app all come from the assistant in the chat.
 *
 * The client script below is plain ES2019 kept in a string; it must not use
 * template literals (backticks), since it lives inside one.
 */

const STYLES = `
:root {
  color-scheme: light dark;
  --ip-bg: #ffffff;
  --ip-surface: #f6f7f9;
  --ip-border: #e3e6ea;
  --ip-text: #14171a;
  --ip-muted: #5f6b77;
  --ip-accent: #2563eb;
  --ip-accent-text: #ffffff;
  --ip-danger: #b42318;
  --ip-ok: #067647;
  --ip-warn: #b54708;
  --ip-radius: 10px;
  --ip-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ip-bg: #16181b; --ip-surface: #1f2226; --ip-border: #2e3238;
    --ip-text: #eceef1; --ip-muted: #9aa4af; --ip-accent: #60a5fa;
    --ip-accent-text: #0b1220; --ip-danger: #f97066; --ip-ok: #47cd89; --ip-warn: #fdb022;
  }
}
:root[data-theme="dark"] {
  --ip-bg: #16181b; --ip-surface: #1f2226; --ip-border: #2e3238;
  --ip-text: #eceef1; --ip-muted: #9aa4af; --ip-accent: #60a5fa;
  --ip-accent-text: #0b1220; --ip-danger: #f97066; --ip-ok: #47cd89; --ip-warn: #fdb022;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--color-background-primary, var(--ip-bg));
  color: var(--color-text-primary, var(--ip-text));
  font: 14px/1.45 var(--font-sans, var(--ip-font));
}
main { padding: 14px 16px 16px; }
header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
h1 { font-size: 18px; margin: 0; font-weight: 700; }
h2 { font-size: 12px; margin: 16px 0 6px; font-weight: 600; color: var(--ip-muted); text-transform: uppercase; letter-spacing: .04em; }
.muted { color: var(--ip-muted); }
.small { font-size: 12px; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
.pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: capitalize; border: 1px solid var(--ip-border); }
.pill.draft { color: var(--ip-muted); }
.pill.sent { color: var(--ip-warn); border-color: currentColor; }
.pill.paid { color: var(--ip-ok); border-color: currentColor; }
.box { background: var(--ip-surface); border: 1px solid var(--ip-border); border-radius: var(--ip-radius); padding: 10px 12px; }
.total { font-size: 24px; font-weight: 800; color: var(--ip-accent); }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 11px; text-transform: uppercase; color: var(--ip-muted); padding: 6px 4px; border-bottom: 1px solid var(--ip-border); font-weight: 600; }
td { padding: 6px 4px; border-bottom: 1px solid var(--ip-border); vertical-align: top; }
td.num, th.num { text-align: right; white-space: nowrap; }
tfoot td { border-bottom: none; }
.msg { margin-top: 10px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--ip-border); }
.msg.error { color: var(--ip-danger); border-color: currentColor; }
.msg.ok { color: var(--ip-ok); border-color: currentColor; }
.confirm { margin-top: 12px; padding: 12px; border-radius: var(--ip-radius); border: 1px solid var(--ip-accent); }
.empty { padding: 24px 0; text-align: center; color: var(--ip-muted); }
`;

const SCRIPT = `
(function () {
  "use strict";
  var root = document.getElementById("app");
  var state = {
    data: null, msg: null
  };

  /* ---------- host bridge: MCP Apps (postMessage JSON-RPC) or OpenAI Apps SDK ---------- */
  var openai = window.openai || null;
  var nextId = 1;
  var waiting = {};
  function post(msg) { if (window.parent && window.parent !== window) window.parent.postMessage(msg, "*"); }
  function request(method, params) {
    var id = nextId++;
    post({ jsonrpc: "2.0", id: id, method: method, params: params || {} });
    return new Promise(function (resolve, reject) {
      waiting[id] = { resolve: resolve, reject: reject };
      setTimeout(function () {
        if (waiting[id]) { delete waiting[id]; reject(new Error("The chat app did not answer in time.")); }
      }, 60000);
    });
  }
  function notify(method, params) { post({ jsonrpc: "2.0", method: method, params: params || {} }); }
  function resultText(res) {
    var c = res && res.content;
    if (c && c.length && c[0] && typeof c[0].text === "string") return c[0].text;
    return "";
  }
  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") document.documentElement.setAttribute("data-theme", theme);
  }
  function applyHostContext(ctx) {
    if (!ctx) return;
    applyTheme(ctx.theme);
    var vars = ctx.styles && ctx.styles.variables;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        if (/^--[a-z0-9-]+$/i.test(k) && typeof vars[k] === "string") document.documentElement.style.setProperty(k, vars[k]);
      });
    }
  }
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;
    var m = event.data;
    if (!m || m.jsonrpc !== "2.0") return;
    if (m.id !== undefined && m.id !== null && !m.method) {
      var w = waiting[m.id];
      if (!w) return;
      delete waiting[m.id];
      if (m.error) w.reject(new Error(m.error.message || "Request failed")); else w.resolve(m.result);
      return;
    }
    if (m.method === "ui/notifications/tool-result") {
      var p = m.params || {};
      if (p.structuredContent && p.structuredContent.invoice) setData(p.structuredContent);
      else if (p.isError) showMessage(resultText(p) || "The tool returned an error.", true);
    } else if (m.method === "ui/notifications/host-context-changed") {
      applyHostContext(m.params);
    } else if (m.method === "ui/resource-teardown" || m.method === "ping") {
      if (m.id !== undefined) post({ jsonrpc: "2.0", id: m.id, result: {} });
    }
  });

  function reportSize() {
    var h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (openai && typeof openai.notifyIntrinsicHeight === "function") { try { openai.notifyIntrinsicHeight(h); } catch (e) {} }
    else notify("ui/notifications/size-changed", { height: h });
  }

  function start() {
    if (openai) {
      applyTheme(openai.theme);
      if (openai.toolOutput && openai.toolOutput.invoice) setData(openai.toolOutput); else render();
      window.addEventListener("openai:set_globals", function (e) {
        var g = (e && e.detail && e.detail.globals) || {};
        if (g.theme) applyTheme(g.theme);
        if (g.toolOutput && g.toolOutput.invoice) setData(g.toolOutput);
      });
    } else {
      render();
      request("ui/initialize", {
        protocolVersion: "2026-01-26",
        appInfo: { name: "invoicepro-invoice-card", version: "1.0.0" },
        appCapabilities: {}
      }).then(function (res) {
        applyHostContext(res && res.hostContext);
        notify("ui/notifications/initialized", {});
      }).catch(function () { /* not embedded in an MCP Apps host */ });
    }
    if (typeof ResizeObserver === "function") new ResizeObserver(reportSize).observe(document.body);
  }

  /* ---------- helpers ---------- */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") el.className = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else if (k === "checked" || k === "disabled" || k === "value" || k === "selected") el[k] = v;
      else el.setAttribute(k, v === true ? "" : String(v));
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
    });
    return el;
  }
  var fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  function money(n) { return fmt.format(Number(n) || 0); }
  function dateText(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  function showMessage(text, isError) { state.msg = { text: text, error: !!isError }; render(); }

  function setData(data) {
    state.data = data;
    render();
  }

  /* ---------- rendering ---------- */
  function render() {
    root.textContent = "";
    var data = state.data;
    if (!data || !data.invoice) {
      root.appendChild(h("main", null, [state.msg ? messageEl() : h("div", { class: "empty" }, ["Loading invoice…"])]));
      return;
    }
    root.appendChild(renderView(data));
  }

  function totalsRows(inv, colspan) {
    var rows = [h("tr", null, [h("td", { colspan: colspan, class: "num muted" }, ["Subtotal"]), h("td", { class: "num" }, [money(inv.subtotal)])])];
    if (inv.tax_rate > 0) rows.push(h("tr", null, [h("td", { colspan: colspan, class: "num muted" }, ["Tax (" + inv.tax_rate + "%)"]), h("td", { class: "num" }, [money(inv.tax)])]));
    if (inv.total_override !== null) rows.push(h("tr", null, [h("td", { colspan: colspan, class: "num muted" }, ["Calculated total"]), h("td", { class: "num muted" }, [money(inv.computed_total)])]));
    rows.push(h("tr", null, [h("td", { colspan: colspan, class: "num" }, [h("strong", null, [inv.total_override !== null ? "Total due (manual)" : "Total due"])]), h("td", { class: "num" }, [h("strong", null, [money(inv.total)])])]));
    return rows;
  }

  function messageEl() {
    return state.msg ? h("div", { class: "msg " + (state.msg.error ? "error" : "ok"), role: state.msg.error ? "alert" : "status" }, [state.msg.text]) : null;
  }

  function renderView(data) {
    var inv = data.invoice, c = inv.customer;
    var addr = [c.address_line1, c.address_line2, [[c.city, c.region].filter(Boolean).join(", "), c.postal_code].filter(Boolean).join(" "), c.country].filter(Boolean);
    return h("main", null, [
      h("header", null, [
        h("div", null, [
          h("div", { class: "muted small" }, [data.organization ? data.organization.name : ""]),
          h("h1", null, ["Invoice ", h("span", { class: "pill " + inv.status }, [inv.status])]),
          h("div", { class: "mono muted" }, [inv.invoice_id]),
          h("div", { class: "muted small" }, [dateText(inv.created_at)])
        ]),
        h("div", { style: "text-align:right" }, [h("div", { class: "muted small" }, ["Total due"]), h("div", { class: "total" }, [money(inv.total)])])
      ]),
      h("h2", null, ["Billed to"]),
      h("div", { class: "box" }, [
        h("strong", null, [c.name]), h("div", { class: "muted" }, [c.email]),
        c.phone ? h("div", { class: "muted" }, [c.phone]) : null
      ].concat(addr.map(function (l) { return h("div", { class: "muted small" }, [l]); }))),
      h("h2", null, ["Line items"]),
      h("table", null, [
        h("thead", null, [h("tr", null, [h("th", null, ["Item"]), h("th", { class: "num" }, ["Qty"]), h("th", { class: "num" }, ["Price"]), h("th", { class: "num" }, ["Amount"])])]),
        h("tbody", null, inv.items.map(function (it) {
          return h("tr", null, [
            h("td", null, [it.name, it.one_off ? h("span", { class: "muted small" }, [" (one-off)"]) : null,
              it.product_id && it.description ? h("div", { class: "muted small" }, [it.description]) : null]),
            h("td", { class: "num" }, [String(it.quantity)]),
            h("td", { class: "num" }, [money(it.unit_price)]),
            h("td", { class: "num" }, [money(it.amount)])
          ]);
        })),
        h("tfoot", null, totalsRows(inv, 3))
      ]),
      data.status === "needs_confirmation" ? h("div", { class: "confirm" }, ["Confirm in the chat to email this invoice to " + c.email + "."]) : null,
      h("div", { class: "muted small", style: "margin-top:12px" }, ["To change this invoice, get its PDF or a link to it, ask in the chat."]),
      messageEl()
    ]);
  }

  start();
})();
`;

/** The invoice card's page. It holds no user data; that comes from the host. */
export function invoiceCardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice</title>
<style>${STYLES}</style>
</head>
<body>
<div id="app"></div>
<script>${SCRIPT}</script>
</body>
</html>`;
}

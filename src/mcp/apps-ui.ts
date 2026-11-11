/*
 * The HTML for the invoice card (MCP Apps, SEP-1865, and the OpenAI Apps
 * SDK). The page is fully self-contained: inline CSS and JS, no network
 * requests, nothing loaded from outside. It talks only to the host it is
 * embedded in, and every change goes through the host as an ordinary MCP
 * `tools/call` (update_invoice, send_invoice, list_customers, ...), so the
 * server's sign-in, organization and plan checks decide what's allowed,
 * exactly as when the model calls those tools.
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
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 520px) { .grid { grid-template-columns: 1fr; } }
.box { background: var(--ip-surface); border: 1px solid var(--ip-border); border-radius: var(--ip-radius); padding: 10px 12px; }
.total { font-size: 24px; font-weight: 800; color: var(--ip-accent); }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 11px; text-transform: uppercase; color: var(--ip-muted); padding: 6px 4px; border-bottom: 1px solid var(--ip-border); font-weight: 600; }
td { padding: 6px 4px; border-bottom: 1px solid var(--ip-border); vertical-align: top; }
td.num, th.num { text-align: right; white-space: nowrap; }
tfoot td { border-bottom: none; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
button, select, input {
  font: inherit; color: inherit; background: var(--ip-bg);
  border: 1px solid var(--ip-border); border-radius: 8px; padding: 6px 10px;
}
input, select { width: 100%; min-width: 0; }
button { cursor: pointer; }
button.primary { background: var(--ip-accent); color: var(--ip-accent-text); border-color: var(--ip-accent); font-weight: 600; }
button.danger { color: var(--ip-danger); }
button:disabled { opacity: .55; cursor: default; }
.msg { margin-top: 10px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--ip-border); }
.msg.error { color: var(--ip-danger); border-color: currentColor; }
.msg.ok { color: var(--ip-ok); border-color: currentColor; }
.confirm { margin-top: 12px; padding: 12px; border-radius: var(--ip-radius); border: 1px solid var(--ip-accent); }
.row { display: flex; gap: 8px; align-items: center; }
.edit-item td { padding: 4px 3px; }
.qty { width: 64px; }
.price { width: 100px; }
label { display: block; font-size: 12px; color: var(--ip-muted); margin-bottom: 3px; }
.empty { padding: 24px 0; text-align: center; color: var(--ip-muted); }
`;

const SCRIPT = `
(function () {
  "use strict";
  var root = document.getElementById("app");
  var state = {
    data: null, editing: false, draft: null, busy: false, msg: null,
    confirmingSend: false, customers: null, products: null,
    customersError: null, productsError: null
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
  function callTool(name, args) {
    if (openai && typeof openai.callTool === "function") return openai.callTool(name, args);
    return request("tools/call", { name: name, arguments: args });
  }
  function openLink(url) {
    if (openai && typeof openai.openExternal === "function") { openai.openExternal({ href: url }); return; }
    request("ui/open-link", { url: url }).catch(function () { window.open(url, "_blank", "noopener"); });
  }
  function resultText(res) {
    var c = res && res.content;
    if (c && c.length && c[0] && typeof c[0].text === "string") return c[0].text;
    return "";
  }
  function structured(res) {
    if (!res) return null;
    var sc = res.structuredContent || res.structured_content;
    if (sc) return sc;
    /* Some hosts drop structuredContent on app-initiated calls; the same data is the JSON text block. */
    var c = res.content || [];
    for (var i = 0; i < c.length; i++) {
      if (c[i] && c[i].type === "text" && typeof c[i].text === "string" && c[i].text.charAt(0) === "{") {
        try { return JSON.parse(c[i].text); } catch (e) { /* not JSON */ }
      }
    }
    return null;
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
  function num(v, fallback) { var n = parseFloat(v); return isFinite(n) ? n : fallback; }
  function dateText(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  function orgArg() { return state.data && state.data.organization ? { org_id: state.data.organization.org_id } : {}; }
  function withOrg(args) { var o = orgArg(); Object.keys(args).forEach(function (k) { o[k] = args[k]; }); return o; }
  function showMessage(text, isError) { state.msg = { text: text, error: !!isError }; render(); }

  function setData(data) {
    state.data = data;
    state.confirmingSend = data.status === "needs_confirmation";
    if (data.mode === "edit" && !state.editing) beginEdit(); else { state.editing = false; state.draft = null; }
    render();
  }

  /* ---------- actions (all through the host -> MCP tools/call) ---------- */
  function run(name, args, okText) {
    state.busy = true; state.msg = null; render();
    return callTool(name, withOrg(args)).then(function (res) {
      state.busy = false;
      var sc = structured(res);
      if (res && res.isError) { showMessage(resultText(res) || "That didn't work.", true); return null; }
      if (sc && sc.invoice) { state.data = sc; state.editing = false; state.draft = null; state.confirmingSend = false; }
      showMessage(okText || resultText(res), false);
      return res;
    }, function (err) {
      state.busy = false;
      showMessage((err && err.message) || "That didn't work.", true);
      return null;
    });
  }

  function beginEdit() {
    var inv = state.data.invoice;
    state.editing = true;
    state.confirmingSend = false;
    state.msg = null;
    state.draft = {
      customer_id: inv.customer.customer_id,
      status: inv.status,
      tax_rate: inv.tax_rate,
      total_override: inv.total_override === null ? "" : String(inv.total_override),
      items: inv.items.map(function (it) {
        return { product_id: it.product_id, description: it.description, name: it.name, quantity: it.quantity, unit_price: it.unit_price };
      })
    };
    loadLists();
  }

  /* Loads every page of a list tool (10 per page) into state[key]; on failure records the reason. */
  function loadAll(tool, key) {
    var all = [];
    state[key + "Error"] = null;
    function page(n) {
      return callTool(tool, withOrg({ page: n })).then(function (res) {
        var sc = structured(res);
        if ((res && res.isError) || !sc || !Array.isArray(sc[key])) {
          throw new Error(resultText(res) || "Couldn't load " + key + ".");
        }
        all = all.concat(sc[key]);
        if (n < (sc.total_pages || 1) && n < 20) return page(n + 1);
        state[key] = all; render();
      });
    }
    page(1).catch(function (err) {
      state[key] = all; state[key + "Error"] = (err && err.message) || "Couldn't load " + key + ".";
      render();
    });
  }

  function loadLists() {
    if (!state.customers) loadAll("list_customers", "customers");
    if (!state.products) loadAll("list_products", "products");
  }

  function save() {
    var d = state.draft;
    var items = d.items.map(function (it) {
      var out = { quantity: Math.max(1, Math.round(num(it.quantity, 1))), unit_price: Math.max(0, num(it.unit_price, 0)) };
      if (it.product_id) out.product_id = it.product_id;
      if (it.description) out.description = it.description;
      return out;
    });
    for (var i = 0; i < items.length; i++) {
      if (!items[i].product_id && !items[i].description) { showMessage("Line " + (i + 1) + " needs a product or a description.", true); return; }
    }
    if (items.length === 0) { showMessage("Add at least one line item.", true); return; }
    var override = d.total_override === "" ? null : Math.max(0, num(d.total_override, 0));
    run("update_invoice", {
      invoice_id: state.data.invoice.invoice_id,
      customer_id: d.customer_id,
      items: items,
      tax_rate: Math.min(100, Math.max(0, num(d.tax_rate, 0))),
      status: d.status,
      total_override: override
    }, "Saved.");
  }

  function send() {
    run("send_invoice", { invoice_id: state.data.invoice.invoice_id, confirm: true });
  }

  function setStatus(status) {
    run("update_invoice_status", { invoice_id: state.data.invoice.invoice_id, status: status });
  }

  function downloadPdf() {
    state.busy = true; state.msg = null; render();
    callTool("get_invoice_pdf", withOrg({ invoice_id: state.data.invoice.invoice_id })).then(function (res) {
      state.busy = false;
      if (!res || res.isError) { showMessage(resultText(res) || "Couldn't make the PDF.", true); return; }
      var blob = null, name = "invoice.pdf";
      (res.content || []).forEach(function (c) {
        if (c && c.type === "resource" && c.resource && c.resource.blob) blob = c.resource.blob;
      });
      var sc = structured(res);
      if (sc && sc.filename) name = sc.filename;
      if (!blob) { openLink(state.data.invoice.app_url); showMessage("Opened the invoice in InvoicePro to download the PDF.", false); return; }
      try {
        var a = h("a", { href: "data:application/pdf;base64," + blob, download: name });
        document.body.appendChild(a); a.click(); a.remove();
        showMessage("Downloading " + name + ". If nothing happens, use Open in InvoicePro.", false);
      } catch (e) {
        openLink(state.data.invoice.app_url);
      }
    }, function (err) {
      state.busy = false;
      showMessage((err && err.message) || "Couldn't make the PDF.", true);
    });
  }

  /* ---------- rendering ---------- */
  function render() {
    root.textContent = "";
    var data = state.data;
    if (!data || !data.invoice) {
      root.appendChild(h("main", null, [h("div", { class: "empty" }, ["Loading invoice…"])]));
      return;
    }
    root.appendChild(state.editing ? renderEdit(data) : renderView(data));
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
    var statusSelect = h("select", { "aria-label": "Status", disabled: state.busy, onchange: function (e) { setStatus(e.target.value); } },
      ["draft", "sent", "paid"].map(function (s) { return h("option", { value: s, selected: s === inv.status }, [s.charAt(0).toUpperCase() + s.slice(1)]); }));

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
      state.confirmingSend ? h("div", { class: "confirm" }, [
        h("div", null, ["Email this invoice for ", h("strong", null, [money(inv.total)]), " to ", h("strong", null, [c.name + " <" + c.email + ">"]), " with the PDF attached? It will be marked sent."]),
        inv.status !== "draft" ? h("div", { class: "muted small" }, ["It's already " + inv.status + ", so this emails it again."]) : null,
        h("div", { class: "actions" }, [
          h("button", { class: "primary", disabled: state.busy, onclick: send }, [state.busy ? "Sending…" : "Yes, send it"]),
          h("button", { disabled: state.busy, onclick: function () { state.confirmingSend = false; render(); } }, ["Cancel"])
        ])
      ]) : null,
      h("div", { class: "actions" }, [
        h("button", { disabled: state.busy, onclick: function () { beginEdit(); render(); } }, ["Edit"]),
        data.can_send ? h("button", { class: "primary", disabled: state.busy || state.confirmingSend, onclick: function () { state.confirmingSend = true; state.msg = null; render(); } }, ["Send invoice"]) : null,
        h("button", { disabled: state.busy, onclick: downloadPdf }, ["PDF"]),
        h("button", { onclick: function () { openLink(inv.app_url); } }, ["Open in InvoicePro"]),
        h("div", { style: "min-width:110px" }, [statusSelect])
      ]),
      data.can_send ? null : h("div", { class: "muted small", style: "margin-top:8px" }, ["Emailing invoices isn't included in this organization's plan."]),
      messageEl()
    ]);
  }

  function draftTotals(d) {
    var subtotal = d.items.reduce(function (s, it) { return s + num(it.quantity, 0) * num(it.unit_price, 0); }, 0);
    var rate = num(d.tax_rate, 0), tax = subtotal * rate / 100;
    var override = d.total_override === "" ? null : num(d.total_override, 0);
    return { subtotal: subtotal, tax_rate: rate, tax: tax, computed_total: subtotal + tax, total_override: override, total: override === null ? subtotal + tax : override };
  }

  function renderEdit(data) {
    var d = state.draft, inv = data.invoice;
    var customers = state.customers;
    var custOptions = customers === null
      ? [h("option", { value: d.customer_id }, [inv.customer.name + " (loading…)"])]
      : (customers.some(function (c) { return c.customer_id === d.customer_id; }) ? [] : [h("option", { value: d.customer_id, selected: true }, [inv.customer.name])])
          .concat(customers.map(function (c) { return h("option", { value: c.customer_id, selected: c.customer_id === d.customer_id }, [c.name + " <" + c.email + ">"]); }));

    var products = state.products || [];
    function productSelect(it, i) {
      return h("select", { "aria-label": "Product for line " + (i + 1), onchange: function (e) {
        var p = products.filter(function (x) { return x.product_id === e.target.value; })[0];
        if (p) { it.product_id = p.product_id; it.name = p.name; it.unit_price = p.price; it.description = null; render(); }
      } }, [h("option", { value: it.product_id || "" }, [it.name || "Choose a product"])].concat(
        products.filter(function (p) { return p.product_id !== it.product_id; }).map(function (p) { return h("option", { value: p.product_id }, [p.name + " — " + money(p.price)]); })));
    }

    var rows = d.items.map(function (it, i) {
      return h("tr", { class: "edit-item" }, [
        h("td", null, [it.product_id
          ? productSelect(it, i)
          : h("input", { "aria-label": "Description for line " + (i + 1), value: it.description || "", placeholder: "One-off item description", oninput: function (e) { it.description = e.target.value; } })]),
        h("td", null, [h("input", { class: "qty", type: "number", min: "1", step: "1", "aria-label": "Quantity for line " + (i + 1), value: String(it.quantity), oninput: function (e) { it.quantity = e.target.value; renderTotalsOnly(); } })]),
        h("td", null, [h("input", { class: "price", type: "number", min: "0", step: "0.01", "aria-label": "Unit price for line " + (i + 1), value: String(it.unit_price), oninput: function (e) { it.unit_price = e.target.value; renderTotalsOnly(); } })]),
        h("td", null, [h("button", { class: "danger", "aria-label": "Remove line " + (i + 1), disabled: d.items.length === 1, onclick: function () { d.items.splice(i, 1); render(); } }, ["✕"])])
      ]);
    });

    var t = draftTotals(d);
    return h("main", null, [
      h("header", null, [h("div", null, [h("h1", null, ["Edit invoice"]), h("div", { class: "mono muted" }, [inv.invoice_id])])]),
      h("div", { class: "grid", style: "margin-top:12px" }, [
        h("div", null, [h("label", { for: "ip-customer" }, ["Customer"]),
          h("select", { id: "ip-customer", onchange: function (e) { d.customer_id = e.target.value; } }, custOptions)]),
        h("div", null, [h("label", { for: "ip-status" }, ["Status"]),
          h("select", { id: "ip-status", onchange: function (e) { d.status = e.target.value; } },
            ["draft", "sent", "paid"].map(function (s) { return h("option", { value: s, selected: s === d.status }, [s.charAt(0).toUpperCase() + s.slice(1)]); }))]),
        h("div", null, [h("label", { for: "ip-tax" }, ["Tax rate (%)"]),
          h("input", { id: "ip-tax", type: "number", min: "0", max: "100", step: "0.01", value: String(d.tax_rate), oninput: function (e) { d.tax_rate = e.target.value; renderTotalsOnly(); } })]),
        h("div", null, [h("label", { for: "ip-override" }, ["Manual total (optional)"]),
          h("input", { id: "ip-override", type: "number", min: "0", step: "0.01", placeholder: "Calculated", value: d.total_override, oninput: function (e) { d.total_override = e.target.value; renderTotalsOnly(); } })])
      ]),
      h("h2", null, ["Line items"]),
      h("table", null, [
        h("thead", null, [h("tr", null, [h("th", null, ["Item"]), h("th", null, ["Qty"]), h("th", null, ["Price"]), h("th", null, [""])])]),
        h("tbody", null, rows)
      ]),
      h("div", { class: "actions" }, [
        h("button", { disabled: !products.length, onclick: function () {
          var p = products[0]; d.items.push({ product_id: p.product_id, description: null, name: p.name, quantity: 1, unit_price: p.price }); render();
        } }, [state.products === null ? "Loading products…" : products.length ? "+ Product" : "No products yet"]),
        h("button", { onclick: function () { d.items.push({ product_id: null, description: "", name: "", quantity: 1, unit_price: 0 }); render(); } }, ["+ One-off item"])
      ]),
      state.productsError || state.customersError ? h("div", { class: "msg error" }, [
        (state.productsError ? "Products: " + state.productsError + " " : "") +
        (state.customersError ? "Customers: " + state.customersError + " " : ""),
        h("button", { onclick: function () {
          if (state.productsError) { state.products = null; }
          if (state.customersError) { state.customers = null; }
          loadLists(); render();
        } }, ["Retry"])
      ]) : null,
      h("table", { id: "ip-totals", style: "margin-top:10px" }, [h("tbody", null, totalsRows(t, 1))]),
      h("div", { class: "actions" }, [
        h("button", { class: "primary", disabled: state.busy, onclick: save }, [state.busy ? "Saving…" : "Save"]),
        h("button", { disabled: state.busy, onclick: function () { state.editing = false; state.draft = null; state.msg = null; render(); } }, ["Cancel"])
      ]),
      messageEl()
    ]);
  }

  function renderTotalsOnly() {
    var table = document.getElementById("ip-totals");
    if (!table || !state.draft) return;
    var body = h("tbody", null, totalsRows(draftTotals(state.draft), 1));
    table.textContent = "";
    table.appendChild(body);
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

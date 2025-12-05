import { jsx, jsxs } from "react/jsx-runtime";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useLocation, Link, useLoaderData, useNavigation, Form, useActionData } from "@remix-run/react";
import * as isbotModule from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { createCookieSessionStorage, redirect, json } from "@remix-run/cloudflare";
async function handleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext) {
  const body = await renderToReadableStream(
    /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url }),
    {
      // If you wish to abort the rendering process, you can pass a signal here.
      // Please refer to the templates for example son how to configure this.
      // signal: controller.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      }
    }
  );
  if (isBotRequest(request.headers.get("user-agent"))) {
    await body.allReady;
  }
  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode
  });
}
function isBotRequest(userAgent) {
  if (!userAgent) {
    return false;
  }
  if ("isbot" in isbotModule && typeof isbotModule.isbot === "function") {
    return isbotModule.isbot(userAgent);
  }
  if ("default" in isbotModule && typeof isbotModule.default === "function") {
    return isbotModule.default(userAgent);
  }
  return false;
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous"
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
  }
];
function App() {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App,
  links
}, Symbol.toStringTag, { value: "Module" }));
function Layout({ children, user }) {
  const location = useLocation();
  const navItems = [
    { label: "Dashboard", path: "/" },
    { label: "Inventory", path: "/inventory" },
    { label: "Categories", path: "/categories" },
    { label: "Outbound / Inbound", path: "/transactions" }
  ];
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", minHeight: "100vh" }, children: [
    /* @__PURE__ */ jsxs(
      "aside",
      {
        className: "glass-panel",
        style: {
          width: "260px",
          margin: "1rem",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          position: "sticky",
          top: "1rem",
          height: "calc(100vh - 2rem)"
        },
        children: [
          /* @__PURE__ */ jsxs("div", { style: { marginBottom: "2rem" }, children: [
            /* @__PURE__ */ jsx("h1", { style: { fontSize: "1.5rem", margin: 0, background: "var(--primary-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }, children: "ItWork" }),
            /* @__PURE__ */ jsx("p", { style: { fontSize: "0.75rem", color: "var(--text-secondary)" }, children: "Office Management" })
          ] }),
          /* @__PURE__ */ jsx("nav", { style: { flex: 1 }, children: /* @__PURE__ */ jsx("ul", { style: { listStyle: "none" }, children: navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return /* @__PURE__ */ jsx("li", { style: { marginBottom: "0.5rem" }, children: /* @__PURE__ */ jsx(
              Link,
              {
                to: item.path,
                style: {
                  display: "block",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: isActive ? "rgba(56, 189, 248, 0.15)" : "transparent",
                  color: isActive ? "var(--text-accent)" : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.2s"
                },
                children: item.label
              }
            ) }, item.path);
          }) }) }),
          /* @__PURE__ */ jsx("div", { style: { paddingTop: "1rem", borderTop: "1px solid var(--border-light)" }, children: user ? /* @__PURE__ */ jsxs("div", { style: { marginBottom: "1rem" }, children: [
            /* @__PURE__ */ jsx("p", { style: { fontSize: "0.875rem", color: "var(--text-primary)" }, children: user }),
            /* @__PURE__ */ jsx("form", { action: "/logout", method: "post", children: /* @__PURE__ */ jsx(
              "button",
              {
                type: "submit",
                style: {
                  background: "none",
                  border: "none",
                  color: "var(--danger-color)",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  padding: 0,
                  marginTop: "0.5rem"
                },
                children: "Sign Out"
              }
            ) })
          ] }) : /* @__PURE__ */ jsx(Link, { to: "/login", className: "btn btn-primary", style: { width: "100%", fontSize: "0.875rem" }, children: "Sign In" }) })
        ]
      }
    ),
    /* @__PURE__ */ jsx("main", { style: { flex: 1, padding: "1rem", maxWidth: "1200px", width: "100%" }, children })
  ] });
}
function getSessionStorage(env) {
  return createCookieSessionStorage({
    cookie: {
      name: "__session",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secrets: [env.SESSION_SECRET || "default-secret"],
      secure: true,
      // Always true for CF Pages in prod usually
      maxAge: 60 * 60 * 24 * 7
      // 1 week
    }
  });
}
async function authenticate(request, env) {
  const sessionStorage = getSessionStorage(env);
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const user = session.get("user");
  if (!user) return null;
  return user;
}
async function requireUser(request, env) {
  const user = await authenticate(request, env);
  if (!user) {
    throw redirect("/login");
  }
  return user;
}
async function createUserSession(request, env, username) {
  const sessionStorage = getSessionStorage(env);
  const session = await sessionStorage.getSession();
  session.set("user", username);
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session)
    }
  });
}
async function logout(request, env) {
  const sessionStorage = getSessionStorage(env);
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session)
    }
  });
}
async function loader$8({ request, context }) {
  const { env } = context;
  const user = await requireUser(request, env);
  const { results: transactions } = await env.DB.prepare(`
    SELECT t.*, p.brand, p.model, c.name as category_name 
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    ORDER BY t.date DESC, t.id DESC
    LIMIT 50
  `).all();
  return json({ transactions, user });
}
function Transactions() {
  const { transactions, user } = useLoaderData();
  return /* @__PURE__ */ jsx(Layout, { user, children: /* @__PURE__ */ jsxs("div", { className: "glass-panel", style: { padding: "2rem" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }, children: [
      /* @__PURE__ */ jsx("h2", { children: "Transactions" }),
      /* @__PURE__ */ jsx(Link, { to: "/transactions/new", className: "btn btn-primary", children: "+ New Operation" })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }, children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid var(--border-light)", textAlign: "left" }, children: [
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Date" }),
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Type" }),
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Item" }),
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Qty" }),
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Handler/Dept" }),
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Note" })
      ] }) }),
      /* @__PURE__ */ jsxs("tbody", { children: [
        transactions.map((t) => /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid var(--border-light)" }, children: [
          /* @__PURE__ */ jsx("td", { style: { padding: "1rem", whiteSpace: "nowrap" }, children: new Date(t.date).toLocaleDateString() }),
          /* @__PURE__ */ jsx("td", { style: { padding: "1rem" }, children: /* @__PURE__ */ jsx(
            "span",
            {
              style: {
                padding: "0.25rem 0.5rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                background: t.type === "IN" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                color: t.type === "IN" ? "#86efac" : "#fca5a5"
              },
              children: t.type
            }
          ) }),
          /* @__PURE__ */ jsxs("td", { style: { padding: "1rem" }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontWeight: 600 }, children: t.model }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.875rem", color: "var(--text-secondary)" }, children: t.brand })
          ] }),
          /* @__PURE__ */ jsx("td", { style: { padding: "1rem", fontWeight: "bold" }, children: t.quantity }),
          /* @__PURE__ */ jsx("td", { style: { padding: "1rem" }, children: t.type === "OUT" ? /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { children: t.department }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.875rem", color: "var(--text-secondary)" }, children: t.user })
          ] }) : "-" }),
          /* @__PURE__ */ jsx("td", { style: { padding: "1rem", color: "var(--text-secondary)" }, children: t.note || "-" })
        ] }, t.id)),
        transactions.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 6, style: { padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }, children: "No transactions found." }) })
      ] })
    ] }) })
  ] }) });
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Transactions,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
async function loader$7({ request, context }) {
  const { env } = context;
  const user = await requireUser(request, env);
  const { results: products } = await env.DB.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    JOIN categories c ON p.category_id = c.id 
    ORDER BY p.brand, p.model
  `).all();
  return json({ products, user });
}
function Inventory() {
  const { products, user } = useLoaderData();
  return /* @__PURE__ */ jsx(Layout, { user, children: /* @__PURE__ */ jsxs("div", { className: "glass-panel", style: { padding: "2rem" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }, children: [
      /* @__PURE__ */ jsx("h2", { children: "Inventory" }),
      /* @__PURE__ */ jsx(Link, { to: "/inventory/new", className: "btn btn-primary", children: "+ Add New Item" })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }, children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid var(--border-light)", textAlign: "left" }, children: [
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Category" }),
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Brand / Model" }),
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Supplier" }),
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Price" }),
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Stock" }),
        /* @__PURE__ */ jsx("th", { style: { padding: "1rem" }, children: "Status" })
      ] }) }),
      /* @__PURE__ */ jsxs("tbody", { children: [
        products.map((item) => {
          var _a;
          return /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid var(--border-light)" }, children: [
            /* @__PURE__ */ jsx("td", { style: { padding: "1rem", color: "var(--text-secondary)" }, children: item.category_name }),
            /* @__PURE__ */ jsxs("td", { style: { padding: "1rem" }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontWeight: 600 }, children: item.model }),
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.875rem", color: "var(--text-secondary)" }, children: item.brand })
            ] }),
            /* @__PURE__ */ jsx("td", { style: { padding: "1rem" }, children: item.supplier || "-" }),
            /* @__PURE__ */ jsxs("td", { style: { padding: "1rem" }, children: [
              "¥",
              (_a = item.price) == null ? void 0 : _a.toFixed(2)
            ] }),
            /* @__PURE__ */ jsx("td", { style: { padding: "1rem", fontWeight: "bold" }, children: item.stock_quantity }),
            /* @__PURE__ */ jsx("td", { style: { padding: "1rem" }, children: item.stock_quantity <= (item.min_stock_level || 5) ? /* @__PURE__ */ jsx("span", { style: { color: "var(--danger-color)", fontSize: "0.875rem" }, children: "Low Stock" }) : /* @__PURE__ */ jsx("span", { style: { color: "var(--success-color)", fontSize: "0.875rem" }, children: "In Stock" }) })
          ] }, item.id);
        }),
        products.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 6, style: { padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }, children: "No items found. Add one to get started." }) })
      ] })
    ] }) })
  ] }) });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Inventory,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
async function loader$6({ request, context }) {
  const { env } = context;
  const user = await requireUser(request, env);
  const { results: products } = await env.DB.prepare(`
    SELECT p.id, p.brand, p.model, p.stock_quantity, c.name as category 
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ORDER BY c.name, p.brand
  `).all();
  return json({ products, user });
}
async function action$5({ request, context }) {
  var _a;
  const { env } = context;
  await requireUser(request, env);
  const formData = await request.formData();
  const type = formData.get("type");
  const product_id = formData.get("product_id");
  const quantity = parseInt(formData.get("quantity"));
  const date = formData.get("date");
  const department = formData.get("department");
  const handler_name = formData.get("handler_name");
  const note = formData.get("note");
  if (!product_id || !quantity || !type) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }
  if (type === "OUT") {
    const { results } = await env.DB.prepare("SELECT stock_quantity FROM products WHERE id = ?").bind(product_id).all();
    const currentStock = ((_a = results[0]) == null ? void 0 : _a.stock_quantity) || 0;
    if (currentStock < quantity) {
      return json({ error: `Insufficient stock (Current: ${currentStock})` }, { status: 400 });
    }
    await env.DB.batch([
      env.DB.prepare("INSERT INTO transactions (product_id, type, quantity, department, handler_name, date, note) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(product_id, type, quantity, department, handler_name, date || (/* @__PURE__ */ new Date()).toISOString(), note),
      env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?").bind(quantity, product_id)
    ]);
  } else {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO transactions (product_id, type, quantity, date, note) VALUES (?, ?, ?, ?, ?)").bind(product_id, type, quantity, date || (/* @__PURE__ */ new Date()).toISOString(), note),
      env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?").bind(quantity, product_id)
    ]);
  }
  return redirect("/transactions");
}
function NewTransaction() {
  const { products, user } = useLoaderData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  navigation.formAction === "/transactions/new" ? null : useNavigation().formMethod ? null : null;
  return /* @__PURE__ */ jsx(Layout, { user, children: /* @__PURE__ */ jsxs("div", { className: "glass-panel", style: { padding: "2rem", maxWidth: "800px", margin: "0 auto" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }, children: [
      /* @__PURE__ */ jsx("h2", { children: "Record Operation" }),
      /* @__PURE__ */ jsx(Link, { to: "/transactions", style: { color: "var(--text-secondary)" }, children: "Cancel" })
    ] }),
    /* @__PURE__ */ jsxs(Form, { method: "post", style: { display: "grid", gap: "1.5rem" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { children: "Type" }),
          /* @__PURE__ */ jsxs("select", { name: "type", required: true, children: [
            /* @__PURE__ */ jsx("option", { value: "OUT", children: "Outbound (Usage)" }),
            /* @__PURE__ */ jsx("option", { value: "IN", children: "Inbound (Restock)" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { children: "Date" }),
          /* @__PURE__ */ jsx("input", { type: "date", name: "date", defaultValue: (/* @__PURE__ */ new Date()).toISOString().split("T")[0], required: true })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { children: "Product" }),
        /* @__PURE__ */ jsxs("select", { name: "product_id", required: true, style: { fontFamily: "monospace" }, children: [
          /* @__PURE__ */ jsx("option", { value: "", children: "Select Item..." }),
          products.map((p) => /* @__PURE__ */ jsxs("option", { value: p.id, children: [
            "[",
            p.category,
            "] ",
            p.brand,
            " ",
            p.model,
            " (Stock: ",
            p.stock_quantity,
            ")"
          ] }, p.id))
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { children: "Quantity" }),
        /* @__PURE__ */ jsx("input", { type: "number", name: "quantity", min: "1", defaultValue: "1", required: true })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)" }, children: [
        /* @__PURE__ */ jsx("h4", { style: { marginBottom: "1rem", fontSize: "0.875rem", color: "var(--text-secondary)" }, children: "For Outbound Only" }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { children: "Department" }),
            /* @__PURE__ */ jsxs("select", { name: "department", children: [
              /* @__PURE__ */ jsx("option", { value: "", children: "Select Dept..." }),
              /* @__PURE__ */ jsx("option", { value: "IT", children: "IT" }),
              /* @__PURE__ */ jsx("option", { value: "HR", children: "HR" }),
              /* @__PURE__ */ jsx("option", { value: "Sales", children: "Sales" }),
              /* @__PURE__ */ jsx("option", { value: "Finance", children: "Finance" }),
              /* @__PURE__ */ jsx("option", { value: "Ops", children: "Operations" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { children: "User / Handler" }),
            /* @__PURE__ */ jsx("input", { type: "text", name: "handler_name", placeholder: "Who took it?" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { children: "Note / Supplier info" }),
        /* @__PURE__ */ jsx("textarea", { name: "note", rows: 3 })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", style: { marginTop: "1rem" }, disabled: isSubmitting, children: isSubmitting ? "Processing..." : "Confirm Operation" })
    ] })
  ] }) });
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  default: NewTransaction,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
async function loader$5({ request, context }) {
  const { env } = context;
  const user = await requireUser(request, env);
  const { results: categories } = await env.DB.prepare("SELECT * FROM categories ORDER BY name").all();
  return json({ categories, user });
}
async function action$4({ request, context }) {
  const { env } = context;
  await requireUser(request, env);
  const formData = await request.formData();
  const category_id = formData.get("category_id");
  const brand = formData.get("brand");
  const model = formData.get("model");
  const price = parseFloat(formData.get("price")) || 0;
  const supplier = formData.get("supplier");
  const stock_quantity = parseInt(formData.get("stock_quantity")) || 0;
  if (!category_id || !model) {
    return json({ error: "Category and Model are required" }, { status: 400 });
  }
  await env.DB.prepare(
    "INSERT INTO products (category_id, brand, model, supplier, price, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(category_id, brand, model, supplier, price, stock_quantity).run();
  return redirect("/inventory");
}
function AddInventory() {
  const { categories, user } = useLoaderData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  return /* @__PURE__ */ jsx(Layout, { user, children: /* @__PURE__ */ jsxs("div", { className: "glass-panel", style: { padding: "2rem", maxWidth: "800px", margin: "0 auto" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }, children: [
      /* @__PURE__ */ jsx("h2", { children: "Add New Item" }),
      /* @__PURE__ */ jsx(Link, { to: "/inventory", style: { color: "var(--text-secondary)" }, children: "Cancel" })
    ] }),
    /* @__PURE__ */ jsxs(Form, { method: "post", style: { display: "grid", gap: "1.5rem" }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { children: "Category" }),
        /* @__PURE__ */ jsxs("select", { name: "category_id", required: true, children: [
          /* @__PURE__ */ jsx("option", { value: "", children: "Select Category..." }),
          categories.map((c) => /* @__PURE__ */ jsx("option", { value: c.id, children: c.name }, c.id))
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { children: "Brand" }),
          /* @__PURE__ */ jsx("input", { type: "text", name: "brand", placeholder: "e.g. HP" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { children: "Model" }),
          /* @__PURE__ */ jsx("input", { type: "text", name: "model", placeholder: "e.g. 1020 Plus", required: true })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { children: "Price (¥)" }),
          /* @__PURE__ */ jsx("input", { type: "number", step: "0.01", name: "price", placeholder: "0.00" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { children: "Initial Stock" }),
          /* @__PURE__ */ jsx("input", { type: "number", name: "stock_quantity", placeholder: "0" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { children: "Supplier" }),
        /* @__PURE__ */ jsx("input", { type: "text", name: "supplier", placeholder: "e.g. Office Depot" })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", style: { marginTop: "1rem" }, disabled: isSubmitting, children: isSubmitting ? "Saving..." : "Save Item" })
    ] })
  ] }) });
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: AddInventory,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
async function loader$4({ request, context }) {
  const { env } = context;
  const user = await requireUser(request, env);
  const { results: categories } = await env.DB.prepare("SELECT * FROM categories ORDER BY name ASC").all();
  return json({ categories, user });
}
async function action$3({ request, context }) {
  const { env } = context;
  await requireUser(request, env);
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "add") {
    const name = formData.get("name");
    const slug = name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]/g, "");
    if (!name) return json({ error: "Name required" }, { status: 400 });
    try {
      await env.DB.prepare("INSERT INTO categories (name, slug) VALUES (?, ?)").bind(name, slug).run();
      return json({ success: true });
    } catch (e) {
      return json({ error: "Category already exists or invalid" }, { status: 400 });
    }
  }
  if (intent === "delete") {
    const id = formData.get("id");
    await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
    return json({ success: true });
  }
  return null;
}
function Categories() {
  var _a;
  const { categories, user } = useLoaderData();
  const navigation = useNavigation();
  const isAdding = ((_a = navigation.formData) == null ? void 0 : _a.get("intent")) === "add";
  return /* @__PURE__ */ jsx(Layout, { user, children: /* @__PURE__ */ jsxs("div", { className: "glass-panel", style: { padding: "2rem" }, children: [
    /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }, children: /* @__PURE__ */ jsx("h2", { children: "Categories" }) }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }, children: [
      /* @__PURE__ */ jsxs("div", { className: "glass-card", style: { padding: "1.5rem", height: "fit-content" }, children: [
        /* @__PURE__ */ jsx("h3", { style: { fontSize: "1.25rem", marginBottom: "1rem" }, children: "Add New" }),
        /* @__PURE__ */ jsxs(Form, { method: "post", children: [
          /* @__PURE__ */ jsxs("div", { style: { marginBottom: "1rem" }, children: [
            /* @__PURE__ */ jsx("label", { children: "Category Name" }),
            /* @__PURE__ */ jsx("input", { type: "text", name: "name", placeholder: "e.g. Office Chairs", required: true })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              name: "intent",
              value: "add",
              className: "btn btn-primary",
              style: { width: "100%" },
              disabled: isAdding,
              children: isAdding ? "Adding..." : "Add Category"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }, children: categories.map((cat) => /* @__PURE__ */ jsxs("div", { className: "glass-card", style: { padding: "1rem", position: "relative" }, children: [
        /* @__PURE__ */ jsx("h4", { style: { color: "var(--text-primary)", marginBottom: "0.25rem" }, children: cat.name }),
        /* @__PURE__ */ jsx("p", { style: { fontSize: "0.75rem", color: "var(--text-secondary)" }, children: cat.slug }),
        /* @__PURE__ */ jsxs(Form, { method: "post", style: { position: "absolute", top: "0.5rem", right: "0.5rem" }, children: [
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "id", value: cat.id }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              name: "intent",
              value: "delete",
              style: { background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", opacity: 0.5 },
              title: "Delete",
              onClick: (e) => !confirm("Are you sure?") && e.preventDefault(),
              children: "✕"
            }
          )
        ] })
      ] }, cat.id)) })
    ] })
  ] }) });
}
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: Categories,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
async function loader$3() {
  return redirect("/");
}
async function action$2({ request, context }) {
  const { env } = context;
  return logout(request, env);
}
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
async function loader$2({ request, context }) {
  const { env } = context;
  const user = await requireUser(request, env);
  try {
    const { results: lowStock } = await env.DB.prepare(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        JOIN categories c ON p.category_id = c.id
        WHERE p.stock_quantity <= p.min_stock_level
        ORDER BY p.stock_quantity ASC
        LIMIT 5
      `).all();
    const { results: recentTx } = await env.DB.prepare(`
        SELECT t.*, p.brand, p.model 
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        ORDER BY t.date DESC
        LIMIT 5
      `).all();
    const totalItemsResult = await env.DB.prepare("SELECT COUNT(*) as count FROM products").first();
    const totalItems = (totalItemsResult == null ? void 0 : totalItemsResult.count) || 0;
    const lowStockCountResult = await env.DB.prepare("SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_level").first();
    const lowStockCount = (lowStockCountResult == null ? void 0 : lowStockCountResult.count) || 0;
    return json({ user, lowStock, recentTx, totalItems, lowStockCount });
  } catch (error) {
    console.error("Database error:", error);
    return json({ user, lowStock: [], recentTx: [], totalItems: 0, lowStockCount: 0 });
  }
}
function Index() {
  const { user, lowStock, recentTx, totalItems, lowStockCount } = useLoaderData();
  return /* @__PURE__ */ jsx(Layout, { user, children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: "2rem" }, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { style: { marginBottom: "0.5rem" }, children: "Dashboard" }),
      /* @__PURE__ */ jsx("p", { style: { color: "var(--text-secondary)" }, children: "Overview of office supplies and status." })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }, children: [
      /* @__PURE__ */ jsxs("div", { className: "glass-card", style: { padding: "1.5rem" }, children: [
        /* @__PURE__ */ jsx("h3", { style: { fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }, children: "Total Products" }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "2.5rem", fontWeight: 700 }, children: totalItems })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "glass-card", style: { padding: "1.5rem" }, children: [
        /* @__PURE__ */ jsx("h3", { style: { fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }, children: "Low Stock Items" }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "2.5rem", fontWeight: 700, color: lowStockCount > 0 ? "var(--danger-color)" : "var(--success-color)" }, children: lowStockCount })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "glass-card", style: { padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "center" }, children: /* @__PURE__ */ jsx(Link, { to: "/transactions/new", className: "btn btn-primary", style: { textAlign: "center" }, children: "Quick Outbound" }) })
    ] }),
    lowStock.length > 0 && /* @__PURE__ */ jsxs("div", { className: "glass-panel", style: { padding: "2rem" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }, children: [
        /* @__PURE__ */ jsx("h3", { style: { fontSize: "1.25rem", color: "var(--danger-color)" }, children: "⚠️ Low Stock Alerts" }),
        /* @__PURE__ */ jsx(Link, { to: "/inventory", style: { fontSize: "0.875rem", color: "var(--text-accent)" }, children: "View All" })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: "1rem" }, children: lowStock.map((item) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-sm)" }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { style: { fontWeight: 600 }, children: item.model }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.875rem", color: "var(--text-secondary)" }, children: [
            item.brand,
            " (",
            item.category_name,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { textAlign: "right" }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "1.5rem", fontWeight: 700, color: "var(--danger-color)" }, children: item.stock_quantity }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", color: "var(--text-secondary)" }, children: [
            "Min: ",
            item.min_stock_level
          ] })
        ] })
      ] }, item.id)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "glass-panel", style: { padding: "2rem" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }, children: [
        /* @__PURE__ */ jsx("h3", { style: { fontSize: "1.25rem" }, children: "Recent Activity" }),
        /* @__PURE__ */ jsx(Link, { to: "/transactions", style: { fontSize: "0.875rem", color: "var(--text-accent)" }, children: "View History" })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { width: "100%", overflowX: "auto" }, children: /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { color: "var(--text-secondary)", textAlign: "left", fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ jsx("th", { style: { paddingBottom: "1rem" }, children: "Date" }),
          /* @__PURE__ */ jsx("th", { style: { paddingBottom: "1rem" }, children: "Type" }),
          /* @__PURE__ */ jsx("th", { style: { paddingBottom: "1rem" }, children: "Product" }),
          /* @__PURE__ */ jsx("th", { style: { paddingBottom: "1rem" }, children: "Qty" }),
          /* @__PURE__ */ jsx("th", { style: { paddingBottom: "1rem" }, children: "Handler" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: recentTx.map((t) => /* @__PURE__ */ jsxs("tr", { style: { borderTop: "1px solid var(--border-light)" }, children: [
          /* @__PURE__ */ jsx("td", { style: { padding: "1rem 0" }, children: new Date(t.date).toLocaleDateString() }),
          /* @__PURE__ */ jsx("td", { style: { padding: "1rem 0" }, children: /* @__PURE__ */ jsx("span", { style: { fontSize: "0.75rem", padding: "2px 6px", borderRadius: "4px", background: t.type === "IN" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: t.type === "IN" ? "#86efac" : "#fca5a5" }, children: t.type }) }),
          /* @__PURE__ */ jsxs("td", { style: { padding: "1rem 0" }, children: [
            t.brand,
            " ",
            t.model
          ] }),
          /* @__PURE__ */ jsx("td", { style: { padding: "1rem 0", fontWeight: 600 }, children: t.quantity }),
          /* @__PURE__ */ jsx("td", { style: { padding: "1rem 0", fontSize: "0.875rem", color: "var(--text-secondary)" }, children: t.handler_name || t.department || "-" })
        ] }, t.id)) })
      ] }) })
    ] })
  ] }) });
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
async function action$1({ request, context }) {
  try {
    const { env } = context;
    return new Response(JSON.stringify({
      hasDB: !!(env == null ? void 0 : env.DB),
      hasAdminUser: !!(env == null ? void 0 : env.ADMIN_USER),
      hasAdminPassword: !!(env == null ? void 0 : env.ADMIN_PASSWORD),
      envKeys: env ? Object.keys(env) : []
    }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
async function loader$1() {
  return new Response("POST to this endpoint to see env debug info", {
    headers: { "Content-Type": "text/plain" }
  });
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
async function loader({ request, context }) {
  const { env } = context;
  const sessionStorage = getSessionStorage(env);
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  if (session.has("user")) return redirect("/");
  return null;
}
async function action({ request, context }) {
  const { env } = context;
  const formData = await request.formData();
  const username = formData.get("username");
  const password = formData.get("password");
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return json({ error: "Invalid form data" }, { status: 400 });
  }
  const validUser = env.ADMIN_USER;
  const validPass = env.ADMIN_PASSWORD;
  if (!validUser || !validPass) {
    return json(
      { error: "Server misconfiguration. Please set ADMIN_USER and ADMIN_PASSWORD." },
      { status: 500 }
    );
  }
  if (username === validUser && password === validPass) {
    return createUserSession(request, env, username);
  }
  return json({ error: "Invalid credentials" }, { status: 401 });
}
function Login() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "var(--bg-app)"
      },
      children: /* @__PURE__ */ jsxs("div", { className: "glass-panel", style: { width: "100%", maxWidth: "400px", padding: "2rem" }, children: [
        /* @__PURE__ */ jsx("h2", { style: { textAlign: "center", marginBottom: "2rem" }, children: "ItWork Login" }),
        /* @__PURE__ */ jsxs(Form, { method: "post", children: [
          /* @__PURE__ */ jsxs("div", { style: { marginBottom: "1rem" }, children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "username", children: "Username" }),
            /* @__PURE__ */ jsx("input", { type: "text", id: "username", name: "username", required: true, autoComplete: "username" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { marginBottom: "2rem" }, children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "password", children: "Password" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "password",
                id: "password",
                name: "password",
                required: true,
                autoComplete: "current-password"
              }
            )
          ] }),
          (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { style: { color: "var(--danger-color)", marginBottom: "1rem", fontSize: "0.875rem" }, children: actionData.error }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              className: "btn btn-primary",
              style: { width: "100%" },
              disabled: isSubmitting,
              children: isSubmitting ? "Signing In..." : "Sign In"
            }
          )
        ] })
      ] })
    }
  );
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: Login,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-BhsWtHwr.js", "imports": ["/assets/components-BacJe0QF.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-lg4qHxT9.js", "imports": ["/assets/components-BacJe0QF.js"], "css": [] }, "routes/transactions._index": { "id": "routes/transactions._index", "parentId": "root", "path": "transactions", "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/transactions._index-D89oCb7C.js", "imports": ["/assets/components-BacJe0QF.js", "/assets/Layout-BncKZjrL.js"], "css": ["/assets/global-CyzFCEFP.css"] }, "routes/inventory._index": { "id": "routes/inventory._index", "parentId": "root", "path": "inventory", "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/inventory._index-BXSLWaLa.js", "imports": ["/assets/components-BacJe0QF.js", "/assets/Layout-BncKZjrL.js"], "css": ["/assets/global-CyzFCEFP.css"] }, "routes/transactions.new": { "id": "routes/transactions.new", "parentId": "root", "path": "transactions/new", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/transactions.new-DAPspsHb.js", "imports": ["/assets/components-BacJe0QF.js", "/assets/Layout-BncKZjrL.js"], "css": ["/assets/global-CyzFCEFP.css"] }, "routes/inventory.new": { "id": "routes/inventory.new", "parentId": "root", "path": "inventory/new", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/inventory.new-CrKNwWJ6.js", "imports": ["/assets/components-BacJe0QF.js", "/assets/Layout-BncKZjrL.js"], "css": ["/assets/global-CyzFCEFP.css"] }, "routes/categories": { "id": "routes/categories", "parentId": "root", "path": "categories", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/categories-DKTII4Oo.js", "imports": ["/assets/components-BacJe0QF.js", "/assets/Layout-BncKZjrL.js"], "css": ["/assets/global-CyzFCEFP.css"] }, "routes/logout": { "id": "routes/logout", "parentId": "root", "path": "logout", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/logout-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-xHU3SD9c.js", "imports": ["/assets/components-BacJe0QF.js", "/assets/Layout-BncKZjrL.js"], "css": ["/assets/global-CyzFCEFP.css"] }, "routes/debug": { "id": "routes/debug", "parentId": "root", "path": "debug", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/debug-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/login": { "id": "routes/login", "parentId": "root", "path": "login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/login-C01ueact.js", "imports": ["/assets/components-BacJe0QF.js"], "css": ["/assets/global-CyzFCEFP.css"] } }, "url": "/assets/manifest-382ccc05.js", "version": "382ccc05" };
const mode = "production";
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": false, "v3_singleFetch": false, "v3_lazyRouteDiscovery": false, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/transactions._index": {
    id: "routes/transactions._index",
    parentId: "root",
    path: "transactions",
    index: true,
    caseSensitive: void 0,
    module: route1
  },
  "routes/inventory._index": {
    id: "routes/inventory._index",
    parentId: "root",
    path: "inventory",
    index: true,
    caseSensitive: void 0,
    module: route2
  },
  "routes/transactions.new": {
    id: "routes/transactions.new",
    parentId: "root",
    path: "transactions/new",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/inventory.new": {
    id: "routes/inventory.new",
    parentId: "root",
    path: "inventory/new",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/categories": {
    id: "routes/categories",
    parentId: "root",
    path: "categories",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/logout": {
    id: "routes/logout",
    parentId: "root",
    path: "logout",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route7
  },
  "routes/debug": {
    id: "routes/debug",
    parentId: "root",
    path: "debug",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/login": {
    id: "routes/login",
    parentId: "root",
    path: "login",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};

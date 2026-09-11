import cors from "cors";
import express from "express";
import multer from "multer";
import path from "path";
import Stripe from "stripe";

import {
  createMessage,
  createPaymentRecord,
  createServiceRequest,
  ensureRuntimeFolders,
  getDatabaseSummary,
  readCategories,
  readProviders,
  readServiceRequests,
  updateServiceRequest,
  uploadsDir,
} from "./store.js";

const app = express();
const port = Number(process.env.PORT || 4242);
const appOrigin = process.env.APP_ORIGIN || "*";
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

ensureRuntimeFolders();

if (!stripeSecretKey || stripeSecretKey.includes("replace_me")) {
  console.warn("STRIPE_SECRET_KEY is not configured. Payment endpoints will return setup errors.");
}

const stripe = stripeSecretKey && !stripeSecretKey.includes("replace_me")
  ? new Stripe(stripeSecretKey)
  : null;

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadsDir),
  filename: (_request, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    callback(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 10,
    fileSize: 80 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    const allowed = ["image/jpeg", "image/png", "image/heic", "video/mp4", "video/quicktime"];
    callback(null, allowed.includes(file.mimetype));
  },
});

app.use(cors({ origin: appOrigin }));
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.get("/", (_request, response) => {
  response.type("html").send(renderRootPage());
});

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "fixee-go-backend", database: getDatabaseSummary().file });
});

app.get("/database/status", (_request, response) => {
  response.json(getDatabaseSummary());
});

app.get("/categories", (_request, response) => {
  response.json({ categories: readCategories() });
});

app.get("/providers", (_request, response) => {
  response.json({ providers: readProviders() });
});

app.get("/service-requests", (_request, response) => {
  response.json({ requests: readServiceRequests() });
});

app.post("/service-requests", upload.array("media", 10), (request, response) => {
  const files = request.files || [];
  const uploadedMedia = files.map((file) => ({
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `/uploads/${path.basename(file.path)}`,
  }));

  const requestPayload = {
    customerName: request.body.customerName || "Customer",
    customerEmail: request.body.customerEmail || "",
    customerPhone: request.body.customerPhone || "",
    category: request.body.category || "Other",
    otherCategory: request.body.otherCategory || "",
    issueType: request.body.issueType || "Other",
    otherIssue: request.body.otherIssue || "",
    description: request.body.description || "",
    deviceInfo: request.body.deviceInfo || "",
    location: request.body.location || "",
    appointmentPreference: request.body.appointmentPreference || "",
    media: uploadedMedia,
  };

  response.status(201).json({ request: createServiceRequest(requestPayload) });
});

app.patch("/service-requests/:id", (request, response) => {
  const updated = updateServiceRequest(request.params.id, request.body || {});

  if (!updated) {
    response.status(404).json({ error: "Service request not found." });
    return;
  }

  response.json({ request: updated });
});

app.post("/service-requests/:id/messages", (request, response) => {
  const message = createMessage({
    requestId: request.params.id,
    senderRole: request.body?.senderRole || "admin",
    senderName: request.body?.senderName || "FixiGo Team",
    body: request.body?.body || "",
  });

  response.status(201).json({ message });
});

app.get("/admin", (_request, response) => {
  response.type("html").send(renderDashboardPage("admin"));
});

app.get("/maintenance", (_request, response) => {
  response.type("html").send(renderDashboardPage("maintenance"));
});

app.get("/payments/status", (_request, response) => {
  response.json({
    configured: Boolean(stripe && stripePublishableKey && !stripePublishableKey.includes("replace_me")),
    mode: stripeSecretKey?.startsWith("sk_live_") ? "live" : "test",
  });
});

app.post("/payments/payment-sheet", async (request, response) => {
  try {
    if (!stripe || !stripePublishableKey) {
      response.status(503).json({
        error: "Stripe backend is not configured yet.",
      });
      return;
    }

    const {
      amountCents,
      currency = "usd",
      customerEmail,
      customerName,
      customerId,
      jobId,
    } = request.body || {};

    if (!Number.isInteger(amountCents) || amountCents < 50) {
      response.status(400).json({ error: "amountCents must be at least 50." });
      return;
    }

    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      metadata: {
        appCustomerId: customerId || "unknown",
      },
    });

    const ephemeralKey = await stripe.ephemeralKeys.create({ customer: customer.id });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        jobId: jobId || "unknown",
        appCustomerId: customerId || "unknown",
      },
    });

    createPaymentRecord({
      requestId: jobId || "",
      stripePaymentIntentId: paymentIntent.id,
      amountCents,
      currency,
      status: paymentIntent.status,
    });

    response.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: stripePublishableKey,
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: "Could not create payment sheet.",
    });
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError) {
    response.status(400).json({ error: "Invalid JSON request body." });
    return;
  }

  if (error instanceof multer.MulterError) {
    response.status(400).json({ error: error.message });
    return;
  }

  response.status(500).json({ error: "Unexpected server error." });
});

const server = app.listen(port);

server.on("listening", () => {
  console.log(`Fixee Go backend listening on http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the old backend process, then run npm.cmd run backend:dev again.`);
    process.exit(1);
  }

  throw error;
});

function renderRootPage() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FixiGo Backend</title>
  ${dashboardStyles()}
</head>
<body>
  <main class="page">
    <section class="hero">
      <p class="eyebrow">FixiGo backend</p>
      <h1>API, admin, and maintenance portals are running.</h1>
      <p class="muted">Use these local links while we build the production business platform.</p>
      <div class="actions">
        <a href="/admin">Open Admin Portal</a>
        <a href="/maintenance">Open Maintenance Portal</a>
        <a href="/health">Health JSON</a>
        <a href="/database/status">Database Status</a>
        <a href="/payments/status">Stripe Status</a>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function renderDashboardPage(mode) {
  const title = mode === "admin" ? "Admin Portal" : "Maintenance Portal";
  const subtitle = mode === "admin"
    ? "Review requests, assign technicians, and track every job."
    : "See assigned and new jobs with customer details and uploaded media.";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FixiGo ${title}</title>
  ${dashboardStyles()}
</head>
<body>
  <main class="page">
    <section class="header">
      <div>
        <p class="eyebrow">FixiGo</p>
        <h1>${title}</h1>
        <p class="muted">${subtitle}</p>
      </div>
      <a href="/">Backend Home</a>
    </section>
    <section class="toolbar">
      <a href="/database/status">Database</a>
      <a href="/providers">Providers JSON</a>
      <a href="/categories">Categories JSON</a>
    </section>
    <section class="toolbar">
      <button onclick="loadRequests()">Refresh</button>
      <span id="count" class="muted">Loading...</span>
    </section>
    <section id="metrics" class="metrics"></section>
    <section id="requests" class="grid"></section>
  </main>
  <script>
    const mode = ${JSON.stringify(mode)};

    async function loadRequests() {
      const response = await fetch('/service-requests');
      const data = await response.json();
      const requests = data.requests || [];
      const open = requests.filter((request) => request.status !== 'Completed').length;
      const assigned = requests.filter((request) => request.assignedTo).length;
      const withMedia = requests.filter((request) => (request.media || []).length > 0).length;
      document.getElementById('count').textContent = requests.length + ' request' + (requests.length === 1 ? '' : 's');
      document.getElementById('metrics').innerHTML =
        '<article><strong>' + open + '</strong><span>Open</span></article>'
        + '<article><strong>' + assigned + '</strong><span>Assigned</span></article>'
        + '<article><strong>' + withMedia + '</strong><span>With media</span></article>';
      document.getElementById('requests').innerHTML = requests.length
        ? requests.map(renderRequest).join('')
        : '<article class="card"><h2>No requests yet</h2><p class="muted">Customer requests will appear here after they submit from the mobile app.</p></article>';
    }

    async function updateRequest(id, patch) {
      await fetch('/service-requests/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      await loadRequests();
    }

    async function addMessage(id, inputId) {
      const input = document.getElementById(inputId);
      const body = input.value.trim();
      if (!body) return;

      await fetch('/service-requests/' + id + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole: mode === 'admin' ? 'admin' : 'provider',
          senderName: mode === 'admin' ? 'FixiGo Admin' : 'Maintenance Team',
          body
        })
      });
      input.value = '';
      await loadRequests();
    }

    function renderRequest(request) {
      const media = (request.media || []).map((item) => {
        const isImage = (item.mimeType || '').startsWith('image/');
        const content = isImage
          ? '<img src="' + item.url + '" alt="' + escapeHtml(item.fileName || 'upload') + '" />'
          : '<video controls src="' + item.url + '"></video>';
        return '<a class="media" href="' + item.url + '" target="_blank">' + content + '<span>' + escapeHtml(item.fileName || 'upload') + '</span></a>';
      }).join('');

      const currentStatus = request.status || 'New';
      const adminTools = mode === 'admin'
        ? '<div class="admin-tools"><input placeholder="Assign technician" value="' + escapeHtml(request.assignedTo || '') + '" onchange="updateRequest(\\'' + request.id + '\\', { assignedTo: this.value, status: this.value ? \\'Assigned\\' : \\'' + currentStatus + '\\' })" /><select onchange="updateRequest(\\'' + request.id + '\\', { status: this.value })">' + renderStatusOptions(currentStatus) + '</select></div>'
        : '';

      const maintenanceTools = mode === 'maintenance'
        ? '<div class="admin-tools"><select onchange="updateRequest(\\'' + request.id + '\\', { status: this.value })">' + renderStatusOptions(currentStatus) + '</select></div>'
        : '';
      const messageInputId = 'msg-' + request.id.replace(/[^a-zA-Z0-9]/g, '');
      const messages = (request.messages || []).map((message) => {
        return '<div class="message"><b>' + escapeHtml(message.senderName) + '</b><p>' + escapeHtml(message.body) + '</p></div>';
      }).join('');

      return '<article class="card">'
        + '<div class="card-head"><div><p class="eyebrow">' + escapeHtml(request.id) + '</p><h2>' + escapeHtml(request.issueType === 'Other' ? request.otherIssue || 'Other issue' : request.issueType) + '</h2></div><strong>' + escapeHtml(request.status || 'New') + '</strong></div>'
        + '<p><b>Category:</b> ' + escapeHtml(request.category === 'Other' ? request.otherCategory || 'Other' : request.category) + '</p>'
        + '<p><b>Customer:</b> ' + escapeHtml(request.customerName || 'Customer') + ' · ' + escapeHtml(request.customerPhone || '') + '</p>'
        + '<p><b>Location:</b> ' + escapeHtml(request.location || 'Not provided') + '</p>'
        + '<p><b>Appointment:</b> ' + escapeHtml(request.appointmentPreference || 'Not provided') + '</p>'
        + '<p><b>Model / details:</b> ' + escapeHtml(request.deviceInfo || 'Not provided') + '</p>'
        + '<p class="description">' + escapeHtml(request.description || '') + '</p>'
        + '<p><b>Assigned:</b> ' + escapeHtml(request.assignedTo || 'Unassigned') + '</p>'
        + adminTools
        + maintenanceTools
        + '<div class="messages">' + (messages || '<p class="muted">No messages yet.</p>') + '</div>'
        + '<div class="admin-tools"><input id="' + messageInputId + '" placeholder="Add job note or message" /><button onclick="addMessage(\\'' + request.id + '\\', \\'' + messageInputId + '\\')">Send</button></div>'
        + '<div class="media-grid">' + (media || '<p class="muted">No media uploaded.</p>') + '</div>'
        + '</article>';
    }

    function renderStatusOptions(currentStatus) {
      return ['New', 'Assigned', 'In Progress', 'Completed'].map((status) => {
        return '<option value="' + status + '"' + (status === currentStatus ? ' selected' : '') + '>' + status + '</option>';
      }).join('');
    }

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char]));
    }

    loadRequests();
  </script>
</body>
</html>`;
}

function dashboardStyles() {
  return `<style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; }
    .page { width: min(1120px, 100%); margin: 0 auto; padding: 24px; }
    .hero, .header, .toolbar, .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
    .hero { margin-top: 28px; }
    .header, .toolbar, .card-head, .actions, .admin-tools { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
    .header, .toolbar { margin-bottom: 16px; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 28px; line-height: 1.2; }
    h2 { font-size: 18px; line-height: 1.3; }
    p { line-height: 1.45; margin-top: 8px; }
    a, button { border: 0; border-radius: 8px; background: #2563eb; color: white; padding: 11px 14px; font-weight: 800; text-decoration: none; cursor: pointer; }
    input, select { min-height: 40px; border-radius: 8px; border: 1px solid #cbd5e1; padding: 0 10px; }
    .eyebrow { color: #2563eb; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0; }
    .muted { color: #64748b; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .metrics article { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .metrics strong { display: block; font-size: 26px; }
    .metrics span { color: #64748b; font-weight: 800; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
    .card strong { color: #2563eb; font-size: 13px; }
    .description { padding: 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .messages { display: grid; gap: 8px; margin-top: 12px; }
    .message { padding: 10px; border-radius: 8px; background: #eff6ff; border: 1px solid #bfdbfe; }
    .message p { margin-top: 4px; }
    .media-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 14px; }
    .media { display: block; background: #f1f5f9; color: #0f172a; padding: 8px; border: 1px solid #e2e8f0; }
    .media img, .media video { width: 100%; height: 120px; object-fit: cover; border-radius: 6px; background: #e2e8f0; }
    .media span { display: block; margin-top: 6px; font-size: 12px; overflow-wrap: anywhere; }
    @media (max-width: 720px) { .header, .toolbar, .card-head, .actions, .admin-tools { align-items: stretch; flex-direction: column; } .page { padding: 14px; } }
  </style>`;
}

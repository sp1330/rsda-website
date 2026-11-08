/// <reference path="../pb_data/types.d.ts" />

// Creates all four collections needed for RS Drive Automation.
// Runs automatically on first PocketBase startup.
migrate((app) => {

  // ── 1. admin_users ─────────────────────────────────────────────────────────
  // Auth collection used by the logo editor. Separate from PocketBase superusers
  // so website admin credentials are isolated.
  const adminUsers = new Collection({
    name:   "admin_users",
    type:   "auth",
    // No public access to any admin_users records
    listRule:   null,
    viewRule:   null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });
  app.save(adminUsers);

  // ── 2. enquiries ───────────────────────────────────────────────────────────
  // Contact form submissions. Anyone can create; only admin_users can read/manage.
  const enquiries = new Collection({
    name: "enquiries",
    type: "base",
    createRule: "",   // public — the contact form posts here
    listRule:   `@request.auth.collectionName = "admin_users"`,
    viewRule:   `@request.auth.collectionName = "admin_users"`,
    updateRule: `@request.auth.collectionName = "admin_users"`,
    deleteRule: `@request.auth.collectionName = "admin_users"`,
    fields: [
      { name: "name",    type: "text",   required: true },
      { name: "email",   type: "email",  required: true },
      { name: "phone",   type: "text" },
      { name: "company", type: "text" },
      { name: "message", type: "text",   required: true },
      { name: "status", type: "text" },
      { name: "ip", type: "text" },
    ],
  });
  app.save(enquiries);

  // ── 3. sell_enquiries ──────────────────────────────────────────────────────
  // "Sell your parts" form submissions. Same access pattern as enquiries.
  const sellEnquiries = new Collection({
    name: "sell_enquiries",
    type: "base",
    createRule: "",
    listRule:   `@request.auth.collectionName = "admin_users"`,
    viewRule:   `@request.auth.collectionName = "admin_users"`,
    updateRule: `@request.auth.collectionName = "admin_users"`,
    deleteRule: `@request.auth.collectionName = "admin_users"`,
    fields: [
      { name: "name",      type: "text",  required: true },
      { name: "email",     type: "email", required: true },
      { name: "phone",     type: "text",  required: true },
      { name: "company",   type: "text" },
      { name: "brand",     type: "text",  required: true },
      { name: "parts",     type: "text",  required: true },
      { name: "condition", type: "text" },
      {
        name: "attachment",
        type: "file",
        options: {
          maxSelect: 1,
          maxSize:   20971520, // 20 MB
          mimeTypes: [
            "image/jpeg", "image/png", "image/webp",
            "application/pdf",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/zip",
          ],
        },
      },
      { name: "status", type: "text" },
      { name: "ip", type: "text" },
    ],
  });
  app.save(sellEnquiries);

  // ── 4. logos ───────────────────────────────────────────────────────────────
  // One record per brand. Public read (site needs logos on load).
  // Only admin_users can create/update/delete.
  const logos = new Collection({
    name: "logos",
    type: "base",
    listRule:   "",   // public — site fetches logos on load
    viewRule:   "",
    createRule: `@request.auth.collectionName = "admin_users"`,
    updateRule: `@request.auth.collectionName = "admin_users"`,
    deleteRule: `@request.auth.collectionName = "admin_users"`,
    fields: [
      { name: "brand", type: "text", required: true },
      {
        name: "file",
        type: "file",
        required: true,
        options: {
          maxSelect: 1,
          maxSize:   5242880, // 5 MB
          mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"],
        },
      },
      { name: "zoom", type: "number" },
      { name: "x",    type: "number" },
      { name: "y",    type: "number" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_logos_brand ON logos (brand)",
    ],
  });
  app.save(logos);

}, (app) => {
  // Rollback: delete in reverse dependency order
  for (const name of ["logos", "sell_enquiries", "enquiries", "admin_users"]) {
    try {
      const col = app.findCollectionByNameOrId(name);
      app.delete(col);
    } catch (_) {}
  }
});

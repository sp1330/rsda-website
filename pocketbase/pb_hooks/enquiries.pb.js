/// <reference path="../pb_data/types.d.ts" />

// ── Security: validate and rate-limit contact form submissions ────────────────
onRecordCreateRequest((e) => {
  const rec  = e.record;
  const info = e.requestInfo();

  // ── 1. Extract real IP (Cloudflare puts it in CF-Connecting-IP) ──────────
  const ip = (
    info.headers["cf-connecting-ip"] ||
    info.headers["x-real-ip"]        ||
    (info.headers["x-forwarded-for"] || "").split(",")[0]
  ).trim() || "unknown";

  rec.set("ip", ip);
  rec.set("status", "new");

  // ── 2. Rate limit: max 3 submissions per IP per hour ────────────────────
  if (ip !== "unknown") {
    const cutoff = new Date(Date.now() - 3_600_000).toISOString().replace("T", " ");
    try {
      const recent = $app.findRecordsByFilter(
        "enquiries",
        `ip = {:ip} && created >= {:cutoff}`,
        "-created", 3, 0,
        { ip, cutoff }
      );
      if (recent.length >= 3) {
        throw new ApiError(429, "Too many submissions. Please try again later.");
      }
    } catch (err) {
      if (err.status === 429) throw err;
      // Collection might be empty on first run — ignore other errors
    }
  }

  // ── 3. Sanitize: strip HTML/script tags, trim, enforce max lengths ───────
  const clean = (val, max) =>
    String(val || "")
      .replace(/<[^>]*>/g, "")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, max);

  rec.set("name",    clean(rec.getString("name"),    100));
  rec.set("email",   clean(rec.getString("email"),   254));
  rec.set("phone",   clean(rec.getString("phone"),    30));
  rec.set("company", clean(rec.getString("company"), 200));
  rec.set("message", clean(rec.getString("message"), 5000));

  // ── 4. Spam filter ────────────────────────────────────────────────────────
  const body = [
    rec.getString("name"),
    rec.getString("company"),
    rec.getString("message"),
  ].join(" ").toLowerCase();

  const SPAM = [
    /\b(casino|viagra|crypto|bitcoin|nft|forex|seo service|backlink)\b/,
    /\b(make money|earn \$|free money|click here|limited offer)\b/,
    /https?:\/\//,   // no URLs in body fields
  ];

  for (const pattern of SPAM) {
    if (pattern.test(body)) {
      // Silent 400 — don't reveal which word triggered
      throw new ApiError(400, "Invalid submission.");
    }
  }

  // Reject obvious test addresses
  const email = rec.getString("email").toLowerCase();
  if (email.endsWith("@example.com") || email.endsWith("@test.com") || email.endsWith("@mailinator.com")) {
    throw new ApiError(400, "Please use a valid email address.");
  }

  e.next();
}, "enquiries");


// ── Email notification after a contact enquiry is saved ───────────────────────
onRecordAfterCreateSuccess((e) => {
  const rec    = e.record;
  const apiKey = $os.getenv("RESEND_API_KEY");

  if (!apiKey) {
    console.log("[enquiries] RESEND_API_KEY not set — skipping notification email");
    return;
  }

  const name    = rec.getString("name");
  const email   = rec.getString("email");
  const phone   = rec.getString("phone")   || "—";
  const company = rec.getString("company") || "—";
  const message = rec.getString("message").replace(/\n/g, "<br>");
  const ts      = new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" });

  try {
    $http.send({
      url:    "https://api.resend.com/emails",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    "RS Drive Automation <noreply@rsdriveautomation.co.nz>",
        to:      ["sales@rsdriveautomation.co.nz"],
        subject: `New Enquiry — ${name}${company !== "—" ? ` (${company})` : ""}`,
        html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#1a2744;padding:18px 24px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:1rem;font-weight:700;">
      New Contact Enquiry — RS Drive Automation
    </h2>
  </div>
  <div style="background:#fff;border:1px solid #e2e6ea;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
    <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
      <tr><td style="padding:8px 12px;font-weight:700;color:#1a2744;width:110px;">Name</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f4f4f4;">${name}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:700;color:#1a2744;">Email</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f4f4f4;">
            <a href="mailto:${email}" style="color:#c0392b;">${email}</a></td></tr>
      <tr><td style="padding:8px 12px;font-weight:700;color:#1a2744;">Phone</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f4f4f4;">${phone}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:700;color:#1a2744;">Company</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f4f4f4;">${company}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:700;color:#1a2744;vertical-align:top;">Message</td>
          <td style="padding:8px 12px;">${message}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:.75rem;color:#9ca3af;">
      Received ${ts} NZST &nbsp;·&nbsp; RS Drive Automation
    </p>
  </div>
</div>`,
      }),
    });
  } catch (err) {
    console.error("[enquiries] Failed to send notification email:", err);
  }
}, "enquiries");

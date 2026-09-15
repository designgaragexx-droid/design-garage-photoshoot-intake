// =====================================================================
// Design Garage — intake submission endpoint
// Receives the intake payload from the front end and emails it via
// Resend (https://resend.com). Requires one environment variable set
// in Vercel (see README.md for the full walkthrough):
//
//   RESEND_API_KEY   your Resend API key
//
// Optional overrides:
//   TO_EMAIL         destination inbox (defaults to
//                    design.garage.xx@gmail.com if unset)
//   FROM_EMAIL       sender address (defaults to Resend's shared test
//                    sender, best replaced with an address on a domain
//                    you verify in Resend for production use)
//
// Payload shape:
//   { contactName, businessName, contactEmail, subject,
//     sections: [{ label, value }], files: [{ name, size, base64 }] }
// Legacy website-planner payloads (package/addons/dates) are still
// accepted and rendered.
// =====================================================================

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO_EMAIL = process.env.TO_EMAIL || "design.garage.xx@gmail.com";
  const FROM_EMAIL = process.env.FROM_EMAIL || "Design Garage <onboarding@resend.dev>";

  if (!RESEND_API_KEY) {
    res.status(500).json({ error: "Server is not configured yet. Set RESEND_API_KEY in Vercel." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  }
  body = body || {};

  const esc = (v) =>
    String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const multiline = (v) => esc(v).replace(/\r?\n/g, "<br/>");

  const files = Array.isArray(body.files) ? body.files : [];

  const row = (label, value) =>
    '<tr><td style="padding:10px 16px;border-bottom:1px solid #e8e5dd;color:#7e7e7f;font:600 12px sans-serif;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;vertical-align:top;">' +
    esc(label) +
    '</td><td style="padding:10px 16px;border-bottom:1px solid #e8e5dd;color:#2b2b2c;font:15px/1.5 sans-serif;">' +
    value +
    "</td></tr>";

  const fileListHtml = files.length
    ? files
        .map((f) => esc(f.name) + (f.base64 ? "" : " <em>(too large to attach \u2014 name only)</em>"))
        .join("<br/>")
    : "None uploaded";

  const sections = Array.isArray(body.sections) ? body.sections : [];

  let detailRows = "";
  if (sections.length) {
    detailRows = sections.map((sec) => row(sec && sec.label, multiline(sec && sec.value))).join("");
  } else {
    // legacy website-planner payload
    const addons = Array.isArray(body.addons) ? body.addons : [];
    detailRows =
      row("Package", esc(body.packageName || body.package)) +
      row("Add-ons", addons.length ? addons.map(esc).join("<br/>") : "None selected") +
      row("Add-on details", body.addonsNotes ? esc(body.addonsNotes) : "None provided") +
      row("Requested start date", esc(body.startDate)) +
      row("Desired launch date", esc(body.launchDate)) +
      row("Branding status", esc(body.brandingLabel || body.branding)) +
      row("Additional notes", body.notes ? multiline(body.notes) : "None provided");
  }

  const title = body.subject || "New intake submitted";

  const html =
    '<div style="font-family:sans-serif;max-width:640px;margin:0 auto;">' +
    '<h1 style="font:300 26px serif;color:#2b2b2c;margin:0 0 4px;">' + esc(title) + "</h1>" +
    '<p style="color:#7e7e7f;font:14px sans-serif;margin:0 0 24px;">via the Design Garage intake form</p>' +
    '<table style="width:100%;border-collapse:collapse;">' +
    row("Name", esc(body.contactName)) +
    row("Company / Brand", esc(body.businessName)) +
    row("Email", esc(body.contactEmail)) +
    detailRows +
    row("Uploaded files", fileListHtml) +
    "</table>" +
    "</div>";

  const attachments = files
    .filter((f) => f && f.base64)
    .map((f) => ({ filename: f.name, content: f.base64 }));

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + RESEND_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: body.contactEmail || undefined,
        subject: title + " \u2014 " + (body.businessName || body.contactName || "Untitled"),
        html,
        attachments: attachments.length ? attachments : undefined
      })
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      res.status(502).json({ error: "Resend rejected the email", detail });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown error" });
  }
};

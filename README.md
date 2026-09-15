# Design Garage — AI Photoshoot Intake

A static intake form plus one Vercel serverless function that emails every
submission to **design.garage.xx@gmail.com** via [Resend](https://resend.com).
Clients never leave the form and never see a third-party form UI.

---

## Files (keep this exact structure — everything at the repo root)

    index.html            the intake form
    support.js            runtime
    colors_and_type.css   brand tokens
    fonts/                brand fonts
    assets/               logo + star mark
    api/submit.js         serverless email function

Do not nest these inside an extra folder — Vercel needs `index.html` at the
root and `api/submit.js` at exactly that path.

---

## Deploy

1. **Create a new GitHub repo**, e.g. `design-garage-photoshoot-intake`.
2. **Upload every file above**, preserving the `fonts/`, `assets/`, and `api/`
   folders. (GitHub web upload: drag the whole set in at once so folders are
   kept.)
3. **In Vercel:** Add New → Project → import that repo → Deploy.
   - Framework preset: **Other**
   - Build command: none
   - Output directory: root
4. **Add the environment variable.** Vercel → Project → Settings →
   Environment Variables:

       RESEND_API_KEY = (the same key the website planner uses)

   Optional overrides:

       TO_EMAIL   = design.garage.xx@gmail.com   ← already the default
       FROM_EMAIL = Design Garage <hello@yourdomain.com>

   `FROM_EMAIL` defaults to Resend's shared test sender, which works right
   away. For production, verify your domain in Resend and use an address on
   it so emails don't land in spam.
5. **Redeploy once** after adding the variable: Deployments → ⋯ → Redeploy.
   Environment variables are only picked up on a fresh deploy.

The live URL will look like `design-garage-photoshoot-intake.vercel.app`.
Link it from an email, or embed it in Showit via an iframe.

---

## Editing the form later

Package names, image counts, prices, shoot types, goal options, and vibe
options all live in the `DG_CONFIG` object at the top of the
`<script data-dc-script>` block in `index.html`. Change a value, commit, and
Vercel redeploys the same URL automatically.

Current packages:

| Package   | Final images | Price  |
| --------- | ------------ | ------ |
| Essential | 12           | $1,200 |
| Signature | 24           | $2,000 |
| Campaign  | 48           | $3,200 |

---

## What the email looks like

Each submission arrives as a formatted table containing every answer: shoot
type, product or subject details, intended usage, campaign context, package
and price, creative direction, moodboard link, reference assets,
non-negotiables, things to avoid, and additional notes.

Uploaded reference images are **attached** to the email when under 4MB each;
anything larger is listed by name only (Vercel caps request bodies at about
4.5MB). Reply-to is set to the client's email address, so replying goes
straight to them.

---

## Troubleshooting

- **"Server is not configured yet"** — `RESEND_API_KEY` is missing, or you
  added it without redeploying.
- **Submission fails with 502** — Resend rejected the send. Usually an
  unverified `FROM_EMAIL` domain; remove the variable to fall back to
  Resend's test sender.
- **Fonts look wrong** — the `fonts/` folder didn't upload. Re-check it
  exists at the repo root.

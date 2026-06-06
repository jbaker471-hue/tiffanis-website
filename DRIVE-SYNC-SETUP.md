# Google Drive → Storefront Design Sync — Setup Guide

This makes your storefront pull designs straight from a Google Drive folder.
You organize artwork in Drive (one folder per category); a background job
copies them into the site every 10 minutes. Add a design to Drive → it
appears on the site shortly after. No manual uploading.

## How it works (plain English)
- Each **top-level folder** in your Drive root = one **category**.
- Each **PNG/JPG** inside a folder = one **design** (file name = design name).
- A scheduled Netlify function reads Drive and saves designs to your Supabase
  `designs` table. Shoppers load the images from there — fast and reliable.

---

## ONE-TIME SETUP

### 1. Add the designs table to Supabase
- Open Supabase → SQL Editor.
- Paste the contents of `designs-table.sql` and run it.

### 2. Make the Drive folder readable
- In Google Drive, find (or create) one **root folder**, e.g. "TATB Designs".
- Put your category folders inside it (Holiday, Family, Sports, etc.).
- Right-click the root folder → Share → "Anyone with the link" → **Viewer**.
  (This lets the images load on the website.)
- Open the root folder and copy its ID from the URL:
  `https://drive.google.com/drive/folders/THIS_LONG_ID_HERE`

### 3. Create a Google service account (the "robot" that reads Drive)
- Go to https://console.cloud.google.com → create a project (any name).
- Search "Google Drive API" → **Enable** it.
- Left menu → APIs & Services → Credentials → **Create credentials** →
  **Service account**. Name it anything, click through, **Done**.
- Click the new service account → **Keys** tab → Add key → **Create new key**
  → **JSON**. A `.json` file downloads. Keep it safe — this is a password.
- Open that JSON file, find the `client_email` value (looks like
  `something@yourproject.iam.gserviceaccount.com`).
- Back in Google Drive, **share your root folder with that email** as Viewer
  (same as step 2, but paste the service account email).

### 4. Add environment variables in Netlify
Netlify → Site settings → Environment variables → add:

| Variable                     | Value                                                        |
|------------------------------|--------------------------------------------------------------|
| `DRIVE_ROOT_FOLDER_ID`       | the folder ID from step 2                                    |
| `SUPABASE_SERVICE_KEY`       | Supabase → Settings → API → **service_role** key (secret!)   |
| `GOOGLE_SERVICE_ACCOUNT_JSON`| paste the **entire contents** of the JSON file from step 3   |

Notes:
- `VITE_SUPABASE_URL` you already have — the sync reuses it.
- `GOOGLE_SERVICE_ACCOUNT_JSON` is the whole file pasted as one value. Netlify
  accepts multi-line values; paste it exactly.
- The `service_role` key is powerful — only ever put it in Netlify env vars,
  never in the website code.

### 5. Deploy
- Commit the new files (`netlify/functions/sync-designs.js`, updated
  `netlify.toml`, `package.json`, `App.jsx`) and push.
- Netlify installs `googleapis` and registers the scheduled function.

---

## TEST IT
- Visit `https://YOUR-SITE/.netlify/functions/sync-designs` once in your
  browser to trigger a sync immediately. You should see something like
  `{"ok":true,"categories":5,"designs_synced":230}`.
- Refresh the storefront — your Drive categories and designs appear.
- After that, it runs automatically every 10 minutes.

## DAY-TO-DAY
- **Add designs:** drop PNG/JPG files into the right category folder in Drive.
- **New category:** make a new folder in the root, add images. It appears
  on the site automatically (with a default 🎨 icon — you can rename/emoji it
  in the Admin panel later).
- **Remove a design:** delete it from Drive. (It stays in the site until you
  also remove it from Supabase — see note below.)

## NOTES / LIMITS
- Sync currently **adds and updates**; it doesn't auto-delete designs removed
  from Drive (kept simple/safe). If you want auto-removal too, say the word
  and it's a small addition.
- Drive image links work because the folder is shared "Anyone with the link."
  If images don't show, re-check that sharing setting.
- Very large libraries (1000+) sync fine, but the first run may take a minute.

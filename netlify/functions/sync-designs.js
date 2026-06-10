// netlify/functions/sync-designs.js
// Scheduled function: reads category folders from Google Drive and
// upserts every PNG/JPG into the Supabase `designs` table.
//
// Drive layout expected:
//   ROOT_FOLDER/
//     Holiday/        <- category
//       snowman.png
//       merry.jpg
//     Family/         <- category
//       wolfpack.png
//
// Folder name = category. File name (minus extension) = design name.
//
// Runs on a schedule (see netlify.toml). Also reachable manually at
//   /.netlify/functions/sync-designs
// for an on-demand sync while testing.

const { google } = require("googleapis");

const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // service role key — server only!
const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID;

function driveClient() {
  // Service account credentials are stored as a single JSON string env var.
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ["https://www.googleapis.com/auth/drive.readonly"]
  );
  return google.drive({ version: "v3", auth });
}

async function listChildren(drive, parentId, mimeContains) {
  const files = [];
  let pageToken = null;
  do {
    const q = mimeContains
      ? `'${parentId}' in parents and (mimeType contains 'image/') and trashed=false`
      : `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const res = await drive.files.list({
      q,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime)",
      pageSize: 1000,
      pageToken,
    });
    files.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return files;
}

// Supabase REST upsert keyed on drive_id (requires the unique constraint)
async function upsertDesigns(rows) {
  if (rows.length === 0) return;
  const res = await fetch(`${SUPA_URL}/rest/v1/designs?on_conflict=drive_id`, {
    method: "POST",
    headers: {
      apikey: SUPA_SERVICE_KEY,
      Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase upsert failed: ${res.status} ${await res.text()}`);
}

exports.handler = async () => {
  try {
    if (!ROOT_FOLDER_ID) throw new Error("DRIVE_ROOT_FOLDER_ID not set");
    const drive = driveClient();

    const categoryFolders = await listChildren(drive, ROOT_FOLDER_ID, false);
    let total = 0;
    const seenDriveIds = [];

    for (const folder of categoryFolders) {
      const images = await listChildren(drive, folder.id, true);
      const rows = images
        .filter(f => f.mimeType === "image/png" || f.mimeType === "image/jpeg")
        .map(f => {
          seenDriveIds.push(f.id);
          return {
            drive_id: f.id,
            name: f.name.replace(/\.(png|jpe?g)$/i, ""),
            category: folder.name,
            // Drive's thumbnail endpoint is far more reliable for hotlinking
            // than the uc?export=view URL. w800 looks crisp on the shirt preview.
            image_url: `https://drive.google.com/thumbnail?id=${f.id}&sz=w800`,
            thumb_url: `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
            mime_type: f.mimeType,
            active: true,
            updated_at: new Date().toISOString(),
          };
        });
      await upsertDesigns(rows);
      total += rows.length;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        categories: categoryFolders.length,
        designs_synced: total,
      }),
    };
  } catch (err) {
    console.error("sync-designs error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

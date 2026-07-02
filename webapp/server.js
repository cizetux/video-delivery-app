require('dotenv').config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());

cloudinary.config({
  cloud_name: process.env.CLOUDY_NAME,
  api_key: process.env.CLOUDY_KEY,
  api_secret: process.env.CLOUDY_SECRET 
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith("image/");

    const baseName = file.originalname
      .replace(/\.[^/.]+$/, "")            // enlève l'extension
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // enlève les accents
      .replace(/[^a-zA-Z0-9-_]+/g, "-")    // remplace le reste par des tirets
      .replace(/^-+|-+$/g, "")             // enlève les tirets en trop
      .slice(0, 60) || "file";

    const uniqueSuffix = uuidv4().slice(0, 6);

    return {
      folder: "video_delivery_app",
      resource_type: isImage ? "image" : "video",
      public_id: `${baseName}-${uniqueSuffix}`,
      allowed_formats: isImage
        ? ["jpg", "jpeg", "png", "webp", "gif"]
        : ["mp4", "mov", "avi"],
    };
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/") || file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    cb(new Error("UNSUPPORTED_FILE_TYPE"));
  },
});

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="88lanche Admin"');
    return res.status(401).send("Authentication required.");
  }

  const [user, password] = Buffer.from(authHeader.split(" ")[1], "base64")
    .toString("utf-8")
    .split(":");

  if (user === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="88lanche Admin"');
  return res.status(401).send("Invalid credentials.");
}

const PAGE_HEAD = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
    :root {
      --bg: #16140f;
      --bg-soft: #1c1a14;
      --card: #211e17;
      --border: #37332a;
      --accent: #e3a53d;
      --accent-hover: #cf9331;
      --text: #f4efe4;
      --text-muted: #a89d87;
      --success: #7ea884;
      --danger: #d97757;
      --radius: 14px;
      --font-display: 'Space Grotesk', sans-serif;
      --font-body: 'Inter', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; }
    body {
      font-family: var(--font-body);
      background:
        radial-gradient(circle at 15% 10%, rgba(227,165,61,0.08), transparent 40%),
        var(--bg);
      color: var(--text);
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .frame { width: 100%; max-width: 460px; }
    .frame.wide { max-width: 860px; }
    .sprockets {
      height: 12px;
      border-radius: var(--radius) var(--radius) 0 0;
      background-color: var(--accent);
      background-image: radial-gradient(circle, var(--bg) 2.6px, transparent 2.6px);
      background-size: 18px 12px;
      background-position: center;
    }
    .sprockets.bottom { border-radius: 0 0 var(--radius) var(--radius); }
    .card {
      background: var(--card);
      padding: 2.25rem 2rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.35);
      text-align: center;
      border-left: 1px solid var(--border);
      border-right: 1px solid var(--border);
    }
    .frame.wide .card { text-align: left; }
    .eyebrow {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
      margin: 0 0 0.6rem;
    }
    h1 {
      font-family: var(--font-display);
      margin: 0 0 0.5rem;
      font-size: 1.6rem;
      letter-spacing: -0.02em;
      font-weight: 600;
    }
    p.lede { color: var(--text-muted); margin: 0 0 1.75rem; font-size: 0.92rem; line-height: 1.5; }
    .dropzone {
      background: var(--bg-soft);
      border: 1.5px dashed var(--border);
      padding: 28px 16px;
      width: 100%;
      border-radius: 10px;
      margin-bottom: 1rem;
      color: var(--text-muted);
      transition: border-color 0.2s, background 0.2s;
    }
    .dropzone:hover, .dropzone.drag { border-color: var(--accent); background: rgba(227,165,61,0.06); }
    input[type="file"] { width: 100%; color: var(--text-muted); font-size: 0.85rem; }
    input[type="file"]::file-selector-button {
      background: var(--card); color: var(--text); border: 1px solid var(--border);
      padding: 8px 14px; border-radius: 6px; margin-right: 12px; cursor: pointer; font-family: var(--font-body);
    }
    button, .btn {
      background: var(--accent); color: #1a1508; border: none; padding: 13px 24px;
      border-radius: 8px; font-weight: 600; font-family: var(--font-body); cursor: pointer;
      transition: transform 0.15s, background 0.15s; width: 100%; font-size: 0.95rem;
    }
    button:hover, .btn:hover { background: var(--accent-hover); transform: translateY(-1px); }
    .link-field {
      width: 100%; padding: 12px 14px; background: var(--bg-soft); border: 1px solid var(--border);
      border-radius: 8px; color: var(--accent); font-family: var(--font-mono); font-size: 0.85rem;
      margin: 1.25rem 0; box-sizing: border-box;
    }
    .btn-secondary {
      display: inline-block; margin-top: 1.1rem; color: var(--text-muted); text-decoration: none; font-size: 0.82rem;
    }
    .btn-secondary:hover { color: var(--text); }
    .status-ok { color: var(--success); }
    video { border-radius: 10px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.5); display: block; }
    .video-meta { margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; }
    .video-meta h3 { margin: 0; font-family: var(--font-display); font-weight: 600; font-size: 1rem; }
    .video-meta a { color: var(--accent); text-decoration: none; font-weight: 600; font-size: 0.85rem; }
    .storage-block {
      background: var(--bg-soft); padding: 18px 20px; border-radius: 10px; margin-bottom: 28px;
      border: 1px solid var(--border);
    }
    .storage-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .storage-row span:first-child { font-size: 0.78rem; color: var(--text-muted); }
    .storage-row span:last-child { font-family: var(--font-mono); font-size: 0.78rem; font-weight: 500; }
    .storage-track { width: 100%; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .storage-fill { height: 100%; background: var(--accent); transition: width 0.4s; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    thead tr { color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--border); }
    th { padding: 0 12px 10px; font-weight: 500; }
    td { padding: 14px 12px; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    td.mono { font-family: var(--font-mono); color: var(--text-muted); font-size: 0.78rem; }
    td.id { color: var(--text); font-weight: 500; }
    td a { color: var(--accent); text-decoration: none; font-weight: 600; }
    td.row-actions { text-align: right; display: flex; justify-content: flex-end; align-items: center; gap: 14px; border-bottom: 1px solid var(--border); }
    td.row-actions form { margin: 0; }
    .delete-btn {
      all: unset; color: var(--danger); font-size: 0.8rem; font-weight: 600; cursor: pointer;
    }
    .delete-btn:hover { text-decoration: underline; }
    .table-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
    .table-footer span { color: var(--text-muted); font-size: 0.75rem; font-family: var(--font-mono); }
    .empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }
    .empty-state p { margin: 0.4rem 0 0; font-size: 0.85rem; }
    .badge {
      display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-mono);
      font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 8px;
      border-radius: 5px; border: 1px solid var(--border);
    }
    .badge-video { color: var(--accent); border-color: rgba(227,165,61,0.35); background: rgba(227,165,61,0.08); }
    .badge-photo { color: var(--success); border-color: rgba(126,168,132,0.35); background: rgba(126,168,132,0.08); }
</style>
`;

function pageShell(bodyHtml, wide = false) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${PAGE_HEAD}
<title>88lanche's Uploader</title>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function errorPage(message) {
  return pageShell(`
    <div class="frame">
      <div class="sprockets"></div>
      <div class="card">
        <p class="eyebrow" style="color: var(--danger);">Upload failed</p>
        <h1>Something went wrong</h1>
        <p class="lede">${message}</p>
        <a href="/" class="btn">Try again</a>
      </div>
      <div class="sprockets bottom"></div>
    </div>
  `);
}

app.get("/", (req, res) => {
  res.send(pageShell(`
    <div class="frame">
      <div class="sprockets"></div>
      <div class="card">
        <h1>88lanche's Uploader</h1>
        <p class="lede">Upload a video or a photo and get a clean, shareable link back.</p>
        <form id="uploadForm" action="/upload" method="POST" enctype="multipart/form-data">
          <div class="dropzone">
            <input type="file" name="file" accept="video/*,image/*" required />
          </div>
          <div class="storage-track" id="progressTrack" style="display:none; margin-bottom: 1rem;">
            <div class="storage-fill" id="progressFill" style="width:0%;"></div>
          </div>
          <button type="submit" id="submitBtn">Upload</button>
        </form>
        <a href="/admin" class="btn-secondary">Manage cloud storage</a>
      </div>
      <div class="sprockets bottom"></div>
    </div>
    <script>
      const form = document.getElementById('uploadForm');
      const progressTrack = document.getElementById('progressTrack');
      const progressFill = document.getElementById('progressFill');
      const submitBtn = document.getElementById('submitBtn');

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const fileInput = form.querySelector('input[type="file"]');
        if (!fileInput.files.length) return;

        const formData = new FormData(form);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload');

        xhr.upload.onprogress = function (evt) {
          if (evt.lengthComputable) {
            const percent = (evt.loaded / evt.total) * 100;
            progressFill.style.width = percent + '%';
          }
        };

        xhr.onload = function () {
          document.open();
          document.write(xhr.responseText);
          document.close();
        };

        xhr.onerror = function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Upload';
          alert('Upload failed. Please check your connection and try again.');
        };

        progressTrack.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading…';
        xhr.send(formData);
      });
    </script>
  `));
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");

  const publicId = req.file.filename.split("/")[1];
  const mediaType = req.file.path.includes("/image/upload/") ? "photo" : "video";
  const host = req.get('host');
  const prettyLink = `https://${host}/media/${mediaType}/${publicId}`;

  res.send(pageShell(`
    <div class="frame">
      <div class="sprockets"></div>
      <div class="card">
        <p class="eyebrow status-ok">Upload complete</p>
        <h1>Ready to share</h1>
        <p class="lede">Copy this link and send it to your client.</p>
        <input type="text" value="${prettyLink}" readonly id="linkInput" class="link-field">
        <button onclick="copyLink()">Copy link</button>
        <br>
        <a href="/media/${mediaType}/${publicId}" class="btn-secondary">Preview page</a> &nbsp;·&nbsp;
        <a href="/" class="btn-secondary">Upload another</a>
      </div>
      <div class="sprockets bottom"></div>
    </div>
    <script>
      function copyLink() {
        const input = document.getElementById('linkInput');
        const btn = event.target;
        const reset = () => { btn.textContent = 'Copy link'; };

        const onCopied = () => {
          btn.textContent = 'Copied!';
          setTimeout(reset, 1500);
        };

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(input.value).then(onCopied).catch(() => {
            input.select();
            document.execCommand('copy');
            onCopied();
          });
        } else {
          input.select();
          document.execCommand('copy');
          onCopied();
        }
      }
    </script>
  `));
});

app.get("/media/:type/:mediaId", (req, res) => {
    const { type, mediaId } = req.params;
    const cloudName = process.env.CLOUDY_NAME;
    const isPhoto = type === "photo";
    const permanentUrl = isPhoto
      ? `https://res.cloudinary.com/${cloudName}/image/upload/video_delivery_app/${mediaId}`
      : `https://res.cloudinary.com/${cloudName}/video/upload/video_delivery_app/${mediaId}.mp4`;

    const mediaTag = isPhoto
      ? `<img src="${permanentUrl}" alt="Uploaded photo" style="border-radius:10px; width:100%; box-shadow: 0 20px 50px rgba(0,0,0,0.5); display:block;">`
      : `<video controls autoplay>
            <source src="${permanentUrl}" type="video/mp4">
        </video>`;

    res.send(pageShell(`
        <div class="frame wide" style="max-width: 900px;">
            ${mediaTag}
            <div class="video-meta">
                <h3>${isPhoto ? "Photo" : "Video"} preview</h3>
                <a href="${permanentUrl}" download>Download original</a>
            </div>
        </div>
    `, true));
});

app.post("/admin/delete/:type/:mediaId", requireAdminAuth, async (req, res) => {
  const { type, mediaId } = req.params;
  const resourceType = type === "photo" ? "image" : "video";

  try {
    await cloudinary.uploader.destroy(`video_delivery_app/${mediaId}`, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error(error);
  }

  res.redirect("/admin");
});

app.get("/admin", requireAdminAuth, async (req, res) => {
  try {
    const [videoResult, photoResult] = await Promise.all([
      cloudinary.api.resources({
        resource_type: "video",
        type: "upload",
        prefix: "video_delivery_app/",
        max_results: 50
      }),
      cloudinary.api.resources({
        resource_type: "image",
        type: "upload",
        prefix: "video_delivery_app/",
        max_results: 50
      }),
    ]);

    const allFiles = [
      ...videoResult.resources.map(f => ({ ...f, mediaType: "video" })),
      ...photoResult.resources.map(f => ({ ...f, mediaType: "photo" })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const usage = await cloudinary.api.usage().catch(() => null);

    const formatBytes = (bytes) => {
      if (!bytes) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const storageUsed = formatBytes(usage?.storage?.usage);
    const creditsUsed = usage?.credits?.usage ?? 0;
    const creditsLimit = usage?.credits?.limit ?? 0;
    const creditsPercent = usage?.credits?.used_percent ?? 0;

    let rows = allFiles.map(file => {
      const shortId = file.public_id.split('/')[1];
      const date = new Date(file.created_at).toLocaleDateString();
      const size = formatBytes(file.bytes);
      const badge = file.mediaType === "photo"
        ? `<span class="badge badge-photo">Photo</span>`
        : `<span class="badge badge-video">Video</span>`;

      return `
        <tr>
          <td class="id">${shortId}</td>
          <td>${badge}</td>
          <td class="mono">${date}</td>
          <td class="mono">${size}</td>
          <td class="row-actions">
            <a href="/media/${file.mediaType}/${shortId}">View</a>
            <form action="/admin/delete/${file.mediaType}/${shortId}" method="POST" onsubmit="return confirm('Delete ${shortId}? This cannot be undone.');">
              <button type="submit" class="delete-btn">Delete</button>
            </form>
          </td>
        </tr>
      `;
    }).join('');

    const tableOrEmpty = allFiles.length
      ? `
        <table>
          <thead>
            <tr>
              <th>Filename</th>
              <th>Type</th>
              <th>Uploaded</th>
              <th>Size</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`
      : `
        <div class="empty-state">
          <p class="eyebrow" style="margin:0;">No files yet</p>
          <p>Uploads will show up here once your first delivery lands.</p>
        </div>`;

    res.send(pageShell(`
      <div class="frame wide">
        <div class="sprockets"></div>
        <div class="card">
          <p class="eyebrow">88lanche's Uploader</p>
          <h1>Manage deliveries</h1>

          <div class="storage-block">
              <div class="storage-row">
                  <span>Storage used</span>
                  <span>${storageUsed}</span>
              </div>
              <div class="storage-row">
                  <span>Plan credits</span>
                  <span>${creditsUsed.toFixed(2)} / ${creditsLimit} (${creditsPercent.toFixed(1)}%)</span>
              </div>
              <div class="storage-track">
                  <div class="storage-fill" style="width: ${creditsPercent}%;"></div>
              </div>
          </div>

          ${tableOrEmpty}

          <div class="table-footer">
             <a href="/" class="btn-secondary">← Back to upload</a>
             <span>Showing ${allFiles.length} files</span>
          </div>
        </div>
        <div class="sprockets bottom"></div>
      </div>
    `, true));
  } catch (error) {
    console.error(error);
    res.send("Admin Error: " + error.message);
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "That file is too large. The max size is 500MB."
      : "Upload failed. Please try again.";
    return res.status(400).send(errorPage(message));
  }

  if (err && err.message === "UNSUPPORTED_FILE_TYPE") {
    return res.status(400).send(errorPage("That file type isn't supported. Please upload a video or a photo."));
  }

  console.error(err);
  res.status(500).send(errorPage("Something unexpected happened on our end. Please try again."));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
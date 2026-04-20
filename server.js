require('dotenv').config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();
app.use(cors());

cloudinary.config({
  cloud_name: process.env.CLOUDY_NAME,
  api_key: process.env.CLOUDY_KEY,
  api_secret: process.env.CLOUDY_SECRET 
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "video_delivery_app",
    resource_type: "video",
    allowed_formats: ["mp4", "mov", "avi"],
  },
});

const upload = multer({ storage: storage });

// SHARED CSS STYLES (To keep code clean)
const UI_STYLE = `
<style>
    :root { --primary: #6366f1; --bg: #0f172a; --card: #1e293b; --text: #f8fafc; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: var(--card); padding: 2rem; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); width: 100%; max-width: 450px; text-align: center; border: 1px solid #334155; }
    h1 { margin-bottom: 1.5rem; font-size: 1.5rem; letter-spacing: -0.025em; }
    input[type="file"] { background: #0f172a; border: 2px dashed #334155; padding: 20px; width: 100%; border-radius: 8px; margin-bottom: 1rem; color: #94a3b8; box-sizing: border-box; }
    button { background: var(--primary); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; width: 100%; }
    button:hover { background: #4f46e5; transform: translateY(-1px); }
    input[type="text"] { width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #818cf8; font-family: monospace; margin: 1rem 0; box-sizing: border-box; }
    .btn-secondary { display: inline-block; margin-top: 1rem; color: #94a3b8; text-decoration: none; font-size: 0.875rem; }
    .btn-secondary:hover { color: white; }
    video { border-radius: 12px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
</style>
`;

// 1. HOME / UPLOAD PAGE
app.get("/", (req, res) => {
  res.send(`
    ${UI_STYLE}
    <div class="card">
      <h1>🚀 Video Delivery</h1>
      <p style="color:#94a3b8; margin-bottom: 2rem;">Upload your MP4 to get a professional link.</p>
      <form action="/upload" method="POST" enctype="multipart/form-data">
        <input type="file" name="video" accept="video/*" required />
        <button type="submit">Upload Now</button>
      </form>
      <a href="/admin" class="btn-secondary">Manage Cloud Storage</a>
    </div>
  `);
});

// 2. UPLOAD ACTION
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");

  const publicId = req.file.filename.split("/")[1]; 
  const host = req.get('host');
  const prettyLink = `https://${host}/video/${publicId}`;

  res.send(`
    ${UI_STYLE}
    <div class="card">
      <h1 style="color: #22c55e;">Ready to Share! ✅</h1>
      <p style="color:#94a3b8;">Copy this professional link for your client:</p>
      <input type="text" value="${prettyLink}" readonly id="linkInput">
      <button onclick="copyLink()">Copy Link</button>
      <br>
      <a href="/video/${publicId}" class="btn-secondary">Preview Page</a> | 
      <a href="/" class="btn-secondary">Upload Another</a>
    </div>
    <script>
      function copyLink() {
        const input = document.getElementById('linkInput');
        input.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
      }
    </script>
  `);
});

// 3. THE "PRETTY" VIDEO PLAYER PAGE
app.get("/video/:videoId", (req, res) => {
    const videoId = req.params.videoId;
    const cloudName = process.env.CLOUDY_NAME;
    const permanentUrl = `https://res.cloudinary.com/${cloudName}/video/upload/video_delivery_app/${videoId}.mp4`;

    res.send(`
        ${UI_STYLE}
        <div style="width: 90%; max-width: 1000px;">
            <video controls autoplay>
                <source src="${permanentUrl}" type="video/mp4">
            </video>
            <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin:0;">Video Preview</h3>
                <a href="${permanentUrl}" download style="color:var(--primary); text-decoration:none; font-weight:bold;">Download Original</a>
            </div>
        </div>
    `);
});

// 4. ADMIN DASHBOARD
app.get("/admin", async (req, res) => {
  try {
    // 1. Fetch all videos
    const result = await cloudinary.api.resources({
      resource_type: "video",
      type: "upload",
      prefix: "video_delivery_app/",
    });

    // 2. Fetch your actual storage usage
    const usage = await cloudinary.api.usage();
    
    // Cloudinary gives usage in bytes, let's convert to MB for humans
    const usedMB = (usage.storage.usage / (1024 * 1024)).toFixed(2);
    const limitMB = (usage.storage.limit / (1024 * 1024)).toFixed(2);
    const percent = usage.storage.used_percent.toFixed(1);

    let rows = result.resources.map(file => `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding:15px; font-size: 0.8rem; color: #94a3b8;">${file.public_id}</td>
          <td style="padding:15px; text-align:right;">
            <a href="/video/${file.public_id.split('/')[1]}" style="color: #6366f1; text-decoration:none;">View</a>
          </td>
        </tr>
    `).join('');

    res.send(`
      ${UI_STYLE}
      <div class="card" style="max-width: 700px;">
        <h1>Cloud Management</h1>
        
        <div style="background: #0f172a; padding: 20px; border-radius: 12px; margin-bottom: 30px; text-align: left; border: 1px solid #334155;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-size: 0.8rem; color: #94a3b8;">Storage Used</span>
                <span style="font-size: 0.8rem; font-weight: bold;">${usedMB} MB / ${limitMB} MB</span>
            </div>
            <div style="width: 100%; height: 8px; background: #334155; border-radius: 4px; overflow: hidden;">
                <div style="width: ${percent}%; height: 100%; background: var(--primary); transition: 0.5s;"></div>
            </div>
            <p style="font-size: 0.7rem; color: #64748b; margin-top: 8px;">You are using ${percent}% of your free Cloudinary credits.</p>
        </div>

        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="color: #64748b; font-size: 0.75rem; text-transform: uppercase;">
              <th style="padding:10px;">Public ID</th>
              <th style="padding:10px; text-align:right;">Link</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <br><a href="/" class="btn-secondary">← Back to Dashboard</a>
      </div>
    `);
  } catch (error) {
    res.send("Admin Error: " + error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
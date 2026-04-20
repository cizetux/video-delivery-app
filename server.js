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

app.get("/", (req, res) => {
  res.send(`
    <body style="font-family:sans-serif; text-align:center; padding-top:50px; background:#111; color:white;">
      <h1>Video Uploader</h1>
      <form action="/upload" method="POST" enctype="multipart/form-data">
        <input type="file" name="video" accept="video/*" required />
        <br><br>
        <button type="submit" style="padding:10px 20px; cursor:pointer;">Upload to Cloud</button>
      </form>
    </body>
  `);
});


app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const videoUrl = req.file.path;
  
  const videoId = req.file.filename.split("/")[1]; 

  res.send(`
    <body style="font-family: sans-serif; text-align:center; padding-top:50px; background:#111; color:white;">
      <h1 style="color: #4CAF50;">Permanent Upload Successful! ✅</h1>
      <p>Share this link with your client:</p>
      <input type="text" value="${videoUrl}" readonly style="width:80%; padding:10px; border-radius:5px; border:none;">
      <br><br>
      <a href="${videoUrl}" target="_blank" style="color:lightblue;">Open Video Directly</a>
      <br><br>
      <a href="/" style="color:gray;">Upload another video</a>
    </body>
  `);
});

app.get("/admin", async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      resource_type: "video",
      type: "upload",
      prefix: "video_delivery_app/",
    });

    let html = `
      <body style="font-family:sans-serif; background:#111; color:white; padding:40px;">
        <h1>Cloud Management Dashboard</h1>
        <table border="1" style="width:100%; border-collapse:collapse; text-align:left;">
          <tr style="background:#333;">
            <th style="padding:10px;">Cloud Filename</th>
            <th style="padding:10px;">Action</th>
          </tr>
    `;

    result.resources.forEach((file) => {
      html += `
        <tr>
          <td style="padding:10px;">${file.public_id}</td>
          <td style="padding:10px;">
            <a href="${file.secure_url}" target="_blank" style="color:lightblue;">View Video</a>
          </td>
        </tr>
      `;
    });

    html += `</table><br><a href="/" style="color:gray;">← Back to Upload</a></body>`;
    res.send(html);
  } catch (error) {
    res.send("Error loading admin panel: " + error.message);
  }
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
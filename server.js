const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const app = express();

app.use(cors());
app.use(express.static("uploads"));

app.get("/", (req, res) => {
  res.send(`
    <h1>Video Uploader</h1>
    <form action="/upload" method="POST" enctype="multipart/form-data">
      <input type="file" name="video" accept="video/*" />
      <button type="submit">Upload Now</button>
    </form>
  `);
});

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const id = randomUUID(); // random name of video
    const ext = path.extname(file.originalname); // get file ext
    const filename = id + ext;

    req.fileId = filename; // save id
    cb(null, filename);
  },
});

const upload = multer({ storage });

let db = {};

// upload
app.post("/upload", upload.single("video"), (req, res) => {
  const id = req.fileId;

  db[id] = {
    file: id,
    createdAt: Date.now(),
  };

  const videoUrl = `https://video-delivery-app.onrender.com/video/${id}`;
  
  res.send(`
    <body style="font-family: sans-serif; text-align:center; padding-top:50px; background:#111; color:white;">
      <h1 style="color: #4CAF50;">Upload Successful! ✅</h1>
      <p>Share this link with your client:</p>
      <input type="text" value="${videoUrl}" readonly style="width:400px; padding:10px; border-radius:5px; border:none;">
      <br><br>
      <a href="${videoUrl}" style="color:lightblue;">Preview the Video Page</a>
      <br><br>
      <a href="/" style="color:gray;">Upload another video</a>
    </body>
  `);
});

// video
app.get("/video/:id", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.id);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Video not found");
  }

  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align:center; background:#111; color:white;">
        <h1>Your Video</h1>

        <video width="800" controls style="border-radius:12px;">
          <source src="/${req.params.id}" type="video/mp4" />
        </video>

        <br><br>

        <a href="/${req.params.id}" download style="color:lightblue;">
          Download Video
        </a>
      </body>
    </html>
  `);
});

// STARTING SERVER
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
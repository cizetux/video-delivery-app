# CODE EXPLANATION - Video Uploader Express App

## Package Imports

```js
const express = require("express");
```
Imports Express, the web framework used to create the server and define routes.

```js
const multer = require("multer");
```
Imports Multer, a middleware for handling file uploads (multipart/form-data).

```js
const cors = require("cors");
```
Imports CORS middleware, which allows requests from different origins (e.g. a frontend on a different domain).

```js
const fs = require("fs");
```
Imports Node's built-in File System module — used to check if files exist and read directories.

```js
const path = require("path");
```
Imports Node's built-in Path module — used to safely build file paths across operating systems.

```js
const { randomUUID } = require("crypto");
```
Imports the `randomUUID` function from Node's built-in crypto module — used to generate unique IDs for uploaded files.

---

## App Setup

```js
const app = express();
```
Creates the Express application instance.

```js
app.use(cors());
```
Enables CORS for all routes — any domain can make requests to this server.

```js
app.use(express.static("uploads"));
```
Serves files in the `uploads/` folder as static assets. This is how videos get streamed directly via `/<filename>`.

---

## Home Route (`GET /`)

```js
app.get("/", (req, res) => {
  res.send(`...`);
});
```
Returns a basic HTML page with a file upload form that POSTs to `/upload`.

---

## Multer Storage Configuration

```js
destination: "uploads/"
```
Tells Multer to save uploaded files into the `uploads/` folder.

```js
const id = randomUUID();
```
Generates a random UUID as the new filename (avoids collisions and hides original names).

```js
const ext = path.extname(file.originalname);
```
Extracts the file extension from the original filename (e.g. `.mp4`).

```js
const filename = id + ext;
```
Combines UUID + extension to form the final stored filename (e.g. `abc-123.mp4`).

```js
req.fileId = filename;
```
Attaches the filename to the request object so the upload route handler can access it later.

```js
cb(null, filename);
```
Calls the callback with `null` (no error) and the filename — this is how Multer receives the name to use.

---

## Upload Middleware & In-Memory DB

```js
const upload = multer({ storage });
```
Creates the Multer upload instance using the custom storage config above.

```js
let db = {};
```
A simple in-memory object used as a makeshift database to track uploaded files. **This resets every time the server restarts.**

---

## Upload Route (`POST /upload`)

```js
app.post("/upload", upload.single("video"), (req, res) => { ... });
```
Defines the upload route. `upload.single("video")` is middleware that processes a single file from the form field named `"video"`.

```js
const id = req.fileId;
```
Retrieves the filename that was saved onto `req` during the Multer `filename` callback.

```js
db[id] = { file: id, createdAt: Date.now() };
```
Stores a record of the upload in the in-memory db with a timestamp.

```js
const videoUrl = `https://video-delivery-app.onrender.com/video/${id}`;
```
Constructs the shareable URL for the uploaded video. Note: this URL is **hardcoded** to the production domain.

```js
res.send(`...`);
```
Returns an HTML success page showing the shareable link and a preview link.

---

## Video Page Route (`GET /video/:id`)

```js
const filePath = path.join(__dirname, "uploads", req.params.id);
```
Builds the absolute path to the requested video file using the `:id` URL parameter.

```js
if (!fs.existsSync(filePath)) {
  return res.status(404).send("Video not found");
}
```
Checks if the file actually exists on disk — returns a 404 if not.

```js
<source src="/${req.params.id}" type="video/mp4" />
```
Returns an HTML page with a `<video>` player. The `src` points to `/<filename>`, which is served by the `express.static("uploads")` middleware set up earlier.

---

## Admin Dashboard (`GET /admin`)

```js
const uploadsDir = path.join(__dirname, 'uploads');
fs.readdir(uploadsDir, (err, files) => { ... });
```
Reads all filenames currently stored in the `uploads/` directory.

```js
const videoUrl = `${req.protocol}://${req.get('host')}/video/${file}`;
```
For each file, builds a dynamic URL using the current request's protocol and host (works on both localhost and production).

```js
<button onclick="navigator.clipboard.writeText('${videoUrl}')">Copy Link</button>
```
Adds a "Copy Link" button for each video that uses the browser clipboard API.

---

## Starting the Server

```js
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```
Starts the HTTP server on port 3000 and logs a confirmation message to the console.

---

> **Note:** The `db` object is populated on upload but never actually read anywhere — the admin page reads directly from the filesystem instead. So `db` is currently unused beyond being written to.

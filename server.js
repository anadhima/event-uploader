require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fetch = require('node-fetch');
const { Dropbox } = require('dropbox');

const app = express();
const upload = multer({ dest: "temp_uploads/" });

// 150MB chunk size for videos
const CHUNK_SIZE = 150 * 1024 * 1024;

/* ---------------------------------------------------
   REFRESH TOKEN → SHORT-LIVED ACCESS TOKEN FUNCTION
--------------------------------------------------- */
async function getDropboxClient() {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", process.env.DROPBOX_REFRESH_TOKEN);
  params.append("client_id", process.env.DROPBOX_APP_KEY);
  params.append("client_secret", process.env.DROPBOX_APP_SECRET);

  const tokenRes = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const tokenJson = await tokenRes.json();

  if (!tokenJson.access_token) {
    console.error("Failed to refresh access token:", tokenJson);
    throw new Error("Dropbox authentication failed");
  }

  return new Dropbox({ accessToken: tokenJson.access_token, fetch });
}

/* ---------------------------------------------------
   FILE CHUNK GENERATOR FOR LARGE FILES
--------------------------------------------------- */
async function* streamChunks(filePath, chunkSize) {
  const stream = fs.createReadStream(filePath);
  let buffer = Buffer.alloc(0);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= chunkSize) {
      yield buffer.slice(0, chunkSize);
      buffer = buffer.slice(chunkSize);
    }
  }

  if (buffer.length > 0) yield buffer;
}

/* ---------------------------------------------------
   UPLOAD LARGE / SMALL FILES TO DROPBOX
--------------------------------------------------- */
async function uploadToDropbox(localPath, dropboxPath) {
  const stats = fs.statSync(localPath);
  const size = stats.size;
  const dbx = await getDropboxClient();

  // Small files (<150MB)
  if (size <= CHUNK_SIZE) {
    const contents = fs.readFileSync(localPath);
    return dbx.filesUpload({
      path: dropboxPath,
      contents,
      mode: { '.tag': 'add' },
    });
  }

  // Chunked upload for larger videos
  let sessionId = null;
  let offset = 0;

  for await (const chunk of streamChunks(localPath, CHUNK_SIZE)) {
    if (!sessionId) {
      const start = await dbx.filesUploadSessionStart({
        close: false,
        contents: chunk,
      });

      sessionId = start.session_id;
    } else if (offset + chunk.length < size) {
      await dbx.filesUploadSessionAppendV2({
        cursor: { session_id: sessionId, offset },
        close: false,
        contents: chunk,
      });
    } else {
      return dbx.filesUploadSessionFinish({
        cursor: { session_id: sessionId, offset },
        commit: {
          path: dropboxPath,
          mode: { '.tag': 'add' },
          autorename: true,
        },
        contents: chunk,
      });
    }

    offset += chunk.length;
  }
}

/* ---------------------------------------------------
   UPLOAD ENDPOINT
--------------------------------------------------- */
app.post("/upload", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ ok: false, error: "No file provided" });

    const timestamp = Date.now();
    const safeName = req.file.originalname.replace(/\s+/g, "_");
    const dropboxPath = `/Maria's Birthday/Maria_Birthday/Uploads/${timestamp}_${safeName}`;



    await uploadToDropbox(req.file.path, dropboxPath);

    // clean temp file
    fs.unlinkSync(req.file.path);

    res.json({ ok: true });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      ok: false,
      error: String(err),
    });
  }
});

/* ---------------------------------------------------
   LIST FILES IN GALLERY
--------------------------------------------------- */
app.get("/list", async (req, res) => {
  try {
    // MUST get a fresh authenticated client
    const dbx = await getDropboxClient();

    // Your Dropbox folder path
    const folder = "/Maria's Birthday/Maria_Birthday/Uploads";

    const listRes = await dbx.filesListFolder({
      path: folder,
      recursive: false,
    });

    // Normalize results (SDK v10 vs v11)
    const entries =
      (listRes.result && listRes.result.entries) ||
      listRes.entries ||
      [];

    const items = entries.filter((e) => e[".tag"] === "file");

    res.json({ ok: true, items });
  } catch (err) {
    console.error("LIST ERROR:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});


/* ---------------------------------------------------
   GET TEMPORARY LINK FOR DOWNLOAD
--------------------------------------------------- */
app.get("/temp-link", async (req, res) => {
  try {
    const path = req.query.path;
    if (!path) return res.status(400).json({ ok: false, error: "Missing path" });

    const dbx = await getDropboxClient();
    const linkResp = await dbx.filesGetTemporaryLink({ path });

    res.json({ ok: true, link: linkResp.link });
  } catch (err) {
    console.error("TEMP LINK ERROR:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/* ---------------------------------------------------
   STATIC FRONT-END
--------------------------------------------------- */
app.use(express.static("public"));

/* ---------------------------------------------------
   SERVER START
--------------------------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});


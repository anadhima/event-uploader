require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const fs = require('fs');
const { Dropbox } = require('dropbox');
const fetch = require('node-fetch');

const app = express();
const upload = multer({ dest: 'temp_uploads/' });

// ---- DROPBOX AUTH USING REFRESH TOKEN ----
async function getDropboxClient() {
  // Step 1: refresh the short-lived access token using OAuth2
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", process.env.DROPBOX_REFRESH_TOKEN);
  params.append("client_id", process.env.DROPBOX_APP_KEY);
  params.append("client_secret", process.env.DROPBOX_APP_SECRET);

  const tokenRes = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const tokenJson = await tokenRes.json();

  if (!tokenJson.access_token) {
    console.error("Failed to refresh token:", tokenJson);
    throw new Error("Dropbox authentication failed");
  }

  // Step 2: return a Dropbox client with a fresh access token
  return new Dropbox({ accessToken: tokenJson.access_token, fetch });
}



const CHUNK_SIZE = 150 * 1024 * 1024; // 150MB

async function* fileStreamToChunks(filePath, chunkSize) {
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

async function uploadLargeFile(localPath, dropboxPath) {
  const stats = fs.statSync(localPath);
  const size = stats.size;

  if (size <= CHUNK_SIZE) {
    const contents = fs.readFileSync(localPath);
    return dbx.filesUpload({ path: dropboxPath, contents, mode: {'.tag':'add'} });
  }

  let sessionId = null;
  let offset = 0;

  for await (const chunk of fileStreamToChunks(localPath, CHUNK_SIZE)) {
    if (!sessionId) {
      const startRes = await dbx.filesUploadSessionStart({ close: false, contents: chunk });
      sessionId = startRes.result ? startRes.result.session_id : startRes.session_id;
    } else if ((offset + chunk.length) < size) {
      await dbx.filesUploadSessionAppendV2({
        cursor: { session_id: sessionId, offset },
        close: false,
        contents: chunk
      });
    } else {
      const finishRes = await dbx.filesUploadSessionFinish({
        cursor: { session_id: sessionId, offset },
        commit: { path: dropboxPath, mode: {'.tag':'add'}, autorename: true },
        contents: chunk
      });
      return finishRes;
    }
    offset += chunk.length;
  }
}

// Upload endpoint
app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok:false, error:'No file' });

    const ts = Date.now();
    const safeName = req.file.originalname.replace(/\s+/g, '_');
    const destPath = `/Maria_Birthday/Uploads/${ts}_${safeName}`;

    await uploadLargeFile(req.file.path, destPath);
    fs.unlinkSync(req.file.path);

    res.json({ ok:true });
  } catch (err) {
    console.error(err);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ ok:false, error:String(err) });
  }
});

// List uploaded files
app.get('/list', async (req, res) => {
  try {
    const folderPath = '/Maria_Birthday/Uploads';
    const listRes = await dbx.filesListFolder({ path: folderPath, recursive: false });
    const entries = listRes.result ? listRes.result.entries : listRes.entries;
    const items = (entries || []).filter(e => e['.tag'] === 'file');
    res.json({ ok:true, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error:String(err) });
  }
});

// Get temporary link for individual download / preview
app.get('/temp-link', async (req, res) => {
  try {
    const p = req.query.path;
    if (!p) return res.status(400).json({ ok:false, error:'Missing path' });
    const tmp = await dbx.filesGetTemporaryLink({ path: p });
    const link = tmp.result ? tmp.result.link : tmp.link;
    res.json({ ok:true, link });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error:String(err) });
  }
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});

# Maria's Birthday Uploader

Simple Node.js + Dropbox app so guests can:
- Upload photos/videos
- View all uploads in a gallery
- Tap to select multiple photos
- Use **Download Selected** to open all selected photos in new tabs (no ZIP)

## Setup

1. Copy `.env.example` to `.env` and set `DROPBOX_TOKEN` with your Dropbox app token.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Run locally:

   ```bash
   npm start
   ```

4. Deploy to Render:
   - Push this repo to GitHub.
   - Create a Render Web Service pointing at the repo.
   - Set `DROPBOX_TOKEN` in Render's Environment tab.

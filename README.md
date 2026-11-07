# Wired Glass

A pane of pebbled wired glass in Three.js, with blurred foliage (or your own image) behind it.

- **Drag** the glass to tilt it in 3D. The picture behind it tilts with it, and the pane is sized so you never see its edge. Double-click or press **R** to straighten it. Arrow keys tilt too.
- **Move** the pointer to move the light across the pane.
- **Use my image**, drag a file onto the page, or paste an image to put your own picture behind the glass.
- **Depth** sets how far behind the glass the picture is. Further away, it falls out of focus like a camera lens, shrinks a little, and slides against the glass when you tilt it. This works on your own images too.
- **Lofi + rain player** (top right): four original tracks, generated live in the browser with Web Audio, so there are no audio files or music licences. Its rain sound follows the **Rain** switch and **Rain speed**.
- **Rain** turns raindrops on the glass on or off, and **Rain speed** sets how fast they run down. Drops clear the frost where they sit and leave clear trails.
- **Frost** changes how milky the glass is. **Wire** shows or hides the mesh. **Sway** turns the gentle movement behind the glass on or off.

## Run it locally

It's a static site with no build step. The browser loads Three.js from jsDelivr.

Because `main.js` is an ES module, open it through a local server, not by double-clicking `index.html`:

- In VS Code, install the **Live Server** extension, then right-click `index.html` → **Open with Live Server**, or
- From a terminal in this folder: `npx serve .` and open the address it prints.

## Put it online

In the GitHub repo, go to **Settings → Pages**, set the source to the `main` branch and `/ (root)`, and save. The site appears at `https://<your-username>.github.io/wired-glass/` after a minute or so.

## Files

- `index.html`: page and controls
- `style.css`: layout and controls styling
- `main.js`: scene, glass shader, depth of field, tilt, light and image upload
- `audio.js`: the lofi + rain player

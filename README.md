# Wired Glass

**Open it here: [wired-glass.vercel.app](https://wired-glass.vercel.app)**

Wired Glass is a calm, interactive window you can play with in your web browser. You look through a pane of bumpy, frosted glass with a wire grid inside it, rain running down the front and a garden behind it. A lofi music player in the corner plays gentle background music with the sound of rain.

There's nothing to download, install or sign up for. It works on computers, tablets and phones.

---

## Getting started

1. Open **[wired-glass.vercel.app](https://wired-glass.vercel.app)**.
2. Move your mouse (or finger) around the screen. The light follows you across the glass.
3. Click and drag on the glass to tilt it.
4. Press the **▶ play** button at the top right to start the music.
5. Try a different scene from the **Garden** menu at the bottom.

That's all you need. Everything else is extra.

---

## What everything does

### On the glass

| What you do | What happens |
|---|---|
| **Move** your mouse or finger | A soft light follows you and glints off the bumps in the glass. Stop moving and the light drifts by itself. |
| **Click and drag** (or touch and drag) | The glass tilts in 3D, and the scene behind it tilts with it. |
| **Double-click** | The glass straightens back up. |
| **Arrow keys** | Tilt the glass with the keyboard. Press **R** to straighten it. Click the glass once first so it hears the keys. |

### The control bar (bottom of the screen)

| Control | What it does |
|---|---|
| **Depth** | How far away the scene behind the glass is. Slide it right and the scene moves further back: blurrier, slightly smaller and hazier, like a camera focusing on the glass. Slide it left to bring the scene up close and sharp. |
| **Frost** | How cloudy the glass is. Left is clearer, right is frostier. |
| **Wire** | Shows or hides the wire grid inside the glass. |
| **Sway** | Makes the scene behind the glass move gently, like plants in a breeze. Untick it for a still scene. |
| **Rain** | Turns the raindrops on the glass on or off. It also turns the rain sound on or off. |
| **Rain speed** | How fast the drops run down and how heavy the rain sounds. Greyed out while Rain is off. |
| **Garden** | Picks the scene behind the glass (see the list below). |
| **Use my image** | Puts your own photo behind the glass. |
| **New garden** | Repaints the current garden with a fresh arrangement. Press it as often as you like. |
| **Reset tilt** | Straightens the glass. |

### The music player (top right)

| Button | What it does |
|---|---|
| **▶ / ❚❚** | Plays or pauses the music. Browsers only allow sound after you click something, so the music won't start on its own. |
| **⏭** | Skips to the next track. |
| **Volume slider** | Makes the music quieter or louder. |

There are four tracks: *Wire & Window*, *Pebbled Light*, *Drizzle at 4pm* and *Last Bus, Wet Street*. They play one after another and loop back to the start. The music is created live in your browser by the website's own code, so it was never recorded, there are no music files, and it plays a little differently each time.

---

## The gardens

Choose one from the **Garden** menu, then press **New garden** to rearrange it.

| Garden | What you'll see |
|---|---|
| **Leafy hedge** | Deep green leaves pressed against the glass (the original scene). |
| **Rose garden** | Red, pink, white and coral roses in dark foliage. |
| **Tulip field** | Rows of bright tulips (red, yellow, pink, orange, purple and white) under a blue sky. |
| **Lavender rows** | Purple lavender planted in long rows under a lilac sky. |
| **Sunflowers** | Big yellow sunflowers against a summer sky. |
| **Cherry blossom** | Dark branches covered in soft pink blossom. |
| **Wildflower meadow** | A mix of daisies, red poppies, blue cornflowers and buttercups. |

Each garden is drawn in three layers (far, middle and near), so moving the **Depth** slider and tilting the glass give a real sense of distance.

---

## Using your own photo

You can put any picture behind the glass: a city at night, a beach, a friend's portrait, your own artwork.

- **Click "Use my image"** and choose a photo, **or**
- **Drag a photo** from your computer onto the page, **or**
- **Copy an image** and **paste** it onto the page (Cmd+V on Mac, Ctrl+V on Windows).

JPG, PNG and WebP all work. Very large photos are shrunk automatically so everything stays smooth. **Your photo never leaves your device.** It isn't uploaded anywhere, and it's gone when you close or refresh the page.

**Tip:** photos with lights in them, such as street lamps, city windows or fairy lights, look especially good behind frosted glass with **Depth** turned up.

To go back to the gardens, choose one from the **Garden** menu or press **New garden**.

---

## Tips for a nice scene

- **Rainy night in the city:** use your own night-time street photo, set Depth high, Frost about halfway, Rain on and Rain speed low, then press play.
- **Spring morning:** choose Cherry blossom, turn Frost down, turn Rain off and leave Sway on.
- **Heavy storm:** choose Leafy hedge and push Rain speed and Frost all the way up.
- **Clear view:** turn Frost all the way down and untick Wire.

---

## If something isn't working

| Problem | Try this |
|---|---|
| **No sound** | Press the ▶ button in the top right. Check the player's volume slider and your device volume. On a phone, make sure silent mode is off. |
| **The page is blank or just dark** | Your browser may have 3D graphics (WebGL) turned off, or it may be very old. Try the latest Chrome, Safari, Edge or Firefox. |
| **It feels slow or jerky** | Close other tabs, untick Sway, or turn Rain off. Older phones and laptops may struggle with the effects. |
| **My photo didn't appear** | Make sure it's a JPG, PNG or WebP image. Some formats, such as HEIC photos from iPhones, may not open in every browser. Take a screenshot of the photo and use that instead. |
| **I tilted it too far** | Double-click the glass or press **Reset tilt**. |
| **I changed lots of settings and want to start over** | Refresh the page. Every setting goes back to normal. |

---

## For developers

Everything below is only needed if you want to change the code.

### What it's made with

- [Three.js](https://threejs.org) for the 3D glass, using a custom shader for the pebbled surface, wire mesh, rain, light and depth of field.
- The Web Audio API for the generated lofi music and rain sound.
- Plain HTML, CSS and JavaScript, with no build step and no frameworks.

### Files

| File | What's in it |
|---|---|
| `index.html` | The page and its controls |
| `style.css` | How the controls look |
| `main.js` | The glass, tilt, light, rain, depth of field and photo upload |
| `garden.js` | The seven gardens, all drawn with code |
| `audio.js` | The lofi music and rain sound |

### Running it on your own computer

The page uses JavaScript modules, so double-clicking `index.html` won't work. It has to be opened through a small local web server:

- **In VS Code:** install the **Live Server** extension, then right-click `index.html` and choose **Open with Live Server**.
- **From a terminal in this folder:** run `python3 -m http.server 8000` and open http://localhost:8000.

### Publishing changes

The site is hosted on [Vercel](https://vercel.com) and is also available on GitHub Pages at [erbdoulsamerd.github.io/wired-glass](https://erbdoulsamerd.github.io/wired-glass/). Both are connected to this repository, so any change committed to the `main` branch goes live automatically within a minute or two. You can even edit files directly on github.com: open a file, click the pencil icon, make your change and click **Commit changes**.

### Credits

The rain-on-glass drops are inspired by Martijn Steinrucken's "Heartfelt" shader. The original idea comes from a wired-glass effect shared by the Three.js community.

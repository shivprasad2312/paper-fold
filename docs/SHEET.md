# The reference sheet, room by room

135 of the game's levels are not designed here. They are **copied** from a single document,
`glass and water levels seperated.pdf`: fifteen pages of nine rooms each, 135 cells, drawn as coloured
shapes on a white page with a thin black rule between cells.

The rule for the copy is simple and strict: **the sheet is the specification.** A room contains what
its cell contains, at the size and angle the cell draws it, in the colour the cell paints it. Nothing
is moved to make a room easier, nothing is stretched to fit, and nothing is added. The only thing the
copy does not take from the sheet is *water*: the taps are the game's taps, and water comes out of
them, as it does in every other room.

---

## What the colours mean

The sheet's palette is small, and each colour is a verb:

| On the sheet | In the game | Meaning |
| --- | --- | --- |
| grey `#C7D0D9` | scenery | a solid. Ledges, blocks, shelves, wedges, balls, diamonds. |
| black `#000000` | scenery | a solid as well, drawn in ink black so it reads as a wall. |
| orange `#FF904D` | a **falling** piece | a loose object: it drops under gravity and can be knocked about. |
| red `#FF3131` | a **hot** surface | water that touches it evaporates. |
| pink `#FFC2C2` | a **no-draw** sheet | the player may not draw inside it. |
| the pale arrow glyph | a **tap** | water pours from the arrow's tail, in the arrow's direction. |
| the pale-blue cup | a **glass** | the thing that has to be filled. |

Cups are placed pictures in the PDF rather than drawn paths, so they are read from the document's
image list. Everything else is traced from the page's own ink.

---

## How the copy is measured

* The sheet is a portrait page, 595.5 × 842.25 pt. Its cells are 196–201 pt wide and 192–195 pt tall;
  they are not perfectly regular (a column edge moves a little between pages), so **each cell is
  fitted on its own**.
* **One cell is one screen.** A cell is scaled uniformly until it fits the area a room may use, and
  centred. Aspect ratio is never changed: nothing on the sheet is stretched, and the relative
  positions of two shapes in a cell are exactly the sheet's.
* The area a room may use starts at **y = 170**, because the game's own wooden bar and progress strip
  hang over the top of the screen, and the authored rooms keep every tap below that line too. The
  band runs to the bottom of the 1280 × 720 screen, so the scale is `min(1280 / cellWidth,
  550 / cellHeight)`.
* Shapes are drawn at their own centre and angle, so a shelf that the sheet draws tilted is tilted in
  the game by the same number of degrees.

Nothing here is a "close enough" redraw. Every solid enters the physics world through its own
outline, and the renderer draws that outline as a flat fill — no bevels, no shadows, no wood grain.
The only objects that keep the game's own art are the things the sheet does not draw: the tap housing
and the glass, both of which the game draws the way it draws them in the authored rooms.

---

## How it was extracted, and how it is checked

The pipeline lives outside the repository (it needs PyMuPDF and OpenCV to read the PDF). It works in
three steps:

1. **Find the grid.** The page's rules are vector strokes, so the three column edges and three row
   edges are read straight from them. Each cell is the rectangle between them.
2. **Trace the ink.** The page is rendered at 5× and each colour family is isolated as a mask. Every
   blob is classified:
   * round and uniform → a **circle**, placed by its centre and radius;
   * a nearly filled oriented box → a **bar**, placed by its centre, size and angle;
   * anything else → its **outline**, simplified to the fewest vertices that still explain the ink
     (a diamond stays four points; a dome keeps as many as its curve needs).
3. **Recognise the taps.** A tap is an arrow, and the arrow is recognised from the polygon itself: a
   single tip vertex, a tail edge about half the glyph's width, centred on the tip, and a silhouette
   that matches the sheet's arrow. That test works on every arrow size on the sheet — from a 12.8 pt
   arrow to a 35 pt one — and it does not fire on round shapes.

Two checks run over the result:

* **Every shape is drawn in its own colour, in its own place.** Each shape's outline is painted into a
  mask in the room's frame and compared with the rendered room's mask of the same colour. 423 of 487
  shapes match at ≥ 72 % coverage; the remainder are hairlines a few pixels thick, where a 1 px
  offset costs most of the mask. Arrow glyphs are excluded, because the tap housing draws those.
* **Every room renders.** All 175 levels (40 authored + 135 copied) are built and drawn in one pass,
  headless: `node tools/loadtest.js`-style sweep, no exceptions. `npm run verify` still passes 40/40
  for the authored rooms.

---

## Rooms the sheet cannot water

The copy does not add anything, so a cell without a tap stays a cell without a tap. Eight of them
have no arrow at all:

| Room | What the cell contains |
| --- | --- |
| 8 | a cup on a shelf and three loose diamonds — no tap |
| 10 | a cup and scenery — no tap |
| 74 | two cups, a hot bar, two hot balls — no tap |
| 86, 87, 89 | **empty cells**: the sheet draws nothing at all in these three |
| 88, 90 | a cup and a shelf — no tap |

They are playable (they load, they draw, they do not crash) but they cannot be won: there is no water
to fill the cup with. They are reported here rather than quietly given a tap, because a tap would be
a change to the sheet.

Everything else — 130 taps across 127 rooms, three rooms with two taps — is watered normally.

---

## What the rooms contain

| | Count |
| --- | --- |
| rooms | 135 |
| taps | 130 (3 rooms have two) |
| glasses | 145 (13 rooms have two) |
| solids | 343 |
| falling pieces | 99 (70 rooms) |
| hot surfaces | 13 (10 rooms) |
| no-draw sheets | 32 (27 rooms) |

Nothing new moves on its own. Orange pieces fall; hot surfaces evaporate; pink sheets refuse ink.
Those are the whole of the added dynamics, and they are the sheet's own three colours.

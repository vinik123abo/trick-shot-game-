# plan.json reference

Word indices refer to `words.json` / the `[first-last]` ranges in `transcript.txt`.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `keep` | list of `[first, last]` | required | Word ranges to keep, **in playback order**. Put the hook's range first to move it to the front. Ranges may come from anywhere in the video; don't repeat words. |
| `max_gap` | seconds | 0.35 | Pauses longer than this inside a kept range are cut out (jump cut). 0.25 = very punchy, 0.5 = more relaxed. |
| `hook_text` | string | none | Title shown at the top at the start (also on `cover.jpg`). No emoji. |
| `hook_seconds` | seconds | 3 | How long the title stays. |
| `hook_persistent` | bool | false | Keep the title for the whole video (good for list/tips videos). |
| `emphasis` | list of word indices | [] | Words drawn in the emphasis colour. |
| `zoom` | list of word indices | [] | A punch-in zoom starts on each of these words and lasts until the next cut. |
| `cta_text` | string | none | Box shown for the last 2.2 seconds. |
| `word_fixes` | {index: "text"} | {} | Correct transcription errors. The fix replaces that word on screen; "" hides a word (use it to merge a split word into its neighbour). |
| `fit` | "crop" / "blur" | "crop" | How non-vertical footage becomes 9:16. |
| `style` | object | {} | Visual options below. Defaults also come from `assets/brand/brand.json` (`{"style": {...}}`); the plan's values override the brand's. |

## style options

| Key | Default | Notes |
|---|---|---|
| `text_color` | `#FFFFFF` | Caption words |
| `highlight_color` | `#FFD400` | The word being spoken right now |
| `emphasis_color` | `#FF3B3B` | `emphasis` words |
| `caption_size` | 120 | Caption font size (ASS units; ~78 px letter height) |
| `caption_y` | 1250 | Vertical centre of captions (frame is 1920 high; keep between ~1000 and ~1400 so the Instagram UI doesn't cover them) |
| `max_words` | 3 | Max words shown at once |
| `max_chars` | 18 | Max characters shown at once |
| `hook_bg` / `hook_fg` | `#FFD400` / `#111111` | Hook and CTA box colours |
| `hook_size` | 110 | Hook title font size |
| `hook_y` | 300 | Top of the hook box |
| `cta_y` | 300 | Top of the CTA box |
| `logo_width` | 170 | Logo width in px |
| `logo_corner` | `top-left` | `top-left`, `top-right`, `bottom-left`, `bottom-right` (bottom stays above the Instagram caption area) |
| `jump_zoom` | 1.08 | Zoom used on every other jump cut |
| `punch_zoom` | 1.2 | Zoom used on `zoom` words |

Brand colours: if the user's logo has a strong brand colour, using it for `hook_bg` and `highlight_color` makes the account look consistent. Keep enough contrast with white captions.

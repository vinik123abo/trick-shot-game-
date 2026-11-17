---
name: insta-reels
description: Turns a raw talking-head video into a scroll-stopping, viral-style Instagram Reel - transcribes the speech (Hebrew by default), finds and front-loads the strongest hook, cuts pauses and filler with jump cuts and punch-in zooms, burns animated word-by-word captions, adds the logo, a hook title and a CTA, and writes the post caption and hashtags. Use this whenever the user sends or mentions a video they recorded and wants it edited, cut, subtitled, branded or "made viral" for Instagram, Reels, TikTok or Shorts - including Hebrew requests like "תערוך לי את הסרטון", "תוסיף כתוביות", "תעשה מזה ריל", "סרטון לאינסטגרם" - even if they don't name the skill.
---

# Instagram Reels editor (viral talking-head edits)

The user is an Israeli accountant (רואה חשבון) who records short videos of themselves talking and wants each one turned into a Reel that stops the scroll and keeps people watching to the end. Speech is Hebrew, captions are Hebrew, and everything you write to the user should be in Hebrew.

The two things that decide whether a Reel performs are **the first 2 seconds** (does it stop the scroll?) and **retention** (is there any dead moment where a viewer would swipe away?). Every editing decision below serves one of those two. The scripts do the mechanical work; your job is the editorial judgement: what to cut, what to move to the front, what the on-screen hook says.

## Files

- `scripts/transcribe.py` - speech to word-level timestamps (`words.json`, `transcript.txt`)
- `scripts/render.py` - cuts, zooms, captions, hook title, logo, CTA, loudness -> `reel.mp4` + `cover.jpg`
- `references/hooks.md` - hook formulas and accountant-specific examples. **Read it before choosing the hook.**
- `references/plan-schema.md` - every field of `plan.json` and the visual style options
- `assets/brand/` - the user's logo and saved brand settings (`brand.json`), kept between runs
- `assets/fonts/` - Rubik Black (bold Hebrew font used for all burned text)

## Workflow

### 0. Setup (once per machine)

```bash
pip install -q faster-whisper pillow numpy
```
`ffmpeg` with libass must exist (`ffmpeg -filters | grep ass`). The first transcription downloads the Hebrew Whisper model (`ivrit-ai/whisper-large-v3-turbo-ct2`, ~1.6 GB) from huggingface.co. If the download is blocked, the script falls back to standard Whisper models; if all are blocked, tell the user that the environment needs network access to huggingface.co and its CDN hosts.

### 1. Find the inputs

- **Video**: the file the user uploaded or pointed to. If it isn't obvious, look for recently added videos (`find / -xdev -mmin -120 \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.m4v' \) 2>/dev/null`) and ask only if there's more than one candidate.
- **Logo**: use `assets/brand/logo.png` if present. If not, ask once for the logo (PNG with transparent background is best), copy it to `assets/brand/logo.png`, and reuse it from then on. If the user has no logo yet, render without one rather than blocking.
- **Brand settings**: if `assets/brand/brand.json` exists, merge its `style` into every plan (colours, logo corner, CTA wording, Instagram handle). When the user expresses a lasting preference ("always put the logo on the right", "I want blue instead of yellow"), save it there.

Work in a fresh folder per video, e.g. `reels/<video-name>/` in the user's working directory, so outputs never overwrite each other.

### 2. Transcribe

```bash
python <skill>/scripts/transcribe.py VIDEO WORKDIR
```
Takes roughly the video's length on CPU. Then read `WORKDIR/transcript.txt`. Each line is `[first-last] start-end  text`, where the bracket numbers are word indices you will use in the plan.

Read the transcript carefully for transcription mistakes, especially accounting terms the model may garble: מע"מ, מס הכנסה, ביטוח לאומי, עוסק פטור / עוסק מורשה, חברה בע"מ, נקודות זיכוי, החזר מס, דוח שנתי, הצהרת הון, מקדמות, ניכוי במקור, רואה חשבון. Fix them through `word_fixes`, because a misspelled word on screen looks unprofessional for an accountant.

### 3. Make the editorial plan

This is the step that makes the video go viral or not, so think it through.

**a. Find the hook.** Read `references/hooks.md`. Then look through the whole transcript for the single most surprising, valuable or provocative sentence: a number ("שילמת 4,000 ש"ח יותר מדי"), a common mistake, a myth, a strong claim. People often say their best line in the middle or at the end. If it's not at the start, **move it to the front**: put its word range first in `keep`, then the rest of the video (skipping the duplicated part). The video should open mid-energy on that line, never on "היי, אז היום אני רוצה לדבר על...".

**b. Cut everything that doesn't earn its place.** Leave out of `keep`:
- greetings and warm-ups ("היי לכולם", "אז ככה", "בעצם", "שנייה")
- false starts, repeated takes (if a sentence is said twice, keep the better/later take), fillers ("אממ", "אה", "כאילו", "נו")
- tangents that don't serve the one main point
- a long sign-off (the CTA title handles that)

Pauses inside kept ranges are removed automatically by `max_gap` (default 0.35 s). Aim for a tight 20-45 second Reel; shorter is usually better if the content is complete. Make sure every cut still produces grammatical, coherent Hebrew - read your `keep` ranges back as text before rendering.

**c. Write the on-screen hook title** (`hook_text`): 3-7 words, shown at the top for the first ~3 seconds and on the cover. It should *add* to what's being said (curiosity, a number, stakes), not just repeat it. No emoji in burned-in text (the font has none; put emoji in the post caption instead).

**d. Choose emphasis and zooms.**
- `emphasis`: 1 word per sentence or so - the payoff words (numbers, money, "טעות", "חינם", "קנס"). They appear in the emphasis colour.
- `zoom`: 2-5 words where a punch-in zoom should land - the hook's key word, the big reveal, the punchline. Don't overdo it; constant punches lose their impact.
- Every other jump cut alternates a subtle zoom automatically, which hides the cut.

**e. CTA** (`cta_text`): a short call to action for the last 2 seconds that fits the content, e.g. "שמרו לפני הדוח השנתי", "שלחו למישהו שצריך את זה", "עקבו לעוד טיפים במס". Saves and shares are what push a Reel the furthest, so prefer CTAs that ask for those.

Write `WORKDIR/plan.json` (full schema in `references/plan-schema.md`):
```json
{
  "keep": [[112, 131], [0, 47], [55, 110]],
  "max_gap": 0.35,
  "hook_text": "הטעות שעולה לעצמאים אלפי שקלים",
  "hook_seconds": 3,
  "emphasis": [118, 23, 71],
  "zoom": [112, 71],
  "cta_text": "שמרו את זה לפני הדוח השנתי",
  "word_fixes": {"40": "מע\"מ"},
  "style": {}
}
```

### 4. Render

First do a quick preview render to check cuts and timing, then the final one:
```bash
python <skill>/scripts/render.py --video VIDEO --words WORKDIR/words.json --plan WORKDIR/plan.json \
  --out WORKDIR/out --logo <skill>/assets/brand/logo.png --preview
```
Drop `--preview` for the final render. For landscape footage add `--fit blur` if the speaker isn't centred (the default `crop` fills the frame, which usually looks best for a face).

### 5. Check your work before showing it

Extract a few frames (e.g. at 0.5 s, 2 s, the middle, the last second) with ffmpeg and look at them. Check that: the hook title is fully on screen and readable; captions are spelled correctly and not hidden behind the logo; the face isn't cropped out by the 9:16 crop or a zoom; the CTA appears at the end. Also read `out/timeline.json` against your plan to confirm the hook line is first. Fix the plan and re-render if anything is off. The user should never be the one to find a typo.

### 6. Deliver

Send the user `out/reel.mp4` and `out/cover.jpg`, and give them, in Hebrew:
1. **The post caption** (תיאור לפוסט): a first line that repeats the hook in a new way, 2-4 short lines of value, a CTA (save / share / comment a keyword), then 5-10 relevant hashtags mixing broad and niche (e.g. #רואהחשבון #מיסים #עצמאים #החזרמס #טיפיםלעצמאים). Emoji are welcome here.
2. **What you did** in 2-3 short bullets: which line you used as the hook and why, how much you cut (from X to Y seconds).
3. **Optionally** 2 alternative hook titles they could test, so they can re-render with a different one.

Keep the explanation short; the user wants the video, not an essay.

## When the user asks for changes

Edit `plan.json` (or `assets/brand/brand.json` for lasting style changes) and re-render; no need to transcribe again. Common requests: different hook text, keep a part you cut, caption colour or size, logo position or size, longer/shorter video, no CTA.

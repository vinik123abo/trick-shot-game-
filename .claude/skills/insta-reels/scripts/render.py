#!/usr/bin/env python3
"""Render a viral-style 9:16 Instagram Reel from a raw talking video.

Usage:
  python render.py --video IN.mp4 --words words.json --plan plan.json --out OUT_DIR
                   [--logo logo.png] [--fit crop|blur] [--preview]

Inputs
  words.json  from transcribe.py
  plan.json   written by Claude (schema in references/plan-schema.md)

Outputs (in OUT_DIR)
  reel.mp4      1080x1920, 30fps, H.264 + AAC, loudness -14 LUFS, faststart
  cover.jpg     frame with the hook title (use as the Reel cover)
  subs.ass      the generated subtitle file (for debugging)
  timeline.json where every kept word landed in the final video

What it does
  * keeps only the word ranges in plan["keep"], in that order (so the strongest
    line can be moved to the very front as the hook)
  * removes pauses longer than plan["max_gap"] (jump cuts)
  * alternates a subtle zoom on every jump cut and punches in on plan["zoom"]
    words, so cuts feel intentional and the frame keeps moving
  * burns animated word-by-word captions (active word highlighted and popped,
    emphasis words in a second colour)
  * shows the hook title for the first seconds, optional CTA at the end
  * overlays the logo, normalises loudness to Instagram's level

Right-to-left text: libass does not order Hebrew words reliably across styled
runs, so every word is placed as its own subtitle event at a position computed
here (words measured with PIL, calibrated against libass). Word order is
therefore always correct, whatever libass version renders it.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.normpath(os.path.join(HERE, "..", "assets", "fonts"))
FONT_FILE = os.path.join(FONT_DIR, "Rubik-Black.ttf")
FONT_NAME = "Rubik Black"
W, H, FPS = 1080, 1920, 30
MAX_TEXT_W = 960
RTL_RE = re.compile(r"[֐-׿؀-ۿיִ-﷿]")
EMOJI_RE = re.compile(r"[\U00010000-\U0010FFFF☀-➿️‍]")


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(" ".join(cmd) + "\n" + r.stderr[-3000:])
        raise SystemExit(f"command failed: {cmd[0]}")
    return r.stdout


def probe(path):
    out = run(["ffprobe", "-v", "error", "-show_entries",
               "format=duration:stream=codec_type,width,height:stream_side_data=rotation",
               "-of", "json", path])
    j = json.loads(out)
    v = next(s for s in j["streams"] if s.get("codec_type") == "video")
    w, h = v["width"], v["height"]
    for sd in v.get("side_data_list", []) or []:
        if abs(int(sd.get("rotation", 0))) in (90, 270):
            w, h = h, w
    has_audio = any(s.get("codec_type") == "audio" for s in j["streams"])
    return w, h, float(j["format"]["duration"]), has_audio


def ass_color(hex_rgb):
    h = hex_rgb.lstrip("#")
    return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}&".upper()


def ts(t):
    cs = int(round(max(0.0, t) * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def clean(text):
    """Text safe to burn: no ASS braces, no emoji (the font has none - keep emoji for the post caption)."""
    text = EMOJI_RE.sub("", text)
    return text.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", " ").strip()


# ---------------------------------------------------------------- text layout
class Measurer:
    """Measures text widths in libass pixels for FONT_FILE."""

    def __init__(self):
        from PIL import ImageFont
        self.IF = ImageFont
        self.k = self._calibrate()
        self.cache = {}

    def _calibrate(self):
        from PIL import Image
        sample = "אבגדהוזחטabcdefg"
        with tempfile.TemporaryDirectory() as td:
            ass = os.path.join(td, "c.ass")
            png = os.path.join(td, "c.png")
            with open(ass, "w", encoding="utf-8") as f:
                f.write(ass_header({}) + f"Dialogue: 0,0:00:00.00,0:00:01.00,Cal,,0,0,0,,{{\\pos(540,500)}}{sample}\n")
            run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}",
                 "-vf", f"ass={ass}:fontsdir={FONT_DIR}", "-frames:v", "1", png])
            bb = Image.open(png).convert("L").point(lambda v: 255 if v > 60 else 0).getbbox()
        pil = self.IF.truetype(FONT_FILE, 100).getbbox(sample)
        if not bb:
            return 0.65
        return (bb[2] - bb[0]) / (pil[2] - pil[0])

    def width(self, text, size):
        key = (text, size)
        if key not in self.cache:
            f = self.IF.truetype(FONT_FILE, max(1, int(round(size * self.k * 4))))
            self.cache[key] = f.getlength(text) / 4.0
        return self.cache[key]


def layout(words, size, m, gap_factor=0.30):
    """Return ([(word, x_center, width)], total_width) for one line, centred on W/2.
    Words are given in reading order; RTL lines are laid out right-to-left."""
    ws = [m.width(w, size) for w in words]
    gap = size * gap_factor
    total = sum(ws) + gap * (len(words) - 1)
    rtl = sum(bool(RTL_RE.search(w)) for w in words) * 2 >= len(words)
    out = []
    if rtl:
        x = W / 2 + total / 2
        for w, wd in zip(words, ws):
            out.append((w, x - wd / 2, wd))
            x -= wd + gap
    else:
        x = W / 2 - total / 2
        for w, wd in zip(words, ws):
            out.append((w, x + wd / 2, wd))
            x += wd + gap
    return out, total


def wrap(words, size, m, max_w=MAX_TEXT_W):
    lines, cur = [], []
    for w in words:
        if cur and layout(cur + [w], size, m)[1] > max_w:
            lines.append(cur)
            cur = []
        cur.append(w)
    if cur:
        lines.append(cur)
    return lines


# ---------------------------------------------------------------- clip building
def build_clips(words, plan, duration):
    max_gap = float(plan.get("max_gap", 0.35))
    zoom_words = set(int(i) for i in plan.get("zoom", []))
    pad_in, pad_out = 0.06, 0.10
    groups = []
    for rng in plan["keep"]:
        seq = words[int(rng[0]):int(rng[1]) + 1]
        if not seq:
            continue
        cur = [seq[0]]
        for w in seq[1:]:
            pause = w["s"] - cur[-1]["e"] > max_gap
            # start a punch-in exactly on a zoom word (if it isn't already near the clip start)
            punch = w["i"] in zoom_words and w["s"] - cur[0]["s"] > 0.5
            if pause or punch:
                groups.append((cur, pause))
                cur = [w]
            else:
                cur.append(w)
        groups.append((cur, True))
    clips = []
    for g, ends_with_pause in groups:
        s = max(0.0, g[0]["s"] - pad_in)
        e = min(duration, g[-1]["e"] + pad_out)
        prev = clips[-1] if clips else None
        if prev and prev["next_i"] == g[0]["i"] and s < prev["e"]:
            # source-adjacent clips: cut at the midpoint so no audio is repeated
            mid = (prev["words"][-1]["e"] + g[0]["s"]) / 2
            prev["e"], s = mid, mid
        clips.append({"s": s, "e": max(e, s + 0.12), "words": g, "next_i": g[-1]["i"] + 1,
                      "punch": any(w["i"] in zoom_words for w in g[:1])})
    return clips


# ---------------------------------------------------------------- video passes
def cut_clip(src, clip, idx, tmp, fit, zoom, has_audio):
    dur = clip["e"] - clip["s"]
    if fit == "blur":
        vf = (f"split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
              f"boxblur=30:5,eq=brightness=-0.08[bg];[b]scale={W}:-2[fg];[bg][fg]overlay=0:(H-h)/2")
    else:
        vf = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"
    if zoom > 1.001:
        zw, zh = int(W * zoom) // 2 * 2, int(H * zoom) // 2 * 2
        # zoom toward the upper third, where the face usually is
        vf += f",scale={zw}:{zh},crop={W}:{H}:(iw-{W})/2:(ih-{H})*0.35"
    vf += f",fps={FPS},setsar=1,format=yuv420p"
    out = os.path.join(tmp, f"c{idx:04d}.mp4")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{clip['s']:.3f}", "-t", f"{dur:.3f}", "-i", src]
    if not has_audio:
        cmd += ["-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
    cmd += ["-vf", vf]
    fo = max(0.0, dur - 0.015)
    cmd += ["-af", f"afade=t=in:d=0.015,afade=t=out:st={fo:.3f}:d=0.015,aresample=48000",
            "-c:a", "aac", "-b:a", "192k", "-ac", "2"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-r", str(FPS), out]
    run(cmd)
    real = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                      "-of", "default=nw=1:nk=1", out]).strip())
    return out, real


# ---------------------------------------------------------------- subtitles
def ass_header(st):
    base = ass_color(st.get("text_color", "#FFFFFF"))
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{FONT_NAME},100,{base},{base},&H00000000&,&H96000000&,0,0,0,0,100,100,0,0,1,7,4,5,0,0,0,-1
Style: Box,{FONT_NAME},100,&H00FFFFFF&,&H00FFFFFF&,&H00000000&,&H00000000&,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,-1
Style: Cal,{FONT_NAME},100,&H00FFFFFF&,&H00FFFFFF&,&H00000000&,&H00000000&,0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,-1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def chunk_words(tl, max_words, max_chars):
    chunks, cur = [], []
    for w in tl:
        txt_len = sum(len(x["w"]) + 1 for x in cur) + len(w["w"])
        gap = (w["s"] - cur[-1]["e"]) if cur else 0
        if cur and (len(cur) >= max_words or txt_len > max_chars or gap > 0.6
                    or (w["clip_group"] != cur[-1]["clip_group"])):
            chunks.append(cur)
            cur = []
        cur.append(w)
        if w["w"][-1:] in ".?!,:;" and len(cur) >= 2:
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return chunks


def titled_box(ev, text, s, e, y_top, size, fg, bg, m, anim):
    """A title (hook / CTA): wrapped words on a solid rounded box, laid out word by word."""
    words = [w for w in clean(text).split() if w]
    if not words:
        return
    lines = wrap(words, size, m, MAX_TEXT_W - 60)
    line_h = size * m.k * 1.32
    pad_x, pad_y = 34, 22
    widest = max(layout(l, size, m)[1] for l in lines)
    bw, bh = widest + 2 * pad_x, line_h * len(lines) + 2 * pad_y
    bx, by = (W - bw) / 2, y_top
    r = 26
    box = (f"m {r} 0 l {bw - r:.0f} 0 b {bw:.0f} 0 {bw:.0f} 0 {bw:.0f} {r} l {bw:.0f} {bh - r:.0f} "
           f"b {bw:.0f} {bh:.0f} {bw:.0f} {bh:.0f} {bw - r:.0f} {bh:.0f} l {r} {bh:.0f} b 0 {bh:.0f} 0 {bh:.0f} 0 {bh - r:.0f} "
           f"l 0 {r} b 0 0 0 0 {r} 0")
    ev.append(f"Dialogue: 3,{ts(s)},{ts(e)},Box,,0,0,0,,{{\\pos({bx:.0f},{by:.0f})\\c{bg}\\bord0\\shad6"
              f"\\4c&H64000000&{anim}\\p1}}{box}{{\\p0}}")
    for li, line in enumerate(lines):
        y = by + pad_y + line_h * (li + 0.5)
        for w, x, _ in layout(line, size, m)[0]:
            ev.append(f"Dialogue: 4,{ts(s)},{ts(e)},Cap,,0,0,0,,{{\\pos({x:.0f},{y:.0f})\\fs{size}"
                      f"\\c{fg}\\bord0\\shad0{anim}}}{w}")


def build_ass(tl, plan, total, out_path, m):
    st = plan.get("style", {})
    base = ass_color(st.get("text_color", "#FFFFFF"))
    hi = ass_color(st.get("highlight_color", "#FFD400"))
    emc = ass_color(st.get("emphasis_color", "#FF3B3B"))
    size = int(st.get("caption_size", 120))
    ypos = int(st.get("caption_y", 1250))
    emphasis = set(int(i) for i in plan.get("emphasis", []))
    ev = []

    chunks = chunk_words(tl, int(st.get("max_words", 3)), int(st.get("max_chars", 18)))
    for ci, ch in enumerate(chunks):
        texts = [clean(x["w"]) or "·" for x in ch]
        lines = wrap(texts, size, m)
        fs = size
        while len(lines) > 2 and fs > 60:
            fs -= 8
            lines = wrap(texts, fs, m)
        line_h = fs * m.k * 1.25
        y0 = ypos - line_h * (len(lines) - 1) / 2
        placed, k = [], 0  # (word index in chunk, x, y)
        for li, line in enumerate(lines):
            for _, x, _ in layout(line, fs, m)[0]:
                placed.append((k, x, y0 + li * line_h))
                k += 1
        c_end = chunks[ci + 1][0]["s"] if ci + 1 < len(chunks) else min(total, ch[-1]["e"] + 0.4)
        c_end = min(c_end, ch[-1]["e"] + 0.7)
        c_start = ch[0]["s"]
        for k, x, y in placed:
            w = ch[k]
            col = emc if w["i"] in emphasis else base
            ws, we = max(w["s"], c_start), (ch[k + 1]["s"] if k + 1 < len(ch) else c_end)
            pop_in = "\\fscx85\\fscy85\\t(0,80,\\fscx100\\fscy100)"
            # resting state (before & after being spoken)
            if ws - c_start > 0.02:
                ev.append(f"Dialogue: 1,{ts(c_start)},{ts(ws)},Cap,,0,0,0,,{{\\pos({x:.0f},{y:.0f})\\fs{fs}\\c{col}{pop_in}}}{texts[k]}")
            # active: highlight + pop
            act = emc if w["i"] in emphasis else hi
            if we - ws > 0.02:
                ev.append(f"Dialogue: 2,{ts(ws)},{ts(we)},Cap,,0,0,0,,{{\\pos({x:.0f},{y:.0f})\\fs{fs}\\c{act}"
                          f"\\fscx100\\fscy100\\t(0,70,\\fscx118\\fscy118)\\t(70,160,\\fscx110\\fscy110)}}{texts[k]}")
            if c_end - we > 0.02:
                ev.append(f"Dialogue: 1,{ts(we)},{ts(c_end)},Cap,,0,0,0,,{{\\pos({x:.0f},{y:.0f})\\fs{fs}\\c{col}}}{texts[k]}")

    fg = ass_color(st.get("hook_fg", "#111111"))
    bg = ass_color(st.get("hook_bg", "#FFD400"))
    if plan.get("hook_text"):
        hs = total if plan.get("hook_persistent") else min(total, float(plan.get("hook_seconds", 3.0)))
        titled_box(ev, plan["hook_text"], 0, hs, int(st.get("hook_y", 300)), int(st.get("hook_size", 110)),
                   fg, bg, m, "\\fad(0,120)")
    if plan.get("cta_text"):
        titled_box(ev, plan["cta_text"], max(0, total - 2.2), total, int(st.get("cta_y", 520)), 88,
                   fg, bg, m, "\\fad(150,0)")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(ass_header(st) + "\n".join(ev) + "\n")


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--words", required=True)
    ap.add_argument("--plan", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--logo")
    ap.add_argument("--fit", choices=["crop", "blur"], default=None,
                    help="how to turn landscape footage into 9:16 (default: plan['fit'] or crop)")
    ap.add_argument("--preview", action="store_true", help="fast low-quality render")
    a = ap.parse_args()

    words = json.load(open(a.words, encoding="utf-8"))
    plan = json.load(open(a.plan, encoding="utf-8"))
    brand_file = os.path.normpath(os.path.join(HERE, "..", "assets", "brand", "brand.json"))
    if os.path.exists(brand_file):  # saved brand style = defaults; the plan overrides it
        brand = json.load(open(brand_file, encoding="utf-8"))
        plan["style"] = {**brand.get("style", {}), **plan.get("style", {})}
    for k, v in (plan.get("word_fixes") or {}).items():
        words[int(k)]["w"] = v
    os.makedirs(a.out, exist_ok=True)
    src_w, src_h, duration, has_audio = probe(a.video)
    fit = a.fit or plan.get("fit", "crop")

    clips = build_clips(words, plan, duration)
    if not clips:
        raise SystemExit("plan['keep'] selected no words")
    st = plan.get("style", {})
    jump_zoom = float(st.get("jump_zoom", 1.08))
    punch_zoom = float(st.get("punch_zoom", 1.2))

    tmp = tempfile.mkdtemp(prefix="reel_")
    try:
        parts, tl, t, group, alt = [], [], 0.0, 0, 0
        for idx, c in enumerate(clips):
            if c["punch"]:
                z = punch_zoom
            else:
                z = jump_zoom if alt % 2 else 1.0
                alt += 1
            path, real = cut_clip(a.video, c, idx, tmp, fit, z, has_audio)
            parts.append(path)
            if idx and clips[idx - 1]["next_i"] != c["words"][0]["i"]:
                group += 1
            for w in c["words"]:
                tl.append({"i": w["i"], "w": w["w"], "clip": idx, "clip_group": group,
                           "s": round(t + w["s"] - c["s"], 3),
                           "e": round(min(t + real, t + w["e"] - c["s"]), 3)})
            t += real
            print(f"[render] clip {idx + 1}/{len(clips)} {c['s']:.2f}-{c['e']:.2f} zoom={z}", file=sys.stderr)
        total = t
        lst = os.path.join(tmp, "list.txt")
        with open(lst, "w") as f:
            f.writelines(f"file '{p}'\n" for p in parts)
        joined = os.path.join(tmp, "joined.mp4")
        run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])

        m = Measurer()
        ass = os.path.join(a.out, "subs.ass")
        build_ass(tl, plan, total, ass, m)
        json.dump(tl, open(os.path.join(a.out, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)

        def fesc(p):
            return p.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
        sub = f"ass='{fesc(ass)}':fontsdir='{fesc(FONT_DIR)}'"
        inputs = ["-i", joined]
        if a.logo and os.path.exists(a.logo):
            lw = int(st.get("logo_width", 170))
            corner = st.get("logo_corner", "top-left")
            x = "50" if "left" in corner else "W-w-50"
            y = "90" if "top" in corner else "H-h-330"
            inputs += ["-loop", "1", "-i", a.logo]
            fc = (f"[1:v]scale={lw}:-1,format=rgba,colorchannelmixer=aa=0.92[lg];"
                  f"[0:v]{sub}[v1];[v1][lg]overlay={x}:{y}:shortest=1,format=yuv420p[v]")
        else:
            fc = f"[0:v]{sub},format=yuv420p[v]"
        out_mp4 = os.path.join(a.out, "reel.mp4")
        q = ["-preset", "ultrafast", "-crf", "28"] if a.preview else ["-preset", "slow", "-crf", "19"]
        run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc,
             "-map", "[v]", "-map", "0:a", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000",
             "-c:v", "libx264", *q, "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", str(FPS),
             "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{total:.3f}", out_mp4])
        cover_t = min(float(plan.get("hook_seconds", 3.0)) * 0.6, total / 2)
        run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{cover_t:.2f}", "-i", out_mp4,
             "-frames:v", "1", "-q:v", "2", os.path.join(a.out, "cover.jpg")])
        print(f"[render] done: {out_mp4}  ({total:.1f}s from {duration:.1f}s, {len(clips)} cuts)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Transcribe a video to word-level timestamps (Hebrew by default).

Usage:
  python transcribe.py INPUT_VIDEO OUT_DIR [--lang he] [--model MODEL]

Writes:
  OUT_DIR/words.json       [{"i":0,"w":"שלום","s":0.12,"e":0.48}, ...]
  OUT_DIR/transcript.txt   numbered lines (one per phrase) for Claude to read,
                           each line shows its word-index range and time range.

Model choice: for Hebrew the best open model is "ivrit-ai/whisper-large-v3-turbo-ct2"
(fine-tuned on Hebrew). If it can't be downloaded, fall back to "large-v3", then
"medium". On CPU, large models take roughly 1-2x the video length.
"""
import argparse
import json
import os
import subprocess
import sys

FALLBACKS = ["ivrit-ai/whisper-large-v3-turbo-ct2", "large-v3", "medium", "small"]


def load_audio(video):
    """Decode audio with ffmpeg to 16 kHz mono float32 (avoids PyAV version issues)."""
    import numpy as np
    raw = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", video, "-vn", "-ac", "1",
         "-ar", "16000", "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def load_model(name):
    from faster_whisper import WhisperModel
    names = [name] if name else FALLBACKS
    last = None
    for n in names:
        try:
            print(f"[transcribe] loading model {n} ...", file=sys.stderr)
            return WhisperModel(n, device="auto", compute_type="int8"), n
        except Exception as ex:  # download blocked, no such model, etc.
            print(f"[transcribe] could not load {n}: {ex}", file=sys.stderr)
            last = ex
    raise SystemExit(f"No whisper model could be loaded: {last}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out_dir")
    ap.add_argument("--lang", default="he")
    ap.add_argument("--model", default=None)
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)

    if True:
        wav = load_audio(a.video)
        model, used = load_model(a.model)
        segments, info = model.transcribe(
            wav, language=a.lang, word_timestamps=True, vad_filter=False,
            beam_size=5, condition_on_previous_text=False,
        )
        words, lines = [], []
        for seg in segments:
            first = len(words)
            for w in seg.words or []:
                t = w.word.strip()
                if not t:
                    continue
                words.append({"i": len(words), "w": t, "s": round(w.start, 3), "e": round(w.end, 3)})
            if len(words) > first:
                seg_words = words[first:]
                lines.append(
                    f"[{first}-{len(words)-1}] {seg_words[0]['s']:.2f}-{seg_words[-1]['e']:.2f}  "
                    + " ".join(x["w"] for x in seg_words)
                )

    with open(os.path.join(a.out_dir, "words.json"), "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=0)
    with open(os.path.join(a.out_dir, "transcript.txt"), "w", encoding="utf-8") as f:
        f.write(f"# model={used} lang={a.lang} words={len(words)}\n")
        f.write("\n".join(lines) + "\n")
    print(f"[transcribe] {len(words)} words -> {a.out_dir}/words.json, transcript.txt")


if __name__ == "__main__":
    main()

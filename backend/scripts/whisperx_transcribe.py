#!/usr/bin/env python3
"""
WhisperX Transcription Script
Generates word-level timestamps from audio files.
"""
import argparse
import json
import sys
import os

def main():
    parser = argparse.ArgumentParser(description='Transcribe audio with WhisperX')
    parser.add_argument('--audio', required=True, help='Path to audio file')
    parser.add_argument('--model_size', default='base', help='Whisper model size')
    parser.add_argument('--output', required=True, help='Output JSON path')
    parser.add_argument('--device', default='cpu', help='Device (cpu or cuda)')
    parser.add_argument('--compute_type', default='int8', help='Compute type')
    args = parser.parse_args()

    if not os.path.exists(args.audio):
        print(f"Error: Audio file not found: {args.audio}", file=sys.stderr)
        sys.exit(1)

    try:
        import whisperx
        import torch
    except ImportError:
        print("Error: whisperx not installed. Run: pip install whisperx", file=sys.stderr)
        sys.exit(1)

    device = args.device
    if device == 'cuda' and not torch.cuda.is_available():
        print("CUDA not available, falling back to CPU", file=sys.stderr)
        device = 'cpu'

    compute_type = args.compute_type
    if device == 'cpu' and compute_type == 'float16':
        compute_type = 'int8'

    print(f"Loading model: {args.model_size} on {device}...", file=sys.stderr)
    model = whisperx.load_model(args.model_size, device, compute_type=compute_type)

    print("Transcribing...", file=sys.stderr)
    audio = whisperx.load_audio(args.audio)
    result = model.transcribe(audio, batch_size=16 if device == 'cuda' else 4)

    print("Aligning words...", file=sys.stderr)
    model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
    result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)

    # Extract word segments
    word_segments = []
    for segment in result.get("segments", []):
        for word_info in segment.get("words", []):
            if "start" in word_info and "end" in word_info:
                word_segments.append({
                    "word": word_info["word"].strip(),
                    "start": round(word_info["start"], 3),
                    "end": round(word_info["end"], 3),
                })

    output = {
        "segments": result.get("segments", []),
        "word_segments": word_segments,
        "language": result.get("language", "en"),
    }

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Done! {len(word_segments)} words transcribed.", file=sys.stderr)
    print(f"Output saved to: {args.output}", file=sys.stderr)

if __name__ == '__main__':
    main()

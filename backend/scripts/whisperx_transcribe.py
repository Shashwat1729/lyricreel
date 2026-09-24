#!/usr/bin/env python3
"""
WhisperX transcription helper for LyricReel.
Writes {"word_segments": [{"word", "start", "end"}], "language": "..."} to --output.
"""
import argparse
import json
import os
import sys


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def main():
    parser = argparse.ArgumentParser(description='Transcribe audio with WhisperX')
    parser.add_argument('--audio', required=True, help='Path to audio file')
    parser.add_argument('--model_size', default='base', help='Whisper model size')
    parser.add_argument('--output', required=True, help='Output JSON path')
    parser.add_argument('--device', default='cpu', help='cpu or cuda')
    parser.add_argument('--compute_type', default='int8', help='int8, float16, float32')
    parser.add_argument('--language', default=None, help='Force a language code (optional)')
    args = parser.parse_args()

    if not os.path.isfile(args.audio):
        log(f'Error: audio file not found: {args.audio}')
        sys.exit(1)

    try:
        import whisperx
        import torch
    except ImportError:
        log('Error: whisperx is not installed. Run: pip install whisperx')
        sys.exit(2)

    device = args.device
    if device == 'cuda' and not torch.cuda.is_available():
        log('CUDA not available, falling back to CPU')
        device = 'cpu'

    compute_type = args.compute_type
    if device == 'cpu' and compute_type == 'float16':
        compute_type = 'int8'

    log(f'Loading model {args.model_size} on {device} ({compute_type})...')
    model = whisperx.load_model(args.model_size, device, compute_type=compute_type, language=args.language)

    log('Transcribing...')
    audio = whisperx.load_audio(args.audio)
    result = model.transcribe(audio, batch_size=16 if device == 'cuda' else 4)
    language = result.get('language') or args.language or 'en'
    segments = result.get('segments', [])

    word_segments = []
    try:
        log('Aligning words...')
        model_a, metadata = whisperx.load_align_model(language_code=language, device=device)
        aligned = whisperx.align(segments, model_a, metadata, audio, device, return_char_alignments=False)
        for segment in aligned.get('segments', []):
            for w in segment.get('words', []):
                text = (w.get('word') or '').strip()
                if text and 'start' in w and 'end' in w:
                    word_segments.append({'word': text, 'start': round(float(w['start']), 3), 'end': round(float(w['end']), 3)})
    except Exception as exc:  # alignment model missing for this language, etc.
        log(f'Word alignment failed ({exc}); spreading words across segments instead')
        for segment in segments:
            words = (segment.get('text') or '').split()
            if not words:
                continue
            start, end = float(segment['start']), float(segment['end'])
            step = max(0.05, (end - start) / len(words))
            for i, text in enumerate(words):
                s = start + i * step
                word_segments.append({'word': text, 'start': round(s, 3), 'end': round(s + step * 0.9, 3)})

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump({'word_segments': word_segments, 'language': language}, f, ensure_ascii=False)

    log(f'Done: {len(word_segments)} words')


if __name__ == '__main__':
    main()

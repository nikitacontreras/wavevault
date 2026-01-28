import sys
import json
import os
import signal

# Handle SIGINT clearly
def handler(signum, frame):
    sys.exit(0)
signal.signal(signal.SIGINT, handler)

HAS_LIBROSA = False
try:
    import librosa
    import numpy as np
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False
    # Don't exit here, wait for loop to signal failure safely

def classify_audio(file_path):
    if not HAS_LIBROSA:
        return {"success": False, "category": None, "error": "Librosa not installed"}

    try:
        # Load audio (only first 2 seconds to be fast)
        y, sr = librosa.load(file_path, sr=22050, duration=2.0)
        
        # Calculate features
        # Calculate features
        spec_cent = librosa.feature.spectral_centroid(y=y, sr=sr)
        zcr = librosa.feature.zero_crossing_rate(y)
        spec_flat = librosa.feature.spectral_flatness(y=y)
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        bpm = librosa.beat.tempo(onset_envelope=onset_env, sr=sr)
        
        # Key Detection
        # Compute the mean chroma across time
        chroma_mean = np.mean(chroma, axis=1)
        
        # Define key profiles (simplified)
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        
        keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        major_corrs = [np.corrcoef(chroma_mean, np.roll(major_profile, i))[0, 1] for i in range(12)]
        minor_corrs = [np.corrcoef(chroma_mean, np.roll(minor_profile, i))[0, 1] for i in range(12)]
        
        best_major = np.argmax(major_corrs)
        best_minor = np.argmax(minor_corrs)
        
        if major_corrs[best_major] > minor_corrs[best_minor]:
            detected_key = f"{keys[best_major]} Major"
        else:
            detected_key = f"{keys[best_minor]} Minor"

        # Mean values
        cent_mean = np.mean(spec_cent)
        zcr_mean = np.mean(zcr)
        flat_mean = np.mean(spec_flat)
        duration = librosa.get_duration(y=y, sr=sr)

        # Basic Classification Heuristics
        category = "Unknown"
        
        # 1. Distinguish between Loop and One-Shot based on duration
        # (This overrides the basic filename check if we want, or works alongside it)
        is_loop = duration > 4.0 # simple threshold
        
        if is_loop:
            category = "Loop"
            # Sub-classify loops?
            if cent_mean < 1000: category = "Bass Loop"
            elif cent_mean > 3000: category = "Synth Loop"
            else: category = "Drum Loop"
        else:
            # One-Shot Classification
            if cent_mean < 1000 and flat_mean < 0.05:
                category = "Kick"
            elif 1000 <= cent_mean < 3000 and zcr_mean > 0.1:
                category = "Snare" # Snares have noise (high ZCR) and mid-range freq
            elif cent_mean > 3500 and flat_mean > 0.1:
                category = "Hi-Hat" # High freq, noise
            elif 100 < cent_mean < 800 and flat_mean < 0.02:
                category = "Bass" # Deep, tonal
            elif cent_mean > 2000 and zcr_mean < 0.1:
                 category = "Synth" # Tonal, higher freq
            elif cent_mean > 3000 and flat_mean > 0.2:
                category = "FX" # Noisy, high freq (Crash, Ride, Noise)
                
            # Refinements
            if "Hi-Hat" in category:
                if duration > 0.5: category = "Cymbal" # Longer hi-hat usually cymbal/crash
        
        return {
            "success": True,
            "category": category,
            "key": detected_key,
            "features": {
                "centroid": float(cent_mean),
                "zcr": float(zcr_mean),
                "flatness": float(flat_mean),
                "bpm": float(bpm[0]) if len(bpm) > 0 else 0
            }
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

def run_streaming_mode():
    # Otherwise, run in streaming mode (stdin -> stdout)
    # This keeps the process alive for batch processing
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            file_path = line.strip()
            if not file_path:
                continue
                
            result = classify_audio(file_path)
            print(json.dumps(result))
            sys.stdout.flush()
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
            sys.stdout.flush()

if __name__ == "__main__":
    # If args provided, run once (legacy/debug mode)
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        result = classify_audio(file_path)
        print(json.dumps(result))
        sys.exit(0)
    
    run_streaming_mode()

import sys
import multiprocessing
import json

# Import logic from other modules
# Since they are in the same folder, simple imports should work
import separate_stems
import classify_audio

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"type": "error", "data": "Usage: ai_engine <command> [args...]"}));
        sys.exit(1)

    command = sys.argv[1]
    
    if command == "separate":
        # separate <file_path> <output_dir> [quality]
        if len(sys.argv) < 4:
            print(json.dumps({"type": "error", "data": "Usage: ai_engine separate <file_path> <output_dir> [quality]"}));
            sys.exit(1)
            
        file_path = sys.argv[2]
        output_dir = sys.argv[3]
        quality = sys.argv[4] if len(sys.argv) > 4 else "standard"
        
        separate_stems.separate_stems_logic(file_path, output_dir, quality)
        
    elif command == "classify":
        # classify [file_path]
        # if file_path provided, run single mode
        # else run streaming mode
        
        if len(sys.argv) > 2:
            file_path = sys.argv[2]
            result = classify_audio.classify_audio(file_path)
            print(json.dumps(result))
        else:
            classify_audio.run_streaming_mode()
            
    else:
        print(json.dumps({"type": "error", "data": f"Unknown command: {command}"}));
        sys.exit(1)

if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()

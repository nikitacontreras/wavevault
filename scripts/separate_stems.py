import sys
import os
import json
import multiprocessing

# SOPORTE PARA BINARIOS
if __name__ == '__main__':
    multiprocessing.freeze_support()

try:
    import numpy
    import torch
    import torchaudio
    import demucs.separate
except ImportError as e:
    print(json.dumps({"type": "error", "data": f"Error de dependencias: {str(e)}"}))
    sys.exit(1)

def separate_stems_logic(file_path, output_root, quality="standard"):
    try:
        # SELECCIÓN DE MODELO SEGÚN CALIDAD
        # standard = htdemucs (Rápido)
        # best = htdemucs_ft (Fine-tuned, lento, pero mucho más limpio)
        model = "htdemucs_ft" if quality == "best" else "htdemucs"
        shifts = 2 if quality == "best" else 1
        
        print(json.dumps({"type": "progress", "data": f"Modo: {quality.upper()} | Modelo: {model}..."}))
        sys.stdout.flush()

        os.makedirs(output_root, exist_ok=True)

        # CONFIGURAR PARÁMETROS
        original_argv = sys.argv
        sys.argv = [
            "separate", 
            "-n", model,
            "--shifts", str(shifts),
            "--out", output_root,
            file_path
        ]
        
        # FIX PARA EVITAR EL ERROR DE TorchCodec EN ALGUNAS VERSIONES
        try:
            # Forzar soundfile si está disponible
            if "soundfile" in torchaudio.list_audio_backends():
                torchaudio.set_audio_backend("soundfile")
        except:
            pass

        try:
            demucs.separate.main()
        except SystemExit as e:
            if e.code != 0:
                print(json.dumps({"type": "error", "data": f"Fallo en el motor (código {e.code})"}))
                return
        finally:
            sys.argv = original_argv

        # RESULTADOS
        name_no_ext = os.path.splitext(os.path.basename(file_path))[0]
        stems_dir = os.path.join(output_root, model, name_no_ext)
        
        if os.path.exists(stems_dir):
            results = {}
            for f in os.listdir(stems_dir):
                if f.endswith(('.wav', '.mp3', '.flac')):
                    stem_name = os.path.splitext(f)[0]
                    results[stem_name] = os.path.abspath(os.path.join(stems_dir, f))
            print(json.dumps({"type": "success", "data": results}))
        else:
            print(json.dumps({"type": "error", "data": f"No se encontró salida en {stems_dir}"}))
            
    except Exception as e:
        print(json.dumps({"type": "error", "data": f"Error crítico: {str(e)}"}))

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        file_path = sys.argv[1]
        output_dir = sys.argv[2]
        quality = sys.argv[3] if len(sys.argv) > 3 else "standard"
        separate_stems_logic(file_path, output_dir, quality)

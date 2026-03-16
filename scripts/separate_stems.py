import sys
import os
import json
import multiprocessing

# SOPORTE PARA BINARIOS
if __name__ == '__main__':
    multiprocessing.freeze_support()

# Feedback inmediato
print(json.dumps({"type": "progress", "data": "Cargando dependencias de IA..."}))
sys.stdout.flush()

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
        # standard = htdemucs (Rápido, 4 pistas)
        # best = htdemucs_ft (Fine-tuned, 4 pistas, muy limpio)
        # pro = htdemucs_6s (6 pistas: incluye Guitarra y Piano)
        
        q = str(quality).strip().lower()
        if q == "pro":
            model = "htdemucs_6s"
            shifts = 1
        elif q == "best":
            model = "htdemucs_ft"
            shifts = 2
        else:
            model = "htdemucs"
            shifts = 1
        
        print(json.dumps({"type": "progress", "data": f"Modo IA: {q.upper()} | Modelo: {model}"}))
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
    # Soporte para subcomandos (ej: 'separate file out quality')
    args = sys.argv[1:]
    if len(args) > 0 and args[0] == "separate":
        args = args[1:]
    
    if len(args) >= 2:
        file_path = args[0]
        output_dir = args[1]
        # Look for quality in remaining args
        quality = "standard"
        for potential_q in args[2:]:
            if potential_q.lower() in ["standard", "best", "pro"]:
                quality = potential_q.lower()
                break
        
        # print(json.dumps({"type": "progress", "data": f"DEBUG: Using quality={quality}"}))
        separate_stems_logic(file_path, output_dir, quality)
    else:
        print(json.dumps({"type": "error", "data": "Argumentos insuficientes. Uso: python separate_stems.py [separate] file_path output_dir [quality]"}))

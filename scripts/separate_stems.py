import sys
import os
import json
import multiprocessing

# IMPORTANTE: Forzar el soporte de multiprocesamiento
if __name__ == '__main__':
    multiprocessing.freeze_support()

try:
    import numpy
    import torch
    import torchaudio
    import demucs.separate
    
    # Intentar forzar el backend de soundfile para evitar errores de TorchCodec
    try:
        if "soundfile" in torchaudio.list_audio_backends():
            torchaudio.set_audio_backend("soundfile")
    except:
        pass
        
except ImportError as e:
    print(json.dumps({"type": "error", "data": f"Error de dependencias: {str(e)}"}))
    sys.exit(1)

def separate_stems_logic(file_path, output_root):
    try:
        print(json.dumps({"type": "progress", "data": "Iniciando motor de separación..."}))
        sys.stdout.flush()

        model = "htdemucs"
        os.makedirs(output_root, exist_ok=True)

        original_argv = sys.argv
        sys.argv = [
            "separate", 
            "-n", model,
            "--out", output_root,
            file_path
        ]
        
        try:
            demucs.separate.main()
        except SystemExit as e:
            if e.code != 0:
                print(json.dumps({"type": "error", "data": f"Demucs falló con código {e.code}"}))
                return
        except Exception as e:
            # Si el error es sobre torchcodec, dar un mensaje más útil
            err_msg = str(e)
            if "TorchCodec" in err_msg:
                print(json.dumps({"type": "error", "data": "Error al guardar: Falta el codec de audio en el binario."}))
            else:
                print(json.dumps({"type": "error", "data": f"Error en Demucs: {err_msg}"}))
            return
        finally:
            sys.argv = original_argv

        # Detección de éxito
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
        separate_stems_logic(sys.argv[1], sys.argv[2])

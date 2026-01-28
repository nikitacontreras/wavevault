const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

async function buildPython() {
    console.log('🚧 Iniciando construcción de motores de IA (Versión Estable)...');

    let pythonBin = 'python3';
    const candidates = ['python3.11', 'python3.12', 'python3.10', 'python3', 'python'];
    for (const cand of candidates) {
        try {
            const { stdout } = await execAsync(`${cand} --version`);
            if (!stdout.includes('3.14')) { pythonBin = cand; break; }
        } catch (e) { }
    }
    console.log(`✅ Usando ${pythonBin} para el build.`);

    const binDir = path.join(__dirname, '../resources/bin');
    if (fs.existsSync(binDir)) {
        console.log('🧹 Limpiando directorio de binarios...');
        fs.rmSync(binDir, { recursive: true, force: true });
    }
    fs.mkdirSync(binDir, { recursive: true });

    try {
        const venvPath = path.join(__dirname, '../.venv_build');
        if (!fs.existsSync(venvPath)) await execAsync(`${pythonBin} -m venv "${venvPath}"`);

        const isWin = process.platform === 'win32';
        const binFolder = isWin ? 'Scripts' : 'bin';
        const pip = path.join(venvPath, binFolder, 'pip');
        const pyinstaller = path.join(venvPath, binFolder, 'pyinstaller');

        console.log('📦 Instalando dependencias estables (Torch 2.4.1 CPU-Only)...');
        // Usar --index-url para descargar versiones CPU de PyTorch (mucho más ligeras)
        await execAsync(`"${pip}" install numpy==1.26.4 torch==2.4.1 torchaudio==2.4.1 soundfile lameenc demucs pyinstaller --index-url https://download.pytorch.org/whl/cpu`, { timeout: 600000 });

        console.log('🔨 Compilando ai_engine (Unified)...');
        const aiScript = path.join(__dirname, '../scripts/ai_engine.py');

        // Compile unified binary
        // Note: collecting librosa and sklearn explicitly to avoid missing imports in onefile mode
        await execAsync(`"${pyinstaller}" --clean --noconfirm --onefile --distpath "${binDir}" --name ai_engine --collect-all demucs --collect-all torchaudio --collect-all librosa --collect-all sklearn --copy-metadata torch --copy-metadata torchaudio --copy-metadata demucs --hidden-import="sklearn.utils._cython_blas" --hidden-import="sklearn.neighbors.typedefs" --hidden-import="sklearn.neighbors.quad_tree" --hidden-import="sklearn.tree._utils" "${aiScript}"`);

        console.log(`✅ Motores listos en: ${binDir}`);

    } catch (e) {
        console.error('❌ Error en el build:', e.message);
        process.exit(1);
    }
}

buildPython();

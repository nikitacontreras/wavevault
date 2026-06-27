const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);
const { spawn } = require('child_process');

function runCmd(commandLine, options = {}) {
    return new Promise((resolve, reject) => {
        const proc = spawn(commandLine, { stdio: 'inherit', shell: true, ...options });
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with exit code ${code}`));
        });
        proc.on('error', (err) => reject(err));
    });
}

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
        if (!fs.existsSync(venvPath)) await runCmd(`${pythonBin} -m venv "${venvPath}"`);

        const isWin = process.platform === 'win32';
        const binFolder = isWin ? 'Scripts' : 'bin';
        const pip = path.join(venvPath, binFolder, 'pip');
        const pyinstaller = path.join(venvPath, binFolder, 'pyinstaller');

        console.log('📦 Instalando dependencias estables...');
        const generalDeps = "numpy==1.26.4 soundfile lameenc demucs pyinstaller";
        const torchDeps = "torch==2.4.1 torchaudio==2.4.1";

        if (process.platform === "darwin") {
            // macOS: Standard PyPI works fine and is preferred (no CPU/CUDA split needed)
            await runCmd(`"${pip}" install ${torchDeps} ${generalDeps}`, { timeout: 600000 });
        } else {
            // Linux/Windows: Force CPU Torch first to avoid 2GB+ CUDA bloat
            console.log('   - Installing CPU Torch...');
            await runCmd(`"${pip}" install ${torchDeps} --index-url https://download.pytorch.org/whl/cpu`, { timeout: 600000 });
            console.log('   - Installing General Deps...');
            await runCmd(`"${pip}" install ${generalDeps}`, { timeout: 600000 });
        }

        console.log('🔨 Compilando ai_engine (Unified)...');
        const aiScript = path.join(__dirname, '../scripts/ai_engine.py');

        // Compile unified binary with exclusions to keep size down
        await runCmd(`"${pyinstaller}" --clean --noconfirm --onefile --distpath "${binDir}" --name ai_engine --collect-all demucs --collect-all torchaudio --collect-all librosa --collect-all sklearn --copy-metadata torch --copy-metadata torchaudio --copy-metadata demucs --hidden-import="sklearn.utils._cython_blas" --hidden-import="sklearn.neighbors.typedefs" --hidden-import="sklearn.neighbors.quad_tree" --hidden-import="sklearn.tree._utils" --exclude-module="matplotlib" --exclude-module="tkinter" "${aiScript}"`);

        console.log(`✅ Motores listos en: ${binDir}`);

    } catch (e) {
        console.error('❌ Error en el build:', e.message);
        process.exit(1);
    }
}

buildPython();

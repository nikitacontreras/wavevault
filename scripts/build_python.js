const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

async function buildPython() {
    console.log('🚧 Iniciando construcción de motores de IA (Versión Estable)...');

    let pythonBin = 'python3';
    const candidates = ['python3.11', 'python3.12', 'python3.10', 'python3'];
    for (const cand of candidates) {
        try {
            const { stdout } = await execAsync(`${cand} --version`);
            if (!stdout.includes('3.14')) { pythonBin = cand; break; }
        } catch (e) { }
    }
    console.log(`✅ Usando ${pythonBin} para el build.`);

    const binDir = path.join(__dirname, '../resources/bin');
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

    try {
        const venvPath = path.join(__dirname, '../.venv_build');
        if (!fs.existsSync(venvPath)) await execAsync(`${pythonBin} -m venv "${venvPath}"`);

        const pip = path.join(venvPath, 'bin', 'pip');
        const pyinstaller = path.join(venvPath, 'bin', 'pyinstaller');

        console.log('📦 Instalando dependencias estables (Torch 2.4.1)...');
        // Usamos Torch 2.4.1 y torchaudio 2.4.1 para evitar el error de TorchCodec
        await execAsync(`"${pip}" install numpy==1.26.4 torch==2.4.1 torchaudio==2.4.1 soundfile lameenc demucs pyinstaller`, { timeout: 600000 });

        console.log('🔨 Compilando separate_stems...');
        const stemsScript = path.join(__dirname, '../scripts/separate_stems.py');

        await execAsync(`"${pyinstaller}" --clean --onedir --distpath "${binDir}" --name separate_stems --collect-all demucs --collect-all torchaudio --copy-metadata torch --copy-metadata torchaudio --copy-metadata demucs "${stemsScript}"`);

        console.log('🔨 Compilando classify_audio...');
        const classifyScript = path.join(__dirname, '../scripts/classify_audio.py');
        await execAsync(`"${pyinstaller}" --clean --onedir --distpath "${binDir}" --name classify_audio --collect-all demucs --copy-metadata torch --copy-metadata demucs "${classifyScript}"`);

        console.log(`✅ Motores listos en: ${binDir}`);

    } catch (e) {
        console.error('❌ Error en el build:', e.message);
        process.exit(1);
    }
}

buildPython();

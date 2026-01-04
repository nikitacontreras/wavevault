const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

async function buildPython() {
    console.log('🚧 Setting up Python environment and building binary...');

    // Ensure resources/bin exists
    const binDir = path.join(__dirname, '../resources/bin');
    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
    }

    try {
        // 1. Install dependencies (assuming pip is available)
        console.log('📦 Installing librosa, numpy, pyinstaller...');
        // We use --user to avoid permission issues if not using venv, but actually venv is better.
        // For simplicity in this script, we assume the user has a python env they can write to, or we use a temporary venv.
        // Let's create a temporary venv to be safe.

        const venvPath = path.join(__dirname, '../.venv_build');
        if (!fs.existsSync(venvPath)) {
            await execAsync(`python3 -m venv "${venvPath}"`);
        }

        const pip = path.join(venvPath, 'bin', 'pip');
        const python = path.join(venvPath, 'bin', 'python');
        const pyinstaller = path.join(venvPath, 'bin', 'pyinstaller');

        await execAsync(`"${pip}" install librosa numpy pyinstaller`);

        // 2. Build the binary with PyInstaller
        console.log('🔨 Compiling classify_audio.py to binary...');
        const scriptPath = path.join(__dirname, '../scripts/classify_audio.py');

        // --onefile: single executable
        // --distpath: output directory
        // --name: output name
        await execAsync(`"${pyinstaller}" --clean --onefile --distpath "${binDir}" --name classify_audio "${scriptPath}"`);

        console.log(`✅ Binary built successfully at: ${path.join(binDir, 'classify_audio')}`);

        // Cleanup venv? Optional. Maybe keep for cache.

    } catch (e) {
        console.error('❌ Build failed:', e.message);
        console.error('Make sure python3 is installed and available in PATH.');
        process.exit(1);
    }
}

buildPython();

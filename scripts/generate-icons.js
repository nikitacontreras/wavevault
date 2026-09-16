const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
    console.log('[WaveVault] Generating macOS Squircle App Icon (icon.png)...');

    // Usaremos por defecto el logo blanco sobre fondo oscuro para el icono de instalación oficial
    const logoFileName = 'wavevault-white.svg';
    const logoPath = path.join(__dirname, '..', logoFileName);
    const outputPath = path.join(__dirname, '..', 'icon.png');

    if (!fs.existsSync(logoPath)) {
        console.error(`[WaveVault] Cannot find logo at: ${logoPath}`);
        process.exit(1);
    }

    let logoSvgContent = fs.readFileSync(logoPath, 'utf8');

    // Eliminar la declaración XML y el tag svg externo para poder incrustar los paths
    logoSvgContent = logoSvgContent
        .replace(/<\?xml.*?\?>/gi, '')
        .replace(/<svg[^>]*>/i, '')
        .replace(/<\/svg>/i, '');

    // Estilos del Squircle de macOS (Modo Oscuro Premium)
    const squircleBg = '#1e1e1e';
    const shadowColor = 'rgba(0,0,0,0.6)';
    const borderGradient = '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3a3a3a"/><stop offset="100%" stop-color="#141414"/></linearGradient>';

    // Creamos el SVG completo en alta resolución (1024x1024 para iconos macOS Retina)
    const composedSvg = `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
        <defs>
            ${borderGradient}
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="125%">
                <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="${shadowColor}" flood-opacity="0.55"/>
            </filter>
        </defs>
        <!-- Contenedor Squircle oficial de macOS a 1024px -->
        <rect x="64" y="64" width="896" height="896" rx="200" fill="${squircleBg}" stroke="url(#g)" stroke-width="8" filter="url(#shadow)" />
        <!-- Logo WaveVault centrado y escalado -->
        <!-- ViewBox original es 1023x945. Queremos que mida 560px de ancho. Escala = 560 / 1023 = ~0.547 -->
        <!-- X = (1024 - (1023 * 0.547)) / 2 = ~232. Y = (1024 - (945 * 0.547)) / 2 = ~253 -->
        <g transform="translate(232, 253) scale(0.547)">
            ${logoSvgContent}
        </g>
    </svg>`;

    try {
        // Convertimos el SVG a un PNG de alta resolución de 1024x1024 usando Sharp
        await sharp(Buffer.from(composedSvg))
            .resize(1024, 1024)
            .png()
            .toFile(outputPath);

        console.log(`[WaveVault] Successfully created high-res app icon at: ${outputPath}`);
    } catch (err) {
        console.error('[WaveVault] Error generating app icon:', err);
        process.exit(1);
    }
}

generateIcons();

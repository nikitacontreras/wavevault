/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{ts,tsx,html}",
    ],
    theme: {
        extend: {
            colors: {
                'wv-bg': '#0a0a0a',
                'wv-sidebar': '#141414',
                'wv-tertiary': '#1e1e1e',
                'wv-accent': '#ffffff',
                'wv-gray': {
                    DEFAULT: '#999999',
                    dark: '#1e1e1e',
                    light: '#333333'
                }
            },
        },
    },
    plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{ts,tsx,html}",
    ],
    theme: {
        extend: {
            colors: {
                'wv-bg': 'var(--wv-bg)',
                'wv-sidebar': 'var(--wv-sidebar)',
                'wv-surface': 'var(--wv-surface)',
                'wv-accent': 'var(--wv-accent)',
                'wv-text': 'var(--wv-text)',
                'wv-border': 'var(--wv-border)',
                'wv-gray': {
                    DEFAULT: 'var(--wv-text-muted)',
                    dark: '#222222',
                    light: '#e1e1e6'
                }
            },

        },
    },
    plugins: [],
}

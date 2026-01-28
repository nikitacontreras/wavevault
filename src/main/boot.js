const { app } = require('electron');
app.name = 'WaveVault';
require('ts-node').register({ transpileOnly: true });
require('./main.ts');

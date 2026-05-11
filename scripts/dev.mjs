import { execSync } from 'child_process'

// Remove ELECTRON_RUN_AS_NODE which VS Code sets in its integrated terminal.
// This causes Electron to run as plain Node.js, breaking built-in modules.
delete process.env.ELECTRON_RUN_AS_NODE

execSync('npx electron-vite dev', { stdio: 'inherit', env: process.env })

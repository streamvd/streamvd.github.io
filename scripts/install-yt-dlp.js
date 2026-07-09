const { spawnSync } = require('child_process');
const path = require('path');

function run(command, args, label, env = process.env) {
    const result = spawnSync(command, args, { stdio: 'inherit', env });
    if (result.status !== 0) {
        console.error(`Falha ao executar ${label}: ${command} ${args.join(' ')}`);
        return false;
    }
    return true;
}

function getProjectVenvPath() {
    return path.join(__dirname, '..', '.yt-dlp-venv');
}

function getProjectYtDlpBinary() {
    const venvPath = getProjectVenvPath();
    const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    return path.join(venvPath, process.platform === 'win32' ? 'Scripts' : 'bin', binaryName);
}

function hasProjectLocalYtDlp() {
    const binaryPath = getProjectYtDlpBinary();
    const result = spawnSync(binaryPath, ['--version'], { stdio: 'ignore' });
    return result.status === 0;
}

if (hasProjectLocalYtDlp()) {
    console.log('yt-dlp já está disponível localmente.');
    process.exit(0);
}

const pythonCommands = process.platform === 'win32'
    ? ['py', 'python']
    : ['python3', 'python'];

const venvPath = getProjectVenvPath();
let createdVenv = false;

for (const pythonCommand of pythonCommands) {
    if (run(pythonCommand, ['-m', 'venv', venvPath], `criar ambiente virtual com ${pythonCommand}`)) {
        createdVenv = true;
        break;
    }
}

if (!createdVenv) {
    console.error('Não foi possível criar o ambiente virtual do projeto.');
    process.exit(1);
}

const pipCommand = process.platform === 'win32'
    ? path.join(venvPath, 'Scripts', 'python.exe')
    : path.join(venvPath, 'bin', 'python');

if (run(pipCommand, ['-m', 'pip', 'install', '--disable-pip-version-check', '--upgrade', 'pip'], 'atualizar pip do ambiente virtual')) {
    if (run(pipCommand, ['-m', 'pip', 'install', '--disable-pip-version-check', 'yt-dlp'], 'instalar yt-dlp no ambiente virtual')) {
        if (hasProjectLocalYtDlp()) {
            console.log('yt-dlp instalado com sucesso.');
            process.exit(0);
        }
    }
}

console.error('Não foi possível instalar o yt-dlp automaticamente.');
process.exit(1);

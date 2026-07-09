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

function hasYtDlp() {
    const candidates = [
        getProjectYtDlpBinary(),
        'yt-dlp',
        'yt-dlp.exe',
        'python',
        'python3'
    ];

    for (const candidate of candidates) {
        const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
        if (result.status === 0) {
            return true;
        }
    }

    return false;
}

if (hasYtDlp()) {
    console.log('yt-dlp já está disponível.');
    process.exit(0);
}

const pythonCommands = [];
if (process.platform === 'win32') {
    pythonCommands.push('py');
    pythonCommands.push('python');
} else {
    pythonCommands.push('python3');
    pythonCommands.push('python');
}

const venvPath = getProjectVenvPath();
const installSteps = [];

for (const pythonCommand of pythonCommands) {
    installSteps.push({
        label: `criar ambiente virtual com ${pythonCommand}`,
        command: pythonCommand,
        args: ['-m', 'venv', venvPath]
    });
}

for (const step of installSteps) {
    if (run(step.command, step.args, step.label)) {
        break;
    }
}

const venvBinary = getProjectYtDlpBinary();
const pipCommand = process.platform === 'win32' ? path.join(venvPath, 'Scripts', 'python.exe') : path.join(venvPath, 'bin', 'python');

const installCommand = [
    { label: 'instalar yt-dlp no ambiente virtual', command: pipCommand, args: ['-m', 'pip', 'install', '--disable-pip-version-check', 'yt-dlp'] }
];

for (const step of installCommand) {
    if (run(step.command, step.args, step.label)) {
        if (hasYtDlp()) {
            console.log('yt-dlp instalado com sucesso.');
            process.exit(0);
        }
    }
}

console.error('Não foi possível instalar o yt-dlp automaticamente.');
process.exit(1);

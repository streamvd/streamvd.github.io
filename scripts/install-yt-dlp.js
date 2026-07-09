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

function getUserLocalBin() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return homeDir ? path.join(homeDir, '.local', 'bin') : '';
}

function hasYtDlp() {
    const localBin = getUserLocalBin();
    const candidates = [
        ['yt-dlp', ['--version']],
        ['yt-dlp.exe', ['--version']],
        ['python', ['-m', 'yt_dlp', '--version']],
        ['python3', ['-m', 'yt_dlp', '--version']]
    ];

    if (localBin) {
        candidates.unshift([path.join(localBin, 'yt-dlp'), ['--version']]);
        candidates.unshift([path.join(localBin, 'yt-dlp.exe'), ['--version']]);
    }

    for (const [command, args] of candidates) {
        const result = spawnSync(command, args, { stdio: 'ignore' });
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

const localBin = getUserLocalBin();
const envWithLocalBin = {
    ...process.env,
    PATH: [process.env.PATH, localBin].filter(Boolean).join(path.delimiter)
};

const installSteps = [
    { label: 'pip via python', command: 'python', args: ['-m', 'pip', 'install', '--user', 'yt-dlp'] },
    { label: 'pip via python3', command: 'python3', args: ['-m', 'pip', 'install', '--user', 'yt-dlp'] },
    { label: 'pip', command: 'pip', args: ['install', '--user', 'yt-dlp'] },
    { label: 'apt-get update', command: 'apt-get', args: ['update'] },
    { label: 'apt-get install yt-dlp', command: 'apt-get', args: ['install', '-y', 'yt-dlp'] }
];

for (const step of installSteps) {
    if (run(step.command, step.args, step.label, envWithLocalBin)) {
        if (hasYtDlp()) {
            console.log('yt-dlp instalado com sucesso.');
            process.exit(0);
        }
    }
}

console.error('Não foi possível instalar o yt-dlp automaticamente.');
process.exit(1);

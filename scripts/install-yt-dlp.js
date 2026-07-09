const { spawnSync } = require('child_process');

function run(command, args, label) {
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.status !== 0) {
        console.error(`Falha ao executar ${label}: ${command} ${args.join(' ')}`);
        return false;
    }
    return true;
}

function hasYtDlp() {
    const checks = [
        ['yt-dlp', ['--version']],
        ['yt-dlp.exe', ['--version']],
        ['python', ['-m', 'yt_dlp', '--version']],
        ['python3', ['-m', 'yt_dlp', '--version']]
    ];

    for (const [command, args] of checks) {
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

const installSteps = [
    { label: 'pip via python', command: 'python', args: ['-m', 'pip', 'install', '--user', 'yt-dlp'] },
    { label: 'pip via python3', command: 'python3', args: ['-m', 'pip', 'install', '--user', 'yt-dlp'] },
    { label: 'pip', command: 'pip', args: ['install', '--user', 'yt-dlp'] },
    { label: 'apt-get', command: 'apt-get', args: ['update'] },
    { label: 'apt-get install', command: 'apt-get', args: ['install', '-y', 'yt-dlp'] }
];

for (const step of installSteps) {
    if (run(step.command, step.args, step.label)) {
        if (hasYtDlp()) {
            console.log('yt-dlp instalado com sucesso.');
            process.exit(0);
        }
    }
}

console.error('Não foi possível instalar o yt-dlp automaticamente.');
process.exit(1);

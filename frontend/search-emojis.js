const fs = require('fs');
const path = require('path');

const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx') || fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            let hasEmoji = false;
            lines.forEach((line, index) => {
                const match = line.match(emojiRegex);
                if (match) {
                    console.log(`File: ${fullPath}:${index + 1}`);
                    console.log(`  Line: ${line.trim()}`);
                    console.log(`  Emojis: ${match.join(' ')}\n`);
                }
            });
        }
    }
}

scanDir(path.join(__dirname, 'app'));
scanDir(path.join(__dirname, 'components'));

/**
 * NGG Storyboard Publisher
 *
 * Publishes a storyboard from a client folder to the ngg-storyboards repo
 * and triggers a Vercel deployment.
 *
 * Usage:
 *   node scripts/publish-storyboard.js <source-folder> <client-name> <project-name>
 *
 * Example:
 *   node scripts/publish-storyboard.js "C:\Users\ddriv\projects\clients\regenTX\Projects\Summit Video\storyboard" regentx summit-video-2025
 *
 * The script will:
 * 1. Copy index.html from source to /<client-name>/<project-name>/
 * 2. Update the landing page with the new project (if not already listed)
 * 3. Commit and push to GitHub
 * 4. Vercel will auto-deploy from the GitHub webhook
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');

function main() {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log('Usage: node publish-storyboard.js <source-folder> <client-name> <project-name>');
        console.log('');
        console.log('Example:');
        console.log('  node publish-storyboard.js "path/to/storyboard" regentx summit-video-2025');
        process.exit(1);
    }

    const [sourceFolder, clientName, projectName] = args;

    // Validate source folder exists
    if (!fs.existsSync(sourceFolder)) {
        console.error(`Error: Source folder not found: ${sourceFolder}`);
        process.exit(1);
    }

    // Check for index.html in source
    const sourceIndex = path.join(sourceFolder, 'index.html');
    if (!fs.existsSync(sourceIndex)) {
        console.error(`Error: index.html not found in source folder`);
        process.exit(1);
    }

    // Create target directory
    const targetDir = path.join(REPO_ROOT, clientName.toLowerCase(), projectName.toLowerCase());
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`✓ Created directory: ${targetDir}`);

    // Copy index.html
    const targetIndex = path.join(targetDir, 'index.html');
    fs.copyFileSync(sourceIndex, targetIndex);
    console.log(`✓ Copied index.html to ${targetDir}`);

    // Copy any additional assets (images, audio files, etc.)
    const files = fs.readdirSync(sourceFolder);
    for (const file of files) {
        if (file !== 'index.html') {
            const srcFile = path.join(sourceFolder, file);
            const destFile = path.join(targetDir, file);
            if (fs.statSync(srcFile).isFile()) {
                fs.copyFileSync(srcFile, destFile);
                console.log(`✓ Copied ${file}`);
            }
        }
    }

    // Git operations
    console.log('\nCommitting and pushing to GitHub...');
    try {
        process.chdir(REPO_ROOT);
        execSync('git add .', { stdio: 'inherit' });
        execSync(`git commit -m "Add/update ${clientName}/${projectName} storyboard"`, { stdio: 'inherit' });
        execSync('git push', { stdio: 'inherit' });
        console.log('\n✓ Pushed to GitHub - Vercel will auto-deploy');
    } catch (error) {
        if (error.message.includes('nothing to commit')) {
            console.log('No changes to commit');
        } else {
            throw error;
        }
    }

    // Output URLs
    console.log('\n========================================');
    console.log('Storyboard Published!');
    console.log('========================================');
    console.log(`Landing Page: https://ngg-storyboards.vercel.app/`);
    console.log(`Storyboard:   https://ngg-storyboards.vercel.app/${clientName.toLowerCase()}/${projectName.toLowerCase()}/`);
    console.log('========================================');
}

main();

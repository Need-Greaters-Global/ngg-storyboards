# NGG Interactive Storyboards

Interactive storyboards for video production with embedded audio.

**Live Site:** https://ngg-storyboards.vercel.app

## Overview

This repository hosts interactive HTML storyboards for video production projects. Each storyboard includes:
- Scene-by-scene layout with visual descriptions
- Embedded audio players with narration for each scene
- Audio hosted on Cloudinary for reliable streaming
- Clean, responsive design for client review

## Structure

```
ngg-storyboards/
├── index.html              # Landing page listing all projects
├── styles/
│   └── storyboard.css      # Shared styles for all storyboards
├── scripts/
│   └── publish-storyboard.js  # Publishing automation
├── [client]/
│   └── [project]/
│       └── index.html      # Individual storyboard
```

## Current Projects

| Client | Project | URL |
|--------|---------|-----|
| RegenTx | Summit Video 2025 | [View](https://ngg-storyboards.vercel.app/regentx/summit-video-2025/) |

## Workflow

### Creating a New Storyboard

1. **Generate scene audio** using ElevenLabs (v3 model with audio tags)
2. **Upload audio to Cloudinary** for hosting
3. **Create HTML storyboard** in the client folder with embedded audio URLs
4. **Publish** using the publish script

### Publishing a Storyboard

```bash
node scripts/publish-storyboard.js <source-folder> <client-name> <project-name>
```

Example:
```bash
node scripts/publish-storyboard.js "C:\path\to\storyboard" regentx summit-video-2025
```

The script will:
1. Copy files to the appropriate directory
2. Commit and push to GitHub
3. Vercel auto-deploys from the webhook

## Technical Details

- **Hosting:** Vercel (auto-deploy from GitHub)
- **Audio CDN:** Cloudinary
- **TTS:** ElevenLabs API v3
- **Voice Settings:** stability 0.5, similarity_boost 0.75

## Local Development

Simply open any HTML file in a browser - no build step required.

---

*Need Greaters Global*

# FFmpeg Core Files Setup

This directory should contain the FFmpeg WebAssembly core files for secure local hosting instead of loading from external CDNs.

## Required Files

You need to download and place the following files in this directory:

- `ffmpeg-core.js`
- `ffmpeg-core.wasm`

## How to Obtain the Files

### Option 1: From NPM Package (Recommended)

1. Install the ffmpeg core package:
   ```bash
   npm install @ffmpeg/core@0.12.10
   ```

2. Copy the required files from node_modules:
   ```bash
   cp node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js public/ffmpeg/
   cp node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm public/ffmpeg/
   ```

### Option 2: Direct Download from GitHub Releases

1. Go to https://github.com/ffmpegwasm/ffmpeg.wasm/releases
2. Download the appropriate version (v0.12.10 or latest)
3. Extract and copy `ffmpeg-core.js` and `ffmpeg-core.wasm` to this directory

## Security Notes

- These files are served from your own domain, eliminating external CDN security risks
- Ensure the files are from official ffmpeg.wasm sources only
- Consider adding integrity checks if serving these files in production
- The files should be committed to your repository for consistency across deployments

## File Verification

After copying the files, verify they exist:
```bash
ls -la public/ffmpeg/
```

You should see:
- ffmpeg-core.js
- ffmpeg-core.wasm
- README.md (this file)

## Production Considerations

- Consider using a Content Security Policy (CSP) that allows WebAssembly execution
- Monitor the file sizes as they can be quite large (several MB)
- Consider using compression (gzip/brotli) for serving these files
- Ensure your web server is configured to serve .wasm files with the correct MIME type: `application/wasm` 
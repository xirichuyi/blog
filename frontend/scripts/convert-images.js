/**
 * Script to convert images to next-gen formats (WebP and AVIF)
 * 
 * Usage:
 * node convert-images.js
 * 
 * Dependencies:
 * npm install sharp glob
 */

import sharp from 'sharp';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';

// Get current script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
    // Source directories to scan for images
    sourceDirs: [
        path.join(__dirname, '../../backend/uploads/covers/*.{jpg,jpeg,png}'),
        path.join(__dirname, '../../backend/uploads/images/*.{jpg,jpeg,png}'),
        path.join(__dirname, '../../backend/uploads/music_covers/*.{jpg,jpeg,png}')
    ],
    // Quality settings (0-100)
    webpQuality: 80,
    avifQuality: 65,
    // Skip files smaller than this size (in bytes)
    minSize: 10 * 1024, // 10KB
    // Log level: 0 = errors only, 1 = info, 2 = verbose
    logLevel: 1
};

// Statistics
const stats = {
    processed: 0,
    skipped: 0,
    errors: 0,
    webpSavings: 0,
    avifSavings: 0,
    originalSize: 0
};

/**
 * Log messages with different levels
 */
function log(message, level = 1) {
    if (level <= config.logLevel) {
        console.log(message);
    }
}

/**
 * Convert a single image to WebP and AVIF formats
 */
async function convertImage(imagePath) {
    try {
        const fileSize = fs.statSync(imagePath).size;

        // Skip small files
        if (fileSize < config.minSize) {
            log(`Skipping small file: ${imagePath}`, 2);
            stats.skipped++;
            return;
        }

        stats.originalSize += fileSize;
        const basePath = imagePath.substring(0, imagePath.lastIndexOf('.'));

        // Convert to WebP
        const webpPath = `${basePath}.webp`;
        await sharp(imagePath)
            .webp({ quality: config.webpQuality })
            .toFile(webpPath);

        // Convert to AVIF
        const avifPath = `${basePath}.avif`;
        await sharp(imagePath)
            .avif({ quality: config.avifQuality })
            .toFile(avifPath);

        // Calculate size savings
        const webpSize = fs.statSync(webpPath).size;
        const avifSize = fs.statSync(avifPath).size;

        stats.webpSavings += (fileSize - webpSize);
        stats.avifSavings += (fileSize - avifSize);

        log(`Converted: ${path.basename(imagePath)}`, 1);
        log(`  Original: ${formatSize(fileSize)}`, 2);
        log(`  WebP: ${formatSize(webpSize)} (${formatSavings(fileSize, webpSize)})`, 2);
        log(`  AVIF: ${formatSize(avifSize)} (${formatSavings(fileSize, avifSize)})`, 2);

        stats.processed++;
    } catch (error) {
        log(`Error converting ${imagePath}: ${error.message}`, 0);
        stats.errors++;
    }
}

/**
 * Format file size in human-readable format
 */
function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format savings as percentage and size
 */
function formatSavings(original, converted) {
    const savings = original - converted;
    const percentage = (savings / original * 100).toFixed(1);
    return `${formatSize(savings)} saved (${percentage}%)`;
}

/**
 * Main function
 */
async function main() {
    log('🖼️ Starting image conversion to next-gen formats...');

    // Process each source directory
    for (const pattern of config.sourceDirs) {
        const files = await glob(pattern);
        log(`Found ${files.length} images in ${pattern}`, 1);

        for (const file of files) {
            await convertImage(file);
        }
    }

    // Print statistics
    log('\n📊 Conversion Statistics:');
    log(`Images processed: ${stats.processed}`);
    log(`Images skipped: ${stats.skipped}`);
    log(`Errors: ${stats.errors}`);
    log(`Original size: ${formatSize(stats.originalSize)}`);
    log(`WebP savings: ${formatSize(stats.webpSavings)} (${(stats.webpSavings / stats.originalSize * 100).toFixed(1)}%)`);
    log(`AVIF savings: ${formatSize(stats.avifSavings)} (${(stats.avifSavings / stats.originalSize * 100).toFixed(1)}%)`);

    log('\n✅ Conversion complete!');
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

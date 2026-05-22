import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const src = join(root, 'static', 'logo.svg');
const outDir = join(root, 'static');

const svg = await readFile(src);

const outputs = [
	{ name: 'icon-192.png', size: 192 },
	{ name: 'icon-512.png', size: 512 },
	{ name: 'apple-touch-icon.png', size: 180 },
	{ name: 'icon-512-maskable.png', size: 512, padding: 0.2 }
];

await mkdir(outDir, { recursive: true });

for (const { name, size, padding } of outputs) {
	if (padding) {
		const inner = Math.round(size * (1 - padding * 2));
		await sharp({
			create: { width: size, height: size, channels: 4, background: '#0f6b30' }
		})
			.composite([{ input: await sharp(svg).resize(inner, inner).png().toBuffer() }])
			.png()
			.toFile(join(outDir, name));
	} else {
		await sharp(svg).resize(size, size).png().toFile(join(outDir, name));
	}
	console.log(`wrote ${name} (${size}px)`);
}

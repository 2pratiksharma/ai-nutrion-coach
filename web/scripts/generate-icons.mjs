// Renders the app icons from scripts/icon.svg. Run: npm run icons -w web
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.join(import.meta.dirname, "..");
const icon = await readFile(path.join(import.meta.dirname, "icon.svg"));
const badge = await readFile(path.join(import.meta.dirname, "badge.svg"));

const out = (name) => path.join(root, "public", "icons", name);
const render = (svg, size) => sharp(svg, { density: 384 }).resize(size, size);

await Promise.all([
  render(icon, 192).png().toFile(out("icon-192.png")),
  render(icon, 512).png().toFile(out("icon-512.png")),
  // Maskable icons are cropped to a circle/squircle; the design already keeps content in the safe zone.
  render(icon, 512).png().toFile(out("maskable-512.png")),
  render(icon, 180).png().toFile(path.join(root, "src", "app", "apple-icon.png")),
  render(icon, 48).png().toFile(path.join(root, "src", "app", "icon.png")),
  render(badge, 96).png().toFile(out("badge-96.png")),
]);
console.log("icons written");

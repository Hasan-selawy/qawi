import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(__dirname, "dist/public/index.html");
const serverEntry = resolve(__dirname, "dist/server/entry-server.js");

const { render } = await import(serverEntry);
const appHtml = render();

let html = readFileSync(indexPath, "utf-8");

const marker = '<div id="root"></div>';
if (!html.includes(marker)) {
  throw new Error(
    'prerender: could not find empty <div id="root"></div> in dist/public/index.html',
  );
}

html = html.replace(marker, `<div id="root">${appHtml}</div>`);
writeFileSync(indexPath, html);

console.log(
  `prerender: injected ${appHtml.length} bytes of static HTML into dist/public/index.html`,
);

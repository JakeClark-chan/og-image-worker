import { Hono } from "hono";
import { ImageResponse } from "workers-og";

const app = new Hono();

// Tabi theme colors (mint skin)
const themes = {
	light: {
		bg: "#ffffff",
		text: "#222222",
		secondary: "#555555",
		accent: "#00804d",
		tagBg: "#e8f5f0",
		tagText: "#00804d",
	},
	dark: {
		bg: "#1f1f1f",
		text: "#e6e6e6",
		secondary: "#aaaaaa",
		accent: "#00b86e",
		tagBg: "#1a3a2a",
		tagText: "#00b86e",
	},
};

// Fetch and cache Inter font (must be TTF — satori does not support woff2)
let fontCache: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
	if (fontCache) return fontCache;
	const res = await fetch(
		"https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf"
	);
	fontCache = await res.arrayBuffer();
	return fontCache;
}

app.get("/og", async (c) => {
	const {
		title = "JakeClark",
		description = "",
		author = "JakeClark",
		date = "",
		tags = "",
		theme: themeParam = "dark",
	} = c.req.query();

	const t = themeParam === "light" ? themes.light : themes.dark;
	const tagList = tags
		? tags.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4)
		: [];

	const fontData = await getFont();
	const titleSize = title.length > 60 ? 38 : title.length > 40 ? 46 : 54;

	// Build bottom metadata elements
	let bottomLeft = "";
	if (date && tagList.length > 0) {
		bottomLeft = `<div style="display: flex; align-items: center; gap: 16px;"><span style="font-size: 17px; color: ${t.secondary};">${escapeHtml(date)}</span>${tagList.map((tag) => `<span style="font-size: 15px; color: ${t.tagText}; background: ${t.tagBg}; padding: 4px 12px; border-radius: 4px;">#${escapeHtml(tag)}</span>`).join("")}</div>`;
	} else if (date) {
		bottomLeft = `<span style="font-size: 17px; color: ${t.secondary};">${escapeHtml(date)}</span>`;
	} else if (tagList.length > 0) {
		bottomLeft = `<div style="display: flex; align-items: center; gap: 8px;">${tagList.map((tag) => `<span style="font-size: 15px; color: ${t.tagText}; background: ${t.tagBg}; padding: 4px 12px; border-radius: 4px;">#${escapeHtml(tag)}</span>`).join("")}</div>`;
	}

	// Description line
	const descHtml = description
		? `<div style="display: flex; font-size: 22px; color: ${t.secondary}; line-height: 1.5;">${escapeHtml(description.length > 140 ? description.slice(0, 140) + "..." : description)}</div>`
		: "";

	// NOTE: Satori requires ALL containers with 2+ children to have display:flex.
	// No HTML comments allowed. Every element needs display:flex on parent.
	const html = `<div style="display: flex; width: 1200px; height: 630px; background: ${t.bg};"><div style="display: flex; width: 6px; height: 630px; background: ${t.accent};"></div><div style="display: flex; flex-direction: column; justify-content: space-between; width: 1194px; padding: 52px 56px;"><div style="display: flex; font-size: 22px; color: ${t.secondary};">thanhnc.id.vn</div><div style="display: flex; flex-direction: column; gap: 16px;"><div style="display: flex; font-size: ${titleSize}px; font-weight: 700; color: ${t.text}; line-height: 1.2;">${escapeHtml(title)}</div>${descHtml}</div><div style="display: flex; align-items: center; justify-content: space-between;">${bottomLeft}<span style="font-size: 18px; color: ${t.accent}; font-weight: 600;">${escapeHtml(author)}</span></div></div></div>`;

	return new ImageResponse(html, {
		width: 1200,
		height: 630,
		fonts: [
			{
				name: "Inter",
				data: fontData,
				style: "normal" as const,
			},
		],
		headers: {
			"Cache-Control": "public, max-age=86400, s-maxage=604800",
		},
	});
});

// Health check
app.get("/", (c) => c.text("OG Image Generator is running."));

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export default app;

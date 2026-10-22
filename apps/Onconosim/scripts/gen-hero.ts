// One-off hero image generation via the z-ai-web-dev-sdk (run with: bun run scripts/gen-hero.ts)
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

async function main() {
  const zai = await ZAI.create();
  const resp = await zai.images.generations.create({
    prompt:
      "Dark scientific abstract illustration: luminous teal and violet molecular network nodes connected by glowing dashed lines, a faint DNA double helix, protein ribbon structures, deep navy-black background, biotech editorial style, cinematic depth, high detail, no text, no words",
    size: "1024x1024",
  });
  const b64 = resp.data[0].base64;
  fs.writeFileSync("public/hero-oncology.png", Buffer.from(b64, "base64"));
  console.log("hero image written to public/hero-oncology.png");
}
main().catch((e) => {
  console.error("hero gen failed:", e.message);
  process.exit(1);
});

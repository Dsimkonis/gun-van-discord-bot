const https = require("https");

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = "1552204841764257813";

if (!TOKEN) {
  throw new Error("DISCORD_TOKEN secret is missing.");
}

function getPage(url) {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 GunVanBot/1.0"
        }
      },
      res => {
        let data = "";

        res.on("data", chunk => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }

          resolve(data);
        });
      }
    ).on("error", reject);
  });
}

function discordRequest(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);

    const req = https.request(
      {
        hostname: "discord.com",
        path,
        method: "POST",
        headers: {
          "Authorization": `Bot ${TOKEN}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data)
        }
      },
      res => {
        let response = "";

        res.on("data", chunk => {
          response += chunk;
        });

        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(
              new Error(
                `Discord API ${res.statusCode}: ${response}`
              )
            );
            return;
          }

          resolve(response);
        });
      }
    );

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("Getting today's Gun Van...");

  const html = await getPage(
    "https://www.gtaboss.gg/gta-5-online/gun-van"
  );

  /*
   * GTA Boss currently exposes the daily location in text similar to:
   *
   * Today's location | La Mesa, spot 19 of 30
   */

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");

  const match = text.match(
    /Today's location\s*\|\s*([^,]+),\s*spot\s+(\d+)\s+of\s+30/i
  );

  if (!match) {
    console.log(text.substring(0, 5000));
    throw new Error("Could not find today's Gun Van location.");
  }

  const area = match[1].trim();
  const spot = Number(match[2]);

  console.log(`Location: ${area}`);
  console.log(`Spot: #${spot}`);

  const mapUrl =
    "https://www.gtaboss.gg/gta-5-online/gun-van";

  const payload = {
    username: "Dsimkonis",
    embeds: [
      {
        title: "🔫 GTA ONLINE — GUN VAN",
        description:
          `📍 **Location:** ${area}\n` +
          `🔢 **Spot:** #${spot} / 30\n\n` +
          `🕕 Changes daily at **06:00 UTC**\n\n` +
          `🗺️ [**Open Gun Van map**](${mapUrl})`,
        color: 15158332,
        footer: {
          text: "Gun Van Bot • Daily update"
        }
      }
    ]
  };

  await discordRequest(
    `/api/v10/channels/${CHANNEL_ID}/messages`,
    payload
  );

  console.log("✅ Gun Van message sent to Discord.");
}

main().catch(error => {
  console.error("❌ ERROR:");
  console.error(error);
  process.exit(1);
});

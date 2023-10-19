import playwright from "playwright";
import clipboard from "clipboardy";
import { Command } from "commander";
import path from "node:path";
import { range } from "lodash";
import { writeFileSync } from "node:fs";
import * as cheerio from "cheerio";

const urlSpecialCases = {
  14: "14-南は梅雨入り、北は運動会",
  26: "26-夫婦の数だけ幸せの形があるんだ！",
  72: "72-フルコンボ！！！",
  74: "74-なんでもコンビニ化",
  78: "78-イランカラㇷ゚テ（こんにちは）",
  85: "85-バキバキの身体",
  87: "87-三十路坊や誕生",
  88: "88-衣替えの季節",
  91: "91-歯を食いしばって生きない",
  94: "94-むかしの話",
  95: "95-うまかもん",
  123: "123-少しくらい長生きさせてくれ",
  168: "168-まだまだ足りない！",
};

const program = new Command();

interface Opts {
  start: number;
  end: number;
  ptstart: number;
  ptend: number;
}
program
  .option("--start <value>", "first transcript to scrape", "0")
  .option("--end <value>", "last transcript to scrape", "0")
  .option("--ptstart <value>", "first patreon transcript to scrape", "0")
  .option("--ptend <value>", "last patreon transcript to scrape", "0");

program.parse(process.argv);
const options = program.opts<Opts>();

const transcriptURL = (videoNumber: number) => {
  if (urlSpecialCases[videoNumber]) {
    return `https://nihongothatsdan.com/${urlSpecialCases[videoNumber]}/`;
  }
  return `https://nihongothatsdan.com/${videoNumber}-2/`;
};

const ptTranscriptURL = (videoNumber: number) =>
  `https://nihongothatsdan.com/pt${videoNumber}/`;

const outputDir = path.resolve("./transcripts");

async function main() {
  console.log(
    "scraping transcripts from",
    options.start,
    "to",
    options.end,
    "and patreon transcripts from",
    options.ptstart,
    "to",
    options.ptend
  );

  console.log("saving to", outputDir);

  const browser = await playwright.chromium.launch({
    headless: true,
  });

  let transcriptURLs: string[] = [];

  if (Number(options.end) > 0) {
    transcriptURLs = range(Number(options.start), Number(options.end) + 1).map(
      transcriptURL
    );
  }

  let patreonTranscriptURLs: string[] = [];

  if (Number(options.ptend) > 0) {
    patreonTranscriptURLs = range(
      Number(options.ptstart),
      Number(options.ptend) + 1
    ).map(ptTranscriptURL);
  }

  const page = await browser.newPage();

  // blackhole google ads
  await page.route("**/*", (route) => {
    route.request().url().startsWith("https://google")
      ? route.abort()
      : route.continue();
    return;
  });

  async function downloadAndSave(urls) {
    for (const url of urls) {
      console.log("getting transcript:", url);
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 5000 });
        const result = await page
          .locator(".post-content")
          .first()
          .innerHTML({ timeout: 5000 });

        const $ = cheerio.load(result);
        $(".addtoany_content").remove();

        const urlParts = url.split("/");
        const path = urlParts.slice(urlParts.length - 2).join("");
        writeFileSync(`${outputDir}/${path}.html`, $.html());
      } catch (e) {
        console.log("ERROR:", url, e);
      }
    }
  }

  await downloadAndSave(transcriptURLs);
  await downloadAndSave(patreonTranscriptURLs);

  await browser.close();
}

main();

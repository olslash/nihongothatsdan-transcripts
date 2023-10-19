import playwright from "playwright";
import clipboard from "clipboardy";
import { Command } from "commander";
import path from "node:path";
import { range } from "lodash";
import { writeFileSync } from "node:fs";
import * as cheerio from "cheerio";

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

const transcriptURL = (videoNumber: number) =>
  `https://nihongothatsdan.com/${videoNumber}-2/`;

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

  async function downloadAndSave(urls) {
    for (const url of urls) {
      console.log("getting transcript:", url);
      await page.goto(url);
      const result = await page.locator(".post-content").first().innerHTML();

      const $ = cheerio.load(result);
      $(".addtoany_content").remove();

      const urlParts = url.split("/");
      const path = urlParts.slice(urlParts.length - 2).join("");
      writeFileSync(`${outputDir}/${path}.html`, $.html());
    }
  }

  await downloadAndSave(transcriptURLs);
  await downloadAndSave(patreonTranscriptURLs);

  await browser.close();
}

main();

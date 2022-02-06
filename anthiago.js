const puppeteer = require("puppeteer-extra");

let page;
let browser;
async function initPage(onContentLoaded) {
  browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: [
      "--incognito",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
  const pages = await browser.pages();
  page = pages[0];
  await page.bringToFront();
  page.on("domcontentloaded", onContentLoaded);
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36."
  );

  return page;
}

async function closeBrowser() {
    await browser.close();
}

module.exports = {
    initPage,
    closeBrowser
}
const puppeteer = require("puppeteer");
const argv = require("yargs").argv;
const fs = require("fs");
const franc = require("franc-all");
const parse = require("date-fns/parse");

const SELECTOR = require("./utils/selectors");
const actualLog = require("./data/log.json");
const dataJson = require("./data/data.json");

const TO_SAVE = parseInt(argv.files, 0) || 1;

async function run() {
  const browser = await puppeteer.launch({
    headless: true
  });

  const page = await browser.newPage();

  // const LAST_MANGA = actualLog[actualLog.length - 1]
  //   ? actualLog[actualLog.length - 1].id
  //   : 0;
  const LAST_MANGA = 152771;
  const LOG = [...actualLog];
  const dataArray = [...dataJson];

  console.log(LAST_MANGA, LAST_MANGA + TO_SAVE);
  for (let index = LAST_MANGA + 1; index <= LAST_MANGA + TO_SAVE; index++) {
    const TIME = 15000 + Math.floor(Math.random() * (100 - 1 + 1) + 1);
    await page.waitFor(TIME);
    console.log(`Fetching manga id: ${index}`);
    await page.goto(`https://www.mangaupdates.com/series.html?id=${index}`);
    await page.screenshot({ path: `screenshots/manga_${index}.jpg` });

    // Check if is a valid id
    const isValid = await page.evaluate(sel => {
      const element = document.querySelector(sel);
      return element && element.textContent.trim() === "Error"
        ? element.textContent.trim()
        : null;
    }, SELECTOR.ERROR);

    if (isValid !== null) {
      const errorMsg = await page.evaluate(sel => {
        const element = document.querySelector(sel);
        return element ? element.textContent.trim() : null;
      }, SELECTOR.ERROR_MSG);
      LOG.push({ id: index, status: "ERROR", msg: errorMsg });
      continue;
    }

    // Name
    const name = await page.evaluate(sel => {
      return document.querySelector(sel).innerHTML;
    }, SELECTOR.MAIN_TITLE);

    // Description
    let description = "";
    try {
      description = await page.evaluate(sel => {
        // Remove 'Less' hyperlink
        var elements = document.querySelectorAll("#div_desc_more > a");
        for (var i = 0; i < elements.length; i++) {
          elements[i].parentNode.removeChild(elements[i]);
        }
        return document.querySelector(sel).textContent.trim();
      }, "#div_desc_more");
    } catch (e) {
      description = await page.evaluate(sel => {
        return document.querySelector(sel).textContent.trim();
      }, SELECTOR.DESCRIPTION);
    }

    // Type
    const type = await page.evaluate(sel => {
      return document.querySelector(sel).innerHTML.trim();
    }, SELECTOR.TYPE);

    const relatedSeries = await page.evaluate(sel => {
      if (document.querySelector(sel).textContent === "N/A") {
        return [];
      }

      let html = document.querySelector(sel).innerHTML;
      const rseries = html.trim().split("<br>");
      return rseries
        .map(ser => {
          try {
            const RS_HREF_REGEX = /href="(.*?)"/g;
            const HTML_TAGS_REGEX = /(?:<[^>]+>)*/g;
            const LAST_PARENTHESIS_REGEX = /\(([^)]*)\)[^(]*$/g;
            const asdfsd = ser.replace(HTML_TAGS_REGEX, "");
            return {
              id: ser
                .match(RS_HREF_REGEX)[0]
                .match(/\d+/g)[0]
                .replace("series.html?id=", ""),
              name: asdfsd.replace(LAST_PARENTHESIS_REGEX, "").trim(),
              relation: asdfsd
                .match(LAST_PARENTHESIS_REGEX)[0]
                .replace(/(\(|\))+/g, "")
            };
          } catch (err) {
            return err;
          }
        })
        .filter(rs => rs !== {});
    }, SELECTOR.RELATED_SERIES);

    const associatedNames = (
      await page.evaluate(sel => {
        let html = document.querySelector(sel).innerText;
        return html.trim().split(/\n/gi);
      }, SELECTOR.ASSOCIATED_NAMES)
    ).map(name => {
      const lang = franc(name);
      return {
        name: name,
        lang: lang !== "und" ? lang : undefined
      };
    });

    const statusInCountryOfOrigin = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().split(/\n/gi);
    }, SELECTOR.STATUS_IN_COUNTRY_OF_ORIGIN);

    const completelyScanlated = await page.evaluate(sel => {
      return document.querySelector(sel).textContent.trim();
    }, SELECTOR.COMPLETELY_SCANLATED);

    const lastUpdated = await page.evaluate(sel => {
      return document.querySelector(sel).textContent.trim();
    }, SELECTOR.LAST_UPDATED);

    const genres = await page.evaluate(sel => {
      let html = Array.from(document.querySelectorAll(sel));
      return html
        .filter(g => g.textContent !== "Search for series of same genre(s)")
        .map(genre => {
          return genre.textContent;
        });
    }, SELECTOR.GENRES);

    let categoryLength = await page.evaluate(sel => {
      return document.querySelectorAll(sel).length;
    }, SELECTOR.CATEGORIES_LIST);

    let categories = [];
    for (let i = 1; i <= categoryLength + 1; i++) {
      const CATEGORY_SELECTOR = SELECTOR.CATEGORY.replace("*INDEX*", i);

      let category = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return el ? el.innerText : null;
      }, CATEGORY_SELECTOR);

      if (category) {
        categories.push(category);
      }
    }

    const authors = await page.evaluate(sel => {
      let html = document.querySelectorAll(sel);
      let authors = [];

      for (let index = 0; index < html.length; index++) {
        const element = html[index];
        authors.push({
          name: element.innerText.trim(),
          id: Number(element.getAttribute("href").replace(/\D+/g, ""))
        });
      }

      return authors;
    }, SELECTOR.AUTHORS);
    //console.log(authors);

    const artists = await page.evaluate(sel => {
      let html = document.querySelectorAll(sel);
      let artists = [];

      for (let index = 0; index < html.length; index++) {
        const element = html[index];
        artists.push({
          name: element.innerText.trim(),
          id: Number(element.getAttribute("href").replace(/\D+/g, ""))
        });
      }

      return artists;
    }, SELECTOR.ARTISTS);

    const year = await page.evaluate(sel => {
      return document.querySelector(sel).innerHTML.trim();
    }, SELECTOR.YEAR);

    const originalPublishers = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().split(/\n/gi);
    }, SELECTOR.ORIGINAL_PUBLISHER);

    const serializedIn = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().split(/\n/gi);
    }, SELECTOR.SERIALIZED_IN);

    const licensed = await page.evaluate(sel => {
      return document.querySelector(sel).innerHTML.trim();
    }, SELECTOR.LICENSED_ENGLISH);

    const englishPublisher = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().split(/\n/gi);
    }, SELECTOR.ENGLISH_PUBLISHER);

    const cover = await page.evaluate(sel => {
      const doc = document.querySelector(sel);
      if (doc) {
        return doc.getAttribute("src");
      } else {
        return null;
      }
    }, SELECTOR.COVER);

    const userRating = await page.evaluate(sel => {
      const elements = document.querySelector(sel).childNodes;
      const lastIndex = elements[0].wholeText.lastIndexOf(":");
      const avg = Number(elements[0].wholeText.substring(lastIndex + 1).trim());
      const count = Number(elements[2].wholeText.replace(/\D+/g, ""));

      return {
        avg,
        count
      };
    }, SELECTOR.USER_RATING);

    const serie = {
      id: index,
      name,
      description,
      type,
      relatedSeries,
      associatedNames,
      statusInCountryOfOrigin,
      completelyScanlated,
      lastUpdated,
      genres,
      categories,
      authors,
      artists,
      year,
      originalPublishers,
      serializedIn,
      licensed,
      englishPublisher,
      cover,
      userRating
    };
    console.log(serie);

    // dataArray.push(serie);
    // LOG.push({ id: index, status: "OK", msg: "" });
    // await saveToJson(dataArray);
    // await saveLog(LOG);
  }

  browser.close();
}

async function saveLog(log) {
  const content = await JSON.stringify(log);
  fs.writeFile("./data/log.json", content, "utf8", function(err) {
    if (err) {
      return console.error(err);
    }
  });
}

async function saveToJson(data) {
  const content = await JSON.stringify(data);
  fs.writeFile("./data/data.json", content, "utf8", function(err) {
    if (err) {
      return console.error(err);
    }
  });
}

run();

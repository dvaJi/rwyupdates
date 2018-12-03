const puppeteer = require('puppeteer');
const csvWriter = require('csv-write-stream');
const fs = require('fs');

const SELECTOR = require('./utils/selectors');
const actualLog = require('./data/log.json');

const TO_SAVE = parseInt(process.env.TOSAVE, 0) || 1;

async function run() {
  const browser = await puppeteer.launch({
    headless: true
  });

  const page = await browser.newPage();

  var writer = csvWriter({ sendHeaders: false, separator: ',' });
  writer.pipe(fs.createWriteStream('./data/data.csv', { flags: 'a' }));

  const LAST_MANGA = actualLog[actualLog.length - 1]
    ? actualLog[actualLog.length - 1].id
    : 0;
  const LOG = [...actualLog];

  for (let index = LAST_MANGA + 1; index <= (LAST_MANGA + TO_SAVE); index++) {
    console.log(`Fetching manga id:${index}`);
    await page.goto(`https://www.mangaupdates.com/series.html?id=${index}`);
    await page.screenshot({ path: `screenshots/manga_${index}.jpg` });

    // Check if is a valid id
    const check = await page.evaluate(sel => {
      const element = document.querySelector(sel);
      return element ? element.textContent.trim() : null;
    }, SELECTOR.ERROR);

    if (check !== null) {
      const errorMsg = await page.evaluate(sel => {
        const element = document.querySelector(sel);
        return element ? element.textContent.trim() : null;
      }, SELECTOR.ERROR_MSG);
      LOG.push({ id: index, status: 'ERROR', msg: errorMsg });
      continue;
    }

    const name = await page.evaluate(sel => {
      return document.querySelector(sel).innerHTML;
    }, SELECTOR.MAIN_TITLE);
    //console.log(name);

    const description = await page.evaluate(sel => {
      return document.querySelector(sel).textContent.trim();
    }, SELECTOR.DESCRIPTION);
    //console.log(description);

    const type = await page.evaluate(sel => {
      return document.querySelector(sel).innerHTML.trim();
    }, SELECTOR.TYPE);
    //console.log(type);

    const relatedSeries = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().replace(/\n/gi, ' | ');
    }, SELECTOR.RELATED_SERIES);
    //console.log(relatedSeries);

    const associatedNames = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().replace(/\n/gi, ' | ');
    }, SELECTOR.ASSOCIATED_NAMES);
    //console.log(associatedNames);

    const statusInCountryOfOrigin = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().replace(/\n/gi, ' | ');
    }, SELECTOR.STATUS_IN_COUNTRY_OF_ORIGIN);
    //console.log(statusInCountryOfOrigin);

    const completelyScanlated = await page.evaluate(sel => {
      return document.querySelector(sel).textContent.trim();
    }, SELECTOR.COMPLETELY_SCANLATED);
    //console.log(completelyScanlated);

    const lastUpdated = await page.evaluate(sel => {
      return document.querySelector(sel).textContent.trim();
    }, SELECTOR.LAST_UPDATED);
    //console.log(lastUpdated);

    const genres = await page.evaluate(sel => {
      let html = Array.from(document.querySelectorAll(sel));
      return html
        .filter(g => g.textContent !== 'Search for series of same genre(s)')
        .map(genre => {
          return genre.textContent;
        });
    }, SELECTOR.GENRES);
    //console.log(genres);

    let categoryLength = await page.evaluate(sel => {
      return document.querySelectorAll(sel).length;
    }, SELECTOR.CATEGORIES_LIST);
    //console.log({ categoryLength });

    let categories = [];
    for (let i = 1; i <= categoryLength + 1; i++) {
      await page.waitFor(500);
      const CATEGORY_SELECTOR = SELECTOR.CATEGORY.replace('*INDEX*', i);

      let category = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return el ? el.innerText : null;
      }, CATEGORY_SELECTOR);

      if (category) {
        categories.push(category);
      }
    }
    //console.log(categories);

    const authors = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().replace(/\n/gi, ' | ');
    }, SELECTOR.AUTHORS);
    //console.log(authors);

    const artists = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().replace(/\n/gi, ' | ');
    }, SELECTOR.ARTISTS);
    //console.log(artists);

    const year = await page.evaluate(sel => {
      return document.querySelector(sel).innerHTML.trim();
    }, SELECTOR.YEAR);
    //console.log(year);

    const originalPublishers = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().replace(/\n/gi, ' | ');
    }, SELECTOR.ORIGINAL_PUBLISHER);
    //console.log(originalPublishers);

    const serializedIn = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().replace(/\n/gi, ' | ');
    }, SELECTOR.SERIALIZED_IN);
    //console.log(serializedIn);

    const licensed = await page.evaluate(sel => {
      return document.querySelector(sel).innerHTML.trim();
    }, SELECTOR.LICENSED_ENGLISH);
    //console.log(licensed);

    const englishPublisher = await page.evaluate(sel => {
      let html = document.querySelector(sel).innerText;
      return html.trim().replace(/\n/gi, ' | ');
    }, SELECTOR.ENGLISH_PUBLISHER);
    //console.log(englishPublisher);

    const cover = await page.evaluate(sel => {
      const doc = document.querySelector(sel);
      if (doc) {
        return doc.getAttribute('src');
      } else {
        return null;
      }
    }, SELECTOR.COVER);
    //console.log(cover);

    const userRating = await page.evaluate(sel => {
      const doc = document.querySelector(sel).innerHTML;
      return doc.substring(0, doc.indexOf('<br>'));
    }, SELECTOR.USER_RATING);
    //console.log(userRating);

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
    //console.log(serie);

    writer.write(serie);
    LOG.push({ id: index, status: 'OK', msg: '' });
    await saveLog(LOG);
  }

  writer.end();
  browser.close();
}

async function saveLog(log) {
  const content = await JSON.stringify(log);
  fs.writeFile('./data/log.json', content, 'utf8', function(err) {
    if (err) {
      return console.error(err);
    }
  });
}

run();

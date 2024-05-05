import fetch from 'node-fetch';

import fs from 'fs';
import cheerio from 'cheerio'
import Sharp from 'sharp'
import { globby } from 'globby'

const inputDir = 'dist/amp';
const googleAnalyticsGa4 = {
  vars: {
    GA4_MEASUREMENT_ID: process.env.GOOGLE_ANALYTICS_GA4 || '',
    GA4_ENDPOINT_HOSTNAME: "www.google-analytics.com",
    DEFAULT_PAGEVIEW_ENABLED: true,
    GOOGLE_CONSENT_ENABLED: false,
    WEBVITALS_TRACKING: false,
    PERFORMANCE_TIMING_TRACKING: false,
    SEND_DOUBLECLICK_BEACON: false,
  },
}

const cheerioOptions = {
  normalizeWhitespace: false,
  xmlMode: false,
  decodeEntities: false,
  cwd: '',
  round: true,
}

const edit = async (file, urlPath) => {

  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, cheerioOptions);

  $('script').each(function () {
    // Dont remove structured data though
    if ($(this).attr('type') !== 'application/ld+json') {
      $(this).remove();
    }
  });

  $('head')
    .append('<script async src="https://cdn.ampproject.org/v0.js"></script>')
    .find('link[rel="amphtml"], link[rel="canonical"], link[as="script"]')
    .remove();

  $('noscript').remove();
  $('html').attr('amp', '');

  if ($('head meta[content="width=device-width,minimum-scale=1,initial-scale=1"]').length === 0) {
    $('head meta[name="viewport"]').remove();
    $('head').prepend('<meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">');
  }

  $('link[rel=stylesheet]').remove();

  $('img').each(function () {
    this.name = 'amp-' + this.name;
    $(this).addClass('not-prose')
  });

  $('amp-img[data-src], amp-img[data-srcset]').each(function () {
    $(this).attr('src', $(this).data('src'))
    $(this).attr('srcset', $(this).data('srcset'))
    $(this).removeAttr('data-src')
    $(this).removeAttr('data-srcset')
  });
  $('amp-img[data-main-image]').removeAttr('data-main-image')

  // Google Analytics
  $('head').append('<script async custom-element="amp-analytics" src="https://cdn.ampproject.org/v0/amp-analytics-0.1.js"></script>');
  $('body').prepend(`<amp-analytics type="googleanalytics" config="https://amp.analytics-debugger.com/ga4.json" data-credentials="include"><script type="application/json">${JSON.stringify(googleAnalyticsGa4)}</script></amp-analytics>`);

  $('amp-img').attr('layout', 'responsive');
  $('amp-img').removeAttr('loading');
  $('amp-img').removeAttr('decoding');

  $('meta').removeAttr('httpequiv');
  $('section').removeAttr('height');
  $('head').append(`<link rel="canonical" href="${process.env.SITE_BASE_URL}/${urlPath.split`/`[1]}/">`)

  const pictures = $('picture');
  if (pictures.length > 0) {
    pictures.children('source').remove();
    pictures.each((_, element) => {
      $(element).find('amp-img')
        .removeAttr('sizes');
      const ampImg = $(element).html().trim();
      $(element).replaceWith(ampImg);
    });
  }

  await (async () => {
    for await (const item of $('amp-img')) {
      if (!$(item).attr('width') || !$(item).attr('height')) {
        if ($(item).attr('src').length > 1) {
          try {
            const response = await fetch($(item).attr('src'));
            const buffer = await response.buffer();
            const image = await Sharp(buffer);
            const metadata = await image.metadata();
            $(item).attr('width', metadata.width)
            $(item).attr('height', metadata.height)

            const ampImg = $.html($(item)).trim();
            $(item).replaceWith(ampImg);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  })();

  const files = await globby("dist/_astro/*.css");
  const css = files.map((file) => fs.readFileSync(file, 'utf8'))
  $('head').prepend(`<style amp-custom>${css}</style>`);
  $('head').prepend('<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>');
  return $.html();
}

(async () => {
  const files = await globby("dist/amp/**/*.html");

  for await (const file of files) {
    try {
      const urlPath = file.replace(inputDir, ''); // No inputDir in the URL
      const html = await edit(file, urlPath);
      fs.writeFileSync(file, html);
    } catch (e) {
      console.error(e)
    }
  }
})();

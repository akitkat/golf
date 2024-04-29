require('dotenv').config();
const contentful = require('contentful');
const client = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
});
const fs = require('fs');

const getPostContent = entry => {
  const body = entry.fields.body.replace(/hotel-info-item/g, 'HotelInfoItem')
    .replace(/><\/HotelInfoItem>/g, ` keywords="${entry.fields.keywords}"><\/HotelInfoItem>`)
    .replace(/golf-course-item/g, 'GolfCourseInfoItem')
    .replace(/<!-- Rakuten Web Services Attribution Snippet FROM HERE -->/g, '')
    .replace(/<!-- Rakuten Web Services Attribution Snippet TO HERE -->/g, '');
  const description = body
        // ヘッダータグ、リンク、画像、リスト、コードブロックを削除
        .replace(/(^#+\s)|(\s#+$)/gm, "") // ヘッダータグ
        .replace(/\[([^\]]+)\]\([^\)]+\)/gm, "$1") // リンク
        .replace(/!\[[^\]]*\]\([^\)]+\)/gm, "") // 画像
        .replace(/(?:^|\n)(?:-|\d+\.)\s+/gm, "") // リスト
        .replace(/`[^`]+`/gm, "") // インラインコード
        .replace(/(?:^|\n)```[\s\S]*?```/gm, "") // 複数行のコードブロック
        .replace(/\n/g, '') // 改行文字
        .replace(/\*/g, '') // strong
        .replace(/"/g, '') // strong
        .substring(0, 180);
  const tags = entry.fields?.tags ? `tags: ${JSON.stringify(entry.fields.tags.map(tag => tag.fields.slug))}` : '';
  return `---
title: "${entry.fields.title}"
description: "${description}"
date: ${entry.fields.publishDate}
image: "https:${entry.fields.heroImage.fields.file.url}"
${tags ? tags : ''}
---
import GolfCourseInfoItem from '../../components/GolfCourseInfoItem.astro';
import { Image } from 'astro:assets';

${body}`;
}

const goldTagId = '3pDpxA3gOgQjrKLA03AyQl'

(async () => {
  const total = await client.getEntries({
    content_type: 'post',
    'fields.tags.sys.id': goldTagId,
    limit: 1
  }).then(res => res.total)

  let i = 0
  while(i < total) {
    await client.getEntries({
      content_type: 'post',
      'fields.tags.sys.id': goldTagId,
      limit: 1000,
      skip: i
    }).then(function (entries) {
      entries.items.forEach(function (entry, index) {
        fs.writeFileSync(`./src/content/posts/${entry.fields.slug}.mdx`, getPostContent(entry), 'utf-8');
      });
    })

    i += 1000
  }

  await client.getEntries({
    content_type: 'page',
  }).then(function (entries) {
    entries.items.forEach(function (entry) {
      fs.writeFileSync(
        `./src/content/pages/${entry.fields.slug}.mdx`,
        `---
title: "${entry.fields.title}"
---
${entry.fields.body}`,
        'utf-8'
      );
    });
  })
})();

import { fetchApi } from '@libs/fetch';
import { Plugin } from '@/types/plugin';
import { load as loadCheerio } from 'cheerio';
import { defaultCover } from '@libs/defaultCover';

class TruthNovelPlugin implements Plugin.PluginBase {
  id = 'truthnovel';
  name = 'TruthNovel';
  icon = 'src/en/truthnovel/icon.png';
  site = 'https://truthnovel.top';
  version = '1.0.0';

  private chapterListUrl = 'https://truthnovel.top/?w4pl=257';

  private async getHtml(url: string): Promise<string> {
    const response = await fetchApi(url, {
      headers: {
        Referer: `${this.site}/`,
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36',
      },
    });
    return await response.text();
  }

  private absolute(url: string): string {
    if (!url) return '';
    try {
      return new URL(url, this.site).toString();
    } catch {
      return url;
    }
  }

  private novelItem(): Plugin.NovelItem {
    return {
      name: 'سيد الحقيقة',
      path: '/',
      cover: defaultCover,
    };
  }

  async popularNovels(
    pageNo: number,
    { showLatestNovels }: Plugin.PopularNovelsOptions<undefined>,
  ): Promise<Plugin.NovelItem[]> {
    if (pageNo > 1) return [];
    return [this.novelItem()];
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    if (pageNo > 1) return [];

    const query = searchTerm.trim().toLowerCase();
    const matches =
      !query ||
      'سيد الحقيقة'.includes(query) ||
      query.includes('سيد') ||
      query.includes('الحقيقة') ||
      query.includes('truth') ||
      query.includes('lord of the truth');

    return matches ? [this.novelItem()] : [];
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const html = await this.getHtml(this.chapterListUrl);
    const $ = loadCheerio(html);
    const chapters: Plugin.ChapterItem[] = [];

    $('a.post_title').each((_, element) => {
      const name = $(element).text().replace(/\s+/g, ' ').trim();
      const path = this.absolute($(element).attr('href') || '');

      if (!name || !path) return;

      const match = name.match(/^(\d+(?:\.\d+)?)/);

      chapters.push({
        name,
        path,
        chapterNumber: match ? Number(match[1]) : undefined,
      });
    });

    // truthnovel.top lists the newest chapter first.
    chapters.reverse();

    return {
      path: novelPath || '/',
      name: 'سيد الحقيقة',
      author: 'TruthTeller',
      cover: defaultCover,
      chapters,
    };
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const html = await this.getHtml(chapterPath);
    const $ = loadCheerio(html);
    const content = $('article.small').first();

    if (!content.length) return '';

    content
      .find(
        'script, style, noscript, iframe, form, .comments, #comments, .wpd-thread-head, .wpd-comment-wrap',
      )
      .remove();

    const paragraphs: string[] = [];

    content.find('p').each((_, element) => {
      const text = $(element).text().replace(/\s+/g, ' ').trim();
      if (text) paragraphs.push(text);
    });

    return paragraphs.length
      ? paragraphs.join('\n\n')
      : content.text().replace(/\s+/g, ' ').trim();
  }

  resolveUrl = (path: string, isNovel?: boolean) => {
    if (/^https?:\/\//i.test(path)) return path;
    return this.absolute(path);
  };
}

export default new TruthNovelPlugin();

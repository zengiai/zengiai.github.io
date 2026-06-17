(function () {
  const manifestPath = "./articles/index.json";
  const articleListEl = document.getElementById("articleList");
  const articleCountEl = document.getElementById("articleCount");
  const docMetaEl = document.getElementById("docMeta");
  const docTitleEl = document.getElementById("docTitle");
  const docSummaryEl = document.getElementById("docSummary");
  const markdownBodyEl = document.getElementById("markdownBody");

  let articles = [];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeHref(value) {
    const href = String(value || "").trim();
    if (/^(https?:|mailto:|#|\.{0,2}\/)/i.test(href)) {
      return href;
    }
    return "#";
  }

  function slugify(value) {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function renderInline(value) {
    const codeSpans = [];
    let text = String(value).replace(/`([^`]+)`/g, function (_, code) {
      const token = "\u0000CODE" + codeSpans.length + "\u0000";
      codeSpans.push("<code>" + escapeHtml(code) + "</code>");
      return token;
    });

    text = escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
        const escapedHref = escapeHtml(safeHref(href));
        return '<a href="' + escapedHref + '" target="_blank" rel="noreferrer">' + label + "</a>";
      });

    codeSpans.forEach(function (html, index) {
      text = text.replace("\u0000CODE" + index + "\u0000", html);
    });

    return text;
  }

  function parseTable(lines, startIndex) {
    const header = lines[startIndex];
    const divider = lines[startIndex + 1];
    if (!header || !divider || !header.includes("|") || !/^\s*\|?[\s:-]+\|[\s|:-]*$/.test(divider)) {
      return null;
    }

    const rows = [];
    let index = startIndex + 2;
    while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
      rows.push(lines[index]);
      index += 1;
    }

    const cells = function (line) {
      return line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map(function (cell) {
          return cell.trim();
        });
    };

    const headerCells = cells(header);
    const bodyRows = rows.map(cells);
    const html =
      "<table><thead><tr>" +
      headerCells.map(function (cell) {
        return "<th>" + renderInline(cell) + "</th>";
      }).join("") +
      "</tr></thead><tbody>" +
      bodyRows.map(function (row) {
        return "<tr>" + row.map(function (cell) {
          return "<td>" + renderInline(cell) + "</td>";
        }).join("") + "</tr>";
      }).join("") +
      "</tbody></table>";

    return {
      html: html,
      nextIndex: index,
    };
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const output = [];
    let index = 0;
    let paragraph = [];
    let listType = null;

    function flushParagraph() {
      if (!paragraph.length) {
        return;
      }
      output.push("<p>" + renderInline(paragraph.join(" ")) + "</p>");
      paragraph = [];
    }

    function closeList() {
      if (!listType) {
        return;
      }
      output.push("</" + listType + ">");
      listType = null;
    }

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        closeList();
        index += 1;
        continue;
      }

      if (/^```/.test(trimmed)) {
        flushParagraph();
        closeList();
        const lang = trimmed.replace(/^```/, "").trim();
        const codeLines = [];
        index += 1;
        while (index < lines.length && !/^```/.test(lines[index].trim())) {
          codeLines.push(lines[index]);
          index += 1;
        }
        index += 1;
        output.push(
          '<pre><code class="language-' +
            escapeHtml(lang) +
            '">' +
            escapeHtml(codeLines.join("\n")) +
            "</code></pre>",
        );
        continue;
      }

      const table = parseTable(lines, index);
      if (table) {
        flushParagraph();
        closeList();
        output.push(table.html);
        index = table.nextIndex;
        continue;
      }

      const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
      if (heading) {
        flushParagraph();
        closeList();
        const level = heading[1].length;
        const text = heading[2].trim();
        output.push(
          "<h" +
            level +
            ' id="' +
            escapeHtml(slugify(text)) +
            '">' +
            renderInline(text) +
            "</h" +
            level +
            ">",
        );
        index += 1;
        continue;
      }

      if (/^---+$/.test(trimmed)) {
        flushParagraph();
        closeList();
        output.push("<hr />");
        index += 1;
        continue;
      }

      if (/^>\s?/.test(trimmed)) {
        flushParagraph();
        closeList();
        const quoteLines = [];
        while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
          quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
          index += 1;
        }
        output.push("<blockquote>" + quoteLines.map(renderInline).join("<br />") + "</blockquote>");
        continue;
      }

      const unordered = /^[-*]\s+(.+)$/.exec(trimmed);
      const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);
      if (unordered || ordered) {
        flushParagraph();
        const nextType = unordered ? "ul" : "ol";
        if (listType !== nextType) {
          closeList();
          listType = nextType;
          output.push("<" + listType + ">");
        }
        output.push("<li>" + renderInline((unordered || ordered)[1]) + "</li>");
        index += 1;
        continue;
      }

      paragraph.push(trimmed);
      index += 1;
    }

    flushParagraph();
    closeList();

    return output.join("\n");
  }

  function formatMeta(article) {
    const parts = [];
    if (article.updated) {
      parts.push("更新于 " + article.updated);
    }
    if (article.readingMinutes) {
      parts.push(article.readingMinutes + " 分钟阅读");
    }
    if (article.tags && article.tags.length) {
      parts.push(article.tags.join(" / "));
    }
    return parts.join(" · ");
  }

  function setActiveArticle(slug) {
    Array.from(articleListEl.querySelectorAll(".article-card")).forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.slug === slug);
    });
  }

  function renderArticleList() {
    articleCountEl.textContent = String(articles.length);
    articleListEl.innerHTML = articles
      .map(function (article) {
        const tags = (article.tags || [])
          .map(function (tag) {
            return '<span class="article-card-tag">' + escapeHtml(tag) + "</span>";
          })
          .join("");

        return (
          '<button class="article-card" type="button" data-slug="' +
          escapeHtml(article.slug) +
          '">' +
          "<h2>" +
          escapeHtml(article.title) +
          "</h2>" +
          '<div class="article-card-meta">' +
          tags +
          "</div>" +
          "</button>"
        );
      })
      .join("");

    Array.from(articleListEl.querySelectorAll(".article-card")).forEach(function (button) {
      button.addEventListener("click", function () {
        loadArticle(button.dataset.slug, true);
      });
    });
  }

  async function loadArticle(slug, shouldPushState) {
    const article = articles.find(function (item) {
      return item.slug === slug;
    });

    if (!article) {
      markdownBodyEl.innerHTML = '<div class="state-message">文章不存在，请从左侧列表重新选择。</div>';
      return;
    }

    setActiveArticle(article.slug);
    docMetaEl.textContent = formatMeta(article);
    docTitleEl.textContent = article.title;
    docSummaryEl.textContent = article.summary || "";
    markdownBodyEl.innerHTML = '<div class="state-message">正在加载 Markdown 正文。</div>';

    try {
      const response = await fetch(article.path, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      const markdown = await response.text();
      markdownBodyEl.innerHTML = renderMarkdown(markdown);
      document.title = article.title + " - 曾嘉琪技术文章";

      if (shouldPushState) {
        const url = new URL(window.location.href);
        url.searchParams.set("doc", article.slug);
        window.history.pushState({ slug: article.slug }, "", url);
      }
    } catch (error) {
      markdownBodyEl.innerHTML =
        '<div class="state-message">Markdown 正文加载失败。请确认通过 HTTP 服务访问页面，并检查文章路径是否正确。</div>';
      console.error(error);
    }
  }

  async function init() {
    try {
      const response = await fetch(manifestPath, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      articles = await response.json();
      renderArticleList();

      const params = new URLSearchParams(window.location.search);
      const requestedSlug = params.get("doc");
      const firstArticle = articles[0];
      await loadArticle(requestedSlug || (firstArticle && firstArticle.slug), false);
    } catch (error) {
      articleListEl.innerHTML = '<div class="state-message">文章索引加载失败。</div>';
      markdownBodyEl.innerHTML =
        '<div class="state-message">无法读取静态文章索引。请确认页面部署在 HTTP 静态服务下。</div>';
      console.error(error);
    }
  }

  window.addEventListener("popstate", function () {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("doc") || (articles[0] && articles[0].slug);
    loadArticle(slug, false);
  });

  init();
})();

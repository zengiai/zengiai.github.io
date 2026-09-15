(function () {
  const dataPath = "./prompts.json";
  const copyResetDelay = 2200;
  const copyIdleLabel = "复制提示词";

  const promptListEl = document.getElementById("promptList");
  const promptCountEl = document.getElementById("promptCount");
  const promptMetaEl = document.getElementById("promptMeta");
  const promptTitleEl = document.getElementById("promptTitle");
  const promptSummaryEl = document.getElementById("promptSummary");
  const promptTagsEl = document.getElementById("promptTags");
  const promptBodyEl = document.getElementById("promptBody");
  const copyButtonEl = document.getElementById("copyButton");

  let prompts = [];
  let activeSlug = null;
  let copyResetTimer = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function groupByCategory(items) {
    const groups = [];
    const groupMap = new Map();
    items.forEach(function (item) {
      const category = item.category || "未分类";
      if (!groupMap.has(category)) {
        const group = { category: category, items: [] };
        groupMap.set(category, group);
        groups.push(group);
      }
      groupMap.get(category).items.push(item);
    });
    return groups;
  }

  function resetCopyButton() {
    window.clearTimeout(copyResetTimer);
    copyResetTimer = null;
    copyButtonEl.classList.remove("is-copied", "is-failed");
    copyButtonEl.textContent = copyIdleLabel;
  }

  function flashCopyButton(className, label) {
    window.clearTimeout(copyResetTimer);
    copyButtonEl.classList.remove("is-copied", "is-failed");
    copyButtonEl.classList.add(className);
    copyButtonEl.textContent = label;
    copyResetTimer = window.setTimeout(resetCopyButton, copyResetDelay);
  }

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value);
    }

    return new Promise(function (resolve, reject) {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      try {
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (copied) {
          resolve();
        } else {
          reject(new Error("execCommand copy returned false"));
        }
      } catch (error) {
        document.body.removeChild(textarea);
        reject(error);
      }
    });
  }

  function setActiveItem(slug) {
    Array.from(promptListEl.querySelectorAll(".prompt-item")).forEach(function (button) {
      const isActive = button.dataset.slug === slug;
      button.classList.toggle("is-active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    const activeButton = promptListEl.querySelector(".prompt-item.is-active");
    if (activeButton) {
      activeButton.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function renderPromptList() {
    promptCountEl.textContent = String(prompts.length);

    if (!prompts.length) {
      promptListEl.innerHTML = '<div class="state-message">暂无提示词。</div>';
      return;
    }

    promptListEl.innerHTML = groupByCategory(prompts)
      .map(function (group) {
        const items = group.items
          .map(function (item) {
            return (
              '<button class="prompt-item" type="button" data-slug="' +
              escapeHtml(item.slug) +
              '">' +
              escapeHtml(item.title) +
              "</button>"
            );
          })
          .join("");

        return (
          '<div class="prompt-group">' +
          '<div class="prompt-group-title">' +
          escapeHtml(group.category) +
          "</div>" +
          items +
          "</div>"
        );
      })
      .join("");

    Array.from(promptListEl.querySelectorAll(".prompt-item")).forEach(function (button) {
      button.addEventListener("click", function () {
        loadPrompt(button.dataset.slug, true);
      });
    });
  }

  function renderTags(tags) {
    promptTagsEl.innerHTML = (tags || [])
      .map(function (tag) {
        return '<span class="tag-chip">' + escapeHtml(tag) + "</span>";
      })
      .join("");
  }

  function formatMeta(prompt) {
    const parts = [];
    if (prompt.category) {
      parts.push(prompt.category);
    }
    if (prompt.updated) {
      parts.push("更新于 " + prompt.updated);
    }
    return parts.join(" · ");
  }

  function transformInline(escaped) {
    return escaped
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, href) {
        const safeHref = /^\s*(javascript|data|vbscript):/i.test(href) ? "#" : href;
        return '<a href="' + safeHref + '" target="_blank" rel="noopener noreferrer">' + label + "</a>";
      })
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*\n])\*([^*\n]+)\*/gm, "$1<em>$2</em>")
      .replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
  }

  function renderInline(text) {
    return String(text)
      .split(/(`[^`\n]+`)/g)
      .map(function (part) {
        if (part.length > 1 && part.charAt(0) === "`" && part.charAt(part.length - 1) === "`") {
          return "<code>" + escapeHtml(part.slice(1, -1)) + "</code>";
        }
        return transformInline(escapeHtml(part));
      })
      .join("");
  }

  function renderMarkdown(content) {
    const lines = String(content || "").replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    let index = 0;

    function isBlank(line) {
      return !line.trim();
    }

    function isFenceLine(line) {
      return /^\s{0,3}```/.test(line);
    }

    function isHeadingLine(line) {
      return /^#{1,6}\s+/.test(line.trim());
    }

    function isQuoteLine(line) {
      return /^\s{0,3}>\s?/.test(line);
    }

    function isListLine(line) {
      return /^\s{0,3}([-*+]|\d{1,3}[.)])\s+/.test(line);
    }

    function isRuleLine(line) {
      return /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line);
    }

    function isTableSeparator(line) {
      return line.indexOf("|") !== -1 && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line);
    }

    function splitTableRow(line) {
      let value = line.trim();
      if (value.charAt(0) === "|") {
        value = value.slice(1);
      }
      if (value.charAt(value.length - 1) === "|") {
        value = value.slice(0, -1);
      }
      return value.split("|").map(function (cell) {
        return cell.trim();
      });
    }

    while (index < lines.length) {
      const line = lines[index];

      if (isBlank(line)) {
        index += 1;
        continue;
      }

      if (isFenceLine(line)) {
        const info = line.match(/^\s{0,3}```\s*([\w+-]*)/);
        const language = info && info[1] ? info[1] : "";
        const codeLines = [];
        index += 1;
        while (index < lines.length && !isFenceLine(lines[index])) {
          codeLines.push(lines[index]);
          index += 1;
        }
        index += 1;
        blocks.push(
          '<pre class="prompt-code"' +
            (language ? ' data-lang="' + escapeHtml(language) + '"' : "") +
            "><code>" +
            escapeHtml(codeLines.join("\n")) +
            "</code></pre>"
        );
        continue;
      }

      if (isRuleLine(line)) {
        blocks.push("<hr />");
        index += 1;
        continue;
      }

      if (isHeadingLine(line)) {
        const heading = line.trim().match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
        const level = Math.min(heading[1].length + 1, 6);
        blocks.push("<h" + level + ">" + renderInline(heading[2]) + "</h" + level + ">");
        index += 1;
        continue;
      }

      if (line.indexOf("|") !== -1 && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
        const headers = splitTableRow(line);
        index += 2;
        const rows = [];
        while (index < lines.length && !isBlank(lines[index]) && lines[index].indexOf("|") !== -1) {
          rows.push(splitTableRow(lines[index]));
          index += 1;
        }
        blocks.push(
          "<table><thead><tr>" +
            headers
              .map(function (cell) {
                return "<th>" + renderInline(cell) + "</th>";
              })
              .join("") +
            "</tr></thead><tbody>" +
            rows
              .map(function (row) {
                return (
                  "<tr>" +
                  row
                    .map(function (cell) {
                      return "<td>" + renderInline(cell) + "</td>";
                    })
                    .join("") +
                  "</tr>"
                );
              })
              .join("") +
            "</tbody></table>"
        );
        continue;
      }

      if (isQuoteLine(line)) {
        const quoteLines = [];
        while (index < lines.length && isQuoteLine(lines[index])) {
          quoteLines.push(lines[index].replace(/^\s{0,3}>\s?/, ""));
          index += 1;
        }
        blocks.push("<blockquote>" + renderMarkdown(quoteLines.join("\n")) + "</blockquote>");
        continue;
      }

      if (isListLine(line)) {
        const ordered = /^\s{0,3}\d{1,3}[.)]\s+/.test(line);
        const items = [];
        while (index < lines.length && isListLine(lines[index])) {
          const itemText = lines[index].replace(/^\s{0,3}([-*+]|\d{1,3}[.)])\s+/, "");
          const checkbox = itemText.match(/^\[([ xX])\]\s+(.*)$/);
          if (checkbox) {
            items.push(
              '<li><span class="task-mark">[' +
                (checkbox[1].toLowerCase() === "x" ? "x" : " ") +
                "]</span> " +
                renderInline(checkbox[2]) +
                "</li>"
            );
          } else {
            items.push("<li>" + renderInline(itemText) + "</li>");
          }
          index += 1;
        }
        const tag = ordered ? "ol" : "ul";
        blocks.push("<" + tag + ">" + items.join("") + "</" + tag + ">");
        continue;
      }

      const paragraph = [line];
      index += 1;
      while (
        index < lines.length &&
        !isBlank(lines[index]) &&
        !isFenceLine(lines[index]) &&
        !isHeadingLine(lines[index]) &&
        !isQuoteLine(lines[index]) &&
        !isListLine(lines[index]) &&
        !isRuleLine(lines[index])
      ) {
        paragraph.push(lines[index]);
        index += 1;
      }
      blocks.push("<p>" + renderInline(paragraph.join("\n")) + "</p>");
    }

    return blocks.join("\n");
  }

  function renderPrompt(prompt) {
    promptMetaEl.textContent = formatMeta(prompt);
    promptTitleEl.textContent = prompt.title;
    promptSummaryEl.textContent = prompt.summary || "";
    renderTags(prompt.tags);
    promptBodyEl.innerHTML = renderMarkdown(prompt.content);
    copyButtonEl.disabled = false;
    resetCopyButton();
  }

  function loadPrompt(slug, shouldPushState) {
    const prompt = prompts.find(function (item) {
      return item.slug === slug;
    });

    if (!prompt) {
      setActiveItem("");
      promptMetaEl.textContent = "";
      promptTitleEl.textContent = "提示词不存在";
      promptSummaryEl.textContent = "请从列表重新选择。";
      promptTagsEl.innerHTML = "";
      promptBodyEl.innerHTML =
        '<div class="state-message">未找到对应的提示词，可能链接已过期。</div>';
      copyButtonEl.disabled = true;
      resetCopyButton();
      return;
    }

    activeSlug = prompt.slug;
    setActiveItem(prompt.slug);
    renderPrompt(prompt);
    document.title = prompt.title + " - 曾嘉琪提示词集";

    if (shouldPushState) {
      const url = new URL(window.location.href);
      url.searchParams.set("p", prompt.slug);
      window.history.pushState({ slug: prompt.slug }, "", url);
    }
  }

  async function init() {
    try {
      const response = await fetch(dataPath, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      const data = await response.json();
      prompts = Array.isArray(data) ? data : data.prompts || [];
      renderPromptList();

      const params = new URLSearchParams(window.location.search);
      const requestedSlug = params.get("p");
      const target =
        prompts.find(function (item) {
          return item.slug === requestedSlug;
        }) || prompts[0];

      if (target) {
        loadPrompt(target.slug, false);
      } else {
        promptMetaEl.textContent = "";
        promptTitleEl.textContent = "暂无内容";
        promptSummaryEl.textContent = "";
        promptTagsEl.innerHTML = "";
        promptBodyEl.innerHTML =
          '<div class="state-message">提示词集目前为空。在 prompts.json 的 prompts 数组中添加条目（title、category、content 等字段）后刷新页面即可看到内容。</div>';
      }
    } catch (error) {
      promptListEl.innerHTML = '<div class="state-message">提示词索引加载失败。</div>';
      promptMetaEl.textContent = "";
      promptTitleEl.textContent = "数据加载失败";
      promptSummaryEl.textContent = "";
      promptTagsEl.innerHTML = "";
      promptBodyEl.innerHTML =
        '<div class="state-message">无法读取 prompts.json。请确认通过 HTTP 服务访问页面，并检查数据文件路径是否正确。</div>';
      copyButtonEl.disabled = true;
      console.error(error);
    }
  }

  copyButtonEl.addEventListener("click", async function () {
    const prompt = prompts.find(function (item) {
      return item.slug === activeSlug;
    });

    if (!prompt || copyButtonEl.disabled) {
      return;
    }

    copyButtonEl.disabled = true;
    try {
      await copyText(prompt.content);
      flashCopyButton("is-copied", "已复制");
    } catch (error) {
      flashCopyButton("is-failed", "复制失败，请手动选择");
      console.error(error);
    } finally {
      copyButtonEl.disabled = false;
    }
  });

  window.addEventListener("popstate", function () {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("p") || (prompts[0] && prompts[0].slug);
    if (slug) {
      loadPrompt(slug, false);
    }
  });

  init();
})();

const form = document.querySelector("#analysis-form");
const textarea = document.querySelector("#review-text");
const errorMessage = document.querySelector("#form-error");
const submitButton = form.querySelector("button[type='submit']");
const navLinks = document.querySelectorAll(".nav-link");
const historyList = document.querySelector("#history-list");
const historyButton = document.querySelector("#clear-history");
const exportButton = document.querySelector("#export-history");
const characterCount = document.querySelector("#character-count");
const historyStorageKey = "sentimentai-history";
const sentimentLabels = ["Positive", "Neutral", "Negative"];
let selectedFile = null;

function getHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(historyStorageKey) || "[]");
    if (!Array.isArray(saved)) throw new Error("Lịch sử đã lưu không đúng định dạng.");
    return saved.filter((entry) => (
      entry && typeof entry.text === "string" &&
      sentimentLabels.includes(entry.label) &&
      Number.isFinite(entry.confidence)
    )).slice(0, 100);
  } catch (error) {
    errorMessage.textContent = `Không thể đọc lịch sử trên thiết bị này: ${error.message}`;
    return [];
  }
}

function sentimentIcon(label) {
  return label === "Positive" ? "☺" : label === "Negative" ? "☹" : "•";
}

function renderHistory() {
  const entries = getHistory();
  historyList.replaceChildren();
  historyButton.hidden = entries.length === 0;
  exportButton.hidden = entries.length === 0;

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    const icon = document.createElement("span");
    icon.textContent = "◷";
    const title = document.createElement("strong");
    title.textContent = "Chưa có phân tích nào";
    const hint = document.createElement("small");
    hint.textContent = "Hãy phân tích một bình luận hoặc nhập tệp CSV để bắt đầu.";
    empty.append(icon, title, hint);
    historyList.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "history-item";
    row.title = "Nhấn để xem lại bình luận này";
    const icon = document.createElement("span");
    icon.className = `history-sentiment ${entry.label.toLowerCase()}`;
    icon.textContent = sentimentIcon(entry.label);

    const copy = document.createElement("span");
    copy.className = "history-copy";
    const quote = document.createElement("strong");
    quote.textContent = entry.text;
    const date = document.createElement("small");
    const createdAt = new Date(entry.createdAt);
    date.textContent = Number.isNaN(createdAt.getTime())
      ? "Ngày phân tích không xác định"
      : createdAt.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
    copy.append(quote, date);

    const result = document.createElement("span");
    result.className = `history-result ${entry.label.toLowerCase()}`;
    result.textContent = `${entry.sentiment} · ${entry.confidence}%`;
    row.append(icon, copy, result);
    row.addEventListener("click", () => {
      textarea.value = entry.text;
      characterCount.textContent = entry.text.length.toLocaleString("vi-VN");
      document.querySelector("#language-select").value = entry.language === "en" ? "en" : "vi";
      const colors = { Positive: "#159b68", Neutral: "#d49a22", Negative: "#e55361" };
      updateResult({
        sentiment: entry.sentiment,
        label: entry.label,
        confidence: entry.confidence,
        color: colors[entry.label],
        message: "Đây là kết quả đã lưu trên thiết bị.",
      }, entry.text);
      textarea.focus();
      document.querySelector("#comments").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    historyList.append(row);
  });
}

function saveHistory(entries) {
  const saved = [...entries, ...getHistory()].slice(0, 100);
  try {
    localStorage.setItem(historyStorageKey, JSON.stringify(saved));
  } catch (error) {
    errorMessage.textContent = `Đã phân tích xong nhưng không thể lưu lịch sử: ${error.message}`;
  }
  renderDashboard(saved);
  renderHistory();
}

function renderDashboard(entries = getHistory()) {
  const counts = { Positive: 0, Neutral: 0, Negative: 0 };
  const wordTotals = { Positive: 0, Neutral: 0, Negative: 0 };
  entries.forEach((entry) => {
    counts[entry.label] += 1;
    wordTotals[entry.label] += Number.isFinite(entry.wordCount)
      ? entry.wordCount
      : entry.text.trim().split(/\s+/u).filter(Boolean).length;
  });

  const total = entries.length;
  const maximum = Math.max(counts.Positive, counts.Neutral, counts.Negative, 1);
  const percentages = Object.fromEntries(
    sentimentLabels.map((label) => [label, total ? Math.round(counts[label] / total * 100) : 0]),
  );
  const setText = (selector, value) => {
    document.querySelector(selector).textContent = String(value);
  };
  const chartNames = { Positive: "positive", Neutral: "neutral", Negative: "negative" };

  setText("#total-count", total.toLocaleString("vi-VN"));
  setText("#total-caption", "Trong lịch sử trên thiết bị · tối đa 100");
  setText("#chart-max", maximum.toLocaleString("vi-VN"));
  setText("#donut-total", total.toLocaleString("vi-VN"));

  sentimentLabels.forEach((label) => {
    const key = chartNames[label];
    setText(`#${key}-percent`, `${percentages[label]}%`);
    setText(`#${key}-count`, `${counts[label].toLocaleString("vi-VN")} đánh giá`);
    setText(`#${key}-bar-value`, counts[label].toLocaleString("vi-VN"));
    setText(`#donut-${key}`, `${percentages[label]}% (${counts[label].toLocaleString("vi-VN")})`);
    const bar = document.querySelector(`#${key}-bar`);
    bar.style.setProperty("--height", `${counts[label] / maximum * 78}%`);
    const words = total ? Math.round(wordTotals[label] / Math.max(counts[label], 1)) : 0;
    setText(`#${key}-words-value`, words.toLocaleString("vi-VN"));
    document.querySelector(`#${key}-words-bar`).style.setProperty(
      "--height",
      `${Math.min(words / 40 * 78, 78)}%`,
    );
  });

  document.querySelector(".donut").style.background = total
    ? `conic-gradient(#26bd78 0 ${percentages.Positive}%,#ffc43d ${percentages.Positive}% ${percentages.Positive + percentages.Neutral}%,#ff6269 ${percentages.Positive + percentages.Neutral}% 100%)`
    : "conic-gradient(#e9eef6 0 100%)";
  setText("#positive-keyword-count", counts.Positive.toLocaleString("vi-VN"));
  setText("#negative-keyword-count", counts.Negative.toLocaleString("vi-VN"));
  document.querySelector("#positive-keyword-bar").style.setProperty(
    "--width",
    `${total ? counts.Positive / total * 100 : 0}%`,
  );
  document.querySelector("#negative-keyword-bar").style.setProperty(
    "--width",
    `${total ? counts.Negative / total * 100 : 0}%`,
  );
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Máy chủ trả về dữ liệu không hợp lệ.");
  }
  if (!response.ok) throw new Error(result.error || "Không thể hoàn tất yêu cầu.");
  return result;
}

function updateResult(result, text) {
  const label = document.querySelector("#result-label");
  label.replaceChildren(document.createTextNode(`${result.sentiment} `));
  if (result.sentiment !== result.label) {
    const englishLabel = document.createElement("small");
    englishLabel.textContent = `(${result.label})`;
    label.append(englishLabel);
  }
  label.style.color = result.color;
  document.querySelector("#confidence").textContent = `Độ tin cậy: ${result.confidence}%`;
  document.querySelector("#confidence-number").textContent = `${result.confidence}%`;
  document.querySelector("#confidence-bar").style.width = `${result.confidence}%`;
  document.querySelector("#confidence-bar").style.backgroundColor = result.color;
  document.querySelector("#result-quote").textContent = `“${text}”`;
  const face = document.querySelector("#result-face");
  face.textContent = sentimentIcon(result.label);
  face.style.backgroundColor = result.color;
  document.querySelector(".disclaimer").textContent = result.message;
  const panel = document.querySelector(".result-panel");
  panel.classList.add("result-updated");
  window.setTimeout(() => panel.classList.remove("result-updated"), 700);
}

textarea.addEventListener("input", () => {
  characterCount.textContent = textarea.value.length.toLocaleString("vi-VN");
});

// SỰ KIỆN BẤM PHÂN TÍCH ĐÃ TÍCH HỢP HIỆU ỨNG LOADING SPINNER SINH ĐỘNG
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = textarea.value.trim();
  errorMessage.textContent = "";
  if (!text) {
    errorMessage.textContent = "Vui lòng nhập nội dung đánh giá trước khi phân tích.";
    textarea.focus();
    return;
  }

  submitButton.disabled = true;
  // Hiệu ứng vòng xoay loading cùng dòng chữ chuyên nghiệp khi demo
  submitButton.innerHTML = `<span class="loading-spinner"></span> Đang phân tích bằng AI...`;
  
  try {
    const language = document.querySelector("#language-select").value;
    const result = await postJson("/api/analyze", { text, language });
    updateResult(result, text);
    saveHistory([{
      text,
      sentiment: result.sentiment,
      label: result.label,
      confidence: result.confidence,
      wordCount: result.word_count,
      language,
      createdAt: new Date().toISOString(),
    }]);
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = "<span>➤</span> Phân tích";
  }
});

document.querySelectorAll(".sample-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    textarea.value = chip.dataset.sample;
    characterCount.textContent = textarea.value.length.toLocaleString("vi-VN");
    textarea.focus();
  });
});

function setTheme(dark) {
  document.body.classList.toggle("dark", dark);
  const themeButton = document.querySelector("#theme-toggle");
  themeButton.textContent = dark ? "☾" : "☼";
  themeButton.setAttribute("aria-label", dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối");
  try {
    localStorage.setItem("sentimentai-theme", dark ? "dark" : "light");
  } catch (error) {
    errorMessage.textContent = `Không thể lưu tùy chọn giao diện: ${error.message}`;
  }
}

document.querySelector("#theme-toggle").addEventListener("click", () => {
  setTheme(!document.body.classList.contains("dark"));
});
document.querySelector("#settings-theme").addEventListener("click", () => {
  setTheme(!document.body.classList.contains("dark"));
});

try {
  setTheme(localStorage.getItem("sentimentai-theme") === "dark");
} catch (error) {
  errorMessage.textContent = `Không thể đọc tùy chọn giao diện: ${error.message}`;
}

historyButton.addEventListener("click", () => {
  try {
    localStorage.removeItem(historyStorageKey);
    errorMessage.textContent = "";
  } catch (error) {
    errorMessage.textContent = `Không thể xóa lịch sử trên thiết bị này: ${error.message}`;
    return;
  }
  renderDashboard([]);
  renderHistory();
});

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

exportButton.addEventListener("click", () => {
  const entries = getHistory();
  if (!entries.length) return;
  const rows = [
    ["Nội dung đánh giá", "Kết quả", "Nhãn", "Độ tin cậy (%)", "Số từ", "Thời gian"],
    ...entries.map((entry) => [
      entry.text,
      entry.sentiment,
      entry.label,
      entry.confidence,
      entry.wordCount ?? "",
      entry.createdAt ?? "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "sentimentai-lich-su.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
});

function parseCsv(source, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === delimiter) {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("Tệp CSV có dấu ngoặc kép chưa được đóng.");
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const csvFile = document.querySelector("#csv-file");
const fileName = document.querySelector("#file-name");
const importButton = document.querySelector("#import-button");
const importError = document.querySelector("#import-error");

csvFile.addEventListener("change", () => {
  selectedFile = csvFile.files[0] || null;
  fileName.textContent = selectedFile ? selectedFile.name : "Chưa chọn tệp";
  importButton.disabled = !selectedFile;
  importError.classList.remove("success-message");
  importError.textContent = "";
});

importButton.addEventListener("click", async () => {
  if (!selectedFile) return;
  importError.textContent = "";
  if (selectedFile.size > 1_000_000) {
    importError.textContent = "Tệp quá lớn. Giới hạn là 1 MB.";
    return;
  }

  importButton.disabled = true;
  importButton.textContent = "Đang xử lý…";
  try {
    const contents = (await selectedFile.text()).replace(/^\uFEFF/u, "");
    const firstLine = contents.split(/\r?\n/u, 1)[0] || "";
    const delimiter = (firstLine.match(/;/gu) || []).length > (firstLine.match(/,/gu) || []).length ? ";" : ",";
    const rows = parseCsv(contents, delimiter).filter((row) => row.some((value) => value.trim()));
    if (!rows.length) throw new Error("Tệp CSV không có dữ liệu.");
    const headerNames = new Set([
      "review", "review_text", "product_review", "comment", "comment_text", "text",
      "content", "feedback", "đánh giá", "bình luận", "nội dung",
    ]);
    const headerIndex = rows[0].findIndex((cell) => headerNames.has(cell.trim().toLocaleLowerCase("vi-VN")));
    const hasHeader = headerIndex >= 0;
    const column = hasHeader ? headerIndex : 0;
    const texts = rows.slice(hasHeader ? 1 : 0).map((row) => (row[column] || "").trim()).filter(Boolean);
    if (!texts.length) throw new Error("Không tìm thấy bình luận trong tệp CSV.");
    if (texts.length > 500) throw new Error("Tệp có quá 500 đánh giá. Hãy chia nhỏ tệp rồi thử lại.");

    const results = await postJson("/api/analyze-batch", {
      texts,
      language: document.querySelector("#language-select").value,
    });
    const createdAt = new Date().toISOString();
    saveHistory(results.map((result) => ({
      text: result.text,
      sentiment: result.sentiment,
      label: result.label,
      confidence: result.confidence,
      wordCount: result.word_count,
      language: result.language,
      createdAt,
    })));
    importError.textContent = `Đã phân tích ${results.length} đánh giá.`;
    importError.classList.add("success-message");
  } catch (error) {
    importError.classList.remove("success-message");
    importError.textContent = error.message;
  } finally {
    importButton.disabled = !selectedFile;
    importButton.textContent = "Phân tích tệp";
  }
});

const profileButton = document.querySelector("#profile-button");
const profileMenu = document.querySelector("#profile-menu");
profileButton.addEventListener("click", () => {
  const isOpen = profileButton.getAttribute("aria-expanded") === "true";
  profileButton.setAttribute("aria-expanded", String(!isOpen));
  profileMenu.hidden = isOpen;
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".profile-wrap")) {
    profileButton.setAttribute("aria-expanded", "false");
    profileMenu.hidden = true;
  }
});

document.querySelector("#notification-button").addEventListener("click", (event) => {
  const button = event.currentTarget;
  button.classList.add("notification-seen");
  button.title = "Không có thông báo mới";
  button.setAttribute("aria-label", "Không có thông báo mới");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});

document.querySelector("#current-date").textContent = new Date().toLocaleDateString("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// KIỂM TRA HỆ THỐNG VÀ KẾT NỐI API ĐA MÔ HÌNH AI
fetch("/api/health")
  .then((response) => {
    if (!response.ok) throw new Error("Máy chủ không phản hồi.");
    return response.json();
  })
  .then((health) => {
    if (health.status !== "ok") throw new Error("Dịch vụ phân tích chưa sẵn sàng.");
    document.querySelector("#system-status-label").textContent = "Hệ thống hoạt động (3 Mô hình AI)";
    if (health.metrics) {
      console.log("Thông số độ chính xác các mô hình AI:", health.metrics);
    }
  })
  .catch(() => {
    document.querySelector("#system-status-label").textContent = "Không kết nối được máy chủ";
    document.querySelector("#system-status").classList.add("status-offline");
  });

renderDashboard();
renderHistory();
// Gợi ý mẫu tiếng Anh
const samples = [
  [
    "This product is amazing and works perfectly.",
    "It broke after one use, very disappointed.",
    "Although I was skeptical at first, the product exceeded my expectations and I would highly recommend it to anyone.",
    "If you enjoy wasting money and being frustrated, then this is definitely the product for you."
  ].join('\n'),
  [
    "The delivery was fast and the packaging was great.",
    "Terrible quality, not worth the price.",
    "Despite some negative reviews, I found this product to be reliable and useful in my daily routine.",
    "If you like disappointment and poor service, this is the perfect choice."
  ].join('\n'),
  [
    "Absolutely love it! Works better than described.",
    "The item stopped working after a week.",
    "Initially I doubted its effectiveness, but it turned out to be a fantastic investment.",
    "If you want to waste your time and money, look no further than this product."
  ].join('\n'),
  [
    "Very easy to use and setup, highly recommend.",
    "Not satisfied, the features are missing.",
    "Though the price seemed high, the value I received was worth every penny.",
    "If you enjoy being let down, this product will not disappoint."
  ].join('\n')
];

function fillSample(idx) {
  document.getElementById("review").value = samples[idx];
}

let sortDesc = true; // true: mới nhất trên cùng, false: cũ nhất trên cùng
let historyVisible = true;

async function analyzeSentiment(inputText = null, skipSave = false) {
  const reviewText = inputText !== null ? inputText : document.getElementById("review").value;
  const resultDiv = document.getElementById("result");
  const compareDiv = document.getElementById("compare-table");
  const reviews = reviewText.split('\n').filter(r => r.trim() !== "");
  if (reviews.length === 0) return;

  let results = [];
  for (let review of reviews) {
    const response = await fetch("http://localhost:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review })
    });
    if (response.ok) {
      const data = await response.json();
      results.push({ review, ...data });
    } else {
      results.push({ review, sentiment: "Error", keywords: [] });
    }
  }

  // Hiển thị bảng so sánh
  let html = `<table border="1" style="margin-top:1rem;width:100%;border-collapse:collapse">
    <tr>
      <th>Review</th>
      <th>Sentiment</th>
      <th>Keywords</th>
    </tr>`;
  results.forEach(r => {
    // Highlight keywords trong review
    let highlighted = r.review;
    if (r.keywords && r.keywords.length > 0) {
      r.keywords.forEach(word => {
        const re = new RegExp(`(${word})`, "gi");
        highlighted = highlighted.replace(re, '<mark>$1</mark>');
      });
    }
    html += `<tr>
      <td>${highlighted.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/&lt;mark&gt;/g,"<mark>").replace(/&lt;\/mark&gt;/g,"</mark>")}</td>
      <td style="color:${r.sentiment==="Positive"?"green":(r.sentiment==="Negative"?"red":"gray")}">${r.sentiment}</td>
      <td>${(r.keywords||[]).join(", ")}</td>
    </tr>`;
  });
  html += "</table>";
  compareDiv.innerHTML = html;

  // Lưu lịch sử nếu không phải là xem lại
  if (!skipSave) saveHistory(results, reviewText);

  // Hiển thị tổng hợp biểu đồ cảm xúc từ toàn bộ lịch sử
  showSentimentChart();
}

// Biểu đồ cảm xúc tổng hợp từ toàn bộ lịch sử (có phần trăm)
let chartInstance = null;
function showSentimentChart() {
  const ctx = document.getElementById('sentimentChart').getContext('2d');
  // Tổng hợp toàn bộ lịch sử
  let history = JSON.parse(localStorage.getItem("sentiment_history") || "[]");
  let allResults = [];
  history.forEach(item => allResults = allResults.concat(item.results));
  const counts = { Positive: 0, Negative: 0, Error: 0 };
  allResults.forEach(r => {
    if (r.sentiment in counts) counts[r.sentiment]++;
  });
  const total = counts.Positive + counts.Negative + counts.Error;
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Positive', 'Negative', 'Error'],
      datasets: [{
        data: [counts.Positive, counts.Negative, counts.Error],
        backgroundColor: ['#4caf50', '#f44336', '#bdbdbd']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        datalabels: {
          color: '#222',
          font: { weight: 'bold', size: 16 },
          formatter: (value, context) => {
            if (!total) return "0%";
            let percent = (value / total) * 100;
            return percent < 1 && value > 0 ? "<1%" : percent >= 1 ? percent.toFixed(0) + "%" : "";
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

// Lưu và hiển thị lịch sử các lần phân tích
function saveHistory(results, reviewText) {
  let history = JSON.parse(localStorage.getItem("sentiment_history") || "[]");
  history.push({ time: new Date().toLocaleString(), results, input: reviewText });
  if (history.length > 8) history = history.slice(history.length - 8); // chỉ lưu 8 lần gần nhất
  localStorage.setItem("sentiment_history", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const historyDiv = document.getElementById("history");
  let history = JSON.parse(localStorage.getItem("sentiment_history") || "[]");
  let sorted = sortDesc ? [...history].reverse() : history;
  let html = `<h3 style="display:inline-block">Lịch sử phân tích gần đây</h3>
    <button onclick="toggleSort()" style="font-size:13px;padding:2px 10px;margin-left:10px">
      Sắp xếp: ${sortDesc ? "Mới nhất" : "Cũ nhất"}
    </button>
    <button onclick="toggleHistory()" style="font-size:13px;padding:2px 10px;margin-left:10px">
      ${historyVisible ? "Ẩn lịch sử" : "Hiện lịch sử"}
    </button>
    <div style="max-height:220px;overflow-y:auto;border:1px solid #ddd;border-radius:6px;padding:6px 0;background:#fafafa;${historyVisible ? "" : "display:none;"}" id="history-list">`;
  sorted.forEach((item, idx) => {
    // Đánh số lần X (theo thứ tự thực tế, không phải thứ tự hiển thị)
    let realIndex = sortDesc ? history.length - idx : idx + 1;
    // Hiển thị nội dung đã nhập (rút gọn)
    let inputShort = item.input ? (item.input.length > 60 ? item.input.slice(0, 60) + "..." : item.input.replace(/\n/g, " ")) : "";
    html += `<div class="history-item" style="cursor:pointer;padding:6px 12px;border-bottom:1px solid #eee"
      onclick="showHistoryResult(${sortDesc ? history.length - idx - 1 : idx})">
      <b>Lần ${realIndex}</b> - <span style="color:#888">${item.time}</span><br>
      <span style="font-size:13px;color:#333">${inputShort}</span>
    </div>`;
  });
  html += "</div>";
  historyDiv.innerHTML = html;
}

// Hàm hiển thị lại kết quả khi bấm vào lịch sử
window.showHistoryResult = function(idx) {
  let history = JSON.parse(localStorage.getItem("sentiment_history") || "[]");
  if (history[idx]) {
    document.getElementById("review").value = history[idx].input;
    analyzeSentiment(history[idx].input, true);
  }
};

function toggleSort() {
  sortDesc = !sortDesc;
  renderHistory();
  showSentimentChart();
}

function toggleHistory() {
  historyVisible = !historyVisible;
  renderHistory();
}

window.onload = function() {
  renderHistory();
  showSentimentChart();
};
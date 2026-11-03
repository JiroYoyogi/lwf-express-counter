const countElement = document.querySelector("#count");
const button = document.querySelector("#increment");
const logElement = document.querySelector("#request-log");
const statusElement = document.querySelector("#request-status");

function updateCount(count) {
  countElement.textContent = String(count).padStart(3, "0");
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

// POSTした実行環境をログ表示
function addLog({ environmentId, count, clickedAt }) {
  const emptyLog = logElement.querySelector(".empty-log");
  if (emptyLog) emptyLog.remove();

  const item = document.createElement("li");

  const info = document.createElement("div");
  info.className = "log-info";

  const title = document.createElement("span");
  title.className = "log-title";
  title.textContent = "✓ POST succeeded";

  const env = document.createElement("span");
  env.className = "log-env";
  env.textContent = `ENV: ${environmentId}`;

  info.append(title, env);

  const meta = document.createElement("div");
  meta.className = "log-meta";

  const countText = document.createElement("span");
  countText.className = "log-count";
  countText.textContent = `Count: ${count}`;

  const time = document.createElement("span");
  time.className = "log-time";
  time.textContent = new Date(clickedAt).toLocaleTimeString(
    "ja-JP",
    { hour12: false }
  );

  meta.append(countText, time);
  item.append(info, meta);

  logElement.prepend(item);

}

// GET: DynamoDBの件数を取得
async function initialize() {
  try {
    const response = await fetch("/api/count", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to get count");
    }

    const data = await response.json();

    updateCount(data.count);
    setStatus("Connected to DynamoDB");
  } catch (error) {
    console.error(error);
    setStatus("Failed to load counter", true);
  } finally {
    button.disabled = false;
  }
}

// POST: クリック履歴をDynamoDBに保存
async function incrementCount() {
  button.disabled = true;
  setStatus("Saving click to DynamoDB...");

  try {
    const response = await fetch("/api/count", {
      method: "POST",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to increment count");
    }

    const data = await response.json();

    updateCount(data.count);

    addLog({
      environmentId: data.environmentId,
      count: data.count,
      clickedAt: data.clickedAt,
    });

    setStatus(`POST completed by ENV ${data.environmentId}`);
  } catch (error) {
    console.error(error);
    setStatus("Failed to save click", true);
  } finally {
    button.disabled = false;
  }
}

button.addEventListener("click", incrementCount);
initialize();
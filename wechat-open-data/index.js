const sharedCanvas = wx.getSharedCanvas();
const ctx = sharedCanvas.getContext("2d");

function scoreOf(item, key) {
  const value = item.KVDataList?.find((kv) => kv.key === key)?.value;
  try {
    return JSON.parse(value ?? "{}").wxgame?.score ?? 0;
  } catch {
    return 0;
  }
}

function paintPanel() {
  const width = sharedCanvas.width || 640;
  const height = sharedCanvas.height || 240;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#102333";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "28px sans-serif";
  ctx.fillText("好友精彩榜", 28, 46);
  return { width, height };
}

function drawEmpty(selfScore) {
  paintPanel();
  ctx.fillStyle = "#d9edf7";
  ctx.font = "24px sans-serif";
  ctx.fillText("还没有好友成绩。", 28, 100);
  if (selfScore > 0) {
    ctx.fillText(`你  ×${(selfScore / 100).toFixed(2)}`, 28, 144);
  } else {
    ctx.fillText("出海打漂亮，成绩会记到这里。", 28, 144);
  }
}

function draw(rows, key, selfScore) {
  if (!rows.length) {
    drawEmpty(selfScore);
    return;
  }
  paintPanel();
  rows.slice(0, 6).forEach((item, index) => {
    ctx.fillStyle = "#d9edf7";
    ctx.font = "24px sans-serif";
    const name = item.nickname || "潮汐收货员";
    ctx.fillText(
      `${index + 1}. ${name}  ×${(scoreOf(item, key) / 100).toFixed(2)}`,
      28,
      92 + index * 36,
    );
  });
}

wx.onMessage((message) => {
  if (!message || message.fromEngine || message.type === "engine") return;
  if (message.type !== "showFriendRank") return;
  const selfScore = Number(message.selfScore) || 0;
  wx.getFriendCloudStorage({
    keyList: [message.key],
    success: ({ data }) => {
      const rows = Array.isArray(data) ? data : [];
      rows.sort((a, b) => scoreOf(b, message.key) - scoreOf(a, message.key));
      draw(rows, message.key, selfScore);
    },
    fail: () => drawEmpty(selfScore),
  });
});

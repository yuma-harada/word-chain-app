const roomId = localStorage.getItem("roomId");
const userId = localStorage.getItem("userId");
const userName = localStorage.getItem("userName");
const color = localStorage.getItem("color");

if (!roomId || !userId || !userName) {
  alert("ルーム情報が見つかりません。もう一度参加してください。");
  globalThis.location.href = "/multi-play";
}

// 画面に表示
document.getElementById("room-id").textContent = roomId;
document.getElementById("user-name").textContent = userName;

// WebSocket接続
const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(
  `${wsProtocol}://${location.host}/ws?roomId=${roomId}&userId=${userId}&userName=${userName}&color=${
    encodeURIComponent(color)
  }`,
);

ws.onopen = () => {
  console.log("WebSocket接続成功");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "playerList") {
    updatePlayerList(data);
  }
  if (data.type === "start") {
    startGame();
  }
};

ws.onclose = () => {
  console.log("WebSocket切断");
};

ws.onerror = (e) => {
  console.error("WebSocketエラー", e);
};

document.getElementById("leave-room-button").onclick = () => {
  leaveRoom();
  localStorage.removeItem("userId");
  localStorage.removeItem("roomId");
  localStorage.removeItem("userName");
  localStorage.removeItem("color");
  globalThis.location.href = "/multi-play";
};

globalThis.addEventListener("beforeunload", () => {
  leaveRoom();
});

const updatePlayerList = (data) => {
  const playerList = document.getElementById("players");
  playerList.textContent = "";

  data.players.forEach((player) => {
    console.log(player);
    const li = document.createElement("li");
    li.textContent = player.userName;
    li.style.color = player.color;
    if (player.isHost) {
      li.style.borderColor = "red";
    }
    if (player.userId === userId) {
      const span = document.createElement("span");
      span.textContent = "（あなた）";
      li.appendChild(span);
    }
    playerList.appendChild(li);
  });
};

const startGame = () => {
  globalThis.location.href = "/multi-play/game";
};

const leaveRoom = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
};

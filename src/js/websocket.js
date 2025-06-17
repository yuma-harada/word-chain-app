import {
  handleSubmit,
  isTextValid,
  leaveRoom,
  nextTurn,
  startGame,
  updatePlayerList,
} from "./room.js";

const roomId = localStorage.getItem("roomId");
const userId = localStorage.getItem("userId");
const userName = localStorage.getItem("userName");
const color = localStorage.getItem("color");

if (!roomId || !userId || !userName) {
  alert("ルーム情報が見つかりません。もう一度参加してください。");
  globalThis.location.href = "/multi-play";
}
document.getElementById("room-id").textContent = roomId;

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
    updatePlayerList(data, userId);
  }
  if (data.type === "start" || data.isPlayMode === true) {
    startGame(userId, data);
  }
  if (data.type === "nextTurn") {
    nextTurn(userId, data);
  }
  if (data.type === "error") {
    alert(data.message);
  }
};

ws.onclose = () => {
  console.log("WebSocket切断");
};

ws.onerror = (e) => {
  console.error("WebSocketエラー", e);
};

document.getElementById("start-button").onclick = () => {
  ws.send(JSON.stringify({ type: "startRequest" }));
};

document.getElementById("next-word-send-button").onclick = () => {
  handleSubmit(ws);
};

document.querySelectorAll(".leave-room-button").forEach((leaveButton) => {
  leaveButton.onclick = () => {
    leaveRoom(ws);
    localStorage.removeItem("userId");
    localStorage.removeItem("roomId");
    localStorage.removeItem("userName");
    localStorage.removeItem("color");
    globalThis.location.href = "/multi-play";
  };
});

globalThis.addEventListener("beforeunload", () => {
  const navigationEntries = performance.getEntriesByType("navigation");
  if (
    navigationEntries.length > 0 &&
    navigationEntries[0] instanceof PerformanceNavigationTiming
  ) {
    const navigationType = navigationEntries[0].type;
    if (!["reload", "navigate"].includes(navigationType)) {
      console.log(navigationType);
      leaveRoom(ws);
      localStorage.removeItem("userId");
      localStorage.removeItem("roomId");
      localStorage.removeItem("userName");
      localStorage.removeItem("color");
      globalThis.location.href = "/multi-play";
    }
  }
});

document.getElementById("next-word-input").addEventListener(
  "input",
  (event) => {
    const input = event.target;
    const sendButton = document.getElementById("next-word-send-button");

    const isValid = isTextValid(input.value);
    if (!isValid) {
      sendButton.classList.add("disabled");
    } else {
      sendButton.classList.remove("disabled");
    }
    return;
  },
);

document.getElementById("next-word-input").addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      handleSubmit(ws);
      return;
    }
  },
);

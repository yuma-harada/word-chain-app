import { leaveRoom, startGame, updatePlayerList } from "./room.js";

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
  if (data.type === "start") {
    // const roomdata = JSON.parse(data);
    console.log(data);
    startGame();
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

document.getElementById("leave-room-button").onclick = () => {
  leaveRoom(ws);
  localStorage.removeItem("userId");
  localStorage.removeItem("roomId");
  localStorage.removeItem("userName");
  localStorage.removeItem("color");
  globalThis.location.href = "/multi-play";
};

globalThis.addEventListener("beforeunload", () => {
  leaveRoom(ws);
});

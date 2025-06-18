import {
  checkHardRoom,
  giveUp,
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

let wordList = [];

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  wordList = data.shiritoriWords;
  if (data.type === "playerList") {
    updatePlayerList(data, userId);
  }
  if (
    data.type === "start" ||
    (data.isPlayMode === true)
  ) {
    startGame(userId, data, checkHardRoom(roomId));
  }
  if (data.type === "nextTurn") {
    nextTurn(userId, data, checkHardRoom(roomId));
  }
  if (data.type === "playerGiveUp") {
    giveUp(data.userId, userId);
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
      leaveRoom(ws);
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

document.getElementById("give-up-button").onclick = () => {
  ws.send(JSON.stringify({ type: "giveUp" }));
};

const modal = document.querySelector(".js-modal");
const modalButton = document.querySelector(".modal-button");

const modalClose = document.querySelector(".modal-close-button");

modalButton.addEventListener("click", () => {
  const content = document.getElementById("modal-content");
  const ul = document.createElement("ul");
  ul.classList.add("word-list");

  content.innerHTML = "";
  wordList.forEach((word) => {
    const li = document.createElement("li");
    li.textContent = word;
    ul.appendChild(li);
  });

  content.appendChild(ul);
  modal.classList.add("is-open");
});

modalClose.addEventListener("click", () => {
  modal.classList.remove("is-open");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    modal.classList.remove("is-open");
  }
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.remove("is-open");
  }
});

globalThis.onload = () => {
  const title = document.getElementById("battle-title");
  if (checkHardRoom(roomId)) {
    title.innerText = "ハードモード\nしりとり対戦中";
    title.classList.add("he11-mode");
  } else {
    title.textContent = "しりとり対戦中";
    title.classList.remove("he11-mode");
  }
  return;
};

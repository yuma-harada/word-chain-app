export const updatePlayerList = (data, userId) => {
  const playerList = document.getElementById("players");
  playerList.textContent = "";

  data.players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.userName;
    li.style.color = player.color;
    if (player.isHost) {
      li.style.borderColor = "red";
      if (player.userId === userId) {
        document.getElementById("start-button").style.display = "block";
      }
    }
    if (player.userId === userId) {
      const span = document.createElement("span");
      span.textContent = "（あなた）";
      li.appendChild(span);
    }
    playerList.appendChild(li);
  });
};

export const startGame = () => {
  console.log("start");
};

export const leaveRoom = (ws) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
};

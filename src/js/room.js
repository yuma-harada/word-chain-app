export const isTextValid = (text) => {
  return /^[ぁ-ゖー]+$/u.test(text) && !/ー{2,}/.test(text);
};

const checkHardRoom = (roomId) => roomId.startsWith("he11_");

const setPreviousWord = (previousWord) => {
  const mainPart = previousWord.slice(0, -1);
  const lastChar = previousWord.slice(-1);
  const paragraph = document.getElementById("previous-word");
  const span = document.createElement("span");
  span.className = "highlight";
  if (lastChar === "ー") {
    paragraph.textContent = `前の単語: ${mainPart.slice(0, -1)}`;
    span.textContent = previousWord.slice(-2, -1);
    const lastSpan = document.createElement("span");
    lastSpan.textContent = lastChar;
    paragraph.appendChild(span);
    paragraph.appendChild(lastSpan);
  } else {
    paragraph.textContent = `前の単語: ${mainPart}`;
    span.textContent = lastChar;
    paragraph.appendChild(span);
  }
  return;
};

const changeGameOver = (isGameOver, turnPlayerId, userId) => {
  console.log(turnPlayerId);
  console.log(userId);
  document.getElementById("game-room").style.display = isGameOver
    ? "none"
    : "flex";
  document.getElementById("gameover-container").style.display = isGameOver
    ? "flex"
    : "none";
  document.getElementById("gameover-title").innerText = turnPlayerId === userId
    ? "YOU LOSE!"
    : "YOU WIN!";
  return;
};

const judgeResults = (data, userId) => {
  const previousWord = data.shiritoriWords.slice(-1)[0];
  console.log(data.player.userId);
  // 末尾が"ん"で終わるとき
  if (previousWord.slice(-1) === "ん") {
    changeGameOver(true, data.previousPlayerId, userId);
    const paragraph = document.getElementById("gameover-message");
    paragraph.innerText =
      `"${previousWord}"が入力されました。\n末尾が"ん"のワードが入力されたのでゲームを終了します。`;
  } // 同じワードが2回入力されたとき
  else if (data.shiritoriWords.slice(0, -1).includes(previousWord)) {
    alert(
      `"${previousWord}"が入力されました。\n同じワードが再送されたのでゲームを終了します。`,
    );
    changeGameOver(true, data.previousPlayerId, userId);
    const paragraph = document.getElementById("gameover-message");
    paragraph.innerText =
      `"${previousWord}"が入力されました。\n同じワードが再送されたのでゲームを終了します。`;
  } else {
    setPreviousWord(previousWord);
  }
  return;
};

const updatePlayerList = (data, userId) => {
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
      } else {
        document.getElementById("start-button").style.display = "none";
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

const startGame = (userId, data) => {
  document.getElementById("wait-room").style.display = "none";
  document.getElementById("game-room").style.display = "flex";
  nextTurn(userId, data);
};

const nextTurn = (userId, data) => {
  judgeResults(data, userId);
  showTurn(userId, data);
  const word_input = document.getElementById("next-word-input");
  const submit_button = document.getElementById("next-word-send-button");
  word_input.value = "";
  word_input.disabled = userId !== data.player.userId;
  submit_button.disabled = userId !== data.player.userId;
};

const leaveRoom = (ws) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  localStorage.removeItem("userId");
  localStorage.removeItem("roomId");
  localStorage.removeItem("userName");
  localStorage.removeItem("color");
  globalThis.location.href = "/multi-play";
};

const showTurn = (userId, data) => {
  const turnDisplay = document.getElementById("turn-display");
  turnDisplay.innerText = "";
  const span = document.createElement("span");
  span.style.color = data.player.color;
  if (userId === data.player.userId) {
    span.innerText = "あなた";
    turnDisplay.appendChild(span);
  } else {
    span.innerText = data.player.userName;
    turnDisplay.appendChild(span);
  }
  const suffix = document.createTextNode(
    userId === data.player.userId ? " のターンです" : " さんのターンです",
  );
  turnDisplay.appendChild(suffix);

  return;
};

const inputTextValidation = (isValid) => {
  const input = document.getElementById("next-word-input");
  const inputError = document.getElementById("input-error");
  if (!isValid) {
    input.classList.add("error");
    inputError.classList.remove("is-hidden");
  } else {
    input.classList.remove("error");
    inputError.classList.add("is-hidden");
  }
  return;
};

const handleSubmit = (ws) => {
  // inputタグを取得
  const nextWordInput = document.getElementById("next-word-input");
  // inputの中身を取得
  const nextWordInputText = nextWordInput.value;

  const isValid = isTextValid(nextWordInputText);
  inputTextValidation(isValid);
  if (!isValid) {
    return;
  }

  // POST /shiritoriを実行
  ws.send(JSON.stringify({ type: "sendWord", nextWord: nextWordInputText }));

  return;
};

export {
  checkHardRoom,
  handleSubmit,
  leaveRoom,
  nextTurn,
  startGame,
  updatePlayerList,
};

const isTextValid = (text) => {
  return /^[ぁ-ゖー]+$/u.test(text);
};

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

const changeGameOver = (isGameOver) => {
  document.getElementById("shiritori-container").style.display = isGameOver
    ? "none"
    : "flex";
  document.getElementById("gameover-container").style.display = isGameOver
    ? "flex"
    : "none";
  return;
};

const judgeResults = (words) => {
  const previousWord = words.slice(-1)[0];

  // 末尾が"ん"で終わるとき
  if (previousWord.slice(-1) === "ん") {
    changeGameOver(true);
    const paragraph = document.getElementById("gameover-message");
    paragraph.innerText =
      `"${previousWord}"が入力されました。\n末尾が"ん"のワードが入力されたのでゲームを終了します。`;
  } // 同じワードが2回入力されたとき
  else if (words.slice(0, -1).includes(previousWord)) {
    alert(
      `"${previousWord}"が入力されました。\n同じワードが再送されたのでゲームを終了します。`,
    );
    changeGameOver(true);
    const paragraph = document.getElementById("gameover-message");
    paragraph.innerText =
      `"${previousWord}"が入力されました。\n同じワードが再送されたのでゲームを終了します。`;
  } else {
    setPreviousWord(previousWord);
  }
  return;
};

const handleSubmit = async () => {
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
  const response = await fetch(
    "/shiritori",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextWord: nextWordInputText }),
    },
  );
  // status: 200以外が返ってきた場合にエラーを表示
  if (response.status !== 200) {
    const errorJson = await response.text();
    const errorObj = JSON.parse(errorJson);
    alert(errorObj["errorMessage"]);
  }

  const words = await response.json();
  judgeResults(words);

  // inputタグの中身を消去する
  nextWordInput.value = "";
  return;
};

globalThis.onload = async () => {
  // GET /shiritoriを実行
  const response = await fetch("/shiritori", { method: "GET" });
  const words = await response.json();
  judgeResults(words);
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

// 入力validation
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
  async (event) => {
    if (event.key === "Enter") {
      await handleSubmit();
      return;
    }
  },
);

// 送信ボタンの押下時に実行
document.getElementById("next-word-send-button").onclick = async () => {
  await handleSubmit();
};

document.querySelectorAll(".reset-button").forEach((resetButton) => {
  const nextWordInput = document.getElementById("next-word-input");
  resetButton.onclick = async () => {
    const response = await fetch(
      "/shiritori/reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    const words = await response.json();

    setPreviousWord(words.slice(-1)[0]);
    nextWordInput.value = "";

    changeGameOver(false);
  };
  return;
});

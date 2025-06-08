const changeGameOver = (isGameOver) => {
  document.getElementById("shiritoriContainer").style.display = isGameOver
    ? "none"
    : "flex";
  document.getElementById("gameoverContainer").style.display = isGameOver
    ? "flex"
    : "none";
};

const judgeResults = (words) => {
  const previousWord = words.slice(-1)[0];

  // 末尾が"ん"で終わるとき
  if (previousWord.slice(-1) === "ん") {
    changeGameOver(true);
    const paragraph = document.getElementById("gameoverMessage");
    paragraph.innerText =
      `"${previousWord}"が入力されました。\n末尾が"ん"のワードが入力されたのでゲームを終了します。`;
  } // 同じワードが2回入力されたとき
  else if (words.slice(0, -1).includes(previousWord)) {
    alert(
      `"${previousWord}"が入力されました。\n同じワードが再送されたのでゲームを終了します。`,
    );
    changeGameOver(true);
    const paragraph = document.getElementById("gameoverMessage");
    paragraph.innerText =
      `"${previousWord}"が入力されました。\n同じワードが再送されたのでゲームを終了します。`;
  } else {
    const paragraph = document.getElementById("previousWord");
    paragraph.textContent = `前の単語: ${previousWord}`;
  }
};

globalThis.onload = async () => {
  // GET /shiritoriを実行
  const response = await fetch("/shiritori", { method: "GET" });
  const words = await response.json();
  judgeResults(words);
};
// 送信ボタンの押下時に実行
document.getElementById("nextWordSendButton").onclick = async () => {
  // inputタグを取得
  const nextWordInput = document.getElementById("nextWordInput");
  // inputの中身を取得
  const nextWordInputText = nextWordInput.value;
  // POST /shiritoriを実行
  // 次の単語をresponseに格納
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
};

document.querySelectorAll(".resetButton").forEach((resetButton) => {
  resetButton.onclick = async () => {
    const response = await fetch(
      "/shiritori/reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    const words = await response.json();

    const paragraph = document.getElementById("previousWord");
    paragraph.textContent = `前の単語: ${words.slice(-1)[0]}`;
    nextWordInput.value = "";

    changeGameOver(false);
  };
});

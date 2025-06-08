const changeGameOver = (isGameOver) => {
  document.getElementById("shiritori-container").style.display = isGameOver
    ? "none"
    : "flex";
  document.getElementById("gameover-container").style.display = isGameOver
    ? "flex"
    : "none";
};

globalThis.onload = async () => {
  // GET /shiritoriを実行
  const response = await fetch("/shiritori", { method: "GET" });
  const words = await response.json();
  const paragraph = document.getElementById("previousWord");
  paragraph.textContent = `前の単語: ${words.slice(-1)[0]}`;
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
  const previousWord = words.slice(-1)[0];

  if (previousWord.slice(-1) === "ん") {
    alert(
      `"${previousWord}"が入力されました。\n末尾が"ん"のワードが入力されたのでゲームを終了します。`,
    );
    changeGameOver(true);
    const paragraph = document.getElementById("gameoverMessage");
    paragraph.innerText =
      `"${previousWord}"が入力されました。\n末尾が"ん"のワードが入力されたのでゲームを終了します。`;
  } else {
    // id: previousWordのタグを取得
    const paragraph = document.getElementById("previousWord");
    // 取得したタグの中身を書き換える
    paragraph.textContent = `前の単語: ${previousWord}`;
  }
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

globalThis.onload = async () => {
  // GET /shiritoriを実行
  const response = await fetch("/shiritori", { method: "GET" });
  // responseの中からレスポンスのテキストデータを取得
  const previousWord = await response.text();
  // id: previousWordのタグを取得
  const paragraph = document.querySelector("#previousWord");
  // 取得したタグの中身を書き換える
  paragraph.innerHTML = `前の単語: ${previousWord}`;
};
// 送信ボタンの押下時に実行
document.querySelector("#nextWordSendButton").onclick = async () => {
  // inputタグを取得
  const nextWordInput = document.querySelector("#nextWordInput");
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

  const previousWord = await response.text();

  // id: previousWordのタグを取得
  const paragraph = document.querySelector("#previousWord");
  // 取得したタグの中身を書き換える
  paragraph.innerHTML = `前の単語: ${previousWord}`;
  // inputタグの中身を消去する
  nextWordInput.value = "";
};

document.querySelector("#resetButton").onclick = async () => {
  // 次の単語をresponseに格納
  const response = await fetch(
    "/shiritori/reset",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );
  const previousWord = await response.text();

  const paragraph = document.querySelector("#previousWord");
  paragraph.innerHTML = `前の単語: ${previousWord}`;
  nextWordInput.value = "";
};

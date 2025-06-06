// server.js
import { serveDir, serveFile } from "jsr:@std/http/file-server";

let previousWord = "しりとり";

Deno.serve(async (_req) => {
  const pathname = new URL(_req.url).pathname;

  // ルーティング
  const fsRoot = "src/pages/";
  if (pathname === "/single-play") {
    return serveFile(_req, fsRoot + "/single_play.html");
  }

  // GET /shiritori: 直前の単語を返す
  if (_req.method === "GET" && pathname === "/shiritori") {
    return new Response(previousWord);
  }

  // POST /shiritori: 次の単語を受け取って保存する
  if (_req.method === "POST" && pathname === "/shiritori") {
    // リクエストのペイロードを取得
    const requestJson = await _req.json();
    // JSONの中からnextWordを取得
    const nextWord = requestJson["nextWord"];

    // previousWordの末尾とnextWordの先頭が同一か確認
    if (previousWord.slice(-1) === nextWord.slice(0, 1)) {
      // 同一であれば、previousWordを更新
      previousWord = nextWord;
    } // 同一でない単語の入力時に、エラーを返す
    else {
      return new Response(
        JSON.stringify({
          "errorMessage": "前の単語に続いていません",
          "errorCode": "10001",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        },
      );
    }

    return new Response(previousWord);
  }
  return serveDir(
    _req,
    {
      fsRoot: "./src/",
      urlRoot: "",
      enableCors: true,
    },
  );
});

// server.js
import { serveDir, serveFile } from "jsr:@std/http/file-server";

let words = ["しりとり"];

Deno.serve(async (_req) => {
  const pathname = new URL(_req.url).pathname;

  // ルーティング
  const pageRoot = "src/pages/";
  if (pathname === "/") {
    return serveFile(_req, pageRoot + "index.html");
  }
  if (pathname === "/single-play") {
    return serveFile(_req, pageRoot + "single_play.html");
  }

  // GET /shiritori: 直前の単語を返す
  if (_req.method === "GET" && pathname === "/shiritori") {
    return new Response(JSON.stringify(words), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // POST /shiritori: 次の単語を受け取って保存する
  if (_req.method === "POST" && pathname === "/shiritori") {
    // リクエストのペイロードを取得
    const requestJson = await _req.json();
    // JSONの中からnextWordを取得
    const nextWord = requestJson["nextWord"];

    if (
      words.slice(-1)[0].slice(-1) === nextWord.slice(0, 1) ||
      (words.slice(-1)[0].slice(-1) === "ー" &&
        words.slice(-1)[0].slice(-2, -1) === nextWord.slice(0, 1))
    ) {
      words.push(nextWord);
    } else {
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
    return new Response(JSON.stringify(words), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // POST /shiritori/reset: 単語をリセットする:
  if (_req.method === "POST" && pathname === "/shiritori/reset") {
    words = ["しりとり"];
    return new Response(JSON.stringify(words), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
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

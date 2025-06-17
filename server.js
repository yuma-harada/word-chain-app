// server.js
import { serveDir, serveFile } from "jsr:@std/http/file-server";

let words = ["しりとり"];

// 拗音対応map
const normalizeKana = (char) => {
  const map = {
    "ゃ": "や",
    "ゅ": "ゆ",
    "ょ": "よ",
    "ぁ": "あ",
    "ぃ": "い",
    "ぅ": "う",
    "ぇ": "え",
    "ぉ": "お",
    "っ": "つ",
  };
  return map[char] || char; // マップにない場合はそのまま返す
};

const rooms = new Map();

const getTurnUser = (room) => {
  const clients = room.get("clients");
  const users = Array.from(clients.entries());
  const turnUser = users[room.get("turn") % users.length][1];
  return {
    userId: turnUser.userId,
    userName: turnUser.userName,
    color: turnUser.color,
  };
};

const broadcastPlayerList = (roomId) => {
  const room = rooms.get(roomId);
  const clients = room.get("clients");
  if (!room || !clients) return;

  const playerList = Array.from(clients.entries()).map(([_, info], index) => ({
    userId: info.userId,
    userName: info.userName,
    color: info.color,
    isHost: index === 0 ? true : false,
  }));

  const message = JSON.stringify({
    type: "playerList",
    players: playerList,
    shiritoriWords: room.get("shiritoriWords"),
    player: getTurnUser(room),
    isPlayMode: room.get("isPlayMode"),
  });

  for (const { socket } of clients.values()) {
    socket.send(message);
  }
};

const broadcastShiritori = (roomId, isStart) => {
  const room = rooms.get(roomId);
  const clients = room.get("clients");
  if (!room || !clients) return;
  if (isStart) {
    room.set("isPlayMode", true);
  }
  const shiritoriMessage = JSON.stringify({
    type: isStart ? "start" : "nextTurn",
    shiritoriWords: room.get("shiritoriWords"),
    player: getTurnUser(room),
    isPlayMode: true,
  });
  for (const { socket } of clients.values()) {
    socket.send(shiritoriMessage);
  }
};

const judgeShiritori = (words, nextWord) => {
  if (
    normalizeKana(words.slice(-1)[0].slice(-1)) === nextWord.slice(0, 1) ||
    (words.slice(-1)[0].slice(-1) === "ー" &&
      normalizeKana(words.slice(-1)[0].slice(-2, -1)) ===
        nextWord.slice(0, 1))
  ) {
    words.push(nextWord);
    return words;
  } else {
    return;
  }
};

const broadcastNextTurn = (roomId, userId, nextWord) => {
  const room = rooms.get(roomId);
  const clients = room.get("clients");
  if (!room || !clients) return;
  const wordList = judgeShiritori(room.get("shiritoriWords"), nextWord);
  if (wordList) {
    const currentTurn = room.get("turn");
    room.set("turn", currentTurn + 1);
    room.set("shiritoriWords", wordList);
    broadcastShiritori(roomId, false);
  } else {
    const errorMessage = JSON.stringify({
      type: "error",
      message: "前の単語に続いていません",
    });
    const socket = clients.get(userId).socket;
    socket.send(errorMessage);
  }
};

Deno.serve(async (_req) => {
  const url = new URL(_req.url);
  const pathname = url.pathname;

  // ルーティング
  const pageRoot = "src/pages/";
  if (pathname === "/") {
    return serveFile(_req, pageRoot + "index.html");
  }
  if (pathname === "/single-play") {
    return serveFile(_req, pageRoot + "single_play.html");
  }
  if (pathname === "/multi-play") {
    return serveFile(_req, pageRoot + "multi_play.html");
  }
  if (pathname === "/multi-play/room") {
    return serveFile(_req, pageRoot + "room.html");
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
      normalizeKana(words.slice(-1)[0].slice(-1)) === nextWord.slice(0, 1) ||
      (words.slice(-1)[0].slice(-1) === "ー" &&
        normalizeKana(words.slice(-1)[0].slice(-2, -1)) ===
          nextWord.slice(0, 1))
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

  // マルチプレイ用websocket
  const isWebSocket =
    _req.headers.get("upgrade")?.toLowerCase() === "websocket";
  if (isWebSocket) {
    const roomId = url.searchParams.get("roomId");
    const userId = url.searchParams.get("userId");
    const userName = url.searchParams.get("userName");
    const color = url.searchParams.get("color");

    if (!roomId || !userId || !userName || !color) {
      return new Response("Missing parameters", { status: 400 });
    }

    const { socket, response } = Deno.upgradeWebSocket(_req);

    socket.onopen = () => {
      if (!rooms.has(roomId)) {
        rooms.set(
          roomId,
          new Map([["clients", new Map()], ["shiritoriWords", ["しりとり"]], [
            "turn",
            0,
          ], ["isPlayMode", false]]),
        );
      }
      const clients = rooms.get(roomId).get("clients");
      clients.set(userId, { socket, userId, userName, color });
      broadcastPlayerList(roomId);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "startRequest":
            broadcastShiritori(roomId, true);
            break;
          case "sendWord":
            broadcastNextTurn(roomId, userId, data.nextWord);
        }
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    };

    socket.onclose = () => {
      const clients = rooms.get(roomId).get("clients");
      if (clients) {
        clients.delete(userId);
        if (clients.size === 0) rooms.delete(roomId);
        else broadcastPlayerList(roomId);
      }
    };

    socket.onerror = (e) => console.error("WebSocket Error:", e);

    return response;
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

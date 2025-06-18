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

// roomIdでハードモードかどうか判定
const checkHardRoom = (roomId) => roomId.startsWith("he11_");

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

  const message = {
    type: "playerList",
    players: playerList,
    shiritoriWords: room.get("shiritoriWords"),
    player: getTurnUser(room),
    isPlayMode: room.get("isPlayMode"),
  };

  if (checkHardRoom(roomId)) {
    message.endCharacter = room.get("endCharacter") ?? "";
    message.wordLength = room.get("wordLength") ?? 0;
  }

  for (const { socket } of clients.values()) {
    socket.send(JSON.stringify(message));
  }
};

const broadcastShiritori = (roomId, userId, isStart) => {
  const room = rooms.get(roomId);
  const clients = room.get("clients");
  if (!room || !clients) return;
  if (clients.size < 2) {
    const errorMessage = JSON.stringify({
      type: "error",
      message: "参加者が2人以上でないとゲームを開始できません",
    });
    const socket = clients.get(userId).socket;
    socket.send(errorMessage);
    return;
  }
  if (isStart) {
    room.set("isPlayMode", true);
  }
  const shiritoriMessage = {
    type: isStart ? "start" : "nextTurn",
    shiritoriWords: room.get("shiritoriWords"),
    player: getTurnUser(room),
    previousPlayerId: userId,
    isPlayMode: true,
  };
  if (checkHardRoom(roomId)) {
    const endCharacter = getRandomHiragana();
    const wordLength = Math.floor(Math.random() * (5)) + 3;
    room.set("endCharacter", endCharacter);
    room.set("wordLength", wordLength);
    shiritoriMessage.endCharacter = endCharacter;
    shiritoriMessage.wordLength = wordLength;
  }
  for (const { socket } of clients.values()) {
    socket.send(JSON.stringify(shiritoriMessage));
  }
};

const getRandomHiragana = () => {
  const baseCode = "あ".charCodeAt(0); // 12354
  const maxOffset = "わ".charCodeAt(0) - baseCode; // 81

  const exclude = ["ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "ゃ", "ゅ", "ょ", "っ", "ゎ"];

  for (let i = 0; i < 10; i++) {
    const code = baseCode + Math.floor(Math.random() * (maxOffset + 1));
    const char = String.fromCharCode(code);
    if (!exclude.includes(char)) {
      return char;
    }
  }
  // "う"が一番末尾に来やすいらしい
  return "う";
};

const judgeShiritori = (words, nextWord) => {
  if (
    judgeStartCharacter(words, nextWord)
  ) {
    words.push(nextWord);
    return words;
  } else {
    return;
  }
};

const judgeStartCharacter = (words, nextWord) => {
  return normalizeKana(words.slice(-1)[0].slice(-1)) === nextWord.slice(0, 1) ||
    (words.slice(-1)[0].slice(-1) === "ー" &&
      normalizeKana(words.slice(-1)[0].slice(-2, -1)) ===
        nextWord.slice(0, 1));
};

const judgeEndCharacter = (endCharacter, nextWord) => {
  return endCharacter === normalizeKana(nextWord.slice(-1)) ||
    (nextWord.slice(-1) === "ー" &&
      endCharacter === normalizeKana(nextWord.slice(-2, -1)));
};

const judgeWordLength = (wordLength, nextWord) => {
  return wordLength === nextWord.length;
};

const judgeShiritoriHardMode = (room, nextWord) => {
  const words = room.get("shiritoriWords");
  const endCharacter = room.get("endCharacter");
  const wordLength = room.get("wordLength");
  if (
    judgeStartCharacter(words, nextWord) &&
    judgeEndCharacter(endCharacter, nextWord) &&
    judgeWordLength(wordLength, nextWord)
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
  const isHardMode = checkHardRoom(roomId);
  if (!room || !clients) return;
  const wordList = isHardMode
    ? judgeShiritoriHardMode(room, nextWord)
    : judgeShiritori(room.get("shiritoriWords"), nextWord);
  if (wordList) {
    const currentTurn = room.get("turn");
    room.set("turn", currentTurn + 1);
    room.set("shiritoriWords", wordList);
    broadcastShiritori(roomId, userId, false);
  } else {
    const errorMessage = JSON.stringify({
      type: "error",
      message: isHardMode
        ? "文字数の不足、または先頭もしくは末尾の文字と一致していません"
        : "前の単語に続いていません",
    });
    const socket = clients.get(userId).socket;
    socket.send(errorMessage);
  }
};

const playerGiveUp = (roomId, userId) => {
  const room = rooms.get(roomId);
  const clients = room.get("clients");
  if (!room || !clients) return;
  for (const { socket } of clients.values()) {
    socket.send(
      JSON.stringify({
        type: "playerGiveUp",
        userId: userId,
        shiritoriWords: room.get("shiritoriWords"),
      }),
    );
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
      return new Response("not found parameters", { status: 400 });
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
        if (checkHardRoom(roomId)) {
          const room = rooms.get(roomId);
          if (!room) return;
          room.set("endCharacter", "");
          room.set("wordLength", 0);
        }
      }
      const clients = rooms.get(roomId)?.get("clients");
      if (!clients.has(userId)) {
        clients.set(userId, { socket, userId, userName, color });
        broadcastPlayerList(roomId);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "startRequest":
            broadcastShiritori(roomId, userId, true);
            break;
          case "sendWord":
            broadcastNextTurn(roomId, userId, data.nextWord);
            break;
          case "giveUp":
            playerGiveUp(roomId, userId);
            break;
        }
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    };

    socket.onclose = () => {
      const clients = rooms.get(roomId)?.get("clients");
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

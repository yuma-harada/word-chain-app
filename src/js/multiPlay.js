const generateUUID = () => {
  if (globalThis.crypto && globalThis.crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const generateColor = () => {
  return "#" +
    Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
};

document.getElementById("join-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const roomId = document.getElementById("room-id").value.trim();
  const userName = document.getElementById("user-name").value.trim();

  if (roomId && userName) {
    localStorage.setItem("roomId", roomId);
    localStorage.setItem("userId", generateUUID());
    localStorage.setItem("userName", userName);
    localStorage.setItem("color", generateColor());
    globalThis.location.href = "/multi-play/room";
  }
});

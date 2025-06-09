const modal = document.querySelector(".js-modal");
const modalButton = document.querySelector(".modal-button");

const modalClose = document.querySelector(".modal-close-button");

modalButton.addEventListener("click", async () => {
  const response = await fetch("/shiritori", { method: "GET" });
  const words = await response.json();
  const content = document.getElementById("modal-content");
  content.innerText = words.join("\n");
  modal.classList.add("is-open");
});

modalClose.addEventListener("click", () => {
  modal.classList.remove("is-open");
});

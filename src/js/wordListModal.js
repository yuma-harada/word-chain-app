const modal = document.querySelector(".js-modal");
const modalButton = document.querySelector(".modal-button");

const modalClose = document.querySelector(".modal-close-button");

modalButton.addEventListener("click", async () => {
  const response = await fetch("/shiritori", { method: "GET" });
  const words = await response.json();
  const content = document.getElementById("modal-content");
  const ul = document.createElement("ul");
  ul.classList.add("word-list");

  content.innerHTML = "";
  words.forEach((word) => {
    const li = document.createElement("li");
    li.textContent = word;
    ul.appendChild(li);
  });

  content.appendChild(ul);
  modal.classList.add("is-open");
});

modalClose.addEventListener("click", () => {
  modal.classList.remove("is-open");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    modal.classList.remove("is-open");
  }
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.remove("is-open");
  }
});

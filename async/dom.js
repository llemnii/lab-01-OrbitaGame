export function showScreen(name) {
  for (const screen of document.querySelectorAll("[data-screen]")) {
    screen.hidden = screen.dataset.screen !== name;
  }
}

export function renderRooms(rooms, list, onPick) {
  list.replaceChildren();
  for (const room of rooms) {
    const button = document.createElement("button");
    button.className = "room";
    button.type = "button";
    button.innerHTML = `<strong>${room.name}</strong><span>${room.players}/${room.limit} гравців</span>`;
    button.addEventListener("click", () => {
      for (const item of list.querySelectorAll(".room"))
        item.classList.remove("selected");
      button.classList.add("selected");
      onPick(room);
    });
    list.append(button);
  }
}

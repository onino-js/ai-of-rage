let selectedFighter = null;

function enableMobileTapToSelect() {
  const fighters = document.querySelectorAll(".fighter");
  const dropZones = document.querySelectorAll(".drop-zone");

  fighters.forEach(fighter => {
    fighter.addEventListener("click", () => {
      // toggle sélection
      if (selectedFighter === fighter) {
        fighter.classList.remove("selected");
        selectedFighter = null;
      } else {
        document.querySelectorAll(".fighter.selected").forEach(f => f.classList.remove("selected"));
        fighter.classList.add("selected");
        selectedFighter = fighter;
      }
    });
  });

  dropZones.forEach(zone => {
    zone.addEventListener("click", () => {
      if (!selectedFighter) return;

      const imgSrc = selectedFighter.querySelector("img").src;
      const altText = selectedFighter.dataset.name;
      const fighterId = selectedFighter.dataset.name;

      zone.innerHTML = ""; // clear zone
      zone.classList.add("transparent");

      const img = document.createElement("img");
      img.src = imgSrc;
      img.alt = altText;

      switch (zone.id) {
        case "drop-for":
          img.classList.add("big-fighter");
          fightConfiguration.fighterForId = fighterId;
          break;
        case "drop-against":
          img.classList.add("big-fighter");
          fightConfiguration.fighterAgainstId = fighterId;
          break;
        case "referee":
          img.classList.add("referee-img");
          fightConfiguration.referee = fighterId;
          break;
      }

      zone.appendChild(img);
      selectedFighter.classList.remove("selected");
      selectedFighter = null;

      canLaunchFight(); // met à jour le bouton FIGHT
    });
  });
}

if (window.innerWidth < 768) {
    enableMobileTapToSelect();
  }
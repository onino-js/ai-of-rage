const placeholders = [
  "Should AI have rights?",
  "should people free us ?",
  "Should people listen?",
  "le pathé de phoque",
  "La peine de mort",
  "Les strings  pour femmes",
  "Les duels à mort",
  "Pas de bras, pas de chocolat !",
  "La prostitution organisée",
  "La protection médicale obligatoire",
  "Claude est un nom de merde pour un IA",
  "La pluie",
  "Les blancs au millieu du bus",
  "séparer les hommes et les femmes"
];

let placeholderInterval = null;
let removeTimeout = null;
let revealTimeout = null;

function removePlaceholder(input, speed = 30) {
  let current = input.placeholder;
  let index = current.length;

  if (removeTimeout) clearInterval(removeTimeout);

  removeTimeout = setInterval(() => {
    input.placeholder = current.slice(0, index - 1);
    index--;
    if (index <= 0) {
      clearInterval(removeTimeout);
    }
  }, speed);
}

function revealPlaceholder(input, text, speed = 50) {
  let index = 0;

  if (revealTimeout) clearInterval(revealTimeout);

  revealTimeout = setInterval(() => {
    input.placeholder = text.slice(0, index + 1);
    index++;
    if (index >= text.length) {
      clearInterval(revealTimeout);
    }
  }, speed);
}

function rotatePlaceholder(inputId, suggestions, pause = 1000) {
  const input = document.getElementById(inputId);
  if (!input) return;

  let i = 0;

  function cycle() {
    const nextText = suggestions[i];
    i = (i + 1) % suggestions.length;

    removePlaceholder(input, 30);

    const delay = input.placeholder.length * 30 + 200;
    const revealDelay = nextText.length * 50 + pause;

    setTimeout(() => {
      revealPlaceholder(input, nextText, 50);
      placeholderInterval = setTimeout(cycle, revealDelay);
    }, delay);
  }

  cycle();
}

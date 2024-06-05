// get playerId from local storage
const playerId =
  localStorage.getItem("playerId") || Math.floor(Math.random() * Date.now());
localStorage.setItem("playerId", playerId);

const HIDDEN_MSGS = ['systemstart']

function send(data, type, system = false) {
  const req = {
    ...data,
    timestamp: Date.now(),
    playerId: system ? 0 : playerId,
    type,
  };
  ws.send(JSON.stringify(req));

  if (type == "message") {
    document.getElementById("message").value = "";
    const ul = document.getElementById("messages");
    const li = document.createElement("li");
    li.innerHTML = `<strong>&lt;Me&gt;</strong> ${data.message}`;
    ul.appendChild(li);
  }
}

function onSubmitText(e, type = "message") {
  e.preventDefault();
  switch (type) {
    case "message":
      send({ message: document.getElementById("message").value }, "message");
      break;
    case "cutscene":
      send(
        {
          message: `playCutscene|${document.getElementById("system-message").value}`,
        },
        "message",
      );
  }
}

function playCutscene(name) {
  send({ message: `playCutscene|${name}` }, "message", true);
}

function createPoll(title, id, options, startTime, endTime) {
  const pollsContainer = document.getElementById("polls");
  const pollContainer = document.createElement("div");
  pollContainer.classList.add("poll");
  pollContainer.id = id;
  pollsContainer.appendChild(pollContainer);

  const heading = document.createElement("h2");
  heading.innerText = title;
  heading.classList.add("poll-title");
  pollContainer.appendChild(heading);

  const countdown = document.createElement("div");
  countdown.classList.add("countdown");
  pollContainer.appendChild(countdown);

  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("poll-buttons");
  pollContainer.appendChild(buttonContainer);

  options.forEach((option) => {
    const button = document.createElement("button");
    button.innerText = option.name;
    button.value = option.id;
    button.classList.add("poll-button");
    button.type = "button";
    button.onclick = function () {
      vote(this);
      // Disable the buttons to prevent multiple votes
      const buttons = document.querySelectorAll(
        `#${this.parentElement.parentElement.id} > div > button`,
      );
      buttons.forEach((btn) => (btn.disabled = true));
    };
    buttonContainer.appendChild(button);
  });
  updateCountdown(countdown, endTime);
  const intervalId = setInterval(() => {
    const timeLeft = updateCountdown(countdown, endTime);
    if (timeLeft <= 0) {
      clearInterval(intervalId);
    }
  }, 1000);
}

function updateCountdown(countdownElement, endTime) {
  const now = Date.now();
  const timeLeft = Math.max(0, endTime - now);
  console.log(`Now: ${now}, End: ${endTime}, Time left: ${timeLeft}`)
  const seconds = Math.floor((timeLeft / 1000) % 60);
  countdownElement.innerText = `Closing in ${seconds}s`;
  return timeLeft;
}

function closePoll(pollId, results, reason) {
  const poll = document.getElementById(pollId);
  poll.remove();
  let winner = results.find(
    (result) =>
      result.votes === Math.max(...results.map((result) => result.votes)),
  );
  // const ul = document.getElementById("messages");
  // const li = document.createElement("li");
  // li.innerHTML = `<strong>&lt;Black Dome of Death&gt;</strong>${reason}`;
  // ul.appendChild(li);
}

function vote(btn) {
  send(
    {
      optionId: btn.value,
      pollId: btn.parentElement.parentElement.id,
    },
    "vote",
  );
}

let ws;
function connect() {
  ws = new WebSocket(`wss://${window.location.host}`);
  ws.onopen = () => {
    const status = document.getElementById("status");
    status.setAttribute("status", "healthy");
    send({ message: `Join|${playerId}` }, "join");
  };

  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);

    switch (data.type) {
      case "poll":
        createPoll(
          data.title,
          data.id,
          data.options,
          data.timestamp * 1000,
          Date.now() + 30000
        );
        break;
      case "message":
        if (data.playerId === 0 || HIDDEN_MSGS.includes(data.message)) {
          break;
        }
        const ul = document.querySelector("ul");
        const li = document.createElement("li");
        li.innerHTML = `<strong>&lt;${data.playerId ? "Admin" : "Unity"}&gt;</strong> ${data.message}`;
        ul.appendChild(li);
        break;
      case "voteClosure":
        closePoll(data.pollId, data.results, data.reason);
        break;
    }
  };

  ws.onclose = () => {
    document.getElementById("status").setAttribute("status", "unhealthy");
    setTimeout(connect, 1000);
  };

  ws.onerror = (error) => {
    console.error("Error:", error);
    document.getElementById("status").setAttribute("status", "unhealthy");
  };
}
connect();

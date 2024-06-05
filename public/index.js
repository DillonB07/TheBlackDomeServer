// Add player ID to local storage - this is used on the server so that they can't vote twice.
const playerId =
  localStorage.getItem("playerId") || Math.floor(Math.random() * Date.now());
localStorage.setItem("playerId", playerId);

// Some admin functionality uses chat messages. This hides it from the frontend.
const HIDDEN_MSGS = ['systemstart']

// This sends data to the server. It takes in the type so it can handle any type of data needed such as messages or votes
function send(data, type, system = false) {
  const req = {
    ...data,
    timestamp: Date.now(),
    playerId: system ? 0 : playerId,
    type,
  };
  ws.send(JSON.stringify(req));

  // When a message is sent, it is added to the chat showing as from <Me>
  if (type == "message") {
    document.getElementById("message").value = "";
    const ul = document.getElementById("messages");
    const li = document.createElement("li");
    li.innerHTML = `<strong>&lt;Me&gt;</strong> ${data.message}`;
    ul.appendChild(li);
  }
}

// This function is called when the user presses the submit button on the chat form. It sends the message to the server. There's a special edge case for cutscenes
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

// This function displays a poll on the website for players to vote on. It creates the poll info and  buttons, then adds them to the DOM.
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

// This function updates the countdown on the poll page. It takes in the countdown element and the end time then calculates the time left and displays it.
function updateCountdown(countdownElement, endTime) {
  const now = Date.now();
  const timeLeft = Math.max(0, endTime - now);
  console.log(`Now: ${now}, End: ${endTime}, Time left: ${timeLeft}`)
  const seconds = Math.floor((timeLeft / 1000) % 60);
  countdownElement.innerText = `Closing in ${seconds}s`;
  return timeLeft;
}

// This function removes the poll from the DOM once it's closed.
function closePoll(pollId, results, reason) {
  const poll = document.getElementById(pollId);
  poll.remove();
  let winner = results.find(
    (result) =>
      result.votes === Math.max(...results.map((result) => result.votes)),
  );
  const ul = document.getElementById("messages");
  const li = document.createElement("li");
  li.innerHTML = `<strong>&lt;Black Dome of Death&gt;</strong>${reason}`;
  ul.appendChild(li);
}

// This sends the users vote to the serverby fetching the id of the element that was clicked, parent's parent element which is the id of the poll. 
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

// This function connects to the websocket server. It sets up the event listeners for the websocket which handle the messages sent from the server.
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

  // When disconnected from the server, it will attempt to connect every second and will change the green dot to red
  ws.onclose = () => {
    document.getElementById("status").setAttribute("status", "unhealthy");
    setTimeout(connect, 1000);
  };

  // If there's an error, it will log it to the console and change the green status dot to red
  ws.onerror = (error) => {
    console.error("Error:", error);
    document.getElementById("status").setAttribute("status", "unhealthy");
  };
}
connect();

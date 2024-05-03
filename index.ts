import express from "express";
import type { Request, Response } from "express";
import { WebSocketServer } from "ws";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.get("/", (_req: Request, res: Response) => {
  res.render("index.html");
});

const wss = new WebSocketServer({ server });

interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  endTime: number;
  timestamp: number;
}

interface PollOption {
  id: string;
  name: string;
  votes: number;
}

let activePolls: Poll[] = [];

function checkPolls() {
  // Check if any active polls have ended. If so, remove them from activePolls list and broadcast the results to all clients. If multiple options have the same number of votes, the winning option is randomly selected from the tied options.
  console.log("Checking polls");
  const now = Date.now();
  for (const poll of activePolls) {
    if (now > poll.endTime) {
      console.log(`"${poll.title}" Poll ended`);
      activePolls.splice(activePolls.indexOf(poll), 1);
      let winners: PollOption[] = [
        {
          id: "",
          name: "",
          votes: 0,
        },
      ];
      for (let option of poll.options) {
        if (option.votes > winners[0].votes) {
          winners = [option];
        } else if (option.votes === winners[0].votes) {
          winners.push(option);
        }
      }
      if (winners[0].id === "") winners.splice(0, 1);
      const winner = winners[Math.floor(Math.random() * winners.length)];
      console.log(`"${poll.title}" Poll ended with winner "${winner.name}"`);
      wss.clients.forEach((client) => {
        client.send(
          JSON.stringify({
            type: "voteClosure",
            pollId: poll.id,
            results: poll.options.map((option) => ({
                optionId: option.id,
                votes: option.votes,
            })),
            reason: "Poll closed! Please focus on the show!",
          }),
        );
      });
    }
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    if (Buffer.isBuffer(message)) {
      const msg = message.toString();
      // console.log(msg);
      const parsed = JSON.parse(msg);
      console.log(parsed);
      switch (parsed.type) {
        case "poll":
          console.log("Poll received, setting up");
          activePolls.push({
            id: parsed.id,
            title: parsed.title,
            options: parsed.options.map(
              (option: { id: string; name: string }) => ({
                ...option,
                votes: 0,
              }),
            ),
            endTime: parsed.endTime * 1000,
            timestamp: parsed.timestamp,
          });
          const delay = parsed.endTime * 1000 - Date.now();
          setTimeout(checkPolls, delay);
          console.log("Waiting", delay, "ms");
          break;
        case "vote":
          console.log("Vote received");
          const poll = activePolls.find((p) => p.id === parsed.pollId);
          if (poll) {
            const option = poll.options.find(
              (option) => option.id === parsed.optionId,
            );
            if (option) {
              option.votes++;
            } else {
              console.log("Invalid option received - ", parsed.optionId);
            }
          }
      }
    } else {
      console.log(message, typeof message);
    }
    // Send message to all other connections
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(Buffer.isBuffer(message) ? message.toString() : message);
      }
    });
  });
});

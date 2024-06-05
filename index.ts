import express from "express";
import type { Request, Response } from "express";
import { WebSocketServer } from "ws";

// This is the main server that will serve the HTML pages, CSS stylesheets and JS files
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// This returns the main page that everyone visits
app.get("/", (_req: Request, res: Response) => {
  res.render("index.html");
});

// This is the secret admin page!
app.get("/admin", (_req: Request, res: Response) => {
  res.render("admin.html");
});

// This creates the websocket server ontop of the HTTP server
const wss = new WebSocketServer({ server });

// These are types for Poll and PollOption. They are used to keep data type-safe.
interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  endTime: number;
  timestamp: number;
  votes: number[];
}

interface PollOption {
  id: string;
  name: string;
  votes: number;
}

let activePolls: Poll[] = [];
// Unfortunately, there were issues with specifying a dynamic time in Unity, so it is hardcoded to be 30 seconds.
const POLL_TIMER = 1000 * 30;

function checkPolls() {
  // Check if any active polls have ended. If so, remove them from activePolls list and broadcast the results to all clients. If multiple options have the same number of votes, the winning option is randomly selected from the tied options.
  const now = Date.now();
  for (const poll of activePolls) {
    if (now / 1000 >= poll.endTime) {
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
            reason: `Poll closed with winner ${winner.name}! Please focus on the show!`,
          }),
        );
      });
    }
  }
}

// This sets up the websocket server to listen for messages from clients
wss.on("connection", (ws) => {
  // When a new message is received, it gets parsed and sent to the appropriate function
  ws.on("message", (message) => {
    if (Buffer.isBuffer(message)) {
      const msg = message.toString();
      const parsed = JSON.parse(msg);
      switch (parsed.type) {
        case "join":
          // When a new player joins, they are sent the active polls that they haven't voted in.
          for (const poll of activePolls) {
            if (!poll?.votes?.find((voter) => voter === parsed.playerId)) {
              const pollData = {
                type: "poll",
                options: poll.options.map((option) => {
                  return { name: option.name, id: option.id };
                }),
                title: poll.title,
                endTime: poll.endTime,
                timestamp: poll.timestamp,
                id: poll.id,
              };
              ws.send(JSON.stringify(pollData));
            }
          }
          break;
        case "poll":
          // Add poll to active polls list so it can be fetched later
          activePolls.push({
            id: parsed.id,
            title: parsed.title,
            options: parsed.options.map(
              (option: { id: string; name: string }) => ({
                ...option,
                votes: 0,
              }),
            ),
            endTime: parsed.endTime,
            timestamp: parsed.timestamp,
            votes: [],
          });
          // const delay = Math.max(0, parsed.endTime * 1000 - POLL_TIMER);
          // let now = Date.now();
          // const delay = Math.max(0, (parsed.endTime - (now / 1000)) * 1000);
          // console.log('Delaying poll check for ' + delay + 'ms')

          // Check the poll after it's end time
          setTimeout(checkPolls, POLL_TIMER);
          break;
        case "vote":
          // When a player votes, the vote is added to the active poll
          const poll = activePolls.find((p) => p.id === parsed.pollId);
          if (poll) {
            const option = poll.options.find(
              (option) => option.id === parsed.optionId,
            );
            if (option) {
              option.votes++;
              poll.votes.push(parsed.playerId);
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

import express from "express";
import type { Request, Response } from "express";
import { WebSocketServer } from "ws";

const app = express();
const port = 3000;

app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.get("/", (_req: Request, res: Response) => {
  res.render("index.html");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    if (Buffer.isBuffer(message)) {
      console.log(message.toString());
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

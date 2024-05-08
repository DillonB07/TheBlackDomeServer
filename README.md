> [!WARNING]
> This is a work in progress. It is also **_not_** designed to be secure at all. You should not
> use this server for a production game.

# BlackDomeServer

This websocket server is for my college summative A2 development project.
The purpose of this server is to allow multiple people to vote on options and control what
happens inside a Unity game.

## Technical Information

The server purely relays data between all of the clients. All logic is handled by the clients.

> [!CAUTION]
> This is fundamentally insecure, **NEVER** do this in a production environment.

### Data Types

#### Messages

The `message` type is used to communicate informally between the game and client. The main use
for this is streaming logs to the game client or sending messages to the player client which
will aid debugging.

##### Player Client

```json5
{
  message: "Hello World from a player!",
  playerId: 1712857177,
  type: "message",
}
```

##### Game Client

```json5
{
  message: "Hallo World from Unity!",
  type: "message",
}
```

##### Properties

- `message`: `string`
  - The message to be displayed to the player clients.
- `type`: `string`
  - The data type. This should always be `"message"`.
- `playerId`: `number`
  - The id of the player sending the message and is used to identify unique clients. This will be set to `0` to denote a system-wide message.

#### Polls

The `poll` type is used to send a poll to the player client to vote on what happens next in the
game. The game client will send this message to the player client when there is an available
choice in the game.

##### Player Client

The player client should never be sending a message with the type of `poll`. The game client will not be looking for this and will ignore it.

##### Game Client

```json5
{
  title: "What should the doctor do?",
  options: [
    {
      id: "bloodlet-the-patient",
      text: "Bloodlet the patient",
    },
    {
      id: "give-the-patient-a-herbal-remedy",
      text: "Give the patient a herbal remedy",
    },
    {
      id: "do-nothing",
      text: "Do nothing",
    },
    {
      id: "burn-the-patients-house-down",
      text: "Burn the patient's house down",
    },
  ],
  type: "poll",
  id: "doctor-choice-1",
  endTime: 1712911621323,
}
```

##### Properties

- `title`: `string`
  - The title of the poll.
- `options`: `array`
  - An array of options for the poll. Each option should have the following properties:
    - `id`: `string`
      - The id of the option. e.g. `"read-book"`
    - `text`: `string`
      - The text of the option. e.g. `"Read a book"`
- `type`: `string`
  - The data type. This should always be `"poll"`.
- `id`: `string`
  - The id of the poll. This should be unique for each poll.
- `endTime`: `number`
  - The time in milliseconds when the poll will close. This should be a Unix timestamp.

#### Vote

The `vote` type is sent by players to vote on a poll. This will then be relayed to the game
client and all other player clients so that votes can be updated in real time.

##### Player Client

```json5
{
  optionId: "burn-the-patients-house-down",
  type: "vote",
  pollId: "string",
  playerId: 1712857177,
}
```

##### Game Client

The game client should never be sending a message with the type of `vote`. The player client will not be looking for this and will ignore it.

##### Properties

- `optionId`: `string`
  - The id of the option that the player is voting for. This should match the `id` field of one option from a `poll.options` data type.
- `type`: `string`
  - The data type. This should always be `"vote"`.
- `pollId`: `string`
  - The id of the poll that the player is voting on. This should match the `id` field from a `poll` data type.
- `playerId`: `number`
  - The id of the player sending the message used by the game client to identify unique votes.

#### Announcement

The `announcement` type is sent by the game client to players to display important information about what is going on in the game. It will display a modal on the player clients.

##### Player Client

The player client should never be sending a message with the type of `announcement`

##### Game Client

```json5
{
  type: "announcement",
  heading: "Game Paused!",
  description: "Due to a technical issue, the game has been paused. Please wait for further instructions.",
  backgroundColor: "#000",
  textColor: "#fff",
}
```

##### Properties

- `type`: `string`
  - The data type. This should always be `"announcement"`.
- `heading`: `string`
  - The title of the announcement.
- `description`: `string`
  - The description of the announcement.
- `backgroundColor`: `string`
  - The background color of the announcement modal as a hex code.
- `textColor`: `string`
  - The text color of the announcement modal as a hex code.

#### Poll Closing

##### Player Client

The player client should never be sending a message with the type of `voteClosure`. The game client will not be looking for this and will ignore it.

##### Game Client

```json5
{
  type: "voteClosure",
  pollId: "doctor-choice-1",
  results: [
    {
      optionId: "bloodlet-the-patient",
      votes: 2,
    },
    {
      optionId: "give-the-patient-a-herbal-remedy",
      votes: 1,
    },
    {
      optionId: "do-nothing",
      votes: 0,
    },
    {
      optionId: "burn-the-patients-house-down",
      votes: 0,
    },
  ],
  reason: "Nuh uh, you don't get a choice!",
}
```

##### Properties

- `type`: `string`
  - The data type. This should always be `"voteClosure"`.
- `pollId`: `string`
  - The id of the poll that is closing. This should match the `id` field from a `poll` data type.
- `results`: `array`
  - An array of results for the poll. Each result should have the following properties:
    - `optionId`: `string`
      - The id of the option. e.g. `"read-book"`
    - `votes`: `number`
      - The number of votes that the option received.
- `reason`: `string`
  - The reason for the poll closing. This should be a short description of why the poll is closing for the player's reference.

## Usage

### Running the Server

```bash
bun install
```

To run:

> [!NOTE]
> This server has not been tested with Node.js, but it should work once compiled to JavaScript as no Bun-specific APIs are used.

```bash
bun start
```

### Connecting from Unity.

Here is an example script to connect to the server from Unity.
I am using the [endel/NativeWebSocket](https://github.com/endel/NativeWebSocket) package for WebSocket support in Unity.

```csharp
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using NativeWebSocket;

public class SocketManager : MonoBehaviour
{
    private WebSocket _websocket;
    private const string URL = "ws://localhost:3000";

    async void Start()
    {
        _websocket = new WebSocket(URL);

        _websocket.OnOpen += () =>
        {
            Debug.Log("Connection open!");
        };

        _websocket.OnError += (e) =>
        {
            Debug.Log("Error! " + e);
        };

        _websocket.OnClose += (e) =>
        {
            Debug.Log("Connection closed! Trying to reconnect in 5s");
            Invoke("Reconnect", 5.0f);
        };

        _websocket.OnMessage += (bytes) =>
        {
            // Convert received message to string
            var message = System.Text.Encoding.UTF8.GetString(bytes);
            Debug.Log(message);
        };

        // Send a message to the server after 0.3s
        Invoke("SendWebSocketMessage", 0.3f);

        await _websocket.Connect();
    }

    void Reconnect()
    {
        _websocket.Connect();
    }

    void Update()
    {
        #if !UNITY_WEBGL || UNITY_EDITOR
            _websocket.DispatchMessageQueue();
        #endif
    }

    async void SendWebSocketMessage()
    {
        if (_websocket.State == WebSocketState.Open)
        {
            // Sending a message
            await _websocket.SendText("Hello, I'm Unity!");
        }
    }

    // Disconnect from the server when the game is closed
    private async void OnApplicationQuit()
    {
        await _websocket.Close();
    }

}

```

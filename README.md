> [!WARNING]  
> This is a work in progress. It is also ***not*** designed to be secure at all. You should not 
> use this server for a production game.
# BlackDomeServer


This websocket server is for my college summative A2 development project.
The purpose of this server is to allow multiple people to vote on options and control what 
happens inside a Unity game.


## Technical Information

The server purely relays data between all of the clients. All logic is handled by the clients. 

> [!CAUTION]
> ***This is fundamentally insecure, NEVER do this in a production environment.***

### Data Types

#### Messages

The `message` type is used to communicate informally between the game and client. The main use 
for this is streaming logs to the game client or sending messages to the player client which 
will aid debugging.

##### Player Client
```json5
{
  "message": "Hello World from a player!",
  "playerId": 1712857177,
  "type": "message", 
  "clientType": "player"
}
```

##### Game Client
```json5
{
  "message": "Hallo World from Unity!",
  "type": "message",
  "clientType": "game"
}
```

##### Properties

- `message`: `string`
- `type`: `string`
- `clientType`: `string`
- `playerId`: `number`

#### Polls

The `poll` type is used to send a poll to the player client to vote on what happens next in the 
game. The game client will send this message to the player client when there is an available 
choice in the game.

##### Player Client
The player client should never be sending a message with the type of `poll`. The game client will not be looking for this and will ignore it.

##### Game Client
```json5
{
  "title": "string",
  "options": [
    {
      "id": "string",
      "text": "string"
    }
  ],
  "clientType": "game",
  "type": "poll",
  "id": "string",
  "endTime": number
}
```

#### Vote

The `vote` type is sent by players to vote on a poll. This will then be relayed to the game 
client and all other player clients so that votes can be updated in real time.

##### Player Client

```json5
{
  "optionId": "string",
  "clientType": "player",
  "type": "vote",
  "pollId": "string",
  "playerId": number
}
```

##### Game Client

The game client should never be sending a message with the type of `vote`. The player client will not be looking for this and will ignore it.

#### Announcement

The `announcement` type is sent by the game client to players to display important information about what is going on in the game. It will display a modal on the player clients. 

##### Player Client

The player client should never be sending a message with the type of `announcement`

##### Game Client

```json5
{
  "type": "announcement",
  "heading": "string",
  "description": "string",
  "backgroundColor": "string",
  "textColor": "string"
}
```

#### Poll Closing

##### Player Client

The player client should never be sending a message with the type of `voteClosure`. The game client will not be looking for this and will ignore it.

### Data Properties
- `message`: `string` - The message to be relayed. This is only applicable to the `message` type.
- `playerId`: `number` - The id of the player sending the message. This is only applicable to 
  the `player` client type and should be attached to all data sent by the player.
- `type`: `string` - The type of message. This can be `message`, `poll`, `vote`, `voteClosure`.
- `clientType`: `string` - The type of client sending the message. This can be `player` or `game`.
- `title`: `string` - The title of the poll. This is only applicable to the `poll` type.
- `options`: `array` - An array of options for the poll. This is only applicable to the `poll` 
  type. Each option should have the following properties:
  - `id`: `string` - The id of the option. e.g. `read-book` 
  - `text`: `string` - The text of the option. e.g. `Read a book`
- `id`: `string` - The id of the poll. This is only applicable to the `poll` type.
- `endTime`: `number` - The time in Unix time when the poll will end. This is only applicable to 
  the `poll` type.
- `optionId`: `string` - The id of the option that the player is voting for. This should match 
  the `id` field of one option from a `poll.options` data type. This is only applicable to the `vote` type.
- `pollId`: `string` - The id of the poll that the player is voting on. This should match the 
  `id` field from a `poll` data type. This is only applicable to the `vote` type.
- ``


## Usage:

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
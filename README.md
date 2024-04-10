> [!WARNING]  
> This is a work in progress. It is also ***not*** designed to be secure at all. You should not 
> use this server for a production game.
# BlackDomeServer


This websocket server is for my college summative A2 development project.
The purpose of this server is to allow multiple people to vote on options and control what 
happens inside a Unity game.


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
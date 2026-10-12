import { useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!joined || !username.trim()) return;

    const socket = new WebSocket("ws://127.0.0.1:8000/ws");
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((previous) => [...previous, data]);
    };

    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [joined, username]);

  function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();
    const socket = socketRef.current;

    if (!text || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(
      JSON.stringify({
        username,
        text,
        timestamp: new Date().toLocaleTimeString(),
      })
    );

    setMessage("");
  }

  if (!joined) {
    return (
      <main className="join-screen">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (username.trim()) setJoined(true);
          }}
        >
          <h1>WebSocket Chat</h1>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your username"
            maxLength={30}
            required
          />
          <button type="submit">Join Chat</button>
        </form>
      </main>
    );
  }

  return (
    <main className="chat">
      <header>
        <div>
          <h1>Chat Room</h1>
          <p>Signed in as {username}</p>
        </div>
        <span className={connected ? "online" : "offline"}>
          {connected ? "Connected" : "Connecting..."}
        </span>
      </header>

      <section className="messages">
        {messages.map((item, index) => (
          <article className="message" key={index}>
            <strong>{item.username}</strong>
            <p>{item.text}</p>
            <small>{item.timestamp}</small>
          </article>
        ))}
      </section>

      <form className="message-form" onSubmit={sendMessage}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type a message..."
          maxLength={2000}
          required
        />
        <button type="submit" disabled={!connected}>
          Send
        </button>
      </form>
    </main>
  );
}
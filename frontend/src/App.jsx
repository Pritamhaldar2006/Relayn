
import { useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Disconnected");

  const socketRef = useRef(null);

  useEffect(() => {
    if (!joined || !username.trim()) return;

    const socket = new WebSocket(
      `ws://127.0.0.1:8000/ws?username=${encodeURIComponent(username.trim())}`
    );

    socketRef.current = socket;

    socket.onopen = () => setStatus("Connected");

    socket.onmessage = (event) => {
      const incoming = JSON.parse(event.data);
      setMessages((previous) => [...previous, incoming]);
    };

    socket.onclose = () => setStatus("Disconnected");
    socket.onerror = () => setStatus("Connection error");

    return () => {
      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [joined, username]);

  function sendMessage(event) {
    event.preventDefault();

    const to = recipient.trim().toLowerCase();
    const text = message.trim();
    const socket = socketRef.current;

    if (!to || !text || to === username.trim().toLowerCase()) {
      return;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setStatus("Not connected");
      return;
    }

    socket.send(JSON.stringify({ recipient: to, text }));
    setMessage("");
  }

  const currentUser = username.trim().toLowerCase();
  const currentRecipient = recipient.trim().toLowerCase();

  const conversation = messages.filter(
    (item) =>
      (item.sender === currentUser &&
        item.recipient === currentRecipient) ||
      (item.sender === currentRecipient &&
        item.recipient === currentUser)
  );

  if (!joined) {
    return (
      <main className="join-screen">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (username.trim()) setJoined(true);
          }}
        >
          <h1>Private Chat</h1>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Choose a username"
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
          <h1>Private Chat</h1>
          <p>You are logged in as {currentUser}</p>
        </div>
        <span className={status === "Connected" ? "online" : "offline"}>
          {status}
        </span>
      </header>

      <label htmlFor="recipient">Chat with</label>
      <input
        id="recipient"
        value={recipient}
        onChange={(event) => setRecipient(event.target.value)}
        placeholder="Enter recipient username"
        maxLength={30}
      />

      <section className="messages">
        {!currentRecipient && (
          <p className="empty">Enter a username to start a conversation.</p>
        )}

        {currentRecipient && conversation.length === 0 && (
          <p className="empty">
            No messages with {currentRecipient} yet.
          </p>
        )}

        {conversation.map((item, index) => (
          <article
            className={
              item.sender === currentUser ? "message mine" : "message"
            }
            key={`${item.timestamp}-${index}`}
          >
            <strong>
              {item.sender === currentUser ? "You" : item.sender}
            </strong>
            <p>{item.text}</p>
            <small>{new Date(item.timestamp).toLocaleTimeString()}</small>
          </article>
        ))}
      </section>

      <form className="message-form" onSubmit={sendMessage}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type a private message..."
          maxLength={2000}
          required
        />
        <button
          type="submit"
          disabled={
            status !== "Connected" ||
            !currentRecipient ||
            currentRecipient === currentUser
          }
        >
          Send
        </button>
      </form>
    </main>
  );
}

import React, { useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import "./App.css";
import { emitEvent } from "./helpers";
import { RoomUser } from "./Interfaces/RoomUser";

export const App = (): JSX.Element => {
  const [isInRoom, setInRoom] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [lastError, setLastError] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [roomNameInput, setRoomNameInput] = useState("");

  const [roomName, setRoomName] = useState("");
  const [roomState, setRoomState] = useState<RoomUser[]>([]);
  const [clientUser, setClientUser] = useState<RoomUser | null>(null);
  const [connection, setConnection] = useState<Socket | null>(null);

  const isInRoomRef = useRef<boolean>();
  isInRoomRef.current = isInRoom;

  const onJoinRoom = () => {
    setLoading(true);

    const username = usernameInput.trim();
    const roomName = roomNameInput.trim();
    const connection = io("wss://vnsync-server-33vh3.ondigitalocean.app", {
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 120,
    });

    connection.on("connect", async () => {
      if (isInRoomRef.current) {
        return;
      }

      const result = await emitEvent<string>(
        connection,
        "joinRoom",
        username,
        roomName
      );

      if (result.status !== "ok") {
        setLastError(result.failMessage);
        connection.disconnect();
        return;
      }

      setInRoom(true);
      setLoading(false);
      setRoomName(roomName);
      setLastError("");
    });

    connection.on("disconnect", (reason: string) => {
      if (reason !== "io server disconnect") {
        return;
      }

      setInRoom(false);
      setLoading(false);
      setRoomName("");
      setRoomState([]);
      setClientUser(null);
      setConnection(null);
    });

    connection.on("roomStateChange", (roomState: RoomUser[]) => {
      setRoomState(roomState);
      setClientUser(
        roomState.find((roomUser) => roomUser.username === username) || null
      );
    });

    setConnection(connection);
  };

  const onToggleReady = async () => {
    setLoading(true);

    if (!connection) {
      throw new Error("Connection is now defined.");
    }

    const result = await emitEvent<undefined>(connection, "toggleReady");

    if (result.status !== "ok") {
      setLastError(result.failMessage);
      connection.disconnect();
      return;
    }

    setLoading(false);
  };

  return (
    <>
      <h2>VNSync v0.4</h2>
      {lastError !== "" && <h3>Error: {lastError}</h3>}
      <div>
        {!isInRoom && (
          <>
            <label htmlFor="username">Username:</label>
            &nbsp;
            <input
              type="text"
              name="username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              disabled={isLoading}
            />
            <br />
            <label htmlFor="roomName">Room name:</label>
            &nbsp;
            <input
              type="text"
              name="roomName"
              value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              disabled={isLoading}
            />
            <br />
            <button disabled={isLoading} onClick={onJoinRoom}>
              Join Room!
            </button>
          </>
        )}
        {isInRoom && (
          <>
            <h3>Room name: {roomName}</h3>
            <ul>
              {roomState.map((roomUser) => (
                <li key={roomUser.username}>
                  {roomUser.username} - {!roomUser.isReady && "not"} ready
                </li>
              ))}
            </ul>
            <button
              onClick={onToggleReady}
              disabled={isLoading}
              style={{
                width: "100%",
                height: "500px",
              }}
            >
              {clientUser?.isReady ? "Unready" : "Ready"}
            </button>
            <hr />
          </>
        )}
      </div>
    </>
  );
};

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import "./App.css";
import { emitEvent } from "./helpers";
import { RoomState } from "./Interfaces/RoomState";
import { RoomUser } from "./Interfaces/RoomUser";

export const App = (): JSX.Element => {
  const [isInRoom, setInRoom] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [lastError, setLastError] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [roomNameInput, setRoomNameInput] = useState("");
  const [isAutoReady, setAutoReady] = useState(false);
  const [isCopyToClipboard, setCopyToClipboard] = useState(false);

  const [roomName, setRoomName] = useState("");
  const [roomState, setRoomState] = useState<RoomState>({
    clipboard: [],
    membersState: [],
  });
  const [clientUser, setClientUser] = useState<RoomUser | null>(null);
  const [connection, setConnection] = useState<Socket | null>(null);

  const isInRoomRef = useRef<boolean>();
  const isLoadingRef = useRef<boolean>();
  const isAutoReadyRef = useRef<boolean>();
  const isCopyToClipboardRef = useRef<boolean>();

  const clientUserRef = useRef<RoomUser | null>();
  const connectionRef = useRef<Socket | null>();
  const roomStateRef = useRef<RoomState>();
  isInRoomRef.current = isInRoom;
  isLoadingRef.current = isLoading;
  isAutoReadyRef.current = isAutoReady;
  clientUserRef.current = clientUser;
  connectionRef.current = connection;
  roomStateRef.current = roomState;
  isCopyToClipboardRef.current = isCopyToClipboard;

  const onJoinRoom = () => {
    setLoading(true);

    const username = usernameInput.trim();
    const roomName = roomNameInput.trim();
    const connection = io("wss://vnsync-server-33vh3.ondigitalocean.app", {
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 5,
      autoConnect: false,
    });

    connection.io.on("reconnect_attempt", () => {
      console.log(connection.auth);
      console.log("reconnect attempt");
    });

    connection.io.on("reconnect_failed", () => {
      console.log("reconnect failed");
    });

    connection.on("connect", async () => {
      console.log("connected");

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
        console.log("reconnecting...?");

        return;
      }

      setInRoom(false);
      setLoading(false);
      setRoomName("");
      setRoomState({
        clipboard: [],
        membersState: [],
      });
      setClientUser(null);
      setConnection(null);
    });

    connection.on("roomStateChange", (roomState: RoomState) => {
      console.log("room state change");

      const clientUser =
        roomState.membersState.find(
          (roomUser) => roomUser.username === username
        ) || null;

      setRoomState(roomState);
      setClientUser(clientUser);

      if (
        clientUser !== null &&
        !clientUser.isReady &&
        isAutoReadyRef.current &&
        !isLoadingRef.current
      ) {
        onToggleReady();
      }
    });

    connection.on("connect_error", (reason) => {
      console.log(reason);
    });

    connection.on("sessionId", (sessionId: string) => {
      console.log(sessionId);
      connection.auth = {
        sessionId,
      };
    });

    connection.connect();

    setConnection(connection);
  };

  const onToggleReady = async () => {
    setLoading(true);

    const connection = connectionRef.current;

    if (!connection) {
      throw new Error("Connection is not defined.");
    }

    const result = await emitEvent<undefined>(connection, "toggleReady");

    if (result.status !== "ok") {
      setLastError(result.failMessage);
      connection.disconnect();
      return;
    }

    setLoading(false);
  };

  useEffect(() => {
    let lastClipboardEntry: string | null = null;
    let repeat = false;
    const clipboardInterval = setInterval(async () => {
      const clipboardEntry = roomStateRef.current?.clipboard[0] || "";

      if (
        lastClipboardEntry !== clipboardEntry &&
        lastClipboardEntry !== null &&
        isCopyToClipboardRef.current
      ) {
        try {
          await navigator.clipboard.writeText(clipboardEntry);
          repeat = false;
        } catch {
          repeat = true;
        }
      }

      if (!repeat) {
        lastClipboardEntry = clipboardEntry;
      }
    }, 100);

    return () => clearInterval(clipboardInterval);
  }, []);

  return (
    <>
      <h2>VNSync v0.10</h2>
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
              {roomState.membersState.map((roomUser) => (
                <li key={roomUser.username}>
                  {roomUser.username} - {!roomUser.isReady && "not"} ready
                </li>
              ))}
            </ul>
            <button
              onClick={onToggleReady}
              disabled={isLoading || isAutoReady}
              style={{
                width: "100%",
                height: "300px",
              }}
            >
              {clientUser?.isReady ? "Unready" : "Ready"}
            </button>
            <hr />
            <label>Auto ready: </label>
            <input
              type="checkbox"
              checked={isAutoReady}
              onChange={(e) => {
                if (
                  clientUserRef.current !== null &&
                  !clientUserRef.current?.isReady &&
                  !isAutoReadyRef.current
                ) {
                  onToggleReady();
                }

                setAutoReady(e.target.checked);
              }}
            />
            <br />
            <label>
              Automatically copy to clipboard (page has to be active for
              clipboard updates to happen):
            </label>
            <input
              type="checkbox"
              checked={isCopyToClipboard}
              onChange={(e) => {
                setCopyToClipboard(e.target.checked);
              }}
            />
            <hr />
            {roomState.clipboard.map((clipboardEntry, index) => (
              <p>{clipboardEntry}</p>
            ))}
          </>
        )}
      </div>
    </>
  );
};

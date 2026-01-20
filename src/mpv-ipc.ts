import { spawn, type Subprocess, type Socket } from "bun";
import { unlinkSync, existsSync } from "fs";

const SOCKET_PATH = `/tmp/poolsuite-mpv-${globalThis.process.pid}.sock`;

type TimeChangeCallback = (position: number, duration: number) => void;
type EndCallback = () => void;

export interface MpvController {
  play(url: string): Promise<void>;
  seek(seconds: number): Promise<void>;
  getPosition(): Promise<number>;
  getDuration(): Promise<number>;
  togglePause(): Promise<void>;
  isPaused(): Promise<boolean>;
  quit(): Promise<void>;
  onTimeChange(callback: TimeChangeCallback): void;
  onEnd(callback: EndCallback): void;
  waitForEnd(): Promise<void>;
}

export function createMpvController(): MpvController {
  let mpvProcess: Subprocess | null = null;
  let socket: Socket<undefined> | null = null;
  let requestId = 0;
  const pendingRequests = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  let timeChangeCallback: TimeChangeCallback | null = null;
  let endCallback: EndCallback | null = null;
  let currentPosition = 0;
  let currentDuration = 0;
  let responseBuffer = "";
  let endPromiseResolve: (() => void) | null = null;

  function cleanupSocket() {
    if (existsSync(SOCKET_PATH)) {
      try {
        unlinkSync(SOCKET_PATH);
      } catch {
        // ignore cleanup errors
      }
    }
  }

  async function sendCommand(command: (string | number)[], expectResponse = true): Promise<unknown> {
    if (!socket) throw new Error("mpv not connected");

    const id = ++requestId;
    const msg = JSON.stringify({ command, request_id: id }) + "\n";

    return new Promise((resolve, reject) => {
      if (expectResponse) {
        pendingRequests.set(id, { resolve, reject });
      }
      socket!.write(msg);
      if (!expectResponse) resolve(undefined);
    });
  }

  async function getProperty(name: string): Promise<unknown> {
    const result = await sendCommand(["get_property", name]);
    return (result as { data: unknown })?.data;
  }

  function handleMessage(line: string) {
    if (!line.trim()) return;

    try {
      const msg = JSON.parse(line);

      // Handle responses to our commands
      if (msg.request_id !== undefined) {
        const pending = pendingRequests.get(msg.request_id);
        if (pending) {
          pendingRequests.delete(msg.request_id);
          if (msg.error && msg.error !== "success") {
            pending.reject(new Error(msg.error));
          } else {
            pending.resolve(msg);
          }
        }
      }

      // Handle property change events
      if (msg.event === "property-change") {
        if (msg.name === "playback-time" && typeof msg.data === "number") {
          currentPosition = msg.data;
          if (timeChangeCallback) {
            timeChangeCallback(currentPosition, currentDuration);
          }
        } else if (msg.name === "duration" && typeof msg.data === "number") {
          currentDuration = msg.data;
        }
      }

      // Handle end of file
      if (msg.event === "end-file") {
        if (endCallback) endCallback();
        if (endPromiseResolve) endPromiseResolve();
      }
    } catch {
      // ignore parse errors
    }
  }

  async function connectSocket(): Promise<void> {
    // Wait for socket file to be created
    let attempts = 0;
    while (!existsSync(SOCKET_PATH) && attempts < 50) {
      await Bun.sleep(100);
      attempts++;
    }

    if (!existsSync(SOCKET_PATH)) {
      throw new Error("mpv socket not created");
    }

    socket = await Bun.connect({
      unix: SOCKET_PATH,
      socket: {
        data(_socket, data) {
          responseBuffer += data.toString();
          const lines = responseBuffer.split("\n");
          responseBuffer = lines.pop() || "";
          for (const line of lines) {
            handleMessage(line);
          }
        },
        close() {
          socket = null;
        },
        error(_socket, error) {
          console.error("Socket error:", error);
        },
      },
    });

    // Observe time position and duration for progress updates
    await sendCommand(["observe_property", 1, "playback-time"], false);
    await sendCommand(["observe_property", 2, "duration"], false);
  }

  // Cleanup on process exit
  globalThis.process.on("exit", cleanupSocket);
  globalThis.process.on("SIGINT", () => {
    cleanupSocket();
    globalThis.process.exit(0);
  });
  globalThis.process.on("SIGTERM", () => {
    cleanupSocket();
    globalThis.process.exit(0);
  });

  return {
    async play(url: string): Promise<void> {
      cleanupSocket();

      mpvProcess = spawn(
        ["mpv", "--no-video", "--really-quiet", `--input-ipc-server=${SOCKET_PATH}`, url],
        { stdout: "ignore", stderr: "ignore", stdin: "ignore" }
      );

      await connectSocket();
    },

    async seek(seconds: number): Promise<void> {
      await sendCommand(["seek", seconds, "relative"]);
    },

    async getPosition(): Promise<number> {
      const pos = await getProperty("playback-time");
      return typeof pos === "number" ? pos : 0;
    },

    async getDuration(): Promise<number> {
      const dur = await getProperty("duration");
      return typeof dur === "number" ? dur : 0;
    },

    async togglePause(): Promise<void> {
      const paused = await getProperty("pause");
      await sendCommand(["set_property", "pause", paused ? "no" : "yes"]);
    },

    async isPaused(): Promise<boolean> {
      const paused = await getProperty("pause");
      return paused === true;
    },

    async quit(): Promise<void> {
      if (socket) {
        try {
          await sendCommand(["quit"], false);
        } catch {
          // ignore
        }
      }
      if (mpvProcess) {
        mpvProcess.kill();
        await mpvProcess.exited;
      }
      cleanupSocket();
    },

    onTimeChange(callback: TimeChangeCallback): void {
      timeChangeCallback = callback;
    },

    onEnd(callback: EndCallback): void {
      endCallback = callback;
    },

    waitForEnd(): Promise<void> {
      return new Promise((resolve) => {
        endPromiseResolve = resolve;
      });
    },
  };
}

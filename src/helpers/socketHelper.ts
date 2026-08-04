import colors from "colors";
import { Server, Socket } from "socket.io";

let io: Server | null = null;

const socketMap: Map<string, Set<string>> = new Map();

export const initSocket = (server: any) => {
  io = new Server(server, {
    pingTimeout: 60000,
    cors: { origin: "*" },
  });

  io.on("connection", (socket: Socket) => {
    console.log(colors.green("A user connected: " + socket.id));

    socket.on("register", (userId: string) => {
      if (!userId) return;

      if (!socketMap.has(userId)) socketMap.set(userId, new Set());
      socketMap.get(userId)!.add(socket.id);

      console.log(colors.blue(`Registered socket ${socket.id} for User ID ${userId}`));
    });

    socket.on("disconnect", () => {
      console.log(colors.red(`Socket disconnected: ${socket.id}`));

      for (const [userId, sockets] of socketMap.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) socketMap.delete(userId);
        }
      }
    });

    socket.on("join_room", (roomId: string) => {
      if (!roomId) return;
      socket.join(roomId);
      console.log(colors.blue(`Socket ${socket.id} joined room ${roomId}`));
    });

    socket.on("leave_room", (roomId: string) => {
      if (!roomId) return;
      socket.leave(roomId);
      console.log(colors.gray(`Socket ${socket.id} left room ${roomId}`));
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

export const getSocketIds = (userId: string) => {
  return Array.from(socketMap.get(userId) || []);
};

export const emitToUser = (userId: string, event: string, data: any) => {
  const socketIds = getSocketIds(userId);
  const ioServer = getIO();
  socketIds.forEach((socketId) => {
    ioServer.to(socketId).emit(event, data);
  });
};
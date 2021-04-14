import { Socket } from "socket.io-client";
import { FailedResult } from "./Interfaces/FailResult";
import { SuccessResult } from "./Interfaces/SuccessResult";

export const emitEvent = async <T>(
  socket: Socket,
  eventName: string,
  ...args: unknown[]
): Promise<FailedResult | SuccessResult<T>> => {
  return new Promise((resolve) => {
    socket.emit(eventName, ...args, (data: FailedResult | SuccessResult<T>) => {
      resolve(data);
    });
  });
};

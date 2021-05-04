import { RoomUser } from "./RoomUser";

export interface RoomState {
  clipboard: string[];
  membersState: RoomUser[];
}

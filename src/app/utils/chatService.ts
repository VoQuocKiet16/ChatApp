// chatService.ts
import {
  ClientEvent,
  Room,
  RoomMember,
  EventType,
  MatrixEvent,
  RoomEvent,
  MsgType,
  SyncState,
  MatrixClient,
  SyncStateData,
} from "matrix-js-sdk";
import authService from "@/app/utils/authService";
import { MATRIX_CONFIG } from "@/app/utils/config";

export interface ChatMessage {
  sender: string;
  body: string;
  eventId: string;
  avatarUrl?: string | null | undefined; // Chấp nhận cả `null`
  timestamp: number;
}

export class ChatService {
  constructor() {}

  private async getClient(): Promise<MatrixClient> {
    return await authService.getAuthenticatedClient();
  }

  async waitForSync(
    timeoutMs: number = MATRIX_CONFIG.SYNC_TIMEOUT_MS
  ): Promise<void> {
    const client = await this.getClient();
    return new Promise((resolve, reject) => {
      if (
        client.getSyncState() === SyncState.Prepared ||
        client.getSyncState() === SyncState.Syncing
      ) {
        console.log("Matrix client đã sẵn sàng hoặc đang đồng bộ.");
        resolve();
        return;
      }

      const syncListener = (
        state: SyncState,
        prevState: SyncState | null,
        data?: SyncStateData
      ) => {
        console.log(
          `Trạng thái đồng bộ: ${state} (trước đó: ${prevState})`,
          data
        );
        if (state === SyncState.Prepared || state === SyncState.Syncing) {
          console.log("Đồng bộ hoàn tất hoặc đang đồng bộ.");
          resolve();
          client.removeListener(ClientEvent.Sync, syncListener);
        } else if (state === SyncState.Error) {
          console.error(
            "Lỗi đồng bộ:",
            data?.error || "Không có thông tin lỗi"
          );
          reject(new Error("Không thể đồng bộ với server."));
          client.removeListener(ClientEvent.Sync, syncListener);
        }
      };
      client.on(ClientEvent.Sync, syncListener);

      setTimeout(() => {
        console.warn(
          `Timeout: Không thể đồng bộ trong ${timeoutMs / 1000} giây.`
        );
        reject(new Error("Không thể đồng bộ trong thời gian cho phép."));
        client.removeListener(ClientEvent.Sync, syncListener);
      }, timeoutMs);
    });
  }

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    const client = await this.getClient();
    const room = client.getRoom(roomId);
    return room ? room.getJoinedMembers() : [];
  }

  async getRoomName(roomId: string): Promise<string> {
    const client = await this.getClient();
    const room = client.getRoom(roomId);
    return room ? room.name || "Không rõ tên phòng" : "Không rõ tên phòng";
  }

  async isRoomOwner(roomId: string): Promise<boolean> {
    const client = await this.getClient();
    const room = client.getRoom(roomId);
    if (!room) return false;
    const userId = client.getUserId();
    const creator = room.currentState
      .getStateEvents(EventType.RoomCreate, "")
      ?.getSender();
    return userId === creator;
  }

  private async getTimelineEvents(room: Room): Promise<MatrixEvent[]> {
    return room.getLiveTimeline().getEvents();
  }

  private async getScrollbackEvents(
    room: Room,
    limit: number
  ): Promise<MatrixEvent[]> {
    const client = await this.getClient();
    const scrollbackEvents = await client.scrollback(room, limit);
    return Array.isArray(scrollbackEvents) ? scrollbackEvents : [];
  }

  private dedupeEvents(events: MatrixEvent[]): MatrixEvent[] {
    return Array.from(
      new Map(events.map((event) => [event.getId(), event])).values()
    );
  }

  private async filterMessages(events: MatrixEvent[]): Promise<ChatMessage[]> {
    const client = await this.getClient();
    const messages = await Promise.all(
      events
        .filter((event) => event.getType() === "m.room.message")
        .map(async (event) => {
          const senderId = event.getSender();
          let avatarUrl: string | null | undefined;
          if (senderId) {
            try {
              const profile = await client.getProfileInfo(senderId);
              avatarUrl = profile.avatar_url
                ? client.mxcUrlToHttp(profile.avatar_url)
                : undefined;
            } catch (err) {
              console.error(`Lỗi khi lấy avatar cho ${senderId}:`, err);
            }
          }
          const timestamp = event.getTs();
          if (typeof timestamp !== "number" || isNaN(timestamp)) {
            console.warn(
              `Timestamp không hợp lệ cho sự kiện ${event.getId()}:`,
              timestamp
            );
          }

          return {
            sender: senderId || "",
            body: event.getContent()?.body || "",
            eventId: event.getId() || `msg-${Date.now()}`,
            avatarUrl: avatarUrl,
            timestamp:
              typeof timestamp === "number" && !isNaN(timestamp)
                ? timestamp
                : Date.now(),
          };
        })
    );
    return messages;
  }

  async fetchRoomMessages(
    roomId: string,
    limit: number = MATRIX_CONFIG.FETCH_MESSAGES_LIMIT
  ): Promise<ChatMessage[]> {
    const client = await this.getClient();
    const room = client.getRoom(roomId);
    if (!room) {
      console.warn(
        `Phòng ${roomId} không tồn tại hoặc không có quyền truy cập.`
      );
      return [];
    }

    try {
      const timelineEvents = await this.getTimelineEvents(room);
      const scrollbackEvents = await this.getScrollbackEvents(room, limit);
      const allEvents = [...timelineEvents, ...scrollbackEvents];
      const uniqueEvents = this.dedupeEvents(allEvents);
      const messages = await this.filterMessages(uniqueEvents);

      console.log(`Tin nhắn trong phòng ${roomId}:`, messages);
      return messages;
    } catch (error) {
      console.error("Lỗi khi tải lịch sử tin nhắn:", error);
      throw new Error("Không thể tải lịch sử tin nhắn.");
    }
  }

  async getRoomMessages(roomId: string): Promise<ChatMessage[]> {
    return await this.fetchRoomMessages(roomId);
  }

  async sendMessage(roomId: string, messageText: string): Promise<string> {
    if (!messageText.trim()) {
      throw new Error("Tin nhắn không được để trống.");
    }
    try {
      const client = await this.getClient();
      const response = await client.sendEvent(roomId, EventType.RoomMessage, {
        msgtype: MsgType.Text,
        body: messageText,
      });
      return response.event_id;
    } catch (error) {
      throw new Error(
        `Không thể gửi tin nhắn: ${error instanceof Error ? error.message : "Lỗi không xác định"}`
      );
    }
  }

  async inviteMember(roomId: string, userId: string): Promise<void> {
    if (!userId.trim()) {
      throw new Error("User ID không được để trống.");
    }
    try {
      const client = await this.getClient();
      await client.invite(roomId, userId);
    } catch (error) {
      throw new Error(
        `Không thể mời thành viên: ${error instanceof Error ? error.message : "Lỗi không xác định"}`
      );
    }
  }

  async onNewMessage(
    callback: (event: MatrixEvent, room?: Room) => void
  ): Promise<() => void> {
    const client = await this.getClient();
    const handler = (event: MatrixEvent, room?: Room) => {
      if (event.getType() === EventType.RoomMessage) {
        callback(event, room);
      }
    };
    client.on(RoomEvent.Timeline, handler);
    return () => client.removeListener(RoomEvent.Timeline, handler);
  }

  async onSyncStateChange(
    callback: (state: SyncState) => void
  ): Promise<() => void> {
    const client = await this.getClient();
    client.on(ClientEvent.Sync, callback);
    return () => client.removeListener(ClientEvent.Sync, callback);
  }
}

const chatService = new ChatService();
export default chatService;

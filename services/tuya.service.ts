import { apiService } from './api';

export interface TuyaDevice {
  id: string;
  name: string;
  roomId?: string;
  roomNumber?: string;
  online?: boolean;
  state?: boolean;
}

export interface TuyaSwitchResponse {
  success: boolean;
  message?: string;
  data?: {
    state?: boolean;
  };
}

class TuyaService {
  async getDevices(roomId?: string, hotelId?: string): Promise<{ message?: string; data: TuyaDevice[] } | TuyaDevice[]> {
    const params: any = {};
    if (roomId) params.roomId = roomId;
    if (hotelId) params.hotelId = hotelId;
    const res = await apiService.get<any>('/tuya/devices', params);
    if (Array.isArray(res)) return res;
    return res;
  }

  async getDevice(deviceId: string): Promise<{ message: string; data: TuyaDevice }> {
    return await apiService.get(`/tuya/devices/${deviceId}`);
  }

  async getDeviceStatus(deviceId: string): Promise<{ message: string; data: { online: boolean; state: boolean } }> {
    return await apiService.get(`/tuya/devices/${deviceId}/status`);
  }

  async turnOn(deviceId: string): Promise<TuyaSwitchResponse> {
    return await apiService.post(`/tuya/devices/${deviceId}/turn-on`, {});
  }

  async turnOff(deviceId: string): Promise<TuyaSwitchResponse> {
    return await apiService.post(`/tuya/devices/${deviceId}/turn-off`, {});
  }

  async toggle(deviceId: string): Promise<TuyaSwitchResponse> {
    return await apiService.post(`/tuya/devices/${deviceId}/toggle`, {});
  }

  async addDevice(deviceData: { deviceId: string; name: string; hotelId?: string; roomId?: string; roomNumber?: string }): Promise<{ message: string; data: TuyaDevice }> {
    return await apiService.post(`/tuya/devices`, deviceData);
  }

  async updateDevice(deviceId: string, deviceData: { name?: string; hotelId?: string; roomId?: string; roomNumber?: string }): Promise<{ message: string; data: TuyaDevice }> {
    return await apiService.put(`/tuya/devices/${deviceId}`, deviceData);
  }

  async deleteDevice(deviceId: string): Promise<{ message: string }> {
    return await apiService.delete(`/tuya/devices/${deviceId}`);
  }

  async autoTurnOnOnCheckIn(roomId: string): Promise<{ message: string; data?: any }> {
    return await apiService.post(`/tuya/rooms/${roomId}/auto-turn-on`, {});
  }

  async autoTurnOffOnCheckOut(roomId: string): Promise<{ message: string; data?: any }> {
    return await apiService.post(`/tuya/rooms/${roomId}/auto-turn-off`, {});
  }

  async turnOffByRoom(roomId: string): Promise<{ message: string; data?: any }> {
    return await apiService.post(`/tuya/devices/room/${roomId}/turn-off`, {});
  }

  async turnOnByRoom(roomId: string): Promise<{ message: string; data?: any }> {
    return await apiService.post(`/tuya/devices/room/${roomId}/turn-on`, {});
  }
}

export const tuyaService = new TuyaService();

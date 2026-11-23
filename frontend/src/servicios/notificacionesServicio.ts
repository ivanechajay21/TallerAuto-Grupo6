import api from './api';

export interface Notification {
  id: number;
  module: string;
  title: string;
  message?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export const getNotifications = async (): Promise<Notification[]> => {
  const response = await api.get('/notificaciones');
  return response.data;
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get('/notificaciones/no-leidas');
  return response.data.count;
};

export const markAsRead = async (id: number): Promise<Notification> => {
  const response = await api.patch(`/notificaciones/${id}/leida`);
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await api.patch('/notificaciones/leer-todas');
  return response.data;
};
import api from './api';

export interface DamageRequest {
  zone: string;
  zoneLabel: string;
  damageType: string;
  severity: string;
  description?: string;
  observation?: string;
  photoIndex?: number;
}

export interface ReceptionRequest {
  vehicleId: number;
  mileage?: number;
  fuelLevel?: string;
  exteriorState?: string;
  generalState?: string;
  accessories: string[];
  customerSymptoms?: string;
  observations?: string;
  damages: DamageRequest[];
}

export interface Reception {
  id: number;
  code: string;
  status: string;
  receptionDate: string;
  mileage?: number;
  fuelLevel?: string;
  exteriorState?: string;
  generalState?: string;
  accessories: string[];
  customerSymptoms?: string;
  observations?: string;
  workOrderNumber?: string;
  vehicle: {
    id: number;
    code?: string;
    plate: string;
    brand: string;
    model: string;
    year?: number;
    color?: string;
    customer?: {
      id: number;
      code?: string;
      firstName: string;
      lastName: string;
      documentNumber: string;
      phone?: string;
    };
  };
  receivedByName?: string;
  damages: {
    id: number;
    zone: string;
    zoneLabel: string;
    damageType: string;
    severity?: string;
    description?: string;
    observation?: string;
    photoUrl?: string;
  }[];
  photos: { id: number; category: string; photoUrl: string }[];
}

export const createReception = async (data: ReceptionRequest, photos: File[]) => {
  const form = new FormData();
  form.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  photos.forEach((file) => form.append('photos', file));
  const response = await api.post('/recepciones', form);
  return response.data as Reception;
};

export const emitOrderFromReception = async (receptionId: number) => {
  const response = await api.post(`/recepciones/${receptionId}/emitir-orden`);
  return response.data as { message: string; workOrderId: number; orderNumber: string };
};

export const getAllReceptions = async (): Promise<Reception[]> => {
  const response = await api.get('/recepciones');
  return response.data;
};

export const getReceptionById = async (id: number): Promise<Reception> => {
  const response = await api.get(`/recepciones/${id}`);
  return response.data;
};

export const getReceptionsByVehicle = async (vehicleId: number): Promise<Reception[]> => {
  const response = await api.get(`/recepciones/vehiculo/${vehicleId}`);
  return response.data;
};
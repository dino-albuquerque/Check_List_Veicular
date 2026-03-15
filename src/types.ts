export type InspectionType = 'inicial' | 'final';

export type ChecklistStatus = 'ok' | 'avaria' | 'na';

export interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
}

export interface InspectionData {
  protocol: string;
  inspector: string;
  type: InspectionType;
  vehicle: {
    plate: string;
    brand: string;
    model: string;
    year: string;
    color: string;
    km: string;
  };
  checklist: {
    exterior: ChecklistItem[];
    interior: ChecklistItem[];
    mechanics: ChecklistItem[];
    docs: ChecklistItem[];
  };
  photos: {
    front?: string;
    back?: string;
    left?: string;
    right?: string;
    engine?: string;
    interior?: string;
  };
  comments: string;
  signature: string;
  date: string;
}

export interface User {
  name: string;
  email: string;
}

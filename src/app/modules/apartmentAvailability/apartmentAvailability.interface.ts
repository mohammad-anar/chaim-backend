export type IToggleAvailability = {
  apartmentId: string;
  weekendId: string;
};

export type IBulkSetAvailability = {
  apartmentId: string;
  weekendIds: string[];
};

export type ISetSpecialWeekend = {
  isSpecial: boolean;
  specialPrice?: number;
};

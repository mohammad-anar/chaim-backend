export type IToggleAvailability = {
  apartmentId: string;
  weekendId: string;
};

export type IBulkSetAvailability = {
  apartmentId: string;
  weekendIds: string[];
};

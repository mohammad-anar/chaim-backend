export type ICreateReportRentedIntent = {
  reportType?: "RENT" | "SWAP";
  targetApartmentId?: string; // UUID or propertyId like apart-001
  weekend?: string | Date;
};

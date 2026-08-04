export type ICreateWeekendCalendar = {
  title: string;
  date: string | Date;
};

export type IUpdateWeekendCalendar = Partial<ICreateWeekendCalendar>;

export type IWeekendCalendarFilter = {
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
};

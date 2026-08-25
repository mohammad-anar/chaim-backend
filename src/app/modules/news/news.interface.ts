export interface ICreateNewsPayload {
  title: string;
  content: string;
  summary?: string;
  image?: string;
  author?: string;
  isPublished?: boolean;
}

export interface IUpdateNewsPayload {
  title?: string;
  content?: string;
  summary?: string;
  image?: string;
  author?: string;
  isPublished?: boolean;
}

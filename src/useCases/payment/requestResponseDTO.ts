export type Request = {
  email: string;
  token: string;
  extension: string;
  quantity: number;
};

export type Response = {
  id: string;
  url: string;
};

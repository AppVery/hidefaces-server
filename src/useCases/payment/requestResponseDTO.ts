export type Request = {
  email: string;
  extension: string;
  amount: number;
  origin: string;
};

export type Response = {
  id: string;
  url: string;
};

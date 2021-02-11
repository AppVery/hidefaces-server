type Event = {
  Input: {
    Payload: {
      id: string;
    };
  };
};
type Response = {
  id: string;
};

export const handler = async (event: Event): Promise<Response> => {
  const { id } = event.Input.Payload;

  return { id };
};

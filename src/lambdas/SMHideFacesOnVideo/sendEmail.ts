type Event = {
  Input: {
    Payload: {
      id: string;
    };
  };
};

export const handler = async (event: Event): Promise<void> => {
  const { id } = event.Input.Payload;
};

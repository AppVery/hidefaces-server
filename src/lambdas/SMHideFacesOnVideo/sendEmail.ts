type Event = {
  Input: {
    Payload: {
      videoS3Key: string;
    };
  };
};

export const handler = async (event: Event): Promise<void> => {
  const { videoS3Key } = event.Input.Payload;
};

type Event = {
  Input: {
    id: string;
    error: {
      Cause: {
        errorMessage: string;
        trace: string[];
      };
    };
  };
};

export const handler = async (event: Event): Promise<void> => {
  const {
    id,
    error: {
      Cause: { errorMessage, trace },
    },
  } = event.Input;

  /* eslint-disable  no-console */
  console.log("data", id, errorMessage, trace, event.Input);
};

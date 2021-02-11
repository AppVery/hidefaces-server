/* eslint-disable @typescript-eslint/no-var-requires */
const ffmpeg = require("fluent-ffmpeg");

type Event = {
  Input: {
    id: string;
    filename: string;
  };
};
type Response = {
  id: string;
};

export const handler = async (event: Event): Promise<Response> => {
  const { id, filename } = event.Input;

  /* eslint-disable no-console */
  console.log(ffmpeg);

  return { id };
};

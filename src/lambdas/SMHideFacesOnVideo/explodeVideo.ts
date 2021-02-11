import { generalFileService } from "../../services";
import { VideoData } from "../../domain/interfaces/types";
import * as fs from "fs";

/* eslint-disable @typescript-eslint/no-var-requires */
const ffmpeg = require("fluent-ffmpeg");
const bucketName = process.env.MAIN_BUCKET_NAME;

type Event = {
  Input: {
    Payload: {
      s3key: string;
      videoData: VideoData;
    };
  };
};

export const handler = async (event: Event): Promise<VideoData> => {
  const { s3key, videoData } = event.Input.Payload;

  const resultVideo = await generalFileService.getS3Stream(bucketName, s3key);

  if (resultVideo.isFailure) {
    throw Error(`explodeVideo: ${resultVideo.error}`);
  }

  const tmpPath = `/tmp/${videoData.id}`;
  const audioPath = `${tmpPath}/audio.mp3`;
  const framesPath = `${tmpPath}/frame-%d.png`;

  try {
    await fs.promises.mkdir(tmpPath);
  } catch (error) {
    /* eslint-disable no-console */
    console.log("mkdir", error);
  }

  const execute = async () => {
    return new Promise((resolve, reject) => {
      ffmpeg(resultVideo.value)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        //.output(audioPath)
        //.output(framesPath)
        //.run();
        .save(audioPath);
    });
  };

  await execute();

  const audioBuffer = await fs.promises.readFile(audioPath);
  const audioS3Key = `videos/temporal/${videoData.id}/audio.mp3`;
  /* eslint-disable no-console */
  console.log("DEV 1", audioS3Key, audioBuffer);

  const dev = await generalFileService.saveBuffer(
    bucketName,
    audioS3Key,
    audioBuffer
  );

  /* eslint-disable no-console */
  console.log("DEV 2", dev);

  return videoData;
};

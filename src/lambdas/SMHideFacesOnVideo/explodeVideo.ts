import { generalFileService } from "../../services";
import { VideoData } from "../../domain/interfaces/types";
import { delay } from "../../utils/validations";
import * as ffmpeg from "fluent-ffmpeg";
import * as chokidar from "chokidar";
import * as fs from "fs";

const bucketName = process.env.MAIN_BUCKET_NAME;

type Event = {
  Input: {
    Payload: {
      s3key: string;
      videoData: VideoData;
    };
  };
};

const initWatcher = async (path: string, id: string): Promise<void> => {
  const watcher = chokidar.watch(path, {
    ignored: /^\./,
    persistent: true,
    awaitWriteFinish: true,
  });
  watcher.on("add", async function (path: any) {
    const fileBuffer = await fs.promises.readFile(path);
    const filename = path.split("/")[3];
    const Key = `videos/temporal/${id}/${filename}`;

    if ("audio.mp3" === filename) return;

    await generalFileService.saveBuffer(bucketName, Key, fileBuffer);
    await fs.promises.unlink(path);
  });
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

  initWatcher(tmpPath, videoData.id);

  const explodeVideo = async () => {
    return new Promise((resolve, reject) => {
      ffmpeg(resultVideo.value)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .output(audioPath)
        .output(framesPath)
        .run();
    });
  };

  await explodeVideo();

  const audioBuffer = await fs.promises.readFile(audioPath);
  const audioS3Key = `videos/temporal/${videoData.id}/audio.mp3`;

  await generalFileService.saveBuffer(bucketName, audioS3Key, audioBuffer);

  //wait chokidar finish with all frames
  await delay(5);

  return videoData;
};

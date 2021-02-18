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

const initWatcher = (path: string, videoData: VideoData): void => {
  const watcher = chokidar.watch(path, {
    ignored: /^\./,
    persistent: true,
    awaitWriteFinish: true,
  });
  watcher.on("add", async function (path: any) {
    const fileBuffer = await fs.promises.readFile(path);
    const filename = path.split("/")[3];
    const Key = `videos/temporal/${videoData.id}/${filename}`;

    if ("audio.mp3" === filename || videoData.filename === filename) return;

    //save frame on S3
    await generalFileService.saveBuffer(bucketName, Key, fileBuffer);
    await fs.promises.unlink(path);
  });
};

const waitWatcher = async (tmpPath: string) => {
  //await until remove (unlink) all files
  let totalFiles = 0;
  do {
    await delay(1);
    const files = await fs.promises.readdir(tmpPath);
    totalFiles = files.length;
  } while (totalFiles > 0);
};

const saveAudioOnS3 = async (id: string, path: string): Promise<void> => {
  const audioBuffer = await fs.promises.readFile(path);
  const audioS3Key = `videos/temporal/${id}/audio.mp3`;

  await generalFileService.saveBuffer(bucketName, audioS3Key, audioBuffer);
  await fs.promises.unlink(path);
};

const makeCleanTemporalFolder = async (tmpPath: string): Promise<void> => {
  if (fs.existsSync(tmpPath)) {
    fs.rmdirSync(tmpPath, { recursive: true });
  }
  await fs.promises.mkdir(tmpPath);
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

  await makeCleanTemporalFolder(tmpPath);

  initWatcher(tmpPath, videoData);

  const explodeVideo = async () => {
    return new Promise((resolve, reject) => {
      ffmpeg(resultVideo.value)
        .on("end", async function () {
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

  await saveAudioOnS3(videoData.id, audioPath);

  await waitWatcher(tmpPath);

  return videoData;
};

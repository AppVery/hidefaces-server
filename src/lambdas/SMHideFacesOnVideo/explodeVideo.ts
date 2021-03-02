import { generalFileService } from "../../services";
import { VideoData } from "../../domain/interfaces/types";
import { delay } from "../../utils/validations";
import getFilePaths, {
  makeCleanTemporalFolder,
} from "../../utils/getFilePaths";
import * as ffmpeg from "fluent-ffmpeg";
import * as chokidar from "chokidar";
import * as fs from "fs";

const bucketName = process.env.MAIN_BUCKET_NAME;

type Event = {
  Input: {
    Payload: VideoData;
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
    const Key = getFilePaths.s3TmpVideo(videoData.id, filename);

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
  const audioS3Key = getFilePaths.s3TmpAudio(id);
  if (audioBuffer) {
    await generalFileService.saveBuffer(bucketName, audioS3Key, audioBuffer);
  }

  await fs.promises.unlink(path);
};

export const handler = async (event: Event): Promise<VideoData> => {
  const videoData = event.Input.Payload;
  const { id } = videoData;

  const resultVideo = await generalFileService.getS3Stream(
    bucketName,
    videoData.s3key
  );

  if (resultVideo.isFailure) {
    throw Error(`explodeVideo: ${resultVideo.error}`);
  }

  const tmpPath = getFilePaths.localFolder(id);
  const audioPath = getFilePaths.localAudio(id);
  const framesPath = getFilePaths.localFrames(id);

  await makeCleanTemporalFolder(id);

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

  const explodeMuteVideo = async () => {
    return new Promise((resolve, reject) => {
      ffmpeg(resultVideo.value)
        .on("end", async function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .output(framesPath)
        .run();
    });
  };

  if (videoData.audio) {
    await explodeVideo();

    await saveAudioOnS3(videoData.id, audioPath);
  } else {
    await explodeMuteVideo();
  }

  await waitWatcher(tmpPath);

  return videoData;
};

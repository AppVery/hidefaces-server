import { generalFileService } from "../../services";
import { VideoData } from "../../domain/interfaces/types";
import { Readable } from "stream";
import getFilePaths, {
  makeCleanTemporalFolder,
} from "../../utils/getFilePaths";
import * as ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";

const bucketName = process.env.MAIN_BUCKET_NAME;

type Event = {
  Input: {
    Payload: VideoData;
  };
};

export const handler = async (event: Event): Promise<VideoData> => {
  const videoData = event.Input.Payload;
  const id = videoData.id;
  const audioS3Key = getFilePaths.s3TmpAudio(id);
  const videoPath = getFilePaths.localFile(id, videoData.filename);
  const audioPath = getFilePaths.localAudio(id);

  await makeCleanTemporalFolder(id);

  let i = 1;
  const imagesStream = new Readable({
    async read() {
      let error: boolean;
      do {
        const s3key = getFilePaths.s3TmpFrame(id, i);
        const frame = await generalFileService.getS3Buffer(bucketName, s3key);
        if (frame.isSuccess) {
          this.push(frame.value);
          error = false;
        } else {
          /* eslint-disable  no-console */
          console.log("frame error", i, frame);
          error = true;
        }
        i++;
        if (i > videoData.totalFrames) {
          this.push(null);
          error = false;
        }
      } while (error);
    },
  });

  const makeVideo = async () => {
    return new Promise((resolve, reject) => {
      ffmpeg(imagesStream)
        .inputFPS(videoData.fps) //same as original video to match with audio
        .input(audioPath)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .outputOptions("-pix_fmt yuv420p")
        .save(videoPath);
    });
  };

  const makeMuteVideo = async () => {
    return new Promise((resolve, reject) => {
      ffmpeg(imagesStream)
        .inputFPS(videoData.fps)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .outputOptions("-pix_fmt yuv420p")
        .save(videoPath);
    });
  };

  if (videoData.audio) {
    const resultAudio = await generalFileService.getS3Buffer(
      bucketName,
      audioS3Key
    );
    await fs.promises.writeFile(audioPath, resultAudio.value);

    await makeVideo();
  } else {
    await makeMuteVideo();
  }

  //save video
  const videoBuffer = await fs.promises.readFile(videoPath);
  const s3key = getFilePaths.s3FinalVideo(id, videoData.extension);
  await generalFileService.saveBuffer(bucketName, s3key, videoBuffer);

  return videoData;
};

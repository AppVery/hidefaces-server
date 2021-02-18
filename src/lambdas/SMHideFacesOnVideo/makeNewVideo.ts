import { generalFileService } from "../../services";
import { VideoData } from "../../domain/interfaces/types";
import { Readable } from "stream";
import * as ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";

const bucketName = process.env.MAIN_BUCKET_NAME;

type Event = {
  Input: {
    Payload: VideoData;
  };
};

type Response = {
  videoS3Key: string;
  id: string;
};

const makeCleanTemporalFolder = async (tmpPath: string): Promise<void> => {
  if (fs.existsSync(tmpPath)) {
    fs.rmdirSync(tmpPath, { recursive: true });
  }
  await fs.promises.mkdir(tmpPath);
};

export const handler = async (event: Event): Promise<Response> => {
  const videoData = event.Input.Payload;
  const id = videoData.id;
  const audioS3Key = `videos/temporal/${id}/audio.mp3`;
  const tmpPath = `/tmp/${id}`;
  const videoPath = `${tmpPath}/${videoData.filename}`;
  const audioPath = `${tmpPath}/audio.mp3`;

  await makeCleanTemporalFolder(tmpPath);

  const resultAudio = await generalFileService.getS3Buffer(
    bucketName,
    audioS3Key
  );
  await fs.promises.writeFile(audioPath, resultAudio.value);

  let i = 1;
  const imagesStream = new Readable({
    async read() {
      const s3key = `videos/temporal/${id}/frame-${i}.png`;
      const frame = await generalFileService.getS3Buffer(bucketName, s3key);
      if (frame.isSuccess) {
        this.push(frame.value);
      }
      i++;
      if (i > videoData.totalFrames) {
        this.push(null);
      }
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

  await makeVideo();

  //save video
  const videoBuffer = await fs.promises.readFile(videoPath);
  const videoS3Key = `videos/final/${id}/${videoData.filename}`;
  await generalFileService.saveBuffer(bucketName, videoS3Key, videoBuffer);

  return { videoS3Key, id: videoData.id };
};

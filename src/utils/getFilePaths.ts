import * as fs from "fs";

const S3_VIDEO_SOURCE = "videos/source";
const S3_VIDEO_TEMPORAL = "videos/temporal";
const S3_VIDEO_FINAL = "videos/final";
const LOCAL_TMP = "/tmp";

const s3SourceVideo = (id: string, extension: string): string => {
  return `${S3_VIDEO_SOURCE}/${id}/${id}.${extension}`;
};

const s3TmpVideo = (id: string, filename: string): string => {
  return `${S3_VIDEO_TEMPORAL}/${id}/${filename}`;
};

const s3TmpAudio = (id: string): string => {
  return `${S3_VIDEO_TEMPORAL}/${id}/audio.mp3`;
};

const s3TmpFrame = (id: string, index: number): string => {
  return `${S3_VIDEO_TEMPORAL}/${id}/frame-${index.toString()}.png`;
};

const s3FinalVideo = (id: string, filename: string): string => {
  return `${S3_VIDEO_FINAL}/${id}/${filename}`;
};

const localFolder = (id: string): string => {
  return `${LOCAL_TMP}/${id}`;
};

const localFile = (id: string, filename: string): string => {
  return `${LOCAL_TMP}/${id}/${filename}`;
};

const localAudio = (id: string): string => {
  return `${LOCAL_TMP}/${id}/audio.mp3`;
};

const localFrames = (id: string): string => {
  return `${LOCAL_TMP}/${id}/frame-%d.png`;
};

export const makeCleanTemporalFolder = async (id: string): Promise<void> => {
  const tmpPath = localFolder(id);

  if (fs.existsSync(tmpPath)) {
    fs.rmdirSync(tmpPath, { recursive: true });
  }
  await fs.promises.mkdir(tmpPath);
};

export default {
  s3SourceVideo,
  s3TmpVideo,
  s3TmpAudio,
  s3TmpFrame,
  s3FinalVideo,
  localFolder,
  localFile,
  localAudio,
  localFrames,
};

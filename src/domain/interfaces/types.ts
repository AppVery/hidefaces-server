export type VideoData = {
  id: string;
  filename: string;
  extension: string;
  duration: number;
  width: number;
  height: number;
  totalFrames: number;
  fps: number;
  audio: boolean;
  s3key: string;
};

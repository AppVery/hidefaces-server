import { VideoData } from "../../domain/interfaces/types";
import { Position } from "../../domain/interfaces/imageService";
import { AwsRekognitionService } from "../../services/AwsRekognitionService";
import {
  RekognitionClient,
  FaceDetail,
  BoundingBox,
} from "@aws-sdk/client-rekognition";

const bucketName = process.env.MAIN_BUCKET_NAME;

const awsRekognition = new RekognitionClient({});

const awsRekognitionService = new AwsRekognitionService(awsRekognition);

type Event = {
  Input: {
    Payload: VideoData;
  };
};

type Response = {
  videoData: VideoData;
  framesData: string;
};

const getFacesPositions = (
  frameWidth: number,
  frameHeight: number,
  BoundingBox: BoundingBox
): Position => {
  const INC_FACES_BOX = 2.2;
  const { Top, Left, Width, Height } = BoundingBox;
  const top = Math.floor(
    Top * frameHeight +
      (Height * frameHeight) / 2 -
      (Height * frameHeight * INC_FACES_BOX) / 2
  );
  const left = Math.floor(
    Left * frameWidth +
      (Width * frameWidth) / 2 -
      (Width * frameWidth * INC_FACES_BOX) / 2
  );
  return {
    top: top > 0 ? top : 0,
    left: left > 0 ? left : 0,
    width: Math.floor(Width * frameWidth * INC_FACES_BOX),
    height: Math.floor(Height * frameHeight * INC_FACES_BOX),
  };
};

export const handler = async (event: Event): Promise<Response> => {
  const videoData = event.Input.Payload;
  const interval = Math.floor(videoData.fps / 2);

  const facesData = new Map<number, FaceDetail[]>();

  for (let i = 1; i <= videoData.totalFrames; i += interval) {
    const s3key = `videos/temporal/${videoData.id}/frame-${i}.png`;
    const result = await awsRekognitionService.getDataFacesImageS3(
      s3key,
      bucketName
    );

    if (result.isSuccess) {
      const beforeFrameData = facesData.has(i - interval)
        ? facesData.get(i - interval)
        : [];
      if (result.value.length > 0 && i > 1 && beforeFrameData.length === 0) {
        facesData.set(i - interval, result.value);
      }
      if (result.value.length === 0 && beforeFrameData.length > 0) {
        facesData.set(i, beforeFrameData);
      } else {
        facesData.set(i, result.value);
      }
    }
  }

  const facesPositions = new Map<number, Position[]>();

  for (const [key, frameData] of facesData) {
    if (frameData && frameData.length > 0) {
      const frameFacesPositions = frameData.map(({ BoundingBox }) => {
        return getFacesPositions(
          videoData.width,
          videoData.height,
          BoundingBox
        );
      });
      facesPositions.set(key, frameFacesPositions);
    }
  }

  const mapper = new Map<number, number>();
  let frameWithData = 1;

  for (let i = 1; i <= videoData.totalFrames; i++) {
    if (i >= frameWithData + interval / 2) {
      frameWithData = frameWithData + interval;
    }

    const frameToMap = facesPositions.has(frameWithData)
      ? frameWithData
      : frameWithData - interval;

    mapper.set(i, frameToMap);
  }

  const framesData: string = JSON.stringify({
    facesPositions: [...facesPositions],
    mapper: [...mapper],
  });

  return { videoData, framesData };
};

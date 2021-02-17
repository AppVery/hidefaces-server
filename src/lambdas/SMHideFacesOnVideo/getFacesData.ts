import { VideoData } from "../../domain/interfaces/types";
import { Position } from "../../domain/interfaces/imageService";
import { parsePositiveNumber } from "../../utils/validations";
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
  videoData: VideoData,
  BoundingBox: BoundingBox
): Position => {
  const frameWidth = videoData.width;
  const frameHeight = videoData.height;
  const maxWidth = videoData.width;
  const maxHeight = videoData.height;
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
  const positions = {
    top: Math.min(parsePositiveNumber(top), maxHeight),
    left: Math.min(parsePositiveNumber(left), maxWidth),
    width: Math.floor(Width * frameWidth * INC_FACES_BOX),
    height: Math.floor(Height * frameHeight * INC_FACES_BOX),
  };

  //avoid set wrong data outside max dimensions of frames
  return {
    top: positions.top,
    left: positions.left,
    width:
      positions.left + positions.width >= maxWidth
        ? maxWidth - positions.left
        : positions.width,
    height:
      positions.top + positions.height >= maxHeight
        ? maxHeight - positions.height
        : positions.height,
  };
};

export const handler = async (event: Event): Promise<Response> => {
  const videoData = event.Input.Payload;
  const interval = Math.floor(videoData.fps / 2);
  let lastFrameWithData = 1;

  const facesData: Map<number, FaceDetail[]> = new Map();

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

    lastFrameWithData = i;
  }

  const facesPositions = new Map<number, Position[]>();

  for (const [key, frameData] of facesData) {
    if (frameData && frameData.length > 0) {
      const frameFacesPositions = frameData.map(({ BoundingBox }) => {
        return getFacesPositions(videoData, BoundingBox);
      });
      facesPositions.set(key, frameFacesPositions);
    }
  }

  //improve frames data by sharing data between frames
  for (const [key, frameData] of facesPositions) {
    //if we are not in the first or last frame
    if (key > 1 && key < lastFrameWithData) {
      const beforeData = facesPositions.get(key - interval) || [];
      const currentData = frameData || [];
      const afterData = facesPositions.get(key + interval) || [];

      //improve before frame in case of less faces
      if (beforeData.length < currentData.length) {
        facesPositions.set(key - interval, [...beforeData, ...currentData]);
      }

      //if current frame have less faces than after and before
      if (
        currentData.length < beforeData.length &&
        currentData.length < afterData.length
      ) {
        facesPositions.set(key, [...currentData, ...afterData]);
      } else {
        facesPositions.set(key, [...beforeData, ...currentData]);
      }
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

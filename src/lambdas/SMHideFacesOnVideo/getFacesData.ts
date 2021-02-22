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
  const INC_FACES_BOX = 1.8;
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
    top: Math.min(Math.abs(top), maxHeight),
    left: Math.min(Math.abs(left), maxWidth),
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
        ? maxHeight - positions.top
        : positions.height,
  };
};

const getPitagorasVector = (x: number, y: number): number => {
  return Math.round(Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
};

const isQuickMovement = (
  beforeData: Position[],
  currentData: Position[],
  maxVector: number
): boolean => {
  const getMinMaxVectorsPercentage = (
    positions: Position[],
    maxVector: number
  ): { min: number; max: number } => {
    const getVector = (position: Position): number => {
      const { top, left, width, height } = position;
      return getPitagorasVector(left + width / 2, top + height / 2);
    };
    const vectors = positions.map((position) => getVector(position));
    return {
      min: Math.round((Math.max(...vectors) * 100) / maxVector),
      max: Math.round((Math.min(...vectors) * 100) / maxVector),
    };
  };
  const { min: beforeMin, max: beforeMax } = getMinMaxVectorsPercentage(
    beforeData,
    maxVector
  );
  const { min: currentMin, max: currentMax } = getMinMaxVectorsPercentage(
    currentData,
    maxVector
  );

  //check if quick movement >10% is detect
  const check =
    Math.abs(currentMin - beforeMin) > 10 ||
    Math.abs(currentMax - beforeMax) > 10;

  if (check) {
    /* eslint-disable  no-console */
    console.log("quick movement", beforeData, currentData);
  }

  return check;
};

export const handler = async (event: Event): Promise<Response> => {
  const videoData = event.Input.Payload;
  const interval = Math.floor(videoData.fps / 3);
  const maxVector = getPitagorasVector(videoData.width, videoData.height);
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
      const afterData = facesPositions.get(key + interval) || [];
      let currentData = frameData || [];

      //if current frame have less faces than later
      if (currentData.length < afterData.length) {
        /* eslint-disable  no-console */
        console.log("improve current frame", key);
        currentData = [...currentData, ...afterData];
        facesPositions.set(key, currentData);
      }

      //improve before frame in case of less faces or detect quick movement
      if (
        currentData.length > beforeData.length ||
        isQuickMovement(beforeData, currentData, maxVector)
      ) {
        /* eslint-disable  no-console */
        console.log("improve before frame", key);
        facesPositions.set(key - interval, [...beforeData, ...currentData]);
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

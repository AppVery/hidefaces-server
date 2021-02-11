import { Result } from "../Result";
import { Metadata } from "sharp";

export type Position = {
  left: number;
  top: number;
  height: number;
  width: number;
};

export interface ImageService {
  getImageMetadata(buffer: Buffer): Promise<Result<Metadata>>;
  compositeImages(
    originalBuffer: Buffer,
    composite: any
  ): Promise<Result<Buffer>>;
  getExtract(buffer: Buffer, position: Position): Promise<Result<Buffer>>;
  makePixelation(
    buffer: Buffer,
    width: number,
    reduction: number
  ): Promise<Result<Buffer>>;
  makeBlurBorder(
    buffer: Buffer,
    borderSVG: string,
    blur: number
  ): Promise<Result<Buffer>>;
  getIcon(
    buffer: Buffer,
    width: number,
    height: number
  ): Promise<Result<Buffer>>;
}

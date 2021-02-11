import { ImageService, Position } from "../domain/interfaces/imageService";
import { Result } from "../domain/Result";
import * as sharp from "sharp";
import { Metadata } from "sharp";

export type Composite = sharp.OverlayOptions[];

export class SharpImageService implements ImageService {
  private sharpService = sharp;

  public async getImageMetadata(buffer: Buffer): Promise<Result<Metadata>> {
    if (!buffer) {
      return Result.fail<Metadata>("No buffer set to work");
    }
    try {
      const metadata = await this.sharpService(buffer).metadata();
      return Result.ok<Metadata>(metadata);
    } catch (error) {
      return Result.fail<Metadata>(`Image Service: ${error.toString()}`);
    }
  }

  public async compositeImages(
    originalBuffer: Buffer,
    composite: Composite
  ): Promise<Result<Buffer>> {
    try {
      const newImage = await this.sharpService(originalBuffer)
        .composite(composite)
        .toBuffer();
      return Result.ok<Buffer>(newImage);
    } catch (error) {
      return Result.fail<Buffer>(`Image Service: ${error.toString()}`);
    }
  }

  public async getExtract(
    buffer: Buffer,
    position: Position
  ): Promise<Result<Buffer>> {
    const { left, top, height, width } = position;
    try {
      const extract = await this.sharpService(buffer)
        .extract({ left, top, height, width })
        .toBuffer();
      return Result.ok<Buffer>(extract);
    } catch (error) {
      return Result.fail<Buffer>(`Image Service: ${error.toString()}`);
    }
  }

  public async makePixelation(
    buffer: Buffer,
    width: number,
    reduction = 15
  ): Promise<Result<Buffer>> {
    const kernel = this.sharpService.kernel.nearest;
    try {
      const imageReduced = await this.sharpService(buffer)
        .resize(reduction, null, { kernel })
        .toBuffer();
      const imagePixelated = await this.sharpService(imageReduced)
        .resize(width, null, { kernel })
        .toBuffer();
      return Result.ok<Buffer>(imagePixelated);
    } catch (error) {
      return Result.fail<Buffer>(`Image Service: ${error.toString()}`);
    }
  }

  public async makeBlurBorder(
    buffer: Buffer,
    borderSVG: string,
    blur = 15
  ): Promise<Result<Buffer>> {
    try {
      const borderImage = await sharp(Buffer.from(borderSVG)).png().toBuffer();
      const imageBlur = await this.sharpService(buffer)
        .blur(blur)
        .composite([
          {
            input: borderImage,
            //https://sharp.pixelplumbing.com/api-composite
            blend: "dest-in",
          },
        ])
        .png()
        .toBuffer();
      return Result.ok<Buffer>(imageBlur);
    } catch (error) {
      return Result.fail<Buffer>(`Image Service: ${error.toString()}`);
    }
  }

  public async getIcon(
    buffer: Buffer,
    width: number,
    height: number
  ): Promise<Result<Buffer>> {
    try {
      const icon = await this.sharpService(buffer)
        .resize(width, height, {
          fit: "fill",
        })
        .toBuffer();
      return Result.ok<Buffer>(icon);
    } catch (error) {
      return Result.fail<Buffer>(`Image Service: ${error.toString()}`);
    }
  }
}

import { Result } from "../../domain/Result";
import { Position } from "../../domain/interfaces/imageService";
import { Operations } from "../../domain/interfaces/operations";
import { ImageService } from "../../domain/interfaces/imageService";
import { Composite } from "../../services/SharpImageService";

export abstract class PositionsOperations implements Operations {
  protected service: ImageService;

  constructor(service: ImageService) {
    this.service = service;
  }

  public async doTransformation(
    originalImageBuffer: Buffer,
    positions: Position[]
  ): Promise<Result<Buffer>> {
    const resultComposite = await this.getComposite(
      originalImageBuffer,
      positions
    );

    if (resultComposite.isFailure) {
      return Result.continueFail<Buffer>(resultComposite);
    }

    const resultNewImageBuffer = await this.service.compositeImages(
      originalImageBuffer,
      resultComposite.value
    );

    if (resultNewImageBuffer.isFailure) {
      return Result.continueFail<Buffer>(resultNewImageBuffer);
    }

    return Result.ok<Buffer>(resultNewImageBuffer.value);
  }

  private async getComposite(
    originalImageBuffer: Buffer,
    positions: Position[]
  ): Promise<Result<Composite>> {
    const promisesComposite = positions.map(async (position, index) => {
      const resultExtract = await this.transformation(
        originalImageBuffer,
        position,
        index
      );

      if (resultExtract.isFailure) {
        return {};
      }

      return {
        input: resultExtract.value,
        top: position.top,
        left: position.left,
      };
    });

    const composite = await Promise.all(promisesComposite);

    return Result.ok<Composite>(composite);
  }

  protected abstract transformation(
    originalImageBuffer: Buffer,
    position: Position,
    index: number
  ): Promise<Result<Buffer>>;
}

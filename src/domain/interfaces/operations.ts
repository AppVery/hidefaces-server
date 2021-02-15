import { Position } from './imageService';
import { Result } from '../Result';

export interface Operations {
  doTransformation(originalImageBuffer: Buffer, positions?: Position[]): Promise<Result<Buffer>>;
}

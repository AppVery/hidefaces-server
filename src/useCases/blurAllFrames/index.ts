import { BlurAllFrames } from "./BlurAllFrames";
import { generalFileService } from "../../services";
import { SharpImageService } from "../../services/SharpImageService";
import { Pixel } from "../../services/operations/PixelPO";

const imageService = new SharpImageService();
const pixelation = new Pixel(imageService);

export default new BlurAllFrames(generalFileService, pixelation);

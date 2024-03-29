import { GetFacesData } from "./GetFacesData";
import { generalFileService } from "../../services";
import { AwsRekognitionService } from "../../services/AwsRekognitionService";
import { RekognitionClient } from "@aws-sdk/client-rekognition";

const awsRekognition = new RekognitionClient({});
const awsRekognitionService = new AwsRekognitionService(awsRekognition);

export default new GetFacesData(awsRekognitionService, generalFileService);

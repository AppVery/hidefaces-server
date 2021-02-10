import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";

const awsDynamoDB = new DynamoDBClient({});

exports.handler = async (event) => {
  /* eslint-disable no-console */
  console.log("event addSignUp", event);

  const email = event.Input.email;
  const played = event.Input.played;
  const ID = "fsdfsdf2rdf4345";

  const input: PutItemCommandInput = {
    TableName: process.env.MAIN_TABLE_NAME,
    Item: {
      pk: { S: `DEV-${ID}` },
      email: { S: email },
      played: { S: played },
      createdAt: { S: Date.now().toString() },
    },
  };

  await awsDynamoDB.send(new PutItemCommand(input));

  return { ID };
};

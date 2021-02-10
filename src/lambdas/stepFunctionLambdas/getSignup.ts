import {
  DynamoDBClient,
  GetItemCommand,
  GetItemCommandInput,
} from "@aws-sdk/client-dynamodb";

const awsDynamoDB = new DynamoDBClient({});

exports.handler = async (event) => {
  /* eslint-disable no-console */
  console.log("event getSignUp", event);

  const ID = event.Input.Payload.ID;

  const input: GetItemCommandInput = {
    TableName: process.env.MAIN_TABLE_NAME,
    Key: {
      pk: { S: `DEV-${ID}` },
    },
  };

  const { Item } = await awsDynamoDB.send(new GetItemCommand(input));

  /* eslint-disable no-console */
  console.log("event Item", Item);

  return {
    email: Item.email.S,
    played: Item.played.S,
  };
};

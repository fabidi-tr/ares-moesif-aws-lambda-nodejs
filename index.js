/**
 * This file is an example AWS Lambda function.
 */

const moesif = require("moesif-aws-lambda");
const https = require("https");
const AWS = require("aws-sdk");

// Configure the DynamoDB service object
const dynamoDb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient({
  service: dynamoDb,
});

console.log("Loading function");

const moesifOptions = {
  applicationId: process.env.MOESIF_APPLICATION_ID,

  identifyUser: function (event, context) {
    console.log("inside identifyUser()");
    const apiKeyId = event.requestContext.identity.apiKeyId;

    // Return a promise from getUserAndCompany which eventually resolves to the user value
    return getUserAndCompany(apiKeyId)
      .then((userAndCompany) => {
        // Make sure to return the user property, or null if not found
        console.log("user is: " + userAndCompany ? userAndCompany.user : null);
        return userAndCompany ? userAndCompany.user : null;
      })
      .catch((error) => {
        console.error("Error in identifyUser:", error);
        return null; // In case of an error, resolve to null
      });
  },

  // below is optional: but if you plan to metered billing, moesif have 1 to 1 mapping between company id and subscription id.
  //
  // - by providing a subscription id directly.
  // - or providing a companyId, and during setting up Billing provider, set up mapping from subscription id to company id.
  identifyCompany: function (event, context) {
    console.log("inside identifyCompany()");
    const apiKeyId = event.requestContext.identity.apiKeyId;

    // Return a promise from getUserAndCompany which eventually resolves to the companyId
    return getUserAndCompany(apiKeyId)
      .then((userAndCompany) => {
        // Make sure to return the companyId property, or null if not found
        console.log(
          "companyId is: " + userAndCompany ? userAndCompany.companyId : null
        );
        return userAndCompany ? userAndCompany.companyId : null;
      })
      .catch((error) => {
        console.error("Error in identifyCompany:", error);
        return null; // In case of an error, resolve to null
      });
  },
};

var moesifMiddleware = moesif(moesifOptions);

// optional. only if you want to capture outgoing api calls.
moesifMiddleware.startCaptureOutgoing();

exports.handler = function (event, context) {
  const postData = event.body;

  const options = {
    hostname: "traversaal-internal-ares-web-agent.hf.space", // Replace with your endpoint's hostname
    port: 443, // Standard port for HTTPS requests
    path: "/api/predict", // Replace with your endpoint's path
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
      "Authorization": "Bearer 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"
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = "";

      const statusCode = res.statusCode;

      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        console.log("Response from endpoint:", responseBody);
        resolve({
          statusCode: statusCode,
          headers: {
            "Content-Type": "application/json",
          },
          body: responseBody,
        });
      });
    });

    req.on("error", (e) => {
      console.error("Error sending POST request:", e);
      reject(e);
    });

    // Write data to request body
    req.write(postData);
    req.end();
  });

  // Outgoing API call to third party
  // https.get(
  //   {
  //     host: "jsonplaceholder.typicode.com",
  //     path: "/posts/1",
  //   },
  //   function (res) {
  //     var body = "";
  //     res.on("data", function (d) {
  //       body += d;
  //     });

  //     res.on("end", function () {
  //       var parsed = JSON.parse(body);
  //       console.log(parsed);
  //     });
  //   }
  // );

  // callback(null, {
  //   statusCode: "200",
  //   body: JSON.stringify({ key: "hello world2" }),
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  // });
};

// Async Functions
// For more details, please refer to - https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html.

// exports.handler = async (event, context) => {
//   const response = {
//     statusCode: 200,
//     body: JSON.stringify({ message: 'hello world' })
//   }
//   return response
// }

function getUserAndCompany(apiKeyId) {
  return getApiKeyData(apiKeyId)
    .then(getFirstUserAndCompanyId)
    .catch((error) => {
      console.error("Error getting user and company data:", error);
      return null;
    });
}

function getApiKeyData(apiKeyId) {
  // Replace 'YourTableName' with the actual table name and adjust the key structure as needed
  const params = {
    TableName: "Ares_API_Key_Customers",
    KeyConditionExpression: '#pk = :pkval',
    ExpressionAttributeNames: {
      '#pk': 'apiKeyId', // The name of the partition key attribute
    },
    ExpressionAttributeValues: {
      ':pkval': apiKeyId, // The value of the partition key to query for
    },
  };

  let body;

  console.log("before db call");

  return new Promise((resolve, reject) => {
    docClient.query(params, function (err, data) {
      if (err) {
        console.error("Error", err);
        reject(err);
      } else {
        console.log("Success", data.Items);
        console.log("db data: " + JSON.stringify(data));
        console.log("ItemCount: " + data.Count);
        resolve(data);
      }
    });
  });
}

function getFirstUserAndCompanyId(data) {
  if (!data || !Array.isArray(data.Items) || data.Items.length === 0) {
    console.log("no data from db");
    return null; // Return null if data is not structured as expected
  }

  const firstItem = data.Items[0];
  console.log("got data from db, data.Items.length=" + data.Items.length);
  return {
    user: firstItem?.user || null,
    companyId: firstItem?.companyId || null,
  }; // Return an object with user and companyId
}

exports.handler = moesif(moesifOptions, exports.handler);

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

let cachedUserAndCompany = {};

const moesifOptions = {
  applicationId: process.env.MOESIF_APPLICATION_ID,

  identifyUser: function (event, context) {
    return new Promise((resolve) => {
      console.log(
        "identifyUser(): " +
          (cachedUserAndCompany ? cachedUserAndCompany.user : null)
      );
      resolve(cachedUserAndCompany ? cachedUserAndCompany.user : null);
    });
  },

  identifyCompany: function (event, context) {
    return new Promise((resolve) => {
      console.log(
        "identifyCompany(): " +
          (cachedUserAndCompany ? cachedUserAndCompany.companyId : null)
      );
      resolve(cachedUserAndCompany ? cachedUserAndCompany.companyId : null);
    });
  },
};

var moesifMiddleware = moesif(moesifOptions);

// optional. only if you want to capture outgoing api calls.
moesifMiddleware.startCaptureOutgoing();

exports.handler = function (event, context) {
  const apiKeyId = event.requestContext.identity.apiKeyId;

  return getUserAndCompany(apiKeyId)
    .then((userAndCompany) => {
      if (userAndCompany?.user) {
        cachedUserAndCompany.user = userAndCompany.user;
      }
      if (userAndCompany?.companyId) {
        cachedUserAndCompany.companyId = userAndCompany.companyId;
      }

      if (userAndCompany && userAndCompany.user) {
        // User is non-null, proceed with HTTPS request
        return sendHttpsRequest(event);
      } else {
        let errorMsg;
        if (!userAndCompany) {
          errorMsg = "Invalid API Key";
        } else {
          errorMsg = "User not found for API Key";
        }
        return {
          statusCode: 401,
          body: JSON.stringify({ error: errorMsg }),
        };
      }
    })
    .catch((error) => {
      console.error("Error in handler:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Application Internal Server Error" }),
      };
    });
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

function sendHttpsRequest(event) {
  const postData = event.body; // The data you want to send in your POST request

  const options = {
    hostname: "traversaal-internal-ares-web-agent.hf.space", // Replace with your endpoint's hostname
    port: 443, // Standard port for HTTPS requests
    path: "/api/predict", // Replace with your endpoint's path
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
      Authorization: "Bearer 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",
    },
  };

  // Return a new promise
  return new Promise((resolve, reject) => {
    // Create the HTTPS request
    const req = https.request(options, (res) => {
      console.log("Proxy request res.statusCode:" + res.statusCode);
      let responseBody = "";

      // Set response encoding to utf8
      res.setEncoding("utf8");

      // Listen for data events to receive chunks of data
      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      // When the response is complete, resolve the promise
      res.on("end", () => {
        console.log("Response from endpoint:", responseBody);
        try {
          if (res.statusCode == 200) {
            resolve({
              statusCode: res.statusCode,
              body: responseBody,
            });
          } else {
            resolve({
              statusCode: res.statusCode,
              body: responseBody,
            });
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    // Handle request errors
    req.on("error", (error) => {
      console.error("Error sending HTTPS request:", error);
      reject(error);
    });

    // Write data to request body and end the request
    req.write(postData);
    req.end();
  });
}

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
    KeyConditionExpression: "#pk = :pkval",
    ExpressionAttributeNames: {
      "#pk": "apiKeyId", // The name of the partition key attribute
    },
    ExpressionAttributeValues: {
      ":pkval": apiKeyId, // The value of the partition key to query for
    },
  };

  let body;

  console.log("getApiKeyData(), before db call");

  return new Promise((resolve, reject) => {
    docClient.query(params, function (err, data) {
      if (err) {
        console.error("Error", err);
        reject(err);
      } else {
        console.log("Success", data.Items);
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

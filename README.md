# Ares-Moesif AWS Lambda (Node 16.x)

Forked from https://github.com/Moesif/moesif-aws-lambda-node-js-example


## P.S. Add as remote and occasionally fetch+merge updates
git remote add moesif https://github.com/Moesif/moesif-aws-lambda-node-js-example
### #test merges here first
git checkout moesif-merge-integration
### Then fetch and merge
git fetch moesif
git merge moesif
### if all good then merge to main
git checkout main
git merge moesif-merge-integration

## Quick Reference
### Zip and install code to dev lambda
zip -r moesif-middleware.zip .;aws lambda update-function-code --function-name ares_predict_moesif_middleware_dev --zip-file fileb://moesif-middleware.zip #CMD_ARES_MOESIF_MIDDWARE_LAMBDA_DEV_UPLOAD

### Zip and install code to primary lambda.
zip -r moesif-middleware.zip .;aws lambda update-function-code --function-name ares_predict_with_id --zip-file fileb://moesif-middleware.zip #CMD_ARES_MOESIF_MIDDWARE_LAMBDA_UPLOAD                  


[Moesif](https://www.moesif.com) is an API analytics platform.
[moesif-aws-lambda-nodejs](https://github.com/Moesif/moesif-aws-lambda-nodejs)
is a middleware that logs API calls to Moesif for AWS Lambda.

This example is an express application with Moesif's API analytics and monitoring integrated.


## How to run this example.

Create a new AWS Lambda function that is trigged by AWS API Gateway

Upload this zip, when prompted for handler, enter `index.handler`

You will also want to add an environment vairable `MOESIF_APPLICATION_ID` with the value being your 
application id from your Moesif account

Go to the URL for the API gateway such as https://XXXXXX.execute-api.us-west-2.amazonaws.com/default/my-test-function

The API Calls should show up in Moesif.


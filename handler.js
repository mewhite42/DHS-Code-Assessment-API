"use strict";

const request = require("request");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();
const bucketName = "mw-dhs-code-assessment";

/**
 * Creates a base64 encoded template from a base64 encoded instance.
 * Stores the image in an S3 bucket for use by Rekognition
 *
 * @param {string} ImageData An image encoded into base64 string.
 * @return {string} Template The path for the S3 image encoded to a base64 string
 */
module.exports.create_template = (event, context, callback) => {
  let data = JSON.parse(event.body);
  try {
    let decodedImage = Buffer.from(data.ImageData, "base64");
  } catch (err) {
    let response = {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Conrol-Allow-Methods": "OPTIONS,GET,POST",
      },
      body: "ImageData missing or invalid",
      isBase64Encoded: false,
    };
    callback(null, response);
  }

  // AWS Rekognition doesn't use a template for comparison of images.
  // Instead it requires an image stored in S3.  Upload a timestamped image to S3 for Rekognition to use
  var timestamp = new Date().getTime() + ".png";

  var params = {
    Body: decodedImage,
    Bucket: data.bucketname,
    Key: timestamp,
  };

  var template = {
    S3Object: {
      Bucket: bucketName,
      Name: timestamp,
    },
  };

  s3.upload(params, function (err, data) {
    if (err) {
      callback(err, null);
    } else {
      let response = {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Conrol-Allow-Methods": "OPTIONS,GET,POST",
        },
        body: new Buffer(JSON.stringify(template)).toString("Base64"),
        isBase64Encoded: false,
      };
      callback(null, response);
    }
  });
};

/**
 * Uses AWS Rekognition to find the similarity factor.
 *
 * @param {string} SingleTemplate A template encoded into base64 string.
 * @param {string[]} TemplateList An array of templates encoded into base64 strings.
 * @return {double[]} Results A list of similarity factors.  It is in the same order as the TemplateList
 */
module.exports.compare_list = (event, context, callback) => {
  let data = JSON.parse(event.body);
  let templateList = data.TemplateList;

  if (!data || !templateList) {
    var errorReturn = {
      statusCode: "400",

      body:
        "Request is not properly formated.  TemplateList parameter is missing",

      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Conrol-Allow-Methods": "OPTIONS,GET,POST",
      },
    };
    callback(null, errorReturn);
    return;
  }

  let sourceImage = {};

  try {
    sourceImage = JSON.parse(Buffer.from(data.SingleTemplate, "base64"));
  } catch (err) {
    let response = {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Conrol-Allow-Methods": "OPTIONS,GET,POST",
      },
      body: "SingleTemplate missing or invalid",
      isBase64Encoded: false,
    };
    callback(null, response);
  }
  let params = {
    SourceImage: sourceImage,
    TargetImage: "",
  };
  let resultList = [];

  let recursiveRekognition = (iteration) => {
    try {
      params.TargetImage = JSON.parse(
        Buffer.from(templateList[iteration], "base64")
      );
    } catch (err) {
      let response = {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Conrol-Allow-Methods": "OPTIONS,GET,POST",
        },
        body: "TemplateList missing or invalid",
        isBase64Encoded: false,
      };
      callback(null, response);
    }

    rekognition.compareFaces(params, function (err, data) {
      if(err){
        console.log(err)
      }
      else if (data.FaceMatches.length > 0) {
        //Return the normalized similarity value of the 1st face
        resultList.push(data.FaceMatches[0].Similarity / 100);
      } else {
        //No Matches
        resultList.push(0);
      }
      if (templateList.length > iteration + 1) {
        recursiveRekognition(iteration + 1);
      } else {
        var successReturn = {
          statusCode: "200",

          body: JSON.stringify(resultList),

          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Conrol-Allow-Methods": "OPTIONS,GET,POST",
          },
        };
        callback(null, successReturn);
      }
    });
  };

  recursiveRekognition(0);
};

module.exports.info = (event, context, callback) => {
  let data = {
    AlgorithmName: "AWS Rekognition",
    AlgorithmVersion: "1.0.0",
    AlgorithmType: "Face",
    CompanyName: "Amazon",
    TechnicalContactEmail: "N/A",
    RecommendedCPUs: 4,
    RecommendedMem: 2048,
  };

  let response = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Conrol-Allow-Methods": "OPTIONS,GET,POST",
    },
    body: JSON.stringify(data),
    isBase64Encoded: false,
  };
  callback(null, response);
};

module.exports.get_list = (event, context, callback) => {
  let results = [];
  let params = { Bucket: bucketName };
  s3.listObjects(params, function (err, data) {
    if (err) console.log(err, err.stack);
    // an error occurred
    else {
      data.Contents.forEach((element) => {
        var template = {
          S3Object: {
            Bucket: bucketName,
            Name: element.Key,
          },
        };
        results.push({
          Name: element.Key,
          Template: new Buffer(JSON.stringify(template)).toString("Base64"),
        });
      });

      let response = {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Conrol-Allow-Methods": "OPTIONS,GET,POST",
        },
        body: JSON.stringify(results),
        isBase64Encoded: false,
      };
      callback(null, response);
    }
  });
};

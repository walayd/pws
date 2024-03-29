const MongoClient = require('mongodb');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const jwt = require('jsonwebtoken');
const config = require('../config');
const ObjectID = require('mongodb').ObjectID;

let storage = new GridFsStorage({
    url:  config.DbConfig.DBURL,
    file: (req, file) => {
        return {
            bucketName: 'plugins',       //Setting collection name, default name is fs
            filename: file.originalname     //Setting file name to original name of file
        }
    }
});

let upload = null;

storage.on('connection', (db) => {
    //Setting up upload for a single file
    console.log("storage.on.connection");
    upload = multer({
        storage: storage
    }).single('file1');

});

module.exports.uploadFile = (req, res) => {
    console.log("uploadFile");
    upload(req, res, (err) => {
        if(err){
            console.log(err);
            return res.status(500).send({title: 'Uploaded Error', message: 'File could not be uploaded', error: err});
        }
        console.log("req " + req);
        console.log("req " + req.file);
        console.log("req " + req.file.filename);
        res.status(200).send({title: 'Uploaded', message: `File ${req.file.filename} has been uploaded!`});
    });
};

module.exports.getFile = (req, res) => {
    //Accepting user input directly is very insecure and should
    //never be allowed in a production app. Sanitize the input.
    let fileName = req.body.text1;
    //Connect to the MongoDB client
    MongoClient.connect(config.DbConfig.DBURL, async function(err, client){
        if(err){
            return res.status(500).send({title: 'Uploaded Error', message: 'MongoClient Connection error', error: err.errMsg});
        }
        const db = client.db("pws");

        const collection = db.collection('plugins.files');
        const collectionChunks = db.collection('plugins.chunks');


        let result = await collection.findOne({filename: fileName});
        console.log(result);

        let bucket = new MongoClient.GridFSBucket(
            db, {bucketName: "plugins"}
        );
        let downloadStream = bucket.openDownloadStream(ObjectID(result._id));

        downloadStream.on('data', (chunk) => {
            res.write(chunk);
        });

        downloadStream.on('error', () => {
            res.sendStatus(404);
        });

        downloadStream.on('end', () => {
            res.end();
        });
    });
};
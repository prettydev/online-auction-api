var MongoClient = require('mongodb').MongoClient;
var dbConfig    = require('../db-config');
var collectionName  = 'locations';

exports.getAll =  function(req, res){
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err)
            return res.status(500).json({message: err});

        var db = client.db(dbConfig.dbName);
        var locations = db.collection(collectionName);

        locations.find().sort( { code: 1 } ).toArray(function (err, result) {
            if (err)
                return res.status(500).json({message: err});

            res.json({
                locations: result
            });
        });

    });
};

exports.save = function (req, res) {
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err)
            return res.status(500).json({message: err});

        var db = client.db(dbConfig.dbName);
        var locations = db.collection(collectionName);

        try {
            locations.insertMany(req.body);
            res.json({
                message: "Cities saved successfully."
            });
        }catch (e) {
            res.json({
                message: e
            });
        }

    });
};